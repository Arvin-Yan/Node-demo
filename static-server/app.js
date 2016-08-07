'use strict'

const http = require('http'),
      fs = require('fs'),
      path = require('path'),
      url = require('url'),
      ejs = require('ejs'),
      zlib = require('zlib'),
      mime = require('./src/mime.json'),
      tpl = fs.readFileSync('./views/directory.ejs');

let server = http.createServer((req, res)=>{
    let pathName = url.parse(req.url).pathname,
        realPath = path.join(__dirname, pathName);
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
            let extension = path.extname(pathName).replace('.', ''),
                fileType = mime[extension] || 'text/plain',
                acceptEnconding = req.headers['accept-encoding'] || '',
                compressible = extension.match(/css|html|js|json|md|txt/ig),
                cacheable = extension.match(/gif|png|jpg|css|js/ig);
            res.setHeader('content-type', fileType);

            if(cacheable) {
                // let expires = new Date();
                // expires.setTime(expires.getTime() + 30*24*60*60*1000); //一个月后失效
                // res.setHeader('Expires',expires.toUTCString());
                res.setHeader("Cache-Control", "max-age=" + 60 * 60 * 24 * 30 * 1000);

                let lastModified = stats.mtime.toUTCString();
                res.setHeader('last-modified', lastModified);

                let isExsits = req.headers['if-modified-since'],
                    isEqual = lastModified == req.headers['if-modified-since'];
                if(isExsits && isEqual){
                    res.statusCode = 304;
                }
            }

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

        }
    })
});

server.listen(process.argv[2] || '80', function(){
    console.log(`server listen on port 80`);
})
