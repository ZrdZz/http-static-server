# http-static-server

编写静态资源服务器练习node

### 读取静态文件

请求过来以后先判断是否有斜杠                                                                                                      
有斜杠, 判断是否为目录, 是目录则判断是否有默认页, 有则输出; 无则输出目录                                                 
无斜杠, 但是是目录, 则重定向

### 缓存

设置`Expires`和`Cache-Control`来验证强缓存, 设置`Last-Modified`、`ETag`来验证协商缓存。

发送请求时, 会先检查`Expires`和`Cache-Control`来验证是否命中强缓存, 若命中则返回200 OK (from disk cache); 没有命中则向服务器发送请求, 通过比较`Last-Modified`和`If-Modified-Since`、`ETag`和`If-None-Match`来验证是否命中协商缓存, 命中则返回304, 没有则返回200 OK。

### 压缩

浏览器发送请求时会携带`Accept-Encoding`, 表示浏览器支持的压缩格式。                                                                 
服务器收到请求后, 会查看`Accept-Encoding`, 并且支持该压缩类型, 就会压缩实体主体(不压缩头部, http2会压缩), 并设置`Content-Encoding`。
浏览器收到响应, 按照`Content-Encoding`指定的格式解压文件。

### 范围请求

服务端响应添加`Accept-Ranges`(值通常为bytes), 表示接受范围请求。                                                  
客户端发送请求时添加`ranges`, 告诉服务器请求一个范围。                                                                    
服务器收到请求后, 若范围有效返回206, 并发送指定内容, 在`Content-Range`中指定范围, 若无效则返回416, 在`Content-Range`中指定可接受范围。

