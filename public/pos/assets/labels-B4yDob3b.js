import{z as l,e as r,A as p,l as h}from"./index-CgCdi-yR.js";const g=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"],f=104,u=105,y=106;function v(e){const t=String(e??"").replace(/[^\x20-\x7e]/g,"?");if(!t)throw new Error("Nothing to encode");const i=[];if(/^\d+$/.test(t)&&t.length>=4&&t.length%2===0){i.push(u);for(let a=0;a<t.length;a+=2)i.push(Number(t.slice(a,a+2)))}else{i.push(f);for(const a of t)i.push(a.charCodeAt(0)-32)}const s=i.reduce((a,o,n)=>a+o*(n===0?1:n),0)%103;return[...i,s,y]}function _(e,{height:t=40,quiet:i=10}={}){let s;try{s=v(e)}catch{return""}const a=s.map(c=>g[c]).join("").split("").map(Number),o=a.reduce((c,d)=>c+d,0)+i*2;let n=i;const m=[];return a.forEach((c,d)=>{d%2===0&&m.push(`<rect x="${n}" y="0" width="${c}" height="${t}"/>`),n+=c}),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o} ${t}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="barcode"><rect width="${o}" height="${t}" fill="#fff"/><g fill="#000">${m.join("")}</g></svg>`}function w(e={}){return`<!doctype html><html><head><meta charset="utf-8"><title>Prescription Label</title>
<style>
  @page { size: 50mm 30mm; margin: 2mm; }
  body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111; }
  .label { width: 46mm; min-height: 26mm; margin: 0 auto; padding: 2mm; box-sizing: border-box; }
  .pharmacy { text-align: center; font-size: 10px; font-weight: 700; margin-bottom: 2mm; }
  .drug { font-size: 12px; font-weight: 700; margin-bottom: 1mm; }
  .line { font-size: 9px; line-height: 1.35; margin-bottom: 1mm; overflow-wrap: anywhere; }
</style></head><body>
  <div class="label">
    <div class="pharmacy">${r(e.pharmacyName||"RemedacarePOS")}</div>
    <div class="drug">${r(e.drugName||"Medicine")}</div>
    <div class="line"><strong>Patient:</strong> ${r(e.patientName||"Walk-in")}</div>
    <div class="line"><strong>Dose:</strong> ${r(e.dose||"-")}</div>
    <div class="line">${r(e.instructions||"-")}</div>
    <div class="line"><strong>Date:</strong> ${r(e.dispensedDate||"")}</div>
    <div class="line">Pharmacist: __________________</div>
    <div class="line">${r(e.pharmacistName||"")}</div>
  </div>
</body></html>`}function x(e={}){return[{type:"text",text:e.pharmacyName||"RemedacarePOS",align:"center",bold:!0},{type:"rule"},{type:"text",text:e.drugName||"Medicine",bold:!0,size:"large"},{type:"row",left:"Patient",right:e.patientName||"Walk-in"},{type:"text",text:`Dose: ${e.dose||"-"}`},{type:"text",text:e.instructions||"-"},{type:"row",left:"Date",right:e.dispensedDate||""},{type:"text",text:`Pharmacist: ${e.pharmacistName||"________________"}`},{type:"feed",lines:1}]}async function N(e,t=h()){const i=p(t);if(i.id.startsWith("escpos-"))try{return await i.printLines(x(e),{settings:{...t,copies:1}}),{ok:!0}}catch{}return l(w(e),{settings:t,paperWidth:50})}function b(e=[],{width:t=50,height:i=25,copies:s=1}={}){const o=e.flatMap(n=>Array.from({length:Math.max(1,Math.min(Number(s)||1,50))},()=>n)).map(n=>`<div class="label">
    <div class="name">${r(n.name)}</div>
    ${_(n.code,{height:34})}
    <div class="row"><span>${r(n.code)}</span><span>${r(n.price||"")}</span></div>
  </div>`).join("");return`<!doctype html><html><head><meta charset="utf-8"><title>Barcode labels</title>
<style>
  @page { size: ${t}mm ${i}mm; margin: 0; }
  body { margin: 0; font-family: Arial, sans-serif; color: #000; }
  .label { width: ${t}mm; height: ${i}mm; box-sizing: border-box; padding: 1.5mm 2mm; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .name { font-size: 9px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  svg { width: 100%; height: 11mm; }
  .row { display: flex; justify-content: space-between; font-size: 8px; font-family: monospace; }
</style></head><body>${o}</body></html>`}function P(e,t={}){return l(b(e,t),{paperWidth:t.width||50})}export{N as a,P as p};
