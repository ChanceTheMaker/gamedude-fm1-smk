import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let Klass;
globalThis.AudioWorkletProcessor=class{constructor(){this.port={};}};
globalThis.registerProcessor=(name,c)=>{assert.equal(name,'gamedude-audio');Klass=c;};
vm.runInThisContext(await fs.readFile(new URL('../web/gamedude-audio.js',import.meta.url),'utf8'));
for(const rate of [44100,48000]){
 globalThis.sampleRate=rate;
 const w=new Klass(),out=[[new Float32Array(128),new Float32Array(128)]];
 w.process([],out);assert.ok(out[0][0].every(v=>v===0));
 const pcm=new Int16Array(2048*2);for(let i=0;i<2048;i++){pcm[i*2]=8192;pcm[i*2+1]=-16384;}
 w.port.onmessage({data:{type:'pcm',bytes:pcm.buffer}});
 for(let i=0;i<10;i++){assert.equal(w.process([],out),true);assert.ok(out[0][0].every(v=>v===0.25));assert.ok(out[0][1].every(v=>v===-0.5));}
 assert.ok(Math.abs(w.read-1280*44100/rate)<=1,'resampling consumes expected frames');
 w.port.onmessage({data:{type:'flush'}});w.process([],out);assert.ok(out[0].every(c=>c.every(v=>v===0)));
 for(let i=0;i<10;i++)w.port.onmessage({data:{type:'pcm',bytes:pcm.buffer}});
 assert.ok(w.write-w.read<=4096,'latency bounded after producer overrun');
 for(let i=0;i<100;i++)w.process([],out);
 assert.ok(out[0].every(c=>c.every(v=>v===0)),'underrun emits silence');
}
console.log('PASS: stereo output, 44.1/48 kHz resampling, silence, flush and bounded queue.');
