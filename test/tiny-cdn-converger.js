var
  cluster = require('cluster'),
  numCPUs = require('os').cpus().length,
  Converger = require('../cli/tiny-cdn-converger.js'),
  invoked = 0,
  result = [],
  basic = new Converger({
    method: function (parameter, resolver) {
      result.push(parameter);
      resolver(cluster.isMaster);
    }
  })
;

while (cluster.isMaster && invoked++ < numCPUs) cluster.fork();

wru.test([
  {
    name: (cluster.isMaster ? '[Master] ' : '  [Worker] ') + 'tiny-cdn-converger',
    test: cluster.isMaster ?
      function () {
        basic.method(123, function (master) {
          wru.assert(master);
        });
        wru.assert('it can invoke as master too', result.shift());
        var done = wru.async(function () {
          wru.assert(result.every(function (num) {
            return this.test(num);
          }, /^\d\.\d+$/));
        });
        (function check() {
          setTimeout(result.length < numCPUs ? check : done, 100);
        }());
      } :
      function () {
        basic.method(Math.random(), wru.async(function (isMaster) {
          wru.assert('Master is master', isMaster);
        }));
      }
  }
]);