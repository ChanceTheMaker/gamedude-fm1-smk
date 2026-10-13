// Audio is a consumer; browser audio startup never blocks the emulator.
class GameDudeAudio extends AudioWorkletProcessor {
  constructor(){super();this.ring=new Float32Array(8192*2);this.read=0;this.write=0;this.phase=0;
    this.port.onmessage=({data:m})=>{
      if(m.type==='flush'){this.read=this.write=0;this.phase=0;return;}
      if(m.type!=='pcm')return;
      const p=new Int16Array(m.bytes),frames=p.length/2;
      if(this.write-this.read+frames>4096)this.read=this.write;
      for(let i=0;i<frames;i++){const j=((this.write+i)&8191)*2;this.ring[j]=p[i*2]/32768;this.ring[j+1]=p[i*2+1]/32768;}
      this.write+=frames;
    };
  }
  process(inputs,outputs){const out=outputs[0];
    for(let i=0;i<out[0].length;i++){
      if(this.read>=this.write){out[0][i]=out[1][i]=0;continue;}
      const j=(this.read&8191)*2,k=((this.read+1<this.write?this.read+1:this.read)&8191)*2;
      out[0][i]=this.ring[j]+(this.ring[k]-this.ring[j])*this.phase;
      out[1][i]=this.ring[j+1]+(this.ring[k+1]-this.ring[j+1])*this.phase;
      this.phase+=44100/sampleRate;const n=Math.floor(this.phase);this.phase-=n;this.read=Math.min(this.read+n,this.write);
    }return true;
  }
}
registerProcessor('gamedude-audio',GameDudeAudio);
