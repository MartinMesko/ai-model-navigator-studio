import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
let count=0;
async function check(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(['node_modules','.git','.wrangler','dist'].includes(entry.name))continue;const path=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory()){await check(path);continue;}if(/\.(mjs|js)$/.test(entry.name)){const r=spawnSync(process.execPath,['--check',fileURLToPath(path)],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);count++;}if(/\.(mjs|js|html|css|toml|yml|md|json)$/.test(entry.name)){const text=await readFile(path,'utf8');if(/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/.test(text))throw new Error('Possible API secret in '+fileURLToPath(path));}}}
await check(root);console.log(`${count} JavaScript files parsed; no API credentials found in source.`);
