const URL = require('url');
const net = require('net');

function proxyHttpsRequest(req, clientSocket, head) {
  const {url, method} = req;
  const {port, hostname} = URL.parse(`//${url}`, false, true);

  console.log(`HTTPS: ${method} ${url}`);

  // if (!req.headers['proxy-authorization']) { // here you can add check for any username/password, I just check that this header must exist!
  //   clientSocket.write([
  //     'HTTP/1.1 407 Proxy Authentication Required',
  //     'Proxy-Authenticate: Basic realm="proxy"',
  //     'Proxy-Connection: close',
  //   ].join('\r\n'))
  //   clientSocket.end('\r\n\r\n')  // empty body
  //   return;
  // }

  // Forward request to localhost https server with correct ssl.

  if (!hostname || !port) {
    clientSocket.end('HTTP/1.1 400 Bad Request\r\n')
    clientSocket.destroy()
    return;
  }

  const serverSocket = net.connect(port, hostname);

  clientSocket.on('error', err => {
    console.log(`HTTP:CLIENTERROR ${method} ${url}`, err.message);
    serverSocket && serverSocket.end()
  })

  clientSocket.on('end', () => {
    serverSocket && serverSocket.end()
  })

  serverSocket.on('error', (err) => {
    console.log(`HTTP:SERVERERROR ${method} ${url}`, err.message);
    clientSocket && clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`);
  });

  serverSocket.on('end', () => {
    clientSocket && clientSocket.end(`HTTP/1.1 500 External Server End\r\n`)
  });

  serverSocket.on('connect', () => {
    clientSocket.write([
      'HTTP/1.1 200 Connection Established',
      'Proxy-agent: Node-VPN',
    ].join('\r\n'));

    clientSocket.write('\r\n\r\n') // empty body

    // "blindly" (for performance) pipe client socket and destination socket between each other
    serverSocket.pipe(clientSocket, {end: false});
    clientSocket.pipe(serverSocket, {end: false});
  });
}

module.exports = proxyHttpsRequest;