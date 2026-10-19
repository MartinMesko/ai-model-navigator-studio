import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { handleApi } from './api.mjs';
import { memoryLimiter } from './limiter.mjs';

const root=fileURLToPath(new URL('../web/',import.meta.url));
const port=Number(process.env.PORT)||8787,host=process.env.HOST||'127.0.0.1';
const env={...process.env,ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS||`http://127.0.0.1:${port},http://localhost:${port}`};
const limiter=memoryLimiter(env);
const staticFiles=new Set(['/','/index.html','/styles.css','/app.mjs','/core.mjs','/data.mjs','/favicon.svg','/runtime-config.js']);
const mime={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.js':'text/javascript;charset=utf-8','.svg':'image/svg+xml'};
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https: http://127.0.0.1:* http://localhost:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
export const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname.startsWith('/api/')){
      const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:req,duplex:'half'})});
      const response=await handleApi(request,env,limiter);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    if(!['GET','HEAD'].includes(req.method)||!staticFiles.has(url.pathname)){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
    const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
    const content=await readFile(resolve(root,file));
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"Lokálny server zlyhal."}');}
});
server.listen(port,host,()=>console.log(`Navigator Studio: http://${host}:${port}\nAI backend: ${env.OPENAI_API_KEY&&env.APP_ACCESS_TOKEN?'nakonfigurovaný':'čaká na serverové secrets v .env'}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
