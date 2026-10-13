import {Package,sha256hex,logicalImage} from './vendor/fm1pkg.js?v=20261013';
import {prepareInstall} from './install-firmware.js?v=20261013';
export async function protectedAppHash(app,offset,capacity){
 const code=new Uint8Array(app.length-capacity);code.set(app.subarray(0,offset));code.set(app.subarray(offset+capacity),offset);return sha256hex(code);
}
export function validateHardwareRom(rom){
 if(rom.length<0x150||rom.length>524288)throw Error('FM-1 cartridges must be 32–512 KiB. Larger games can still play in the browser.');
 if(rom[0x143]===0xc0)throw Error('GBC-only games are not supported.');
 if(rom[0x148]>4||rom.length!==(32768<<rom[0x148]))throw Error('Cartridge size does not match its header.');
 if(rom[0x149]>5||![0,1,2,3,5,6,8,9,15,16,17,18,19,25,26,27,28,29,30].includes(rom[0x147]))throw Error('Unsupported cartridge hardware.');
 let sum=0;for(let i=0x134;i<0x14d;i++)sum=(sum-rom[i]-1)&255;if(sum!==rom[0x14d])throw Error('Cartridge header checksum failed.');
}
export async function prepareFirmware(rom,template,metadata){
 validateHardwareRom(rom);
 if(await sha256hex(template)!==metadata.sha256)throw Error('Firmware template failed its integrity check. Reload and retry.');
 const pkg=new Package(template),offset=metadata.cartridge_offset,capacity=metadata.cartridge_capacity;
 if(pkg.product!==metadata.product||!Number.isInteger(offset)||offset<0||capacity!==524288||offset+capacity>pkg.app.size)throw Error('Unsupported firmware template layout.');
 const app=pkg.dec.slice(pkg.appOff,pkg.appOff+pkg.app.size);
 const loader=pkg.entries.find(e=>e.type===100&&e.name==='ota.bin');
 if(metadata.usb_updater!==true||metadata.usb_protocol!=='fm1-ota-v1'||!loader||
    await protectedAppHash(app,offset,capacity)!==metadata.protected_app_sha256||
    await sha256hex(template.subarray(loader.dataOff+pkg.skew,loader.dataOff+pkg.skew+loader.size))!==metadata.loader_sha256)
  throw Error('USB updater code or loader failed verification. Nothing was prepared.');
 app.fill(255,offset,offset+capacity);app.set(rom,offset);pkg.setApp(app);
 const bytes=pkg.serialize(),check=new Package(bytes);
 if(check.product!==metadata.product)throw Error('Firmware identity mismatch.');
 const placed=check.dec.subarray(check.appOff+offset,check.appOff+offset+rom.length);
 if(await sha256hex(placed)!==await sha256hex(rom))throw Error('ROM verification failed.');
 const after=check.dec.subarray(check.appOff,check.appOff+check.app.size);
 if(await protectedAppHash(after,offset,capacity)!==metadata.protected_app_sha256||
    await sha256hex(bytes.subarray(loader.dataOff+pkg.skew,loader.dataOff+pkg.skew+loader.size))!==metadata.loader_sha256)
  throw Error('ROM packing changed the USB updater. Nothing was prepared.');
 const sha256=await sha256hex(bytes),install=await prepareInstall(bytes,{product:metadata.product,sha256});
 return {bytes,image:logicalImage(bytes),product:metadata.product,sha256,rom_sha256:await sha256hex(rom),install,usb_updater:true};
}
