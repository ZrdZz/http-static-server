const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const config = require('./config');
const Mime = require('./mime');

class StaticServer{
    constructor(){
        this.port = config.port;
        this.root = config.root;
        this.indexPage = config.indexPage;
    }

    start(){
        const server = http.createServer((req, res) => {
            const filePath = path.join(this.root, path.normalize(req.url));
            
            this.handleRouter(filePath, req, res);
            
        }).listen(this.port, err => {
            if(err){
                console.error(err);
                console.info('Failed to start server');
            }else{
                console.info(`Server started on port ${this.port}`);
            }
        })
    }

    //判断文件是否存在, 并作出相应
    handleRouter(filePath, req, res){
        fs.stat(filePath, (err, stat) => {
            if(!err){                
                let strArr = req.url.split('/')
                console.log(strArr)
                //尾部有斜杠, 认为用户请求的是目录
                if(strArr[strArr.length - 1] === '' && stat.isDirectory()){
                    this.responseDirectory(filePath, req, res);

                //没有斜杠但是是目录, 需要重定向
                }else if(stat.isDirectory()){
                    this.responseDirection(filePath, req, res);
                }else{
                    this.responseFile(filePath, req, res);
                }
            }else{
                this.responseNotFound(req, res);
            }
        })
    }

    responseDirectory(filePath, req, res){
        let dir = fs.readdirSync(filePath);

        //判断目录中是否有默认页面
        if(dir[this.indexPage]){
            this.responseFile(filePath + this.indexPage, req, res);                      
        }else{
            let body = '';
            dir.forEach(function(item){
                body += `<a href= ${req.url}/${item}> ${item} </a> <br />`
            })
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(body);                        
        }       
    }

    responseDirection(filePath, req, res){
        let location = req.url + '/';
        res.writeHead(301, {'Location': location});
        res.end();
    }

    responseFile(filePath, req, res){
        let readStream = fs.createReadStream(filePath);
        res.writeHead(200, {'Content-Type': Mime(filePath)});
        readStream.pipe(res);        
    }

    responseNotFound(req, res){
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.end('<h1>Not Found</h1>');
    }
}

module.exports = StaticServer