var
  path = require('path'),
  compression = require('compression'),
  express = require('express'),
  app = express();
;

app.set('port', 7357);

app.use(compression());
app.use('/', express.static(path.join(__dirname, 'demo', 'source')));

app.listen(app.get('port'), function() {
  console.log("Node app is running at http://localhost:" + app.get('port'));
});