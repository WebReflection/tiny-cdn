require('http')
  .createServer(require('./tiny-cdn').create({
    accessControlAllowOrigin: '*',
    source: './demo/source',
    dest: './demo/dest'
    , compression: 'best'
    , etag: 'sha256'
    // , onError: function () { console.log(arguments); }
    // , onResponse: function () { console.log(arguments); }
  }))
  .listen(7357, '0.0.0.0')
;
console.log("Basic app is running at http://localhost:7357");