import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadGamedudeFirmware} from '../web/gamedude-firmware.js';
const manifest=JSON.parse(await fs.readFile('web/firmware/gamedude.json','utf8'));
let corrupt=false,fail=false,badModel=false;
const fetcher=async url=>{
 if(fail)return new Response('',{status:503});
 if(url==='firmware/gamedude.json'){
  const data=structuredClone(manifest);if(badModel)data.models.fm1.product='SMK-37_938';
  return Response.json(data);
 }
 let file='web/'+url;
 if(url.includes('SMK-37_Pro_016'))file=process.argv[2];
 if(url.includes('SMK-37_Elite_016'))file=process.argv[3];
 const bytes=await fs.readFile(file);if(corrupt&&url.endsWith('.bin'))bytes[0]^=1;
 return new Response(bytes);
};
for(const model of ['fm1',...(process.argv[2]?['smk-pro','smk-elite']:[])]){
 const result=await loadGamedudeFirmware(model,fetcher);
 assert.equal(result.product,model==='fm1'?'FM-1_938':'SMK-37_938');assert(result.install);
}
corrupt=true;await assert.rejects(()=>loadGamedudeFirmware('fm1',fetcher),/verification failed/);corrupt=false;
fail=true;await assert.rejects(()=>loadGamedudeFirmware('fm1',fetcher),/download failed/);fail=false;
badModel=true;await assert.rejects(()=>loadGamedudeFirmware('fm1',fetcher),/release information/);
await assert.rejects(()=>loadGamedudeFirmware('unknown',fetcher),/Choose your instrument/);
console.log('PASS: automatic GameDude core selection, packaging, wrong-release, corrupt-core and failed-download rejection.');
