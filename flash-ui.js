import {prepareFirmware} from './rom-firmware.js';
import {Updater} from './vendor/fm1ota.js';
const $=id=>document.getElementById(id);let rom=null,filename='',prepared=null,access=null,device=null,busy=false,downloadUrl=null;
const message=s=>$('flash-status').textContent=s;
function controls(){const fm=$('flash-model').value==='fm1';$('build-firmware').disabled=busy||!rom||!fm;$('connect-device').disabled=busy||!fm;$('flash-device').disabled=busy||!prepared||!device||!fm;$('flash-model').disabled=busy;document.querySelectorAll('#rom,#demo,#openLibrary').forEach(e=>e.disabled=busy);}
function available(){const fm=$('flash-model').value==='fm1';$('flash-availability').textContent=fm?'FM-1 trial firmware. Chrome or Edge with USB MIDI access.':'SMK37 controls are available in the simulator. Hardware flashing is not enabled for this development build.';controls();}
document.addEventListener('gamedude-rom',e=>{rom=new Uint8Array(e.detail.bytes);filename=e.detail.name;prepared=null;$('build-review').hidden=true;if(downloadUrl)URL.revokeObjectURL(downloadUrl);$('rom-summary').hidden=false;$('rom-name').textContent=e.detail.title;$('rom-info').textContent=`${(rom.length/1024).toFixed(0)} KiB · ${filename}`;message('Cartridge ready. Prepare firmware to put it on your FM-1.');controls();});
document.addEventListener('gamedude-rom-clear',()=>{rom=null;prepared=null;$('build-review').hidden=true;$('rom-summary').hidden=true;controls();});
$('flash-model').onchange=available;
$('connect-device').onclick=async()=>{busy=true;controls();try{if(!navigator.requestMIDIAccess)throw Error('Use Chrome or Edge for USB flashing. Browser play works without MIDI.');access=await navigator.requestMIDIAccess({sysex:true});const updater=new Updater(access);device=await updater.find(id=>id.model==='FM-1'||id.model==='ota-FM-1');if(!device)throw Error('No FM-1 found. Connect it by USB and close other apps using MIDI.');$('device-status').textContent=`Connected: ${device.id.text}`;device.link.close();message('Device connected. Choose a cartridge and prepare its firmware.');}catch(e){device=null;$('device-status').textContent=e.message;}finally{busy=false;controls();}};
$('build-firmware').onclick=async()=>{busy=true;controls();$('flash-progress').hidden=false;$('flash-progress').removeAttribute('value');message('Preparing your cartridge locally…');try{
 const response=await fetch('firmware/template.json');if(!response.ok)throw Error('Firmware template is unavailable.');const metadata=await response.json();
 const packageResponse=await fetch('firmware/'+metadata.package);if(!packageResponse.ok)throw Error('Firmware download failed.');
 prepared=await prepareFirmware(rom,new Uint8Array(await packageResponse.arrayBuffer()),metadata);
 if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(new Blob([prepared.bytes],{type:'application/octet-stream'}));$('download-firmware').href=downloadUrl;$('download-firmware').download='gamedude-'+filename.replace(/[^a-z0-9_-]/gi,'_')+'.fwsc';
 $('build-title').textContent=`${$('rom-name').textContent} → FM-1`;$('build-details').textContent=`${prepared.product} · ${(prepared.bytes.length/1024).toFixed(0)} KiB package · SHA-256 ${prepared.sha256.slice(0,16)}…`;$('build-review').hidden=false;message('Firmware verified. Connect your FM-1, then press Flash FM-1.');
 }catch(e){prepared=null;message(e.message);}finally{$('flash-progress').hidden=true;busy=false;controls();}};
$('flash-device').onclick=async()=>{if(!prepared||!device)return;busy=true;controls();$('flash-progress').hidden=false;$('flash-progress').removeAttribute('value');document.dispatchEvent(new Event('gamedude-pause'));let wake;
 try{
   try{wake=await navigator.wakeLock?.request('screen');}catch{}
   const updater=new Updater(access),step=(phase,value)=>{const names={start:'Starting update',verify:'Checking firmware',loader:'Starting device updater',write:'Verifying / writing firmware',reboot:'Waiting for device restart',done:'Installed and verified'};message((names[phase]||phase)+(typeof value==='number'?` · ${value} blocks`:typeof value==='string'?` · ${value}`:'')+'. Keep USB connected.');};
   if(device.id.model==='ota-FM-1'){if(!await updater.resume(prepared.image,step,prepared.product))throw Error('Could not resume the update. Reconnect USB and connect again.');}
   else await updater.install(prepared.image,prepared.product,step);
   $('flash-progress').value=100;$('device-status').textContent='Connected: '+prepared.product;message('Installed and verified. Press PLAY on your FM-1 to start.');device=null;
 }catch(e){message(e.message+' Reconnect and use Connect FM-1 to retry.');device=null;}finally{await wake?.release().catch(()=>{});busy=false;controls();}
};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
available();
