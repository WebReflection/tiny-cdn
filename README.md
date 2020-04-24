# Deprecated

Check the new, 100% code covered, **[µcdn](https://github.com/WebReflection/ucdn#readme)** instead 👍

## tiny-cdn [![build status](https://secure.travis-ci.org/WebReflection/tiny-cdn.svg)](http://travis-ci.org/WebReflection/tiny-cdn)

A tiny static files serving handler


### About
This module has been developed on top of [holdon](https://github.com/WebReflection/holdon) utility.

While this script is the fastest on Internet of Things devices such Arduino Yun or Raspberry PI, it has also been tested on regular servers and it has demonstrated to be both reliable and on average 2X or more faster than common nodejs solutions.



#### How to install
```
npm install -g tiny-cdn
```


## The Module API
Used as module, `tiny-cdn` exports a function with a public `.create` method which is simply an alternative way to invoke the module.

The function will return a function usable as serving middle-ware.

```js
var
  tinyCDN = require('./tiny-cdn'),
  siteCDN = tinyCDN({ ..configuration object ..})
;
require('http')
  .createServer(function (request,  response) {
    if (/^\/(?:js|css|img|assets)/.test(request.url)) {
      siteCDN(request,  response);
    } else {
      // dynamic content generation in here
    }
  })
  .listen(8080, '0.0.0.0')
;
```

If the purpose of the machine is to serve static files only, this is also possible.
```js
require('http')
  .createServer(require('./tiny-cdn').create({
    // the configuration object
  }))
  .listen(8080, '0.0.0.0');
```


#### The Configuration Object
`tinyCDN({...})` function accepts a configuration object.
Following a description of all accepted properties:

```js
var tinyCDN = require('./tiny-cdn').create({


  // where are original files ?
  // this should be the root of client requests
  // as example, /js/main.js should be a file
  // originally saved in ./source/js/main.js
  // the folder does not have to be publicly reachable
  source: './source',


  // where should ETags and Compressed files be stored ?
  // this folder will be populated with respective etags
  // per each requested file and their gzip or deflate version
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

  // optional, if specified will activate compression
  // and it will perform it only for the list of known extensions
  // such list can be passed as Array of extensions
  // with values like 'txt' or '.css'
  // by default, if compression is enabled,
  // the list of known files will be the following one
  compress: [
    'js', 'css', 'txt', 'html',
    'svg', 'md', 'htm', 'xml', 'json', 'yml'
  ],

  // optional, if specified will create
  // an etag related file per each request kind
  // (raw, gzip, deflate)
  // it can be any valid crypt hash
  // and by default it will be the sha256 one
  etag: 'sha256',


  // optional, if specified will limit
  // the amount of connection that cpould be piped
  // as streams when any file is served
  maxListeners: Infinity, // as deafault


  // optional, if specified will define
  // the masimum age any  ETag should last
  maxAge: 30672000, // as deafault


  // optional, if set every file will send
  // the Access-Control-Allow-Origin header
  // with the specified value
  accessControlAllowOrigin: '', // as deafault


  // if cluster is used and you'd like
  // to not use optimizations made for multiple workers
  // feel free to force this flag to true (false by default)
  ignoreCluster: false, // as deafault

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

## The CLI API
If used directly as executable, `tinyCDN` is capable of creating an *http* or *https* server, pre-build a file and its compressed versions, or generate a configuration JSON/object content to read and test.

```
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
```

#### run examples

This is the minimum requirement to run an http server:

```sh
tiny-cdn run
```
Above snippet will start `tinyCDN` static file serving in the current folder without creating etags or compressed files.
Handy to quickly test some directory content statically.

Please note that point at a generic `/folder/` will automatically check for an `index.html` file within that folder.

Reaching the default shown url will also look for an `index.html` file and  will return a Not Found error if none is provided.


It is possible to specify both source and destination though:
```sh
tiny-cdn run -s=./source -d=./dest
```

To use compression and etags, we can add related flags too:
```sh
tiny-cdn run -s=./source -d=./dest -e -c
```

To use a specific version of the etag or compression
```sh
tiny-cdn run -s=./source -d=./dest -e=md5 -c=speed
```

To specify a different host or port
```sh
tiny-cdn run -s=./source -d=./dest -h=192.168.1.10 -p=4321 -e -c
```

#### build examples
The build flag will create only what will be served to every request accordingly with the configuration  options.

For instannce, assuming we have `source/js/main.js` file in the source folder,
the following command will do basically nothing:
```sh
tiny-cdn -s=./source -d=./dest -b=/js/main.js
```
because neither etag nor compression flag is required.

However, if we use the ETag flag:
```sh
tiny-cdn -s=./source -d=./dest -b=/js/main.js -e
```
the builder will create the file `./dest/js/main.js.raw.sha256` with its ETag content.

Using the compression flag will create both gzip and  deflate version of the file.
```sh
tiny-cdn -s=./source -d=./dest -b=/js/main.js -c
```
Now we'll have also  `./dest/js/main.js.raw.gzip` and `./dest/js/main.js.raw.deflate` files.

Putting everything together will have also `./dest/js/main.js.raw.gzip.sha256` and `./dest/js/main.js.raw.deflate.sha256` files generated.
```sh
tiny-cdn -s=./source -d=./dest -b=/js/main.js -c -e
```

### Running tinyCDN through SSL
If the `-ssl-cert=file.crt` and the `-ssl-key=file.key` are provided, the CLI will create a **https** server instead.
Please note that if you created the certificate using your local network IP address, you might need to specify it as `-h=192.168.1.5` in order to have a link in  console that will point to the authorized page.

Otherwise you can always write down manually that IP address when visiting the CDN.

If you have no idea how to create a certificate, feel free to [read this "How To" page](https://www.webreflection.co.uk/blog/2015/08/08/bringing-ssl-to-your-private-network).

Following an example on how to run SSL and HTTPS server
```bash
./tiny-cdn run \
  -s=source/ \
  -ssl-key=~/.server/192.168.1.5.key \
  -ssl-cert=~/test/https/192.168.1.5.crt \
  -h=192.168.1.5

# will log
# [tinyCDN] running on https://192.168.1.5:7151/
```


#### configuration example
In case you'd like to automatically generate a configuration file for your CDN, or simply read how it looks like, skip `run` and build options and just execute the cli
```sh
tiny-cdn -s=./source -d=./dest -c -e

/* [tinyCDN] */{
  "source": "/home/yourname/cdn/source",
  "dest": "/home/yourname/cdn/dest",
  "compression": "best",
  "etag": "sha256"
}

```
It is helpful to also understand defaults and verify folders.



### tinyCDN and cluster
The main reason tinyCDN is 2X faster is disk access which,
even if executed in an  asynchronous non-blocking way,
is usually repeated per each request.

All common operations like file stats access, runtime etag or gzip compression,
and even piping the output, are performed through a single-request model,
which will serve every other connection that meanwhile asked for the same file.

This is a great model specially on Internet of Things devices, where every
disk operation might have a huge cost, specially the writing one.

When the `cluster` module is in place, we can use every available core to serve our CDN.

This is great, and it works already out of the box with [common solutions](benchmark/express-multi),
however there could be cases where a single file that should be compressed at runtime,
will be asked potentially from different workers.

What usually happens is that each worker will perform the same operation  if the file wasn't there,
unable to know another worker maybe is going to create such file.

Due to the nature of cluster and workers, the holdon module (as it is) cannot coordinate
in a single core requests from every CPU, so here it comes [the converger](cli/tiny-cdn-converger.js),
which role is to be a cluster director.

#### The Converger Utility
This helper does basically one thing: it forces asynchronous methods to be **execute only in Master**,
providing a regular JS looking interface that is transparent to human  eyes.
```js
var
  cluster = require('cluster'),
  fs = require('fs'),
  numCPUs = require('os').cpus().length,
  Converger = require('tiny-cdn').Converger,

  // it should be defined no matter if this is master or worker
  // it will perform in master anyway
  master = new Converger({
    readFile: function (path, onFileRead) {
      // just to be sure we are reading from master
      console.log('reading from ' +
        (cluster.isMaster ? 'Master' : 'Worker'));
      fs.readFile(path, function (err, file) {
        onFileRead(err, err || file.toString());
      });
    }
  })
;

// if we have one CPU there's no  point to fork this process
if (cluster.isMaster && 1 < numCPUs) {
  while (numCPUs--) cluster.fork();
} else {
  // but even with a single CPU we can use Converger as it is
  master.readFile(__filename, function (err, content) {
    // however, if we have multiple cores
    // we will receive data per each of them
    console.log(
      'Read file with length ' + content.length +
      (cluster.isMaster ? '' :
        (' [worker ' + cluster.worker.id + ']'))
    );
  });
}
```

If we run [above example](test/example.converger.js) we'll see this kind of output:
```
reading from Master
reading from Master
reading from Master
reading from Master
Read file with length 1098 [worker 2]
Read file with length 1098 [worker 1]
Read file with length 1098 [worker 3]
Read file with length 1098 [worker 4]
```

Which means the `Converger` instance worked as expected, but we have 4 workers asking for the same file so that
in order to satisfy all of them the system will access and read from scratch each time.

Adding [holdon](https://github.com/WebReflection/holdon#holdon) to this equation will result in less reading operations.
```js
// ...

  // let's hold on readFile
  heldFile = cluster.isMaster ?
    // since we'd like to do this on master only ...
    require('holdon').create(['callback']) : null,

  // it should be defined no matter if this is master or worker
  // it will perform in master anyway
  master = new Converger({
    readFile: function (path, onFileRead) {
      // absolute path is a unique identifier
      if (heldFile.add(path, onFileRead)) {
        // only if added as new record
        console.log('reading from ' +
          (cluster.isMaster ? 'Master' : 'Worker'));
        fs.readFile(path, function (err, file) {
          // per each worker waiting for a result
          heldFile.remove(path).callback.forEach(
            function (callback) {
              // send already processed arguments
              callback.apply(null, this);
            },
            [err, err || file.toString()]
          );
        });
      }
    }
  })

// ...
```

Accordingly with your machine performance, your output should be now like the following one:
```
reading from Master
Read file with length 1603 [worker 1]
Read file with length 1603 [worker 2]
Read file with length 1603 [worker 3]
Read file with length 1603 [worker 4]
```
Where `reading from Master` could happen twice and the workers order could be completely different.
```
reading from Master
reading from Master
Read file with length 1603 [worker 2]
Read file with length 1603 [worker 3]
Read file with length 1603 [worker 1]
Read file with length 1603 [worker 4]
```
In latter case two workers asked in different reading time the same file ... which is OK, it means my machine was that fast (cache).


#### Converger Performance

While this might not look like a huge win on the reading path,
this might actually save your Raspberry PI, as well as your server,
for all cases when you need some runtime operation like compressing
and storing a file or creating its etag.

Those kind of slow operation that specially on SD cards might take "forever".

The **writing** is indeed a wonderful fit for `Converger` which is, together with `holdon` module,
capable of bringing in a very good performance compromise even for IoT projects.

**However**, the serialization channel can be very slow,
and serving files entirely read on a single thread broadcasted
per each worker becomes a bottleneck,  rather than a feature.

Accordingly, beside little content read,  how an ETag could be,
or some little information, as a `fs.Stats` object could contain,
are a good fit for `Converger` pattern but every other reading should be avoided.

The `tinyCDN` strategy when it comes to file serving is to pipe all requests at once
when the read stream is ready, and the etag has been retrieved.

The compression, and the etag generation, is done only once, holding every request.

I also need to better benchmark the get stats path and see if it makes sense to
pass through the channel, or if I could simply use the thread for every read-only opration.



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
