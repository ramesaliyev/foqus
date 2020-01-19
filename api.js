const http = require('http');

const API_PORT = process.env.API_PORT || 8990;

function onRequest(req, res) {
  console.log(`API: ${req.url}`);

  res.end('Hi from API');
}

function onError(err) {
  throw err;
}

function onListen(err) {
  if (err) {
    throw err;
  }

  console.log(`Foqus APIServer started. PORT:${API_PORT}`);
}

const apiServer = http.createServer();

apiServer.on('request', onRequest);
apiServer.on('error', onError);

apiServer.listen(API_PORT, onListen);