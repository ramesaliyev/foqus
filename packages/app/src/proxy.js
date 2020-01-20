const http = require('http');
const httpProxyServer = require('./http-proxy');
const httpsProxyServer = require('./https-proxy');

const PROXY_PORT = process.env.PROXY_PORT || 8991;

function onRequest(req, res) {
  return httpProxyServer(req, res);
}

function onConnect(req, clientSocket, head) {
  return httpsProxyServer(req, clientSocket, head);
}

function onError(err) {
  throw err;
}

function onListen(err) {
  if (err) {
    throw err;
  }

  console.log(`Foqus ProxyServer started. PORT:${PROXY_PORT}`);
}

const proxyServer = http.createServer();

proxyServer.on('request', onRequest);
proxyServer.on('connect', onConnect);
proxyServer.on('error', onError);

proxyServer.listen(PROXY_PORT, onListen);