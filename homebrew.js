// Only audited local cartridges from the public manifest can enter this picker.
export async function verifiedCartridge(game,fetcher=fetch){
 if(!/^[a-z0-9-]+\.gb$/.test(game.file)||!Number.isSafeInteger(game.bytes)||game.bytes<32768||game.bytes>524288||!/^[a-f0-9]{64}$/.test(game.sha256))throw Error('Invalid homebrew catalog entry.');
 const response=await fetcher(new URL('homebrew/'+game.file+'?sha='+game.sha256,import.meta.url));
 if(!response.ok)throw Error('Cartridge download failed. Please try again.');
 const bytes=await response.arrayBuffer();
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(bytes.byteLength!==game.bytes||sha!==game.sha256)throw Error('Cartridge integrity check failed. Reload the page and try again.');
 return bytes;
}
export async function initHomebrew({canLoad,startAudio,load}){
 const $=id=>document.getElementById(id),select=$('stock-game'),play=$('stock-play'),message=$('stock-status');
 let games=[],pending=false;
 try{
  const r=await fetch(new URL('homebrew/catalog.json',import.meta.url),{cache:'no-store'});
  if(!r.ok)throw Error('Included library unavailable. You can still load your own ROM.');
  const catalog=await r.json();if(catalog.schema!==1||!Array.isArray(catalog.games)||!catalog.games.length)throw Error('Included library is empty.');
  games=catalog.games;
  select.replaceChildren(...games.map(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.title+' / '+g.genre;return o;}));
  const show=()=>{const g=games.find(g=>g.id===select.value);$('stock-description').textContent=g.description;$('stock-controls').textContent=g.controls;const a=$('stock-creator');a.textContent=g.author;const url=new URL(g.download_source);a.href=url.protocol==='https:'?url.href:'#';message.textContent='';};
  select.onchange=show;show();select.dataset.ready='true';select.disabled=play.disabled=!canLoad();
  play.onclick=async()=>{
   if(pending||!canLoad())return;pending=true;select.dataset.loading='true';play.disabled=true;select.disabled=true;startAudio();
   const g=games.find(g=>g.id===select.value);message.textContent='Opening '+g.title+'...';
   try{const bytes=await verifiedCartridge(g);if(!canLoad())throw Error('Finish the current operation, then select this cartridge again.');const ok=await load(bytes,g.title+'.gb');message.textContent=ok?g.title+' loaded. Play here or send it to your device.':'Unable to open this cartridge. See player status.';}
   catch(e){message.textContent=e.message;}
   finally{pending=false;delete select.dataset.loading;play.disabled=select.disabled=!canLoad();}
  };
 }catch(e){message.textContent=e.message;select.disabled=play.disabled=true;}
}
