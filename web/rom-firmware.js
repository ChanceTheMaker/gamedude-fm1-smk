import {Package,sha256hex,logicalImage} from './vendor/fm1pkg.js';
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
 app.fill(255,offset,offset+capacity);app.set(rom,offset);pkg.setApp(app);
 const bytes=pkg.serialize(),check=new Package(bytes);
 if(check.product!==metadata.product)throw Error('Firmware identity mismatch.');
 const placed=check.dec.subarray(check.appOff+offset,check.appOff+offset+rom.length);
 if(await sha256hex(placed)!==await sha256hex(rom))throw Error('ROM verification failed.');
 return {bytes,image:logicalImage(bytes),product:metadata.product,sha256:await sha256hex(bytes),rom_sha256:await sha256hex(rom)};
}
