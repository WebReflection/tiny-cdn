/**                              cli
 *   __  _           ________  _  __
 *  / /_(_)__  __ __/ ___/ _ \/ |/ /
 * / __/ / _ \/ // / /__/ // /    / 
 * \__/_/_//_/\_, /\___/____/_/|_/  
 *           /___/                  
 * - - - - - - - - - - - - - - - - -
 *              by Andrea Giammarchi
 */

/** HOW TO

  ./tiny-cdn [run] [options]

  Mandatory options

    -s | --source           the source folder with static content
    -d | --dest             the destination folder for ETags / gzip

  Configuration options

    -c | --compression      use compression and optionally specify its level
                            best, speed, default, or an integer
    -cl | --compress-list   a comma separated list of extension to compress
    -e | --etag             use etag and optionally specify its algorithm
                            by default it's sha256
    -ma | --max-age         the cache max-age header in seconds (default: 30672000)
    -ml | --max-listeners   the maximum amount of listeners to use per each stream
                            by default there is no limit
    -ic | --ignore-cluster  if true (or empty) will never use master/cluster logic

  SSL options

    -ssl-cert               will use the provided cert file to run HTTPS instead of HTTP
    -ssl-key                will use the provided key file to run HTTPS instead of HTTP

  Network options

    -h | --host | -ip       if specified, will be used as server address
    -p | --port             if specified, will be used as port

  Build file option
    -b | --build            if specified will pre build a file
                            creating in the destination folder
                            the gzip and deflate version of the file
                            plus the ETag per each version

*/

'use strict';

var
  fs = require('fs'),
  path = require('path'),
  http = require('http'),
  https = require('https')
;

function fixPathWithTilde(src) {
  var i = src.indexOf('~');
  return i < 0 ? src : process.env.HOME + src.slice(i + 1);
}

function getContent(src) {
  return fs.readFileSync(path.resolve(fixPathWithTilde(src)));
}

module.exports = function (tinyCDN) {
  for (var
    get,
    handler,
    next,
    pair,
    server,
    sslCert,
    sslKey,
    args = process.argv,
    config = {},
    host = '0.0.0.0',
    port = 7151,
    build = false,
    run = false,
    ssl = 0,
    i = 2; i < args.length; i++
  ) {
    pair = args[i].split('=');
    switch (pair[0]) {
      case '-acao': case '--access-control-allow-origin':
        config.accessControlAllowOrigin = pair[1] || '*';
        break;
      case '-b': case '--build':
        build = pair[1] || true;
        break;
      case '-c': case '--compression':
        config.compression = pair[1] || 'best';
        break;
      case '-cl': case '--compress-list':
        config.compress = pair[1].split(',');
        break;
      case '-d': case '--dest':
        config.dest = path.resolve(pair[1]);
        break;
      case '-e': case '--etag':
        config.etag = pair[1] || 'sha256';
        break;
      case '-h': case '--host': case '--ip':
        host = pair[1];
        break;
      case '-ic': case '--ignore-cluster':
        config.ignoreCluster = pair[1] === 'true' || !pair[1];
        break;
      case '-ma': case '--max-age':
        config.maxAge = parseInt(pair[1] || 0,  10);
        break;
      case '-ml': case '--max-listeners':
        config.maxListeners = ''.toLowerCase.call(pair[1]) === 'infinity' ?
          Infinity : parseInt(pair[1],  10);
        break;
      case '-p': case '--port':
        port = parseInt(pair[1], 10);
        break;
      case '-s': case '--source':
        config.source = path.resolve(pair[1]);
        break;
      case '-ssl-cert':
        ssl++;
        try {
          sslCert = getContent(pair[1]);
        } catch (o_O) {
          console.error('\n[ERROR] Unable to read SSL certificate: ' + pair[1] + '\n');
          process.exit(1);
        }
        break;
      case '-ssl-key':
        ssl++;
        try {
          sslKey = getContent(pair[1]);
        } catch (o_O) {
          console.error('\n[ERROR] Unable to read SSL key: ' + pair[1] + '\n');
          process.exit(1);
        }
        break;
      // special argument, if specified will run tinyCDN
      // using the provided configuration as simple http server
      case 'run':
        ssl++;
        run = true;
        break;
    }
  }
  if (run || build) {
    handler = tinyCDN(config);
    if (ssl === 3) {
      server = https.createServer({
        key: sslKey,
        cert: sslCert
      }, handler);
    } else {
      server = http.createServer(handler);
    }
    server
      .listen(port, host, function () {
        var
          addres = this.address(),
          full = ''.concat(
            (ssl === 3 ? 'https' : 'http'), '://',
            addres.address, ':',
            addres.port, '/'
          )
        ;
        if (run) {
          console.log(
            '[tinyCDN] running on ' + full +
             (addres.address !== host ? (
                ' as ' + host
              ) : '')
          );
        }
        if (build) {
          get = function (encoding) {
            (ssl === 3 ? https : http).get({
              hostname: addres.address,
              port: addres.port,
              path: build,
              headers: {'accept-encoding': encoding},
              agent: false
            }).on('close', next);
          };
          next = function () {
            if (!--i && !run) {
              console.log('[tinyCDN] ' + build + ' is ready');
              server.close();
            }
          };
          i = 1;
          if (config.compression) {
            i = 3;
            fs.unlink(config.dest + build + '.deflate', function () {
              fs.unlink(config.dest + build + '.deflate.' + config.etag, function () {
                get('deflate');
              });
            });
            fs.unlink(config.dest + build + '.gzip', function () {
              fs.unlink(config.dest + build + '.gzip.' + config.etag, function () {
                get('gzip');
              });
            });
          }
          fs.unlink(config.dest + build + '.raw.' + config.etag, function () {
            get('');
          });
        }
      })
    ;
  } else {
    console.log('/* [tinyCDN] */' + JSON.stringify(config, null, '  '));
  }
};