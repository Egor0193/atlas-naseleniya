import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = {'.html':'text/html', '.css':'text/css','.js':'text/javascript','.csv':'text/csv','.svg':'image/svg+xml'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    const path = resolve(root,'.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(resolve(root) + sep)) throw Error();
    const body = await readFile(path);
    res.writeHead(200,{'Content-Type':(mime[extname(path)] || 'application/octet-stream') + '; charset=utf-8'}).end(body);
  } catch { res.writeHead(404).end('404'); }
}).listen(8000,'127.0.0.1',()=>console.log('Откройте http://127.0.0.1:8000'));
