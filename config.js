const path = require('path');

const config = {
    port: 3000,
    root: path.resolve(__dirname, '..'),
    indexPage: 'index.html',
    cacheControl: true,
    expires: true,
    lastModified: true,
    etag: true,
    maxAge: 5000
}

module.exports = config