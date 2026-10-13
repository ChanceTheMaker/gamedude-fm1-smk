// Render small promotional screenshots from the owner's local ROMs.
// Usage: node tools/capture_hero.mjs <local-ROM-directory>. No ROMs are copied.
import fs from 'node:fs/promises';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {cartridge} from '../web/zip.js';
if(!process.argv[2])throw Error('Provide the local ROM directory');
const {instance}=await WebAssembly.instantiate(await fs.readFile('web/gb.wasm'),{}),e=instance.exports;
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,bytes){const name=Buffer.from(type),out=Buffer.alloc(bytes.length+12);out.writeUInt32BE(bytes.length);name.copy(out,4);bytes.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([name,bytes])),out.length-4);return out;}
for(const [name,file,starts] of [
 ['tetris','Tetris (W) (V1.1) [!].zip',[600,660,720]],
 ['mario','Super Mario Land (W) (V1.1) [!].zip',[200]],
 ['tennis','Tennis (W) [!].zip',[200,260,320,380]]]){
 const zip=await fs.readFile(path.join(process.argv[2],file));const rom=new Uint8Array(await cartridge(zip.buffer.slice(zip.byteOffset,zip.byteOffset+zip.byteLength)));
 new Uint8Array(e.memory.buffer,e.gp_upload(),rom.length).set(rom);if(e.gp_load_upload(rom.length))throw Error('Cartridge failed: '+name);e.gp_palette(0);
 for(let frame=0;frame<(name==='tetris'?820:name==='tennis'?1000:470);frame++){e.gp_buttons(starts.some(start=>frame>=start&&frame<start+5)?8:0);if(!e.gp_frame())throw Error('Frame failed: '+name);e.gp_render_audio(e.gp_audio_queued());}
 const pixels=new Uint16Array(e.memory.buffer,e.gp_pixels(),160*144),rows=Buffer.alloc(144*(160*3+1));
 for(let y=0;y<144;y++)for(let x=0;x<160;x++){const p=pixels[y*160+x],o=y*481+1+x*3;rows[o]=Math.round((p>>11)*255/31);rows[o+1]=Math.round(((p>>5)&63)*255/63);rows[o+2]=Math.round((p&31)*255/31);}
 const h=Buffer.alloc(13);h.writeUInt32BE(160);h.writeUInt32BE(144,4);h[8]=8;h[9]=2;
 await fs.writeFile('web/artwork/game-'+name+'.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));console.log(name);
}
