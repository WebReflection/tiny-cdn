var
  cluster = require('cluster'),
  fs = require('fs'),
  numCPUs = require('os').cpus().length,
  Converger = require('../cli/tiny-cdn-converger.js'),

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