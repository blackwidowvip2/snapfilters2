import fs from 'fs'; import { PNG } from 'pngjs';
const SRC='C:/Users/Black/Desktop/AGF logo.png';
const OUT='public/images/agf_fan.png';
const png=PNG.sync.read(fs.readFileSync(SRC));
const {width:W,height:H,data}=png;
const idx=(x,y)=>(y*W+x)*4;
function isBg(i){const r=data[i],g=data[i+1],b=data[i+2];const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mn>=205 && (mx-mn)<=22;}
// BFS flood fill from border bg pixels
const seen=new Uint8Array(W*H);
const stack=[];
function push(x,y){if(x<0||y<0||x>=W||y>=H)return;const p=y*W+x;if(seen[p])return;if(!isBg(idx(x,y)))return;seen[p]=1;stack.push(p);}
for(let x=0;x<W;x++){push(x,0);push(x,H-1);}
for(let y=0;y<H;y++){push(0,y);push(W-1,y);}
while(stack.length){const p=stack.pop();const x=p%W,y=(p/W)|0;push(x+1,y);push(x-1,y);push(x,y+1);push(x,y-1);}
// set alpha 0 on flooded background
let removed=0;for(let p=0;p<W*H;p++){if(seen[p]){data[p*4+3]=0;removed++;}}
// feather: soften 1px boundary alpha for anti-aliasing
console.log('removed bg px',removed,'of',W*H);
fs.writeFileSync(OUT, PNG.sync.write(png));
console.log('wrote',OUT);
