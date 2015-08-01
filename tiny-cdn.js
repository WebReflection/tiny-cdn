'use strict'; /*! (C) Andrea Giammarchi */

var
  crypto = require('crypto'),
  fs = require('fs'),
  path = require('path'),
  zlib = require('zlib'),
  holdon = require('holdon'),
  mime = require('mime-types'),
  contentTypeDefault = mime.lookup('.bin'),
  contentTypeHTML = mime.lookup('.html'),
  contentTypeJSON = mime.lookup('.json'),
  contentTypeTXT = mime.lookup('.txt'),
  contentHTML = {'Content-Type': contentTypeHTML},
  contentJSON = {'Content-Type': contentTypeJSON},
  contentTXT = {'Content-Type': contentTypeTXT},
  FileError = {message: 'Not a file'},
  Null = (Object.create || Object)(null),
  OK_SLASH = path.sep === '/'
;

function getCompressionLevel(compression) {
  return typeof compression === 'string' ?
    getCompressionByType(compression) :
    (typeof compression === 'number' ?
      compression :
      getCompressionByType('best')
    );
}

function getCompressionByType(type) {
  switch (type.toLowerCase()) {
    case 'best': return zlib.Z_BEST_COMPRESSION;
    case 'no': return zlib.Z_NO_COMPRESSION;
    case 'speed': return zlib.Z_BEST_SPEED;
    default: return zlib.Z_DEFAULT_COMPRESSION;
  }
}

function tinyCDN(options) {
  var
    cache = holdon.create(['request', 'response']),
    compression = !!options.compression,
    compressionObject = compression && {
      level: getCompressionLevel(options.compression)
    },
    etag = !!options.etag,
    hash = etag && typeof options.etag === 'string' ? options.etag : 'sha256',
    defaultMime = options.defaultMime || contentTypeDefault,
    source = path.resolve(options.source || __dirname),
    dest = path.resolve(options.dest || __dirname),
    $404 = options[404] || Null,
    $404HTML = $404.html || $404.HTML || 'Not Found',
    $404JSON = $404.json || $404.JSON || '{"error":"Not found"}',
    $404TXT = $404.txt || $404.TXT || 'Not Found',
    accessControlAllowOrigin = options.accessControlAllowOrigin || '',
    maxAge = options.maxAge || 30672000,
    maxListeners = parseInt(options.maxListeners || 0, 10) || Infinity,
    onresponse = options.onresponse || options.onResponse || function onresponse(err, url) {},
    onerror = options.onerror || options.onError || function onerror(err, url, held) {
      held.request.forEach(fail, held.response);
    },
    withAccessControl = accessControlAllowOrigin ?
      function addAccessControl(headers) {
        headers[
          'Access-Control-Allow-Origin'
        ] = accessControlAllowOrigin;
        return headers;
      } :
      function noObjectOP(object) {
        return object;
      },
    withETag = function withETag(etag, headers) {
      if (etag) {
        headers['Expires'] = new Date(Date.now() + maxAge * 1000).toGMTString();
        headers['Cache-Control'] = 'public, max-age=' + maxAge;
        headers['ETag'] = etag;
      }
      return withAccessControl(headers);
    }
  ;

  if (crypto.getHashes().indexOf(hash) < 0) {
    console.warn('unabe to use specified ETag hash: ' + hash);
    hash = crypto.getHashes().filter(function (hash) {
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
  }

  // utility that will create only once
  // targets with the right headers and streams
  function Output(contentType) {
    this.contentType = contentType;
  }

  function pipeOutputTarget(response) {
    response.writeHead(200, this.headers);
    this.stream.pipe(response);
  }

  Output.prototype.get = function get(target, stats, encoding, etag) {
    if (!(target in this)) {
      var headers = withETag(etag, {
        'Content-Type': this.contentType,
        'Content-Length': stats.size,
        'Last-Modified': stats.mtime.toGMTString()
      });
      if (encoding) {
        headers['Content-Encoding'] = encoding;
      }
      this[target] = {
        pipe: pipeOutputTarget,
        headers: headers,
        stream: createReadStream(target)
      };
    }
    return this[target];
  };

  // DONE!
  function asHash(content) {
    var sum = crypto.createHash(hash);
    sum.update(content);
    return sum.digest('hex');
  }
  function createEtagIfNotPresent(url, src, etag, then) {
    fs.readFile(etag, function (err, data) {
      if (err) {
        fs.readFile(src, function (err, buffer) {
          if (err) {
            failRequest(err, url);
          } else {
            src = asHash(buffer);
            fs.writeFile(etag, src, function(err) {
              if (err) {
                failRequest(err, url);
              } else {
                then(src);
              }
            });
          }
        });
      } else {
        then(data.toString());
      }
    });
  }
  function createReadStream(path) {
    var stream = fs.createReadStream(path);
    stream.setMaxListeners(maxListeners);
    return stream;
  }
  function fail(request, i) {
    var
      accept = request.headers.accept,
      response = this[i],
      head, end
    ;
    if (accept.indexOf(contentTypeHTML) < 0) {
      if (accept.indexOf(contentTypeJSON) < 0) {
        head = contentTXT;
        end = $404TXT;
      } else {
        head = contentJSON;
        end = $404JSON;
      }
    } else {
      head = contentHTML;
      end = $404HTML;
    }
    response.writeHead(404, head);
    response.end(end);
  }
  function failRequest(err, url) {
    onerror.call(options, err, url, cache.remove(url));
    onresponse.call(options, err, url);
  }
  function justURL(url) {
    var i = url.indexOf('?');
    return i < 0 ? url : url.slice(0, i);
  }
  function getSourceStatsAnd(url, resolved, then) {
    var src = source + resolved;
    fs.stat(src, function (err, stats) {
      if (err || !stats.isFile()) {
        failRequest(err || FileError, url);
      } else {
        then(url, resolved, src, stats);
      }
    });
  }
  // !ENOD

  function getCompressedStats(url, resolved, src, plainStats) {
    var
      plainEtag,
      methodGzip = 'createGzip',
      methodDeflate = 'createDeflate',
      gzip = dest + resolved + '.gzip',
      deflate = dest + resolved + '.deflate',
      failed = false,
      calls = etag ? 3 : 2,
      stats = {},
      verify = function () {
        if (--calls === 0) {
          serveCompressed(
            url,
            src,
            plainStats,
            etag ? plainEtag : '',
            gzip,
            stats[methodGzip],
            etag ? stats[methodGzip + 'etag'] :  '',
            deflate,
            stats[methodDeflate],
            etag ? stats[methodDeflate + 'etag'] : ''
          );
        }
      },
      after = function (err, usedMethod, result, etag) {
        if (failed) return;
        if (err) {
          failed = true;
          failRequest(err, url);
        } else {
          stats[usedMethod] = result;
          if (etag) stats[usedMethod + 'etag'] = etag;
          verify();
        }
      }
    ;
    readCompressedStatsOrCreate(url, src, gzip, methodGzip, after, false);
    readCompressedStatsOrCreate(url, src, deflate, methodDeflate, after, false);
    if (etag) {
      createEtagIfNotPresent(
        url,
        src,
        dest + resolved + '.' + hash,
        function (etag) {
          plainEtag = etag;
          verify();
        }
      );
    }
  }

  function readCompressedStatsOrCreate(url, source, target, method, then, internalCall) {
    fs.stat(target, function (err, stats) {
      if (err && !internalCall) {
        fs
          .createReadStream(source)
          .pipe(zlib[method](compressionObject))
          .pipe(fs.createWriteStream(target))
          .on('finish', function () {
            readCompressedStatsOrCreate(url, source, target, method, then, !internalCall);
          })
        ;
      } else if (etag) {
        createEtagIfNotPresent(
          url,
          target,
          target + '.' + hash,
          function (etag) {
            then(err, method, stats, etag);
          }
        );
      } else {
        then(err, method, stats);
      }
    });
  }

  function  Decider(info) {
    this.output = new Output(info.contentType);
    this.headers = {};
    this.info = info;
  }
  Decider.prototype.serve = function (request, response) {
    var
      headers = request.headers,
      acceptEncoding = headers['accept-encoding'] || '',
      out = acceptEncoding.indexOf('gzip') < 0 ?
        (acceptEncoding.indexOf('deflate') < 0 ?
          'plain' : 'deflate'
        ) : 'gzip',
      info = this.info[out]
    ;
    if (etag && headers['if-none-match'] === info.etag) {
      response.writeHead(
        304,
        this.headers[info.etag] || (
          this.headers[info.etag] = withETag(info.etag, {
            'Content-Type': this.output.contentType
          })
        )
      );
      response.end();
    } else {
      this.output.get(
        info.source,
        info.stats,
        info.encoding,
        info.etag
      ).pipe(response);
    }
  };

  function serveCompressed(
    url,
    plainSrc,
    plainStats,
    plainEtag,
    gzipSrc,
    gzipStats,
    gzipEtag,
    deflateSrc,
    deflateStats,
    deflateEtag
  ) {
    for (var
      held = cache.remove(url),
      decider = new Decider({
        contentType: mime.lookup(url) || defaultMime,
        plain: {
          source: plainSrc,
          stats: plainStats,
          encoding: '',
          etag: plainEtag
        },
        deflate: {
          source: deflateSrc,
          stats: deflateStats,
          encoding: 'deflate',
          etag: deflateEtag
        },
        gzip: {
          source: gzipSrc,
          stats: gzipStats,
          encoding: 'gzip',
          etag: gzipEtag
        }
      }),
      request = held.request,
      response = held.response,
      i = 0, length = response.length;
      i < length; i++
    ) {
      decider.serve(request[i], response[i]);
    }
    onresponse.call(options, null, url);
  }

  function readEtag(url, resolved, src, stats) {
    createEtagIfNotPresent(
      url,
      src,
      dest + resolved + '.' + hash,
      function (etag) {
        serveEtag(url, etag, src, stats);
      }
    );
  }

  function serveEtag(url, etag, src, stats) {
    for (var
      res,
      held = cache.remove(url),
      contentType = mime.lookup(url) || defaultMime,
      common200 = new Output(contentType).get(src, stats, '', etag),
      common304 = withETag(etag, {
        'Content-Type': contentType
      }),
      request = held.request,
      response = held.response,
      i = 0, length = response.length;
      i < length; i++
    ) {
      res = response[i];
      if (request[i].headers['if-none-match'] === etag) {
        res.writeHead(304, common304);
        res.end();
      } else {
        common200.pipe(res);
      }
    }
    onresponse.call(options, null, url);
  }

  function serveFile(url, resolved, src, stats) {
    for (var
      response = cache.remove(url).response,
      out = new Output(
        mime.lookup(url) || defaultMime
      ).get(src, stats, '', ''),
      i = 0, length = response.length;
      i < length;
      out.pipe(response[i++])
    );
    onresponse.call(options, null, url);
  }

  // the tinyCDN handler
  return function tinyCDN(request, response) {
    var url = justURL(request.url), resolved;
    if (cache.add(url, request, response)) {
      resolved = OK_SLASH ? url : path.join(url.split(path.sep));
      switch (true) {
        case compression: getSourceStatsAnd(url, resolved, getCompressedStats); break;
        case etag: getSourceStatsAnd(url, resolved, readEtag); break;
        default: getSourceStatsAnd(url, resolved, serveFile); break;
      }
    }
  };
}

(module.exports = tinyCDN).create = tinyCDN;