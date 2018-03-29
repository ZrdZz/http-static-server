# http-static-server

编写静态资源服务器练习node

### 读取静态文件

请求过来以后先判断是否有斜杠
有斜杠, 判断是否为目录, 是目录则判断是否有默认页, 有则输出; 无则输出目录
无斜杠, 但是是目录, 则重定向

### 缓存

设置`Expires`和`Cache-Control`来验证强缓存, 设置`Last-Modified`、`ETag`来验证协商缓存。

发送请求时, 会先检查`Expires`和`Cache-Control`来验证是否命中强缓存, 若命中则返回200 OK (from disk cache); 没有命中则向服务器发送请求, 通过比较`Last-Modified`和`If-Modified-Since`、`ETag`和`If-None-Match`来验证是否命中协商缓存, 命中则返回304, 没有则返回200 OK。
