
var fs = require('fs');
var http = require('http');
var path = require('path');

var tinyCDN = require('../tiny-cdn');

function unlink(file) {
  fs.unlink(file, wru.async(function () {
    wru.assert(file + ' removed');
  }));
}

wru.test([
  {
    name: 'tiny-cdn',
    test: function () {
      wru.assert('tinyCDN is a function', typeof tinyCDN === 'function');
    }
  }, {
    name: 'single tone',
    test: function () {
      var config = {};
      wru.assert('each tinyCDN invoke creates a different function',
        tinyCDN(config) !== tinyCDN(config));
    }
  }, {
    name: 'configuration defaults',
    test: function () {
      var
        url = '/demo/source/lorem-ipsum.txt',
        file = path.resolve(__dirname, '..' + url),
        data = [],
        done = wru.async(function () {
          server.close();
          var
            response = data.response,
            headers = response.headers,
            content = data.join('')
          ;
          wru.assert('the response had a content', content.length);
          wru.assert('the status was 200', response.statusCode === 200);
          wru.assert('the headers were correct',
            headers['x-served-by'] === 'tinyCDN' &&
            headers['content-type'] === 'text/plain' &&
            headers['content-length'] === fs.statSync(file).size.toString() &&
            !headers['etag'] &&
            !headers['cache-control'] &&
            !headers['content-encoding'] &&
            !headers['access-control-allow-origin']
          );
        }),
        server = http.createServer(tinyCDN({})).listen(7357, '0.0.0.0', function () {
          var addres = server.address();
          http.get(
            {
              hostname: addres.address,
              port: addres.port,
              path: '/demo/source/lorem-ipsum.txt',
              headers: {
                'accept-encoding': 'gzip,deflate'
              },
              agent: false
            },
            function (response) {
              (data.response = response).on('data', data.push.bind(data));
            }
          ).on('close', done);
        })
      ;
    }
  }, {
    name: 'configuration with etag',
    test: function () {
      var
        url = '/demo/source/lorem-ipsum.txt',
        file = path.resolve(__dirname, '..' + url),
        extraFile = file + '.raw.md5',
        data = [],
        done = wru.async(function () {
          server.close();
          var
            response = data.response,
            headers = response.headers,
            content = data.join('')
          ;
          wru.assert('the response had a content', content.length);
          wru.assert('the status was 200', response.statusCode === 200);
          wru.assert('the headers were correct',
            headers['x-served-by'] === 'tinyCDN' &&
            headers['content-type'] === 'text/plain' &&
            headers['content-length'] === fs.statSync(file).size.toString() &&
            headers['etag'] === 'ede669a3e0767ab50571f4e2b898397d' &&
            -1 < headers['cache-control'].indexOf('max-age=1000') &&
            !headers['content-encoding'] &&
            !headers['access-control-allow-origin']
          );
          unlink(extraFile);
        }),
        server = http.createServer(tinyCDN({
          etag: 'md5',
          maxAge: 1000
        })).listen(7357, '0.0.0.0', function () {
          var addres = server.address();
          http.get(
            {
              hostname: addres.address,
              port: addres.port,
              path: '/demo/source/lorem-ipsum.txt',
              headers: {
                'accept-encoding': 'gzip,deflate'
              },
              agent: false
            },
            function (response) {
              (data.response = response).on('data', data.push.bind(data));
            }
          ).on('close', done);
        })
      ;
    }
  }, {
    name: 'configuration with gzip compression',
    test: function () {
      var
        url = '/demo/source/lorem-ipsum.txt',
        file = path.resolve(__dirname, '..' + url),
        extraFile = file + '.gzip',
        data = [],
        done = wru.async(function () {
          server.close();
          var
            response = data.response,
            headers = response.headers,
            content = data.join('')
          ;
          wru.assert('the response had a content', content.length);
          wru.assert('the status was 200', response.statusCode === 200);
          wru.assert('the headers were correct',
            headers['x-served-by'] === 'tinyCDN' &&
            headers['content-type'] === 'text/plain' &&
            headers['content-length'] === fs.statSync(extraFile).size.toString() &&
            !headers['etag'] &&
            !headers['cache-control'] &&
            headers['content-encoding'] === 'gzip' &&
            !headers['access-control-allow-origin']
          );
          unlink(extraFile);
        }),
        server = http.createServer(tinyCDN({
          compression: 'speed'
        })).listen(7357, '0.0.0.0', function () {
          var addres = server.address();
          http.get(
            {
              hostname: addres.address,
              port: addres.port,
              path: '/demo/source/lorem-ipsum.txt',
              headers: {
                'accept-encoding': 'deflate,gzip'
              },
              agent: false
            },
            function (response) {
              (data.response = response).on('data', data.push.bind(data));
            }
          ).on('close', done);
        })
      ;
    }
  }, {
    name: 'configuration with deflate compression',
    test: function () {
      var
        url = '/demo/source/lorem-ipsum.txt',
        file = path.resolve(__dirname, '..' + url),
        extraFile = file + '.deflate',
        data = [],
        done = wru.async(function () {
          server.close();
          var
            response = data.response,
            headers = response.headers,
            content = data.join('')
          ;
          wru.assert('the response had a content', content.length);
          wru.assert('the status was 200', response.statusCode === 200);
          wru.assert('the headers were correct',
            headers['x-served-by'] === 'tinyCDN' &&
            headers['content-type'] === 'text/plain' &&
            headers['content-length'] === fs.statSync(extraFile).size.toString() &&
            !headers['etag'] &&
            !headers['cache-control'] &&
            headers['content-encoding'] === 'deflate' &&
            !headers['access-control-allow-origin']
          );
          unlink(extraFile);
        }),
        server = http.createServer(tinyCDN({
          compression: 'speed'
        })).listen(7357, '0.0.0.0', function () {
          var addres = server.address();
          http.get(
            {
              hostname: addres.address,
              port: addres.port,
              path: '/demo/source/lorem-ipsum.txt',
              headers: {
                'accept-encoding': 'deflate'
              },
              agent: false
            },
            function (response) {
              (data.response = response).on('data', data.push.bind(data));
            }
          ).on('close', done);
        })
      ;
    }
  }, {
    name: 'configuration with etag and compression',
    test: function () {
      var
        url = '/demo/source/lorem-ipsum.txt',
        file = path.resolve(__dirname, '..' + url),
        extraFile = file + '.gzip',
        data = [],
        done = wru.async(function () {
          server.close();
          var
            response = data.response,
            headers = response.headers,
            content = data.join('')
          ;
          wru.assert('the response had a content', content.length);
          wru.assert('the status was 200', response.statusCode === 200);
          wru.assert('the headers were correct',
            headers['x-served-by'] === 'tinyCDN' &&
            headers['content-type'] === 'text/plain' &&
            headers['content-length'] === fs.statSync(extraFile).size.toString() &&
            headers['etag'] === 'e5d101bcbc89a02ef7d1da8aea6fae9d' &&
            headers['cache-control'] &&
            headers['content-encoding'] === 'gzip' &&
            !headers['access-control-allow-origin']
          );
          unlink(extraFile);
          unlink(extraFile + '.md5');
        }),
        server = http.createServer(tinyCDN({
          compression: 'speed',
          etag: 'md5'
        })).listen(7357, '0.0.0.0', function () {
          var addres = server.address();
          http.get(
            {
              hostname: addres.address,
              port: addres.port,
              path: '/demo/source/lorem-ipsum.txt',
              headers: {
                'accept-encoding': 'deflate,gzip'
              },
              agent: false
            },
            function (response) {
              (data.response = response).on('data', data.push.bind(data));
            }
          ).on('close', done);
        })
      ;
    }
  }, {
    name: 'configuration with etag, compression, and origin',
    test: function () {
      var
        random = Math.random(),
        url = '/demo/source/lorem-ipsum.txt',
        encoding = 'deflate',
        file = path.resolve(__dirname, '..' + url),
        extraFile = file + '.' + encoding,
        data = [],
        done = wru.async(function () {
          server.close();
          var
            response = data.response,
            headers = response.headers,
            content = data.join('')
          ;
          wru.assert('the response had a content', content.length);
          wru.assert('the status was 200', response.statusCode === 200);
          wru.assert('the headers were correct',
            headers['x-served-by'] === 'tinyCDN' &&
            headers['content-type'] === 'text/plain' &&
            headers['content-length'] === fs.statSync(extraFile).size.toString() &&
            headers['etag'] === '5ff49fbd6fde427919c12608c473826a' &&
            headers['cache-control'] &&
            headers['content-encoding'] === encoding &&
            headers['access-control-allow-origin'] === '' + random
          );
          unlink(extraFile);
          unlink(extraFile + '.md5');
        }),
        server = http.createServer(tinyCDN({
          compression: 'speed',
          etag: 'md5',
          accessControlAllowOrigin: random
        })).listen(7357, '0.0.0.0', function () {
          var addres = server.address();
          http.get(
            {
              hostname: addres.address,
              port: addres.port,
              path: '/demo/source/lorem-ipsum.txt',
              headers: {
                'accept-encoding': encoding
              },
              agent: false
            },
            function (response) {
              (data.response = response).on('data', data.push.bind(data));
            }
          ).on('close', done);
        })
      ;
    }
  }, {
    name: 'different source and destination foolder',
    test: function () {
      var
        url = '/demo/source/lorem-ipsum.txt',
        file = path.resolve(__dirname, '..' + url),
        destFile = file.replace('source', 'dest') + '.raw.md5',
        data = [],
        done = wru.async(function () {
          server.close();
          var
            response = data.response,
            headers = response.headers,
            content = data.join('')
          ;
          wru.assert('the response had a content', content.length);
          wru.assert('the status was 200', response.statusCode === 200);
          wru.assert('the headers were correct',
            headers['x-served-by'] === 'tinyCDN' &&
            headers['content-type'] === 'text/plain' &&
            headers['content-length'] === fs.statSync(file).size.toString()
          );
          wru.assert('the etag was created in the right place', fs.existsSync(destFile));
          unlink(destFile);
        }),
        server = http.createServer(tinyCDN({
          etag: 'md5',
          source: 'demo/source',
          dest: 'demo/dest/'
        })).listen(7357, '0.0.0.0', function () {
          var addres = server.address();
          http.get(
            {
              hostname: addres.address,
              port: addres.port,
              path: '/lorem-ipsum.txt',
              headers: {
                'accept-encoding': 'gzip,deflate'
              },
              agent: false
            },
            function (response) {
              (data.response = response).on('data', data.push.bind(data));
            }
          )
          .on('close', done);
        })
      ;
    }
  }
]);



        /*
        configured = tinyCDN({
          compression: 'speed',
          etag: 'md5',
          maxAge: 1000,
          maxListeners: 5,
          source: '../demo/source',
          dest: '../demo/dest',
          accessControlAllowOrigin: '*',
          errors: 0,
          responses: 0,
          onError: function () {
            configured.errors++;
          },
          onResponse: function () {
            configured.responses++;
          }
        }),
        */