import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareFirmware} from '../web/rom-firmware.js';
import {Package} from '../web/vendor/fm1pkg.js';

const template=new Uint8Array(await fs.readFile(new URL('../web/firmware/fm1-template.fwsc',import.meta.url)));
const metadata=JSON.parse(await fs.readFile(new URL('../web/firmware/template.json',import.meta.url),'utf8'));
const diagnostic=new Uint8Array(await fs.readFile(new URL('../web/diagnostic.gb',import.meta.url)));
const original=new Package(template),before=original.dec.slice(original.appOff,original.appOff+original.app.size);
const offset=metadata.cartridge_offset,capacity=metadata.cartridge_capacity;
for(let size=0;size<=4;size++){
  const rom=new Uint8Array(32768<<size);rom.set(diagnostic);rom[0x148]=size;
  rom[0x147]=size?1:0;
  let checksum=0;for(let i=0x134;i<0x14d;i++)checksum=(checksum-rom[i]-1)&255;rom[0x14d]=checksum;
  const result=await prepareFirmware(rom,template,metadata),pkg=new Package(result.bytes);
  const app=pkg.dec.slice(pkg.appOff,pkg.appOff+pkg.app.size);
  assert.deepEqual(app.subarray(offset,offset+rom.length),rom);
  assert.ok(app.subarray(offset+rom.length,offset+capacity).every(b=>b===255));
  assert.deepEqual(app.subarray(0,offset),before.subarray(0,offset));
  assert.deepEqual(app.subarray(offset+capacity),before.subarray(offset+capacity));
  assert.equal(pkg.product,metadata.product);
}
const damaged=template.slice();damaged[damaged.length-1]^=1;
await assert.rejects(prepareFirmware(diagnostic,damaged,metadata),/integrity/);
await assert.rejects(prepareFirmware(diagnostic,template,{...metadata,cartridge_offset:-1}),/layout/);
await assert.rejects(prepareFirmware(diagnostic.subarray(0,100),template,metadata),/32/);
const badRom=diagnostic.slice();badRom[0x134]^=1;
await assert.rejects(prepareFirmware(badRom,template,metadata),/checksum/);
for(const bad of [{usb_updater:false},{usb_protocol:'unknown'},{protected_app_sha256:'bad'},{loader_sha256:'bad'}])
 await assert.rejects(prepareFirmware(diagnostic,template,{...metadata,...bad}),/USB updater/);
console.log('PASS: 32/64/128/256/512 KiB cartridge packing, unchanged application code, padding, identity, integrity and invalid-ROM rejection.');
