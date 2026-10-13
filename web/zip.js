// Minimal bounded ZIP reader for one local .gb file. Supports stored/DEFLATE.
export async function cartridge(buffer){
  const b=new Uint8Array(buffer);if(b[0]!==80||b[1]!==75)return buffer;
  const v=new DataView(buffer);let end=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw Error('Invalid ZIP directory.');
  const count=v.getUint16(end+10,true);let p=v.getUint32(end+16,true);const files=[];
  for(let i=0;i<count;i++){
    if(p+46>b.length||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid ZIP entry.');
    const n=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true);
    if(p+46+n+extra+comment>b.length)throw Error('Truncated ZIP directory.');
    const name=new TextDecoder().decode(b.subarray(p+46,p+46+n));
    if(/\.gb$/i.test(name))files.push({flags:v.getUint16(p+8,true),method:v.getUint16(p+10,true),crc:v.getUint32(p+16,true),compressed:v.getUint32(p+20,true),size:v.getUint32(p+24,true),offset:v.getUint32(p+42,true)});
    p+=46+n+extra+comment;
  }
  if(files.length!==1)throw Error('Choose a ZIP containing exactly one .gb cartridge.');
  const f=files[0];if(f.flags&1||f.size>8388608||f.offset+30>b.length)throw Error('Encrypted or oversized ZIP is unsupported.');
  if(v.getUint32(f.offset,true)!==0x04034b50)throw Error('Invalid ZIP local header.');
  const start=f.offset+30+v.getUint16(f.offset+26,true)+v.getUint16(f.offset+28,true);
  if(start+f.compressed>b.length)throw Error('Truncated ZIP content.');
  const input=b.slice(start,start+f.compressed);let raw;
  if(f.method===0)raw=input;
  else if(f.method===8){
    const reader=new Blob([input]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    raw=new Uint8Array(f.size);let used=0;
    for(;;){const {done,value}=await reader.read();if(done)break;if(used+value.length>raw.length){await reader.cancel();throw Error('ZIP size mismatch.');}raw.set(value,used);used+=value.length;}
    if(used!==raw.length)throw Error('ZIP size mismatch.');
  }else throw Error('Unsupported ZIP compression. Use an extracted .gb file.');
  if(raw.length!==f.size)throw Error('ZIP size mismatch.');
  let crc=0xffffffff;for(const byte of raw){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  if(((crc^0xffffffff)>>>0)!==f.crc)throw Error('ZIP checksum failed.');
  return raw.buffer;
}
