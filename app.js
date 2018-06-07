const http = require('http');
const fs = require('fs');

const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');
  getFileData(request.url.slice(1), request, response).then(data => {
    console.log(data);
    response.end();
  });
});

const getFileData = (path, request, response) => {
  var rs = fs.createReadStream(path, 'utf-8');
  return new Promise((resolve, reject) => {
    rs.on('data', chunk => {
      response.write(chunk)
    });
    rs.on('end', () => resolve());
  });
}

server.listen(5000);