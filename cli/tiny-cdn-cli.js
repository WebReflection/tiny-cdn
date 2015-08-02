/*   __  _           ________  _  __
 *  / /_(_)__  __ __/ ___/ _ \/ |/ /
 * / __/ / _ \/ // / /__/ // /    / 
 * \__/_/_//_/\_, /\___/____/_/|_/  
 *           /___/                  
 * - - - - - - - - - - - - - - - - -
 *              by Andrea Giammarchi
 */


'use strict';

var
  fs = require('fs'),
  path = require('path'),
  http = require('http')
;

module.exports = function (tinyCDN) {
  for (var
    next,
    pair,
    server,
    args = process.argv,
    config = {},
    host = '0.0.0.0',
    port = 7151,
    build = false,
    run = false,
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
      case '-d': case '--dest':
        config.dest = path.resolve(pair[1]);
        break;
      case '-e': case '--etag':
        config.etag = pair[1] || 'sha256';
        break;
      case '-h': case '--host': case '--ip':
        host = pair[1];
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
      // special argument, if specified will run tinyCDN
      // using the provided configuration as simple http server
      case 'run':
        run = true;
        break;
    }
  }
  if (run || build) {
    server = http
      .createServer(tinyCDN(config))
      .listen(port, host, function () {
        var
          addres = this.address(),
          full = 'http://' + addres.address + ':' + addres.port + '/'
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
          next = function () {
            if (!--i && !run) {
              console.log('[tinyCDN] ' + build + ' is ready');
              server.close();
            }
          };
          i = 1;
          if (config.compression) {
            i = 3;
            http.get({
              hostname: addres.address,
              port: addres.port,
              path: build,
              headers: {'accept-encoding': 'deflate'},
              agent: false
            }).on('close', next);
            http.get({
              hostname: addres.address,
              port: addres.port,
              path: build,
              headers: {'accept-encoding': 'gzip'},
              agent: false
            }).on('close', next);
          }
          http.get({
            hostname: addres.address,
            port: addres.port,
            path: build,
            headers: {'accept-encoding': ''},
            agent: false
          }).on('close', next);
        }
      })
    ;
  } else {
    console.log('/* [tinyCDN] */' + JSON.stringify(config, null, '  '));
  }
};