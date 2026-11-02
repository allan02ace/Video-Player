const C='ampm-v21';
const A=['./','index.html','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const q=e.request;
  if(q.method!=='GET'||!q.url.startsWith(self.location.origin))return;
  e.respondWith(
    fetch(q).then(r=>{
      if(r.status===200&&r.type==='basic'){const cp=r.clone();caches.open(C).then(c=>c.put(q,cp)).catch(()=>{})}
      return r;
    }).catch(()=>caches.match(q,{ignoreSearch:true}).then(m=>m||(q.mode==='navigate'?caches.match('index.html'):Response.error())))
  );
});
