import assert from 'node:assert/strict';
import {usbRequest,usbReply,createUsbChannel} from '../web/usb-library.js';
import {transferCartridge} from '../web/bluetooth-transfer.js';
import {crc32} from '../web/zip.js';
function response(seq,data=[],error=0){const p=[0xf0,0x7d,71,85,seq&127,seq>>>7,error];for(const b of data)p.push(b&127,b>>>7);return [...p,0xf7];}
for(let n=0;n<=44;n++){const b=Uint8Array.from({length:n},(_,i)=>i*31);assert.deepEqual(usbReply(response(16383,b),16383),b);}
assert.equal(usbReply(response(12),13),null);assert.throws(()=>usbReply(response(1,[],2),1));assert.throws(()=>usbRequest(1,1,new Uint8Array(245)));
const bad=response(1,[0]);bad[8]=2;assert.throws(()=>usbReply(bad,1));
const rom=Uint8Array.from({length:40976},(_,i)=>i*7);let queue=[],state=0,received=0,checksum=0,buffer,closed=false,drop=false,writes=0,loseRequest=true,loseAck=true;
const link={get lost(){return closed;},drain(){queue=[];},close(){closed=true;},read:async()=>{if(!queue.length)await new Promise(r=>setTimeout(r,1));return queue.shift()||null;},send:p=>{
 const seq=p[4]|p[5]<<7,kind=p[6];let result=[];
 if(kind){const data=Uint8Array.from({length:(p.length-8)/2},(_,i)=>p[7+i*2]|p[8+i*2]<<7),v=new DataView(data.buffer),u=i=>v.getUint32(i,true);writes++;
  if(data[0]===4){state=0;received=0;}
  if(data[0]===1){buffer=new Uint8Array(u(5));checksum=u(9);state=1;}
  if(data[0]===2){
   if(loseRequest&&received>2000){loseRequest=false;return true;}
   if(u(1)<received)assert.deepEqual(buffer.subarray(u(1),u(1)+data.length-5),data.subarray(5));
   else{assert.equal(u(1),received);buffer.set(data.subarray(5),received);received+=data.length-5;}
   if(loseAck&&received>4000){loseAck=false;return true;}
  }
  if(data[0]===3){assert.equal(crc32(buffer),checksum);assert.deepEqual(buffer,rom);state=2;}
 }else{const b=new Uint8Array(20),v=new DataView(b.buffer);[0x314c4447,state,0,received,262144].forEach((n,i)=>v.setUint32(i*4,n,true));result=b;}
 if(drop){closed=true;return false;}queue.push(response((seq+1)&16383));queue.push(response(seq,result));return true;
}};
const {device,characteristic:c}=createUsbChannel(link);
const originalSend=link.send,queryDrops=new Set([0,6,7]);
link.send=p=>{if(p[6]===1&&queryDrops.delete(p[7]))return true;return originalSend(p);};
for(const command of [0,6,7])await c.writeValueWithResponse(Uint8Array.from(command===7?[7,0,0,0,0]:[command]));
assert.equal(queryDrops.size,0);link.send=originalSend;
const read=async()=>{const v=await c.readValue();return {state:v.getUint32(4,true),error:v.getUint32(8,true),received:v.getUint32(12,true),capacity:v.getUint32(16,true)};};
await transferCartridge({rom,session:2,read,write:p=>c.writeValueWithResponse(p)});assert.equal(state,2);assert(!loseRequest&&!loseAck);assert(writes>172);assert.equal(c.properties.writeWithoutResponse,false);
drop=true;await assert.rejects(c.readValue());assert(!device.gatt.connected);
console.log('PASS: actual USB adapter uploads complete cartridge through shared transfer logic, recovers lost requests/ACKs without duplicate bytes, ignores wrong sequences and handles cable loss');
