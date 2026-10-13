import assert from 'node:assert/strict';
globalThis.Image=class{complete=true;naturalWidth=192;decode(){return Promise.resolve();}};
let reduced=false,frames=[];globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=fn=>frames.push(fn);
const {bootSplash,landingDing,splashY}=await import('../web/branding.js');
const ctx={fillRect(){},drawImage(){},fillText(){}};
async function sequence(reduce){reduced=reduce;let rings=0,done=false;const p=bootSplash(ctx,()=>rings++).then(()=>done=true);await Promise.resolve();await Promise.resolve();
 for(const ms of [0,100,499,500,600,800,1100,1500]){const q=frames;frames=[];q.forEach(f=>f(ms));await Promise.resolve();}
 await p;assert.equal(rings,1);assert.equal(done,true);assert.equal(frames.length,0);
}
await sequence(false);await sequence(true);assert.equal(splashY(500),55);assert.ok(splashY(580)<55);assert.equal(splashY(1500),55);
const tones=[],levels=[];const param={setValueAtTime(){},linearRampToValueAtTime(v){levels.push(v);},exponentialRampToValueAtTime(){}};
const audio={state:'running',currentTime:10,destination:{},createGain(){return{gain:param,connect(){},disconnect(){}};},createOscillator(){const o={frequency:{},connect(){},disconnect(){},start(t){o.startAt=t;},stop(t){o.stopAt=t;}};tones.push(o);return o;}};
landingDing(audio,0);assert.equal(tones.length,0);audio.state='suspended';landingDing(audio,100);assert.equal(tones.length,0);audio.state='running';landingDing(audio,25);
assert.equal(tones.length,3);assert.deepEqual(tones.map(o=>o.frequency.value),[1046.5,1318.5,1568]);assert.ok(levels.every(v=>v<=.0055));assert.ok(tones.every(o=>o.stopAt-o.startAt<.51));tones.forEach(o=>o.onended());
console.log('PASS browser normal/reduced-motion completion, one landing cue, mute and quiet three-note envelope.');
