'use strict'; /*! (C) Andrea Giammarchi */

var
  // module dependencies
  crypto = require('crypto'),
  fs = require('fs'),
  path = require('path'),
  zlib = require('zlib'),
  holdon = require('holdon'),
  mime = require('mime-types'),

  // shared constants
  OK_SLASH = path.sep === '/',
  CONTENT_TYPE = {
    BIN: mime.lookup('.bin'),
    HTML: mime.lookup('.html'),
    JSON: mime.lookup('.json'),
    TXT: mime.lookup('.txt')
  },
  ERROR_CONTENT = {
    HTML: {'Content-Type': CONTENT_TYPE.HTML},
    JSON: {'Content-Type': CONTENT_TYPE.JSON},
    TXT: {'Content-Type': CONTENT_TYPE.TXT}
  },
  FILE_ERROR = {message: 'Not a file'},

  // shared utilities
  getStats = (function (cache) {
    return function getStats(path, callback) {
      if (cache.add(path, callback)) {
        fs.stat(path, function onStats(err, stats) {
          var
            callback = cache.remove(path).callback,
            i = 0, length = callback.length
          ;
          while (i < length) callback[i++](err, stats);
        });
      }
    };
  }(holdon.create(['callback']))),
  getFileContent = (function (cache) {
    return function getFileContent(path, callback) {
      if (cache.add(path, callback)) {
        fs.readFile(path, function onFileRead(err, content) {
          var
            callback = cache.remove(path).callback,
            i = 0, length = callback.length,
            str = err ? '' : content.toString()
          ;
          while (i < length) callback[i++](err, str);
        });
      }
    };
  }(holdon.create(['callback'])))
;

// shared utilities defined as function declaration
// (for no reason whatsoever, just less typing that
// became actually more the moment I wrote this comment)

  // adjusts Windows slashes, eventually
  function fixPathSlashes(url) {
    return url.replace(/\//g, path.sep);
  }

  // returns the right compression name/number
  // accordingly with the type of input or "best" by default
  function getCompressionLevel(compression) {
    return typeof compression === 'string' ?
      getCompressionByType(compression) :
      (typeof compression === 'number' ?
        compression :
        getCompressionByType('best')
      );
  }

  // returns the right compression
  // based on the name ( best, speed, no, or default )
  function getCompressionByType(type) {
    switch (type.toLowerCase()) {
      case 'best': return zlib.Z_BEST_COMPRESSION;
      case 'no': return zlib.Z_NO_COMPRESSION;
      case 'speed': return zlib.Z_BEST_SPEED;
      default: return zlib.Z_DEFAULT_COMPRESSION;
    }
  }

  // returns a string before any eventual '?' char
  function justURL(url) {
    var i = url.indexOf('?');
    return i < 0 ? url : url.slice(0, i);
  }

// finally, the exported module!
function tinyCDN(options) {

  var
    // privagte scope "constants"
    USE_COMPRESSION = !!options.compression,
    USE_ETAG = !!options.etag,

    // default hash used to flag ETag header: sha256 (if present, resolved at runtime otherwise)
    HASH = USE_ETAG && typeof options.etag === 'string' ? options.etag : 'sha256',

    // optionally specified Cache-Control max-age value, in seconds
    MAX_AGE = options.maxAge || 30672000,

    // every stream might have a maxListeners limit
    // options can overwrite such limit, or just let it be
    MAX_LISTENERS = parseInt(options.maxListeners || 0, 10) || Infinity,

    // every connection will go through a different cache channel
    // accordingly with compression status and request availability
    cacheEntries = ['request', 'response'],
    CACHE = {
      deflate: USE_COMPRESSION && holdon.create(cacheEntries),
      gzip: USE_COMPRESSION && holdon.create(cacheEntries),
      raw: holdon.create(cacheEntries)
    },
    // compression level: 'no', 'speed', 'best', 'default' or number 1 to 9
    COMPRESSION = USE_COMPRESSION && {
      level: getCompressionLevel(options.compression)
    },
    // source and destination folders to use
    SOURCE = options.source && OK_SLASH ? options.source.split('/').join(path.sep) : __dirname,
    DEST = options.dest && OK_SLASH ? options.dest.split('/').join(path.sep) : __dirname,

    // 404 options
    $404 = options[404] || (Object.create || Object)(null),
    $404HTML = $404.html || $404.HTML || 'Not Found',
    $404JSON = $404.json || $404.JSON || '{"error":"Not found"}',
    $404TXT = $404.txt || $404.TXT || 'Not Found',

    // callbacks used to notify events and clean up the cache
    onresponse = options.onresponse || options.onResponse || function onresponse(err, url) {},
    onerror = options.onerror || options.onError || function onerror(err, url, held) {
      for (var
        request = held.request,
        response = held.response,
        i = 0, length = response.length;
        i < length; i++
      ) {
        failLoop(request[i], response[i]);
      }
    },

    // if specified as accessControlAllowOrigin property,
    // the Access-Control-Allow-Origin header will be used too
    accessControlAllowOrigin = options.accessControlAllowOrigin || '',
    withAccessControl = accessControlAllowOrigin ?
      function addAccessControl(headers) {
        headers[
          'Access-Control-Allow-Origin'
        ] = accessControlAllowOrigin;
        return headers;
      } :
      function noObjectOP(headers) {
        return headers;
      },
    withETag = function withETag(etag, headers) {
      if (etag) {
        headers['Expires'] = new Date(Date.now() + MAX_AGE * 1000).toGMTString();
        headers['Cache-Control'] = 'public, max-age=' + MAX_AGE;
        headers['ETag'] = etag;
      }
      return withAccessControl(headers);
    }
  ;

  // in case the chosen HASH is not available
  if (crypto.getHashes().indexOf(HASH) < 0) {
    // warns and tries to grab the right one
    console.warn('unabe to use specified ETag hash: ' + HASH);
    HASH = crypto.getHashes().filter(function (hash) {
      // choose in higher security level order
      switch (hash) {
        case 'sha512':
        case 'sha384':
        case 'sha256':
        case 'sha224':
        case 'sha1':
        case 'md5':
          return true;
        default:
          return false;
      }
    }).sort().pop();
    // if no HASH is usable, we cannot go on
    if (!HASH) throw new Error('unabe to use any ETag');
  }

  // will grab an ETag from a generic file
  function getHash(source, then) {
    var
      sum = crypto.createHash(HASH),
      stream = fs.createReadStream(source)
    ;
    stream.on('data', function(data) {
      sum.update(data);
    });
    stream.on('end', function() {
      then(sum.digest('hex'));
    });
  }

  // will create a Stream that can cope with all responses
  function createReadStream(path) {
    var stream = fs.createReadStream(path);
    stream.setMaxListeners(MAX_LISTENERS);
    return stream;
  }

  // utility that will create only once
  // targets with the right headers and streams
  function Output(contentType) {
    this.contentType = contentType;
    this.headers = this.stream = null;
  }

  // simply an helper for the object created
  // as Stream facade in the getStream method
  function pipeOutputTarget(response) {
    response.writeHead(200, this.headers);
    this.stream.pipe(response);
  }

  // given the right amount of arguments/info
  // will return a header Singleton based on those info
  Output.prototype.getHeaders = function get(target, stats, encoding, etag) {
    var headers = this.headers || (this.headers = withETag(etag, {
      'Content-Type': this.contentType,
      'Content-Length': stats.size,
      'Last-Modified': stats.mtime.toGMTString()
    }));
    if (encoding) {
      headers['Content-Encoding'] = encoding;
    }
    return headers;
  };

  // given the right amount of arguments/info
  // will return a Stream Singleton based on those info
  Output.prototype.getStream = function get(target, stats, encoding, etag) {
    return this.stream || (this.stream = {
      pipe: pipeOutputTarget,
      headers: this.getHeaders(target, stats, encoding, etag),
      stream: createReadStream(target)
    });
  };

  // fail fast, fail cool and stuff ...
  function failLoop(request, response) {
    var
      accept = request.headers.accept,
      head, end
    ;
    if (accept.indexOf(CONTENT_TYPE.HTML) < 0) {
      if (accept.indexOf(CONTENT_TYPE.JSON) < 0) {
        head = CONTENT_TYPE.TXT;
        end = $404TXT;
      } else {
        head = CONTENT_TYPE.JSON;
        end = $404JSON;
      }
    } else {
      head = CONTENT_TYPE.HTML;
      end = $404HTML;
    }
    response.writeHead(404, head);
    response.end(end);
  }
  function failRequest(err, url, group, channel) {
    onerror.call(options, err, url, CACHE[group].remove(channel));
    onresponse.call(options, err, url);
  }

  // DRY utility used to actually serve a file, accordingly with the request
  function serveFile(url, group, channel, source, stats, encoding, etag) {
    for (var
      res,
      // free current channel first!
      held = CACHE[group].remove(channel),
      // create a convenient handler for 200
      // eventually recycled to serve 304 too
      serve200 = new Output(mime.lookup(url) || CONTENT_TYPE.BIN),
      // simpler resolution for request, response
      request = held.request,
      response = held.response,
      i = 0, length = response.length;
      i < length; i++
    ) {
      res = response[i];
      if (USE_ETAG && request[i].headers['if-none-match'] === etag) {
        res.writeHead(304, serve200.getHeaders(source, stats, encoding, etag));
        res.end();
      } else {
        serve200.getStream(source, stats, encoding, etag).pipe(res);
      }
    }
    onresponse.call(options, null, url);
  }

  // the exported tinyCDN module handler
  return function tinyCDN(request, response) {

    var
      // remove any query string from the url
      url = justURL(request.url),
      // grab once the Accept-Encoding header, if any
      acceptEncoding = request.headers['accept-encoding'] || '',
      // and try to use it to figure out in which group
      // this connection should be held
      // but only if the compression is ON
      group = USE_COMPRESSION ? (
        // most common accepted compression
        acceptEncoding.indexOf('gzip') < 0 ?
          // fallback to deflate if no gzip
          (acceptEncoding.indexOf('deflate') < 0 ?
            // use raw serving as last resource
            'raw' : 'deflate'
          ) : 'gzip'
        ) :
        // otherwise fallback to raw response
        'raw',
      encoding = group === 'raw' ? '' : group,
      channel = group + ':' + url,
      destAbout,
      sourceAbout,
      statsAbout,
      resolved
    ;

    if (url[url.length - 1] === '/') return failLoop(request, response);

    // accordingly with the optionally accepted encoding
    // we can queue request and response to the right channel
    if (CACHE[group].add(channel, request, response)) {
      // resolve once URL slashes so file operations will be safe
      resolved = OK_SLASH ? url : fixPathSlashes(url);
      // temporarily saved sourceAbout and destAbout, reused later on
      sourceAbout = SOURCE + resolved;
      destAbout = DEST + resolved + '.' + group;
      // lets grab stats for the needed file
      getStats(
        // if the group is raw, grab original file stats
        // otherwise grab the compressed file stats from DEST folder
        group === 'raw' ?
          (statsAbout = sourceAbout) :
          (statsAbout = destAbout)
        ,
        function onStats(err, stats) {
          // if we have an error
          if (err) {
            // if it was a source file
            if (group === 'raw') {
              // we can just fail since the file wasn't present
              failRequest(err, url, group, channel);
            } else {
              // we might be in a case where a UA asked for a compressed file
              // but this hasn't been created yet
              // in this case we can check if the original one exists
              // so we can eventually create the compressed version and serve it
              // to the whole group of connections waiting for it
              getStats(sourceAbout, function (err, stats) {
                // if there is an error we can just fail
                if (err) {
                  failRequest(err, url, group, channel);
                } else {
                  // otherwise good: we have the source, we can compress it!
                  fs
                    .createReadStream(sourceAbout)
                    .pipe(zlib[
                      group === 'gzip' ? 'createGzip' : 'createDeflate'
                    ](COMPRESSION))
                    .pipe(fs.createWriteStream(statsAbout))
                    .on('finish', function () {
                      // once we have created the compressed file
                      // we can finally ask its stats and serve it
                      getStats(statsAbout, onStats); 
                    })
                  ;
                }
              });
            }
          } else if (!stats.isFile()) {
            onStats(FILE_ERROR, null);
          } else {
            // in case we need an ETag header ...
            if (USE_ETAG) {
              // let's grab its content
              getFileContent(destAbout + '.' + HASH, function onEtag(err, etag) {
                // and if no file was available ...
                if (err) {
                  // let's try create it!
                  getHash(sourceAbout, function (etag) {
                    // we can write the ETag content
                    fs.writeFile(destAbout + '.' + HASH, etag, function (err) {
                      // and if we didn't succeed, we have to give up!
                      if (err) {
                        failRequest(err, url, group, channel);
                      } else {
                        serveFile(url, group, channel, statsAbout, stats, encoding, etag);
                      }
                    });
                  });
                } else {
                  serveFile(url, group, channel, statsAbout, stats, encoding, etag);
                }
              });
            } else {
              serveFile(url, group, channel, statsAbout, stats, encoding, '');
            }
          }
        }
      );
    }
  };
}

(module.exports = tinyCDN).create = tinyCDN;