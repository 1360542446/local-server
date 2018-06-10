const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    const url = path.join(__dirname, request.url.slice(0, 1));
    getTypeOfUrl(url).then(type => {
        switch (type) {
            case 'file': {
                getFileData(url, request, response).then(info => response.end()).catch(err => response.end(err.message));
                break;
            }
            case 'directory': {
                getFilesInDir(url, request, response).then(files => {
                    response.end(JSON.stringify(files));
                }).catch(err => response.end(err));
                break;
            }
        }
    });
});

const getFileData = (url, request, response) => {
    const rs = fs.createReadStream(url, 'utf-8');
    return new Promise((resolve, reject) => {
        rs.on('data', chunk => {
            response.write(chunk);
        });
        rs.on('end', () => resolve('ok!'));
        rs.on('error', err => {
            reject(err.message);
        });
    });
};

const getFilesInDir = (url, request, reject) => {
    return new Promise((resolve, reject) => {
        fs.readdir(url, (err, files) => {
            if (err) {
                reject(err.message);
            } else {
                Promise.all(files.map(fileName => {
                    return new Promise(getTypeOfUrl(path.join(url, fileName)).then(type => {
                        resolve(fileName);
                    }));
                })).then(urls => {
                    let obj = urls.reduce((previousValue, currentValue) => {
                        switch (currentValue) {
                            case 'file': {
                                let file = previousValue['file'];
                                Array.isArray(file) ? file.push(currentValue) : previousValue['file'] = [currentValue];
                                break;
                            }
                            case 'directory': {
                                let directory = previousValue['directory'];
                                Array.isArray(directory) ? directory.push(currentValue) : previousValue['directory'] = [currentValue];
                                break;
                            }
                        }
                        return previousValue;
                    }, {});
                    resolve(obj);
                }).catch(err => reject(err.message));
            }
        });
    });

};

const getTypeOfUrl = (url, request, Response) => {
    return new Promise((resolve, reject) => {
        fs.stat(url, (err, stats) => {
            if (err) {
                reject(err.message);
            } else {
                if (stats.isFile()) {
                    resolve('file');
                } else if (stats.isDirectory()) {
                    resolve('directory');
                }
            }
        });
    });

};

server.listen(3000);