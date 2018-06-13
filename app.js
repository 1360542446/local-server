const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    const url = path.join(__dirname, request.url.slice(1));
    if (request.url.slice(1) === 'favicon.ico') {
        response.end();
        return;
    }
    getTypeOfUrl(url).then(type => {
        switch (type) {
            case 'file':
            {
                let contentType = getContentTypeByFileType(path.extname(request.url), request, response);
                response.setHeader('Content-Type', contentType['Content-Type']);
                response.setHeader('Accept-Ranges', 'bytes');
                sendFileData(url, request, response).then(data => {
                    response.end();
                }).catch(err => {
                    response.statusCode = 404;
                    response.end(err.message);
                });
                break;
            }
            case 'directory':
            {
                getFilesInDir(url, request, response).then(files => {
                    response.end(JSON.stringify(files));
                }).catch(err => {
                    response.statusCode = 404;
                    response.end(err);
                });
                break;
            }
        }
    }).catch(error => {
        response.statusCode = 404;
        response.end(error);
    });
});

const getRequestFileRange = (range, fileSize) => {
    let arr = range.match(/[0-9]+/);
    if (arr.length === 1) {
        return {
            start: Number(arr[0]),
            end: fileSize - 1,
        };
    }
    return {
        start: Number(arr[0]),
        end: Math.max(Number(arr[1]), fileSize - 1),
    };

};

const sendFileData = (url = __dirname, request, response, option = {}) => {
    return new Promise((resolve, reject) => {
        if (request.headers['range']) {
            getFileSize(url, resolve, reject);
        } else {
            resolve();
        }
    }).then(fileSize => {
        if (!fileSize) {
            fs.createReadStream(url).pipe(response);
            return;
        }
        let { start, end } = { ...getRequestFileRange(request.headers['range'], fileSize) };
        response.setHeader('Content-Length', end - start);
        fs.createReadStream(url, {
            'start': start,
            'end': end
        }).pipe(response);
    }).catch(e => {

    });

};

const getFileSize = (url, resolve, reject) => {
    fs.stat(url, (error, stats) => {
        if (error) {
            reject(error);
            return;
        }
        resolve(stats['size']);
    });
};

const getFilesInDir = (url, request, reject) => {
    return new Promise((resolve, reject) => {
        fs.readdir(url, (err, files) => {
            if (err) {
                reject(err.message);
            } else {
                Promise.all(files.map(fileName => {
                    return getTypeOfUrl(path.join(url, fileName)).then(type => {
                        return {
                            type,
                            fileName
                        };
                    });
                })).then(urls => {
                    let obj = urls.reduce((previousValue, currentValue) => {
                        switch (currentValue.type) {
                            case 'file':
                            {
                                let file = previousValue['file'];
                                Array.isArray(file) ? file.push(currentValue.fileName) : previousValue['file'] = [currentValue.fileName];
                                break;
                            }
                            case 'directory':
                            {
                                let directory = previousValue['directory'];
                                Array.isArray(directory) ? directory.push(currentValue.fileName) : previousValue['directory'] = [currentValue.fileName];
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

const getTypeOfUrl = url => {
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


const getContentTypeByFileType = (type) => {
    const mime = require('./mime').mime;
    return {
        'Content-Type': mime[type.slice(1)] || 'text/*'
    };
};

server.listen(3000);