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
                let encoding = contentType['Content-Type'] === 'text/*' ? 'utf-8' : 'binary';
                getFileData(url, {
                    encoding: encoding,
                }).then(data => {
                    response.write(data);
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


const getFileData = (url = __dirname, option = {}) => {
    const rs = fs.createReadStream(url);
    return new Promise((resolve, reject) => {
        let tempData = [];
        rs.on('data', chunk => {
            tempData.push(chunk);
        });
        rs.on('end', () => {
            let str;
            if (option.encoding === 'binary') {
                str = Buffer.concat(tempData);
            } else {
                str = tempData.join('');
            }
            resolve(str);
        });
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
    let contentType = '';
    switch (type) {
        case '.jpg':
        case '.png':
        case '.gif':
        case '.ico':
        {
            contentType = 'image/' + type.slice(1);
            break;
        }
        case '.avi':
        case '.mp4':
        case '.mpg':
        case '.wmv':
        {
            contentType = 'video/' + type.slice(1);
            break;
        }
        default:
        {
            contentType = 'text/*';
        }
    }
    // response.setHeader('Content-Type', contentType);
    return {
        'Content-Type': contentType
    };
};

server.listen(3000);