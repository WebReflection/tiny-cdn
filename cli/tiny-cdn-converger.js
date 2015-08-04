'use strict'; // (C) Andrea Giammarchi

var
  cluster = require('cluster'),
  i = 0
;

// https://gist.github.com/WebReflection/4327762cb87a8c634a29
function slice() {
  for (var
    o = +this,                // offset
    i = o,                    // start index
    l = arguments.length,     // length
    n = l - o,                // new length
    a = Array(n < 0 ? 0 : n); // new Array
    i < l; i++
  ) a[i - o] = arguments[i];
  return a;
}

function uid(prefix) {
  return prefix.concat(':', ++i, Math.random());
}

module.exports = cluster.isMaster ?
  (function () {

    return function Converger(options) {
      function handler(message) {
        if (message.type === 'converger' && message.action in self) {
          message.arguments.push(function () {
            message.arguments = [message.uid];
            message.arguments.push.apply(message.arguments, arguments);
            cluster.workers[message.worker].send(message);
          });
          self[message.action].apply(self, message.arguments);
        }
      }
      var self = this, k;
      for (k in options) {
        self[k] = options[k];
      }
      cluster.on('online', function (worker) {
        worker.on('message', handler);
      });
    };

  }()) :
  (function (worker) {

    function createMethod(action, method) {
      return typeof method === 'function' ?
        function () {
          var
            self = this,
            id = uid(action),
            args = slice.apply(0, arguments),
            callback = args.pop() || Object
          ;
          worker.once(id, function () {
            callback.apply(self, arguments);
          });
          process.send({
            type: 'converger',
            worker: worker.id,
            uid: id,
            action: action,
            arguments: args
          });
        } :
        method
      ;
    }

    worker.on('message', function (message) {
      if (message.type === 'converger') {
        worker.emit.apply(worker, message.arguments);
      }
    });

    return function Converger(options) {
      for (var k in options) {
        this[k] = createMethod(k, options[k]);
      }
    };

  }(cluster.worker))
;