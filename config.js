const path = require('path');

const config = {
    port: 3000,
    root: path.resolve(__dirname, '..'),
    indexPage: 'index.html',
    cacheControl: true,
    expires: true,
    lastModified: true,
    etag: true,
    maxAge: 5,
    zipMatch: /css|js|html/ig   //判断需要压缩的文件, 图片本身已经压缩, 无须再压缩
}

module.exports = config