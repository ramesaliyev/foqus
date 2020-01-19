const http = require('http');

function proxyHttpRequest(req, res) {
  const {url, headers, method} = req;
  const {host} = headers;

  // Simply return whatever you want.

  console.log(`HTTP: ${method} ${url}`);

  const proxyReq = http.request({
    host, method, headers, port: 80, path: url
  });

  proxyReq.on('response', proxyRes => {
    proxyRes.on('data', chunk => {
      res.write(chunk, 'binary');
    });

    proxyRes.on('end', () => {
      res.end();
    });

    res.writeHead(
      proxyRes.statusCode,
      proxyRes.headers
    );
  });

  proxyReq.on('error', err => {
    console.log(`HTTP:ERROR ${method} ${url}`, err.message);

    res.writeHead(500, {});
    res.end();
  });

  req.on('data', chunk => {
    proxyReq.write(chunk, 'binary');
  });

  req.on('end', () => {
    proxyReq.end();
  });
}

module.exports = proxyHttpRequest;