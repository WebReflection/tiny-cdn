# tiny-cdn
A tiny static files serving handler
[![build status](https://secure.travis-ci.org/WebReflection/tiny-cdn.svg)](http://travis-ci.org/WebReflection/tiny-cdn)

This script is entirely based on [holdon](https://github.com/WebReflection/holdon) potentials.


## API
It's rather about what you want to configure for your `tiny-cdn`,
so here an object  description:


```js
var tinyCDN = require('./tiny-cdn').create({


  // where are original files ?
  source: './source',


  // where should ETags and Compressed files be stored ?
  dest: './dest',


  // optional, if specified will create
  // gzip and deflate version of every request
  // in case the requesting UA is compatible.
  //
  // If specified as string,
  // it can be one of these values:
  //    best     // best compression
  //    speed    // fastest compression
  //    default  // default compression
  //    no       // no compression ( kinda pointeless )
  //
  // If specified as number,
  // it could be an integer from 1 to 9
  // that will mirror the compression level
  // accordingly with current zlib API compression values
  compression: 'best',


  // optional, if specified will create
  // an etag related file per each request kind
  // (raw, gzip, deflate)
  // it can be any valid crypt hash
  // and by default it will be the sha256 one
  etag: 'sha256',


  // optional, if specified will limit
  // the amount of connection that cpould be piped
  // as streams when any file is served
  maxListeners: Infinity,


  // optional, if specified will define
  // the masimum age any  ETag should last
  maxAge: 30672000,


  // optional, if set every file will send
  // the Access-Control-Allow-Origin header
  // with the specified value
  accessControlAllowOrigin: '*',


  // optional, if specified will define
  // the Not Found content per each page
  // served accordingly with common readind standards
  404: {

    // either html or HTML, could be any HTML page
    html: 'Not Found',
    // or
    HTML: 'Not Found',

    // either json or JSON, could be any JSON
    json: '{"error":"Not found"}',
    // or
    JSON: '{"error":"Not found"}',

    // either txt or TXT, could be any TXT
    txt: 'Not Found',
    // or
    TXT: 'Not Found'
  },


  // optional, if specified will be invoked
  // every time an erro occurs.
  // by default tinyCDN will take care of everything
  onError: function (
    // the error that triggered this callback
    err,
    // the requested url that generated the error
    url,
    // the list of requestes waiting for a response.
    // do not use an error handler if you don't have
    // a good way to serve failures.
    // Use simply `onResponse` handler instead
    // to be notified, if that's what you are looking for
    held
  ) {
    // do your stuff here ...
  },


  // optional, if specified will be invoked
  // every time a request completes.
  // It will eventually provide the error object
  // and the url as second argument.
  // But there won't be anything to do once this triggers
  onResponse: function (
    // the error, if any, that happened while serving
    err,
    // the url that successfully, eventually, got delivered
    url
  ) {
    // do your stuff here ...
  }
});
```


### License
```
Copyright (C) 2015 by Andrea Giammarchi - @WebReflection

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```