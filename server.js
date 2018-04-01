const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const zlib = require('zlib');
const config = require('./config');
const Mime = require('./mime');

class StaticServer {
    constructor() {
        this.port = config.port;
        this.root = config.root;
        this.indexPage = config.indexPage;
        this.cacheControl = config.cacheControl;
        this.expires = config.expires;
        this.lastModified = config.lastModified;
        this.etag = config.etag;
        this.maxAge = config.maxAge;
        this.zipMatch = config.zipMatch;
    }

    start() {
        const server = http.createServer((req, res) => {
            const filePath = path.join(this.root, path.normalize(req.url));

            this.handleRouter(filePath, req, res);

        }).listen(this.port, err => {
            if (err) {
                console.error(err);
                console.info('Failed to start server');
            } else {
                console.info(`Server started on port ${this.port}`);
            }
        })
    }

    //判断文件是否存在, 并作出相应
    /**
     * 先判断尾部是否有斜杠
     * 1. 有斜杠, 则认为是目录
     *    目录存在, 判断其中是否有默认页面, 有则输出, 无则输出目录
     * 2. 没有斜杠, 则认为是文件
     *    文件存在, 发送文件; 文件不存在, 判断是否是目录, 若是, 则重定向
     */
    handleRouter(filePath, req, res) {
        fs.stat(filePath, (err, stat) => {
            if (!err) {
                let strArr = req.url.split('/')
                //尾部有斜杠, 认为用户请求的是目录
                if (strArr[strArr.length - 1] === '' && stat.isDirectory()) {
                    this.responseDirectory(filePath, req, res);

                    //没有斜杠但是是目录, 需要重定向
                } else if (stat.isDirectory()) {
                    this.responseDirection(filePath, req, res);
                } else {
                    this.response(filePath, req, res);
                }
            } else {
                this.responseNotFound(res);
            }
        })
    }

    response(filePath, req, res) {
        fs.stat(filePath, (err, stat) => {
            if (!err) {
                this.setCache(res, stat);

                //判断缓存是否新鲜
                if (this.isFresh(req, res)) {
                    this.responseNotModified(res);
                } else {
                    this.responseFile(filePath, req, res);
                }
            } else {
                this.responseNotFound(res);
            }
        })
    }

    responseDirectory(filePath, req, res) {
        let dir = fs.readdirSync(filePath);

        //判断目录中是否有默认页面
        if (dir[this.indexPage]) {
            this.responseFile(filePath + this.indexPage, req, res);
        } else {
            let body = '';
            dir.forEach(function (item) {
                let itemPath = path.join(req.url, item);
                let stat = fs.statSync(filePath + item);

                //给子目录后面添加斜杠, 防止重定向
                if (stat.isDirectory()) {
                    itemPath = path.join(itemPath, '/');
                }
                body += `<a href= ${itemPath}> ${item} </a> <br />`
            })
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(body);
        }
    }

    responseFile(filePath, req, res) {
        let acceptEncoding = req.headers['accept-encoding'],
            ext = path.extname(filePath),
            readStream = null;

        res.setHeader('Accept-Ranges', 'bytes');

        let stat = fs.statSync(filePath);
        if(req.headers['ranges']){
            readStream = this.rangeRequest(filePath, req.headers['ranges'], stat.size, res);
        }else{
            readStream = fs.createReadStream(filePath);
        }

        //判断是否要进行压缩
        if(ext.match(this.zipMatch)){
            if(acceptEncoding.match(/\bgzip\b/)){
                res.writeHead(200, {'Content-Encoding': 'gzip', 'Content-Type': Mime(filePath)});
                readStream.pipe(zlib.createGzip()).pipe(res);
            }else if(acceptEncoding.match(/\bdeflate\b/)){
                res.writeHead(200, {'Content-Encoding': 'deflate', 'Content-Type': Mime(filePath)});
                readStream.pipe(zlib.createDeflate()).pipe(res);
            }
        }else{
            res.writeHead(200, {'Content-Type': Mime(filePath)});
            readStream.pipe(res);
        }
    }

    responseDirection(filePath, req, res){
        let location = path.join(req.url, '/');
        res.writeHead(301, {
            'Location': location
        });
        res.end();
    }

    responseNotFound(res) {
        res.writeHead(404, {
            'Content-Type': 'text/html'
        });
        res.end('<h1>Not Found</h1>');
    }

    responseNotModified(res) {
        res.writeHead(304, {
            'Content-Type': 'text/html'
        });
        res.end();
    }

    setCache(res, stat) {
        if (this.expires) {
            const expirestime = new Date(Date.now() + (this.maxAge * 1000)).toUTCString();
            res.setHeader('Expires', expirestime);
        }

        if (this.cacheControl) {
            res.setHeader('Cache-Control', [`max-age=${this.maxAge}`]);
        }

        if (this.etag) {
            res.setHeader('ETag', stat.size);
        }

        if (this.lastModified) {
            res.setHeader('Last-Modified', stat.mtime.toUTCString());
        }
    }

    isFresh(req, res) {
        let ifModifiedSince = req.headers['if-modified-since'];
        let ifNoneMatch = req.headers['if-none-match'];

        if (!(ifModifiedSince || ifNoneMatch)) {
            return false
        }

        //先验证ETag, 比时间更准确
        if (ifNoneMatch && (ifNoneMatch === res.getHeader('ETag'))) {
            return true
        }

        if (ifModifiedSince && (ifModifiedSince === res.getHeader('Last-Modified'))) {
            return true
        }

        return false
    }

    rangeRequest(filePath, range, size, res){
        let range = this.getRange(range, size);
        if(range.start > size || range.end < size || range.start > range.end){
            res.writeHead(416, {'Content-Range': `bytes */${size}`});
            res.end();
            return
        }else{
            res.writeHead(206, {'Content-Range': `bytes ${range.start}-${range.end}/${size}`});
            return fs.createReadStream(filePath, {start: range.start, end: range.end});
        }
    }

    getRange(range, size){
        let matchRange = range.match(/bytes=([0-9]*)-([0-9]*)/);
        let start = parseInt(matchRange[0]),
            end = parseInt(matchRange[1]);
        
        if(isNaN(start) && !isNaN(end)){
            start = size - end;
            end = size - 1;
        }else if(!isNaN(start) && isNaN(end)){
            end = size - 1;
        }

        return {start, end}
    }
}

module.exports = StaticServer
