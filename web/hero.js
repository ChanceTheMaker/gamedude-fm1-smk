const host=document.getElementById('hero-device'),caption=document.getElementById('hero-caption'),motion=document.getElementById('hero-motion');
const scenes=[
 {art:'fm1',game:'tetris',label:'FM-1 · Tetris',screen:[200,95,103,93],wide:[25,45,590,350],zoom:[183,90,137,103]},
 {art:'smk-pro',game:'mario',label:'SMK-37 Pro · Super Mario Land',screen:[137,80,72,65],wide:[10,32,940,370],zoom:[124,76,98,74]},
 {art:'smk-elite',game:'tennis',label:'SMK-37 Elite · Tennis',screen:[137,80,72,65],wide:[10,32,940,370],zoom:[124,76,98,74]}
];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,index=0,svg=null,start=0,token=0;
const cache=new Map();
function sync(){motion.textContent=paused?'Play tour':'Pause tour';motion.setAttribute('aria-pressed',String(paused));document.querySelectorAll('[data-hero]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.hero)===index)));}
async function show(next){
 const request=++token;index=next;svg=null;sync();const scene=scenes[index];
 try{
 if(!cache.has(scene.art))cache.set(scene.art,fetch('artwork/'+scene.art+'.svg').then(r=>{if(!r.ok)throw Error('Artwork unavailable');return r.text();}));
 let text=await cache.get(scene.art);if(request!==token)return;
 // Isolate paint-server IDs from the playable simulator on this same page.
 const ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of ids)text=text.replaceAll('id="'+id+'"','id="hero-'+id+'"').replaceAll('#'+id+'"','#hero-'+id+'"').replaceAll('#'+id+')','#hero-'+id+')');
 const art=new DOMParser().parseFromString(text,'image/svg+xml').documentElement;art.removeAttribute('aria-label');art.removeAttribute('aria-labelledby');art.setAttribute('aria-hidden','true');art.querySelector('#hero-game-screen-brand')?.remove();
 const shot=document.createElementNS('http://www.w3.org/2000/svg','image');['x','y','width','height'].forEach((key,i)=>shot.setAttribute(key,scene.screen[i]));shot.setAttribute('href','artwork/game-'+scene.game+'.png');shot.setAttribute('preserveAspectRatio','none');shot.style.imageRendering='pixelated';art.append(shot);
 art.setAttribute('viewBox',scene.wide.join(' '));host.replaceChildren(art);host.setAttribute('aria-label',scene.label);caption.textContent=scene.label;svg=art;start=performance.now();
 }catch{caption.textContent='GameDude · FM-1 + SMK';}
}
function frame(now){
 requestAnimationFrame(frame);if(!svg||paused||document.hidden){start=now;return;}
 const t=(now-start)/1000,scene=scenes[index];
 if(t>=10){show((index+1)%scenes.length);return;}
 const progress=Math.min(1,Math.max(0,(t-3.5)/3)),ease=progress*progress*(3-2*progress);
 svg.setAttribute('viewBox',scene.wide.map((v,i)=>v+(scene.zoom[i]-v)*ease).join(' '));
}
motion.onclick=()=>{paused=!paused;if(!paused)show(index);sync();};
for(const b of document.querySelectorAll('[data-hero]'))b.onclick=()=>show(Number(b.dataset.hero));
reduced.addEventListener('change',e=>{paused=e.matches;show(index);sync();});
show(0);requestAnimationFrame(frame);
