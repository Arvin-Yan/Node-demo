### 使用原生NodeJS，搭建的一个静态资源服务器。
#### 该服务器思路简单，功能明确，启动服务后，可在浏览器查看本地的文件，并兼顾了压缩和缓存的功能。
### 启动
``` node app.js 8080```
默认监听80端口，也可以自己指定端口，上面监听的是8080端口

### 大致流程
用到的模块
```
const http = require('http'),
      fs = require('fs'),
      path = require('path'),
      url = require('url'),
      ejs = require('ejs'),
      zlib = require('zlib');
```
首先使用http模块创建一个http服务
```
let server = http.createServer((req, res)=>{
    //
}
```
使用url模块的parse方法拿到文件（夹）的相对路径，path模块的join方法
拼装出该文件（夹）在本地的绝对路径
```
let pathName = url.parse(req.url).pathname,
    realPath = path.join(__dirname, pathName);
```
fs模块的stat方法读取该绝对路径，并在回调函数中判断其是文件还是文件夹，
若是文件，则直接创建一个可读流，将该文件pipe到res，显示出来。若是文件夹，
则使用fs.readdirSync方法拿到该文件夹下的所有文件（夹）名，并利用ejs模块渲染。
```
fs.stat(realPath, (err, stats)=>{
    if(err){
        res.writeHead(404,{
            'content-type':'text/html'
        });
        res.end('404');
    }
    if(stats.isDirectory()){
        let file = fs.readdirSync(realPath);
        let content = ejs.render(tpl.toString(), {
            data:{
                path: path.join(pathName, '/'),
                file: file
            }
        });
        res.end(content);
    }
    else{
        fs.createReadStream(realPath).pipe(res);
    }
}
```
到这里，一个最简单静态资源服务器就基本成型了，我们再给它加入压缩和缓存的功能。
当在上一步中判断出是一个文件以后，可进一步判断该文件是否是可压缩的可缓存的，此Demo中
只列举了几种常见的可压缩可缓存的文件类型。
首先，得到文件的文件类型，并设置响应头
```
let extension = path.extname(pathName).replace('.', ''),
    fileType = mime[extension] || 'text/plain';
res.setHeader('content-type', fileType);    
```
判断该文件是否可压缩可缓存
```
let compressible = extension.match(/css|html|js|json|md|txt/ig),
    cacheable = extension.match(/gif|png|jpg|css|js/ig);
```
若文件支持缓存，则进行缓存处理。此处没有使用expires，而是用了max-age代替expires。并使用
last-modified和if-modified-since进一步判断缓存是否过期。
```
if(cacheable) {
    res.setHeader("Cache-Control", "max-age=" + 30 * 24 * 60 * 60 * 1000);  //一个月后过期

    let lastModified = stats.mtime.toUTCString();
    res.setHeader('last-modified', lastModified);

    let isExsit = req.headers['if-modified-since'],
        isEqual = lastModified == req.headers['if-modified-since'];
    if(isExsit && isEqual){
        res.statusCode = 304;
    }
}
```
最后，对支持压缩的文件进行压缩。gzip和deflate是最常见的两种方式。
```
    if(compressible && acceptEnconding.match(/\bgzip\b/ig)){
        res.setHeader('content-encoding','gzip');
        fs.createReadStream(realPath).pipe(zlib.createGzip()).pipe(res);
    }
    else if(compressible && acceptEnconding.match(/\ddeflate\b/ig)){
        res.setHeader('content-encoding','deflate');
        fs.createReadStream(realPath).pipe(zlib.createGzip()).pipe(res);
    }
    else{
        fs.createReadStream(realPath).pipe(res);
    }
```   
