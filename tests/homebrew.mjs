import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifiedCartridge} from '../web/homebrew.js';
import {validateHardwareRom,prepareFirmware} from '../web/rom-firmware.js';
const root=new URL('../web/homebrew/',import.meta.url);
const catalog=JSON.parse(await fs.readFile(new URL('catalog.json',root),'utf8'));
const wasm=await fs.readFile(new URL('../web/gb.wasm',import.meta.url));
const template=new Uint8Array(await fs.readFile(new URL('../web/firmware/fm1-template.fwsc',import.meta.url)));
const meta=JSON.parse(await fs.readFile(new URL('../web/firmware/template.json',import.meta.url),'utf8'));
await assert.rejects(()=>verifiedCartridge({file:'../private.gb'}),/Invalid/);
const report=[];
await fs.mkdir(new URL('../build/homebrew-frames/',import.meta.url),{recursive:true});
for(const g of catalog.games){
 const rom=await fs.readFile(new URL(g.file,root));
 assert.equal(crypto.createHash('sha256').update(rom).digest('hex'),g.sha256);
 assert.equal(rom.length,g.bytes);validateHardwareRom(rom);
 const read=await verifiedCartridge(g,async()=>new Response(rom));assert.deepEqual(new Uint8Array(read),new Uint8Array(rom));
 await assert.rejects(()=>verifiedCartridge({...g,sha256:'0'.repeat(64)},async()=>new Response(rom)),/integrity/);
 if(g.source_file)assert.equal(crypto.createHash('sha256').update(await fs.readFile(new URL(g.source_file,root))).digest('hex'),g.source_sha256);
 assert.ok((await fs.readFile(new URL(g.license_file,root),'utf8')).length>100);
 const {instance}=await WebAssembly.instantiate(wasm,{}),e=instance.exports;
 new Uint8Array(e.memory.buffer,e.gp_upload(),rom.length).set(rom);
 assert.equal(e.gp_load_upload(rom.length),0,g.title+' load');
 const hashes=new Set();let nonzero=0,peak=0;
 for(let f=0;f<1800;f++){
  const phase=f%240;
  e.gp_buttons(f>=300&&f<308?8:f>=200&&phase<30?[16,64,32,128,1,2][Math.floor(f/240)%6]:0);
  assert.equal(e.gp_frame(),1,g.title+' frame '+f);assert.equal(e.gp_error(),0);
  const n=e.gp_audio_queued(),p=e.gp_render_audio(n),pcm=new Int16Array(e.memory.buffer,p,n*2);
  for(const v of pcm){if(v)nonzero++;peak=Math.max(peak,Math.abs(v));}
  if(f%60===0)hashes.add(crypto.createHash('sha256').update(new Uint8Array(e.memory.buffer,e.gp_pixels(),46080)).digest('hex'));
  if([119,599,1199].includes(f))await fs.writeFile(new URL('../build/homebrew-frames/'+g.id+'-'+f+'.rgb565',import.meta.url),new Uint8Array(e.memory.buffer,e.gp_pixels(),46080));
 }
 if(g.id==='bytewave')assert.ok(nonzero>1000,'Bytewave emits audio after Start');
 assert.ok(hashes.size>1,g.title+' display changes');
 const built=await prepareFirmware(rom,template,meta);assert.equal(built.usb_updater,true);assert.equal(built.product,meta.product);
 const row={id:g.id,bytes:rom.length,frames:1800,distinctFrames:hashes.size,nonzeroSamples:nonzero,peak,firmware:built.product,usbUpdaterVerified:true};report.push(row);console.log(row);
}
await fs.writeFile(new URL('../build/homebrew-smoke.json',import.meta.url),JSON.stringify(report,null,2));
console.log('PASS: bundled cartridges load, run, retain attribution, and pack with the protected USB updater. Startup/input smoke coverage; not complete gameplay or physical hardware verification.');
