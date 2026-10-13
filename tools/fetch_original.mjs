// Refresh the manufacturer copy without weakening the reviewed firmware gate.
// New M-VAVE releases must pass review before updating validateStockPackage.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateStockPackage} from '../web/vendor/fm1pkg.js';
const folder=new URL('../web/firmware/',import.meta.url);
const metadata=JSON.parse(await fs.readFile(new URL('original.json',folder),'utf8'));
let bytes;
if(process.platform==='win32'){
 // Windows curl uses the OS certificate store, including managed roots.
 const curl=path.join(process.env.SystemRoot||'C:/Windows','System32/curl.exe');
 bytes=new Uint8Array(execFileSync(curl,['--fail','--silent','--show-error','--location','--proto','=https','--proto-redir','=https','--max-time','30',metadata.source_url],{maxBuffer:2*1024*1024,windowsHide:true}));
}else{
 const response=await fetch(metadata.source_url,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`M-VAVE download failed: ${response.status}`);
 bytes=new Uint8Array(await response.arrayBuffer());
}
const verified=await validateStockPackage(bytes);
if(verified.product!==metadata.product||verified.sha256!==metadata.sha256)throw Error('Manufacturer release changed; review it before publishing.');
await fs.writeFile(new URL(metadata.package,folder),bytes);
metadata.checked_date=new Date().toISOString().slice(0,10);
await fs.writeFile(new URL('original.json',folder),JSON.stringify(metadata,null,2)+'\n');
console.log(`Verified official ${verified.product}: ${verified.sha256}`);
