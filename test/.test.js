var
  fs = require('fs'),
  path = require('path'),
  spawn = require('child_process').spawn,
  modules = path.join(__dirname, '..', 'node_modules', 'wru', 'node', 'program.js'),
  tests = [],
  ext = /\.js$/,
  many = 0
;

fs.readdirSync(__dirname).filter(function(file){
  if (ext.test(file) && file !== path.basename(__filename)) {
    tests.push(file.replace(ext, ''));
    spawn(
      'node', [modules, path.join('test', file)], {
      detached: false,
      stdio: [process.stdin, process.stdout, process.stderr]
    });
  }
});