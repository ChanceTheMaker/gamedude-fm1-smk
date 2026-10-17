import {initHomebrew} from './homebrew.js?v=20261013';
import {bootSplash,idleLogo,landingDing} from './branding.js?v=solid1';
import {cartridge} from './zip.js';
const $=id=>document.getElementById(id),ctx=$('screen').getContext('2d'),image=ctx.createImageData(160,144);
let core,enginePromise,audio,node,audioPromise,romKey='',saveSize=0,paused=false,loaded=false,gameName='cartridge',allGames=[],catalog=[],loading=false,nextFrame=0,lastSave=0;
const keyPresses=new Map(),owners=new Map(),period=1000*70224/4194304;
let rateStart=0,rateFrames=0,videoDirty=false;
const errors=['','Cartridge is too short.','GBC-only cartridge. This player supports original GB.','Cartridge length/header size mismatch.','Unsupported cartridge RAM size.','Cartridge header checksum failed.','Unsupported cartridge mapper.','The emulator encountered an unsupported CPU operation.','Emulator frame timed out.'];
const status=s=>$('status').textContent=s;
function inputs(){let bits=0;for(const b of owners.values())bits|=b;core?.gp_buttons(bits);document.querySelectorAll('[data-bit],[data-control-bit]').forEach(b=>b.classList.toggle('active',!!(bits&Number(b.dataset.bit||b.dataset.controlBit))));}
function release(){keyPresses.clear();owners.clear();inputs();}
async function ensureEngine(){
  if(!core){enginePromise??=WebAssembly.instantiateStreaming(fetch('gb.wasm'),{}).then(r=>core=r.instance.exports).catch(e=>{enginePromise=null;throw e;});await enginePromise;}
  core.gp_volume(Number($('volume').value));core.gp_palette(Number($('palette').value));
}
function startAudio(){
  try{
    if(!audio){audio=new AudioContext({sampleRate:44100,latencyHint:'interactive'});audio.onstatechange=audioState;}
    audio.resume().catch(()=>status('Audio unavailable; the game can still play.'));
    if(!node&&!audioPromise){audioPromise=audio.audioWorklet.addModule('gamedude-audio.js').then(()=>{
      node=new AudioWorkletNode(audio,'gamedude-audio',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});node.connect(audio.destination);
      node.onprocessorerror=()=>status('Audio processor stopped. Reload to restart sound.');audioState();
    }).catch(()=>{audioPromise=null;status('Audio unavailable; the game can still play.');});}
    audioState();
  }catch{status('Audio unavailable; the game can still play.');}
}
function audioState(){$('sound').textContent=audio?.state==='running'?'Sound on':'Enable sound';}
function flushAudio(){node?.port.postMessage({type:'flush'});if(core)for(let i=0;i<2;i++)core.gp_render_audio(2048);}
function draw(){const px=new Uint16Array(core.memory.buffer,core.gp_pixels(),160*144);for(let i=0;i<px.length;i++){const c=px[i],j=i*4;image.data[j]=(c>>11)*255/31;image.data[j+1]=((c>>5)&63)*255/63;image.data[j+2]=(c&31)*255/31;image.data[j+3]=255;}ctx.putImageData(image,0,0);}
function saveNow(){
  if(!loaded||!saveSize||!romKey)return;
  const bytes=new Uint8Array(core.memory.buffer,core.gp_save_data(),saveSize);
  try{let s='';for(const b of bytes)s+=String.fromCharCode(b);localStorage.setItem(romKey,btoa(s));core.gp_save_clean();$('saved').textContent='Save RAM stored in this browser.';}
  catch{$('saved').textContent='Browser storage unavailable. Use Export save.';}
}
function advance(now){
  if(!loaded||paused)return;
  if(!nextFrame||now-nextFrame>200)nextFrame=now;
  let count=0;
  while(now>=nextFrame&&count<4){
    count++;
    if(!core.gp_frame()){status(errors[core.gp_error()]||'Emulator stopped.');saveNow();loaded=false;flushAudio();$('lamp').classList.remove('on');return;}
    const frames=core.gp_audio_queued(),ptr=core.gp_render_audio(frames);
    if(node&&audio.state==='running'){const pcm=new Int16Array(core.memory.buffer,ptr,frames*2).slice();node.port.postMessage({type:'pcm',bytes:pcm.buffer},[pcm.buffer]);}
    nextFrame+=period;
  }
  if(count)videoDirty=true;
  if(!rateStart)rateStart=now;rateFrames+=count;
  if(now-rateStart>=1000){$('rate').textContent=Math.round(rateFrames*1000/(now-rateStart))+' FPS · GB';rateStart=now;rateFrames=0;}
  if(now-lastSave>2000){lastSave=now;if(core.gp_save_dirty())saveNow();}
}
// Browser repaint throttling must not become the Game Boy's CPU/audio clock.
setInterval(()=>advance(performance.now()),8);
function present(){requestAnimationFrame(present);if(videoDirty&&loaded&&!paused){draw();videoDirty=false;}}
requestAnimationFrame(present);
function download(bytes,name){const url=URL.createObjectURL(new Blob([bytes]));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function load(buffer,name='cartridge.gb'){
  if(loading||$('rom').disabled)return false;loading=true;document.dispatchEvent(new CustomEvent('gamedude-loading',{detail:true}));document.dispatchEvent(new Event('gamedude-rom-clear'));status('Opening cartridge…');
  try{await ensureEngine();const rom=await cartridge(buffer);if(rom.byteLength>8388608)throw Error('Cartridge exceeds 8 MiB.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rom)),b=>b.toString(16).padStart(2,'0')).join('');
    saveNow();release();loaded=false;flushAudio();new Uint8Array(core.memory.buffer,core.gp_upload(),rom.byteLength).set(new Uint8Array(rom));
    const error=core.gp_load_upload(rom.byteLength);if(error)throw Error(errors[error]);
    romKey='gamedude-smk-save-'+hash;saveSize=core.gp_save_size();
    try{const s=localStorage.getItem(romKey);if(s){const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));if(bytes.length===saveSize)new Uint8Array(core.memory.buffer,core.gp_save_data(),saveSize).set(bytes);}}catch{}
    const b=new Uint8Array(core.memory.buffer,core.gp_title(),17);gameName=String.fromCharCode(...b).split('\0')[0]||'Untitled';
    await bootSplash(ctx,()=>landingDing(audio,Number($('volume').value)));
    document.dispatchEvent(new CustomEvent('gamedude-rom',{detail:{bytes:rom.slice(0),name,title:gameName}}));
    loaded=true;paused=false;nextFrame=0;rateStart=rateFrames=0;$('pause').textContent='Pause';$('title').textContent=gameName;$('lamp').classList.add('on');$('pause').disabled=$('reset').disabled=false;$('save').disabled=$('exportSave').disabled=!saveSize;
    status('Playing · '+gameName);$('saved').textContent=saveSize?'Battery RAM saves automatically in this browser.':'This cartridge has no save RAM.';$('screen').focus({preventScroll:true});return true;
  }catch(e){status(e.message||'Could not decompress this ZIP. Try an extracted .gb file.');if(!loaded){$('lamp').classList.remove('on');$('pause').disabled=$('reset').disabled=$('exportSave').disabled=$('save').disabled=true;}}
  finally{loading=false;document.dispatchEvent(new CustomEvent('gamedude-loading',{detail:false}));}
}
$('demo').onclick=async()=>{try{startAudio();await load(await(await fetch('diagnostic.gb')).arrayBuffer(),'diagnostic.gb');}catch(e){status(e.message);}};
async function openFile(f){if(!f||$('rom').disabled)return;if(f.size>16*1024*1024){status('File is too large.');return;}startAudio();await load(await f.arrayBuffer(),f.name);}
$('rom').onchange=async e=>{await openFile(e.target.files[0]);e.target.value='';};
const drop=$('dropzone');if(drop){for(const type of ['dragenter','dragover'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragover');});for(const type of ['dragleave','drop'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragover');});drop.addEventListener('drop',e=>openFile(e.dataTransfer.files[0]));}
document.addEventListener('gamedude-control',e=>{const {source,bit,down}=e.detail;if(down)owners.set(source,bit);else owners.delete(source);inputs();});
document.addEventListener('gamedude-release',release);
document.addEventListener('gamedude-pause',()=>{if(loaded&&!paused)$('pause').click();});
$('pause').onclick=()=>{paused=!paused;rateStart=rateFrames=0;$('rate').textContent=paused?'PAUSED': '160 \u00d7 144 \u00b7 GB';release();core.gp_pause(paused?1:0);flushAudio();nextFrame=0;$('pause').textContent=paused?'Resume':'Pause';status(paused?'Paused':'Playing · '+gameName);if(paused)saveNow();else startAudio();};
$('reset').onclick=()=>{release();core.gp_reset();flushAudio();nextFrame=0;};
$('palette').onchange=e=>core?.gp_palette(Number(e.target.value));
$('volume').oninput=e=>core?.gp_volume(Number(e.target.value));
$('sound').onclick=()=>{if(audio?.state==='running'){audio.suspend();flushAudio();}else startAudio();};
$('exportSave').onclick=()=>{if(loaded&&saveSize)download(new Uint8Array(core.memory.buffer,core.gp_save_data(),saveSize).slice(),gameName+'.sav');};
$('save').onchange=async e=>{const f=e.target.files[0];if(f){if(f.size!==saveSize){status('Save size does not match this cartridge.');return;}new Uint8Array(core.memory.buffer,core.gp_save_data(),saveSize).set(new Uint8Array(await f.arrayBuffer()));saveNow();status('Save imported. Reset the game to reload its save.');}e.target.value='';};
const keys={ArrowUp:64,KeyW:64,ArrowDown:128,KeyS:128,ArrowLeft:32,KeyA:32,ArrowRight:16,KeyD:16,KeyZ:2,KeyX:1,Space:2,Enter:1,ShiftLeft:4,ShiftRight:4,KeyP:8};
window.addEventListener('keydown',e=>{
  if(!loaded||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('textarea,select,[contenteditable]:not([contenteditable="false"]),input:not([type="file"]):not([type="button"]):not([type="submit"])'))return;
  if((e.code==='Enter'||e.code==='Space')&&e.target.closest?.('button,a,input'))return;
  const bit=keys[e.code];if(bit){e.preventDefault();if(!e.repeat){keyPresses.set(e.code,{at:performance.now()});owners.set(e.code,bit);inputs();}}
});
window.addEventListener('keyup',e=>{const press=keyPresses.get(e.code);if(!press)return;
  // Even a very quick tap must span a Game Boy input polling interval.
  setTimeout(()=>{if(keyPresses.get(e.code)!==press)return;keyPresses.delete(e.code);owners.delete(e.code);inputs();},Math.max(0,40-(performance.now()-press.at)));
});
document.addEventListener('click',e=>{if(loaded&&e.detail&&e.target.closest?.('.toolbar button,#hardware button,.game-controls button,.small-buttons button'))$('screen').focus({preventScroll:true});});
window.addEventListener('blur',release);window.addEventListener('pagehide',saveNow);
document.addEventListener('visibilitychange',()=>{if(document.hidden){release();saveNow();if(loaded&&!paused)$('pause').click();}});
document.querySelectorAll('[data-bit]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);owners.set('p'+e.pointerId,Number(b.dataset.bit));inputs();};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{owners.delete('p'+e.pointerId);inputs();});});
// Keyboard/assistive activation produces a click without pointerdown. A short
// pulse also makes quick taps long enough for at least one emulated frame.
document.querySelectorAll('[data-bit]').forEach(b=>{b.onclick=()=>{const token=Symbol();owners.set(token,Number(b.dataset.bit));inputs();setTimeout(()=>{owners.delete(token);inputs();},100);};});
function library(){
  const q=$('search').value.toLowerCase(),curated=$('collection').value==='selected';
  const list=curated?catalog:allGames.map(file=>({file,title:file,status:'unchecked'}));
  $('library').replaceChildren(...list.filter(g=>g.title.toLowerCase().includes(q)).map(g=>{const o=document.createElement('option');o.value=g.file;o.textContent=g.title+(g.status==='unreadable'?' · archive error':g.hardware_size_candidate===false?' · browser only':'');return o;}));
  $('libraryCount').textContent=(curated?catalog.length+' selected cartridges':'Full local library')+' · '+list.filter(g=>g.status==='unreadable').length+' archive errors';
}
$('search').oninput=library;$('collection').onchange=library;
$('openLibrary').onclick=async()=>{const name=$('library').value;if(!name)return;try{startAudio();const r=await fetch('/api/rom?name='+encodeURIComponent(name));if(!r.ok)throw Error('Unable to read cartridge.');await load(await r.arrayBuffer(),name);}catch(e){status(e.message);}};
if(['localhost','127.0.0.1'].includes(location.hostname)){
  try{const [r,c]=await Promise.all([fetch('/api/roms'),fetch('catalog.json')]);if(r.ok)allGames=await r.json();if(c.ok)catalog=(await c.json()).games;library();}catch{}
}
if(!allGames.length){if($('library-details'))$('library-details').hidden=true;$('openLibrary').disabled=true;}
if(!loaded&&!loading)idleLogo(ctx);

initHomebrew({canLoad:()=>!loading&&!$('rom').disabled,startAudio,load});

let deviceBusy=false,installBusy=false;
function deviceLocks(){const locked=deviceBusy||installBusy;for(const id of ['rom','demo','stock-play','openLibrary']){const e=document.getElementById(id);if(e)e.disabled=locked;}}
document.addEventListener('gamedude-device-state',e=>{deviceBusy=e.detail.busy;deviceLocks();});
document.addEventListener('gamedude-install-busy',e=>{installBusy=e.detail;deviceLocks();});
for(const type of ['dragover','drop'])document.addEventListener(type,e=>{if(!Array.from(e.dataTransfer?.types||[]).includes('Files'))return;e.preventDefault();if(type==='drop'&&!document.getElementById('dropzone').contains(e.target)&&e.target.closest('#hardware,.screen-shell,#large-screen'))openFile(e.dataTransfer.files[0]);});
