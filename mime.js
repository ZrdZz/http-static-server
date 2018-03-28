const path = require('path');

const mime = {
    "css": "text/css",
    "gif": "image/gif",
    "html": "text/html",
    "ico": "image/x-icon",
    "jpeg": "image/jpeg",
    "txt": "text/plain"  
}

function Mime(filename){
    let ext = path.extname(filename);
    ext = ext.split('.').pop();
    return mime[ext] || mime['txt']
}

module.exports = Mime