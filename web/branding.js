const logo=new Image();logo.src=new URL('gamedude-logo.svg?v=solid1',import.meta.url).href;
const ready=logo.decode().catch(()=>{});
const colors=['#29e6ff','#65eebb','#b8ef92','#ffe45a','#ff7890','#d975e8','#ad8bff','#6aceff'];
export const SPLASH_LAND_MS=500,SPLASH_END_MS=1500;
function background(ctx){ctx.fillStyle='#080b19';ctx.fillRect(0,0,160,144);}
function paint(ctx,y){background(ctx);if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,7,Math.round(y),146,Math.round(146*logo.naturalHeight/logo.naturalWidth));}
export async function idleLogo(ctx){await ready;paint(ctx,55);ctx.fillStyle='#6c819e';ctx.font='6px monospace';ctx.textAlign='center';ctx.fillText('INSERT A CARTRIDGE',80,100);}
export function splashY(ms){
 if(ms<SPLASH_LAND_MS)return -32+87*(ms/SPLASH_LAND_MS)**2;
 if(ms<660){const u=(ms-500)/160;return 55-8*4*u*(1-u);}
 if(ms<800){const u=(ms-660)/140;return 55-3*4*u*(1-u);}
 return 55;
}
export function paintSplash(ctx,ms,reduced=false){
 paint(ctx,reduced?55:splashY(ms));
 if(reduced)return;
 // A small radial burst, drawn as crisp pixels rather than a screen flash.
 if(ms>=500&&ms<1100){const t=(ms-500)/600;ctx.globalAlpha=1-t;
  for(let i=0;i<12;i++){const angle=i*Math.PI/6,reach=12+t*39;ctx.fillStyle=colors[i%8];const x=80+Math.cos(angle)*reach*1.65,y=69+Math.sin(angle)*reach;ctx.fillRect(Math.round(x),Math.round(y),2,2);}
  ctx.globalAlpha=1;
 }
 // A single travelling twinkle above the settled wordmark.
 if(ms>=850&&ms<1350){const t=(ms-850)/500,x=Math.round(12+t*136),y=47;ctx.fillStyle=colors[Math.min(7,Math.floor(t*8))];ctx.fillRect(x-3,y,7,1);ctx.fillRect(x,y-3,1,7);ctx.fillStyle='#eefaff';ctx.fillRect(x,y,1,1);}
 if(ms>=800){ctx.fillStyle='#8998b6';ctx.font='6px monospace';ctx.textAlign='center';ctx.fillText('LET’S PLAY!',80,103);}
}
export function landingDing(audio,volume){
 if(!audio||audio.state!=='running'||volume<=0)return;
 const t=audio.currentTime;
 for(const [frequency,delay] of [[1046.5,0],[1318.5,.09],[1568,.20]]){
  const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=frequency;
  gain.gain.setValueAtTime(0,t+delay);gain.gain.linearRampToValueAtTime(.022*volume/100,t+delay+.006);gain.gain.exponentialRampToValueAtTime(.00001,t+delay+.48);
  osc.connect(gain);gain.connect(audio.destination);osc.start(t+delay);osc.stop(t+delay+.5);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
}
export async function bootSplash(ctx,ding){
 await ready;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 await new Promise(resolve=>{let start,landed=false;
  function frame(now){start??=now;const ms=Math.max(0,now-start);paintSplash(ctx,ms,reduced);
   if(!landed&&(reduced||ms>=SPLASH_LAND_MS)){landed=true;ding();}
   if(ms>=(reduced?750:SPLASH_END_MS)){resolve();return;}requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
 });
}
