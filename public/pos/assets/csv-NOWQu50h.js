function i(e){return`"${String(e??"").replace(/"/g,'""')}"`}function u(e,n){return[e,...n||[]].map(t=>(t||[]).map(i).join(",")).join(`
`)}function d(e,n,t,l={}){const o=u(e,n);if(l.download===!1)return o;const a=new Blob([o],{type:"text/csv"}),r=URL.createObjectURL(a),c=document.createElement("a");return c.href=r,c.download=t,c.click(),URL.revokeObjectURL(r),o}export{d};
