import { mkdir, cp, writeFile } from 'node:fs/promises';
const source=new URL('../web/',import.meta.url), target=new URL('../dist/',import.meta.url);
await mkdir(target,{recursive:true});await cp(source,target,{recursive:true});
const base=process.env.API_BASE_URL||'';
if(base){const u=new URL(base);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('API_BASE_URL must be an HTTPS origin without credentials.');}
await writeFile(new URL('runtime-config.js',target),`// Public configuration; never include secrets.\nwindow.NAVIGATOR_CONFIG = ${JSON.stringify({apiBase:base})};\n`);
await writeFile(new URL('.nojekyll',target),'');
console.log('Static web built in dist/. No server secrets were included.');
