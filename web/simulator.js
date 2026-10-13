const $=id=>document.getElementById(id),names={1:'A',2:'B',4:'Select',8:'Start',16:'Right',32:'Left',64:'Up',128:'Down'},symbols={1:'A',2:'B',4:'SEL',8:'START',16:'→',32:'←',64:'↑',128:'↓'};
export const simulatorMappings={
 fm1:{base:5,count:27,keys:{0:32,4:128,7:16,3:64,5:64,24:2,26:1,11:4,12:8},pads:{}},
 smk37:{base:0,count:37,keys:{5:32,9:128,12:16,6:64,8:64,35:1,36:2},pads:{1:64,8:32,9:128,10:16,14:2,15:1}}
};
let model='fm1';
function send(source,bit,down){document.dispatchEvent(new CustomEvent('gamedude-control',{detail:{source,bit,down}}));}
function button(bit,label,klass){const b=document.createElement('button');b.type='button';b.className=klass+(bit?' assigned':'');b.disabled=!bit;b.dataset.controlBit=bit||0;b.setAttribute('aria-label',label);b.title=label;return b;}
export function renderSimulator(next){
 if(!$('hardware-keys')||!['fm1','smk37','gameboy'].includes(next))return;model=next;send('sim-reset',0,false);document.dispatchEvent(new Event('gamedude-release'));
 for(const id of ['fm1','smk37','gameboy'])$('sim-'+id).setAttribute('aria-pressed',String(id===model));
 $('simulator-model').value=model;
 document.querySelector('.player-card').dataset.simulator=model;
 document.querySelector('.instrument').hidden=model==='gameboy';
 $('gameboy-note').hidden=model!=='gameboy';
 if(model==='gameboy'){
   $('palette').value='0';$('palette').dispatchEvent(new Event('change'));
   return;
 }
 $('instrument-name').textContent=model==='fm1'?'FM-1':'SMK37';
 const cfg=simulatorMappings[model],blacks=[1,3,6,8,10];let whites=0,black=0;const whiteTotal=Array.from({length:cfg.count},(_,i)=>i).filter(i=>!blacks.includes((i+cfg.base)%12)).length;
 $('hardware-keys').replaceChildren();
 for(let i=0;i<cfg.count;i++){
   const isBlack=blacks.includes((i+cfg.base)%12),num=isBlack?++black:++whites,bit=cfg.keys[i],color=isBlack?'black':'white';
   const b=button(bit,`${color} key ${num}${bit?' — '+names[bit]:' — unassigned'}`,color);
   b.innerHTML=`<span class="key-action">${symbols[bit]||''}</span><span class="key-number">${num}</span>`;
   if(isBlack){b.style.left=((whites-.31)/whiteTotal*100)+'%';b.style.width=(.62/whiteTotal*100)+'%';}
   $('hardware-keys').append(b);
 }
 $('hardware-pads').hidden=model!=='smk37';$('hardware-pads').replaceChildren();
 if(model==='smk37')for(let i=0;i<16;i++){
   const bit=cfg.pads[i],row=i<8?'Top':'Bottom',num=i%8+1,b=button(bit,`${row} pad ${num}${bit?' — '+names[bit]:' — unassigned'}`,bit&&i>=14?'rotate':'');
   b.innerHTML=`<span>${symbols[bit]||'·'}</span><small>${row.toUpperCase()} ${num}</small>`;$('hardware-pads').append(b);
 }
 $('hardware-transport').replaceChildren();
 for(const [bit,text] of [[8,'PLAY / START'],[4,'RECORD / SELECT']]){const b=button(bit,text,'');b.textContent=text;$('hardware-transport').append(b);}
 $('hardware-legend').textContent=model==='fm1'?'White 1 / 3 / 5: left / down / right · Black 2 or 3: up · Two rightmost whites: B / A.':'White 4 / 6 / 8: left / down / right · Black 3 or 4: up · White 21: A, white 22: B. Pads: bottom 1 / 2 / 3 move, top 2 up, bottom 7 / 8 B / A.';
}
if($('hardware')){
 for(const id of ['fm1','smk37','gameboy'])$('sim-'+id).onclick=()=>renderSimulator(id);
 $('simulator-model').onchange=e=>renderSimulator(e.target.value);
 const host=$('hardware');
 host.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-control-bit]');if(!b||b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);send('sim-'+e.pointerId,Number(b.dataset.controlBit),true);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,e=>send('sim-'+e.pointerId,0,false));
 host.addEventListener('click',e=>{const b=e.target.closest('[data-control-bit]');if(!b||b.disabled||e.detail)return;const source='sim-key-'+Date.now();send(source,Number(b.dataset.controlBit),true);setTimeout(()=>send(source,0,false),100);});
 renderSimulator('fm1');
}
