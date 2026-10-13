const logo=new Image();logo.src=new URL('gamedude-logo.svg',import.meta.url).href;
const ready=logo.decode().catch(()=>{});
function paint(ctx,y){ctx.fillStyle='#080b19';ctx.fillRect(0,0,160,144);if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,7,y,146,28);}
export async function idleLogo(ctx){await ready;paint(ctx,55);ctx.fillStyle='#6c819e';ctx.font='6px monospace';ctx.textAlign='center';ctx.fillText('INSERT A CARTRIDGE',80,100);}
export function landingDing(audio,volume){
  if(!audio||audio.state!=='running'||volume<=0)return;
  const t=audio.currentTime,level=audio.createGain();level.gain.setValueAtTime(.045*volume/100,t);level.gain.exponentialRampToValueAtTime(.0001,t+.22);level.connect(audio.destination);
  for(const [frequency,mix] of [[1959,1],[3918,.22]]){const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=frequency;gain.gain.value=mix;osc.connect(gain);gain.connect(level);osc.start(t);osc.stop(t+.23);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  setTimeout(()=>level.disconnect(),300);
}
export async function bootSplash(ctx,ding){
  await ready;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  await new Promise(resolve=>{let start,landed=false;function frame(now){start??=now;const t=reduced?1:Math.min(1,(now-start)/650);paint(ctx,-32+87*t*t);if(t===1&&!landed){landed=true;ding();setTimeout(resolve,250);return;}requestAnimationFrame(frame);}requestAnimationFrame(frame);});
}
