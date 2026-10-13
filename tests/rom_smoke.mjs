import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {cartridge} from '../web/zip.js';
const folder=process.argv[2]||'E:/Games/RetroPocketGames_EMUL8R/gb';
const result=[],archiveErrors=[],failures=[];
const {instance}=await WebAssembly.instantiate(await fs.readFile(new URL('../web/gb.wasm',import.meta.url)),{});
const e=instance.exports;
const selected=JSON.parse(await fs.readFile(new URL('../web/catalog.json',import.meta.url),'utf8')).games;
for(const game of selected){
 const name=game.file;
 const file=await fs.readFile(path.join(folder,name));let rom;
 try{rom=new Uint8Array(await cartridge(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength)));}
 catch(error){archiveErrors.push({name,error:error.message||String(error)});console.log('ARCHIVE ERROR:',name,error.message);continue;}
 try {
 new Uint8Array(e.memory.buffer,e.gp_upload(),rom.length).set(rom);
 assert.equal(e.gp_load_upload(rom.length),0,name);
 let loud=0,peak=0;const hashes=new Set();const started=performance.now();
 for(let frame=0;frame<1800;frame++){
   e.gp_buttons(frame>=120&&frame<125?8:frame>=180&&frame<240?17:0);
   assert.equal(e.gp_frame(),1,name+' frame '+frame);assert.equal(e.gp_error(),0);
   const count=e.gp_audio_queued(),pcm=new Int16Array(e.memory.buffer,e.gp_render_audio(count),count*2);
   for(const v of pcm){if(v)loud++;peak=Math.max(peak,Math.abs(v));}
   if(frame%60===0)hashes.add(crypto.createHash('sha256').update(new Uint8Array(e.memory.buffer,e.gp_pixels(),160*144*2)).digest('hex'));
 }
 assert.ok(hashes.size>1,name+' changes display');
 const row={name,romBytes:rom.length,frames:e.gp_frame_count(),distinctFrames:hashes.size,nonzeroSamples:loud,peak,hostMilliseconds:Math.round(performance.now()-started)};
 result.push(row);console.log(row);
 }catch(error){failures.push({name,error:error.message});}
}
await fs.writeFile(new URL('../build/rom-smoke.json',import.meta.url),JSON.stringify({passed:result,archiveErrors,failures},null,2)+'\n');
assert.equal(failures.length,0,JSON.stringify(failures));
assert.equal(result.length,selected.filter(g=>g.status==='ready').length);
console.log(`PASS: ${result.length} cartridges execute 1800 frames; ${archiveErrors.length} source archives unreadable. Startup/input smoke coverage, not full-game or hardware validation.`);
