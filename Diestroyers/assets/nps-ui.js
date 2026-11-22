/* The Diestroyers - NPS UI */
(function(w){
  "use strict";
  const N=()=>w.DIESTROYERS_NPS||{};
  const cfg=()=>w.DIESTROYERS_CONFIG_DATA||{};
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const period=()=>new URLSearchParams(location.search).get("periode") || N().latestPeriod || new Date().toISOString().slice(0,7);
  const fmtNps=v=>v===null||v===undefined?"—":new Intl.NumberFormat("nl-BE",{maximumFractionDigits:1}).format(v);
  const dateFmt=s=>{const d=new Date(String(s).replace(" ","T"));return isNaN(d)?s:new Intl.DateTimeFormat("nl-BE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d)};
  const target=(type,name,p)=>{
    const rows=cfg().targets||[];
    const r=rows.find(x=>String(x.Periode)===p&&String(x.EntiteitType||"").toLowerCase()===type&&String(x.Naam||"").toLowerCase()===String(name||"").toLowerCase());
    const t=Number(r?.NPSTarget||0); return t||70;
  };
  const status=(n,t)=>n===null||n===undefined?"none":n>=t?"ok":n>=t*.9?"close":"bad";
  const stats=(title,s,t)=>`<section class="nps-stat-group"><h3>${esc(title)}</h3><div class="nps-stat-grid">
    ${card("NPS",fmtNps(s?.nps),`Target ${fmtNps(t)}`,status(s?.nps,t))}
    ${card("Promotoren",s?.promoters||0,"Score 9–10","ok")}
    ${card("Neutralen",s?.passives||0,"Score 7–8","close")}
    ${card("Detractoren",s?.detractors||0,"Score 0–6","bad")}
    ${card("Kaartjes",s?.cards||0,"Enquêtes","none")}
  </div></section>`;
  const card=(label,value,sub,st)=>`<article class="nps-stat ${st}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`;
  const comment=(x,showSeller=true)=>`<article class="nps-comment ${String(x.type||"").toLowerCase()}">
    <div class="nps-comment-head"><strong>${esc(x.score)} · ${esc(x.type)}</strong><span>${esc(dateFmt(x.dateIso||x.date))}${showSeller?` · ${esc(x.sellerName||"Winkel")}`:""}</span></div>
    <p>${esc(x.comment)}</p>
  </article>`;
  function sellerId(){return new URLSearchParams(location.search).get("id")||""}
  function sellerNameById(id){
    const v=(cfg().verkopers||[]).find(x=>String(x.PersoneelsNr)===String(id));
    return v?.Naam||N().sellers?.[id]?.name||id;
  }
  function monthHistory(source){
    const ps=(N().periods||[]).slice().reverse();
    return `<div class="nps-history">${ps.map(p=>{const s=source?.[p]||{};return `<div><span>${esc(p)}</span><strong>${fmtNps(s.nps)}</strong><small>${s.cards||0} kaartjes · ${s.promoters||0}/${s.passives||0}/${s.detractors||0}</small></div>`}).join("")}</div>`;
  }
  function shopHtml(){
    const p=period(), m=N().store?.month?.[p]||{}, y=N().store?.ytd?.[p]||{}, t=target("winkel",cfg().shop?.naam||"Diest",p);
    const comments=(N().comments||[]).slice().sort((a,b)=>String(b.dateIso).localeCompare(String(a.dateIso)));
    return `<section class="intel-hero"><div class="intel-kicker">Klantbeleving</div><h1 class="intel-title">NPS Winkel</h1><div class="intel-sub">${esc(p)}</div></section>
      ${stats("Huidige maand",m,t)}${stats("Year to date",y,t)}
      <section class="nps-two"><div class="analysis-panel"><h2>Maandhistoriek</h2>${monthHistory(N().store?.month)}</div>
      <div class="analysis-panel"><h2>Controle</h2><div class="nps-control">${Object.entries(N().control||{}).filter(([k,v])=>typeof v!=="object").map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div></div></section>
      <section class="analysis-panel"><h2>Alle commentaren</h2><div class="nps-comments">${comments.length?comments.map(x=>comment(x,true)).join(""):"<p>Geen commentaren.</p>"}</div></section>`;
  }
  function sellerHtml(id){
    const p=period(), seller=N().sellers?.[id]||{name:sellerNameById(id),month:{},ytd:{},comments:[]}, t=target("verkoper",seller.name,p);
    const m=seller.month?.[p]||{}, y=seller.ytd?.[p]||{};
    const comments=(seller.comments||[]).slice().sort((a,b)=>String(b.dateIso).localeCompare(String(a.dateIso)));
    return `<section class="analysis-panel nps-seller-section"><h2>NPS</h2>${stats("Huidige maand",m,t)}${stats("Year to date",y,t)}
      <h3>Maandhistoriek</h3>${monthHistory(seller.month)}
      <h3>Commentaren</h3><div class="nps-comments">${comments.length?comments.map(x=>comment(x,false)).join(""):"<p>Geen gekoppelde commentaren.</p>"}</div></section>`;
  }
  function boot(){
    const kpi=document.querySelector('#kpi-dossier-root[data-kpi="nps"]');
    if(kpi) kpi.innerHTML=shopHtml();
    const diest=document.getElementById("diest-root");
    if(diest && !diest.querySelector(".nps-shop-section")) {
      const s=document.createElement("section");s.className="nps-shop-section";s.innerHTML=shopHtml();diest.appendChild(s);
    }
    const seller=document.getElementById("seller-root")||document.getElementById("seller-dossier-root")||document.getElementById("verkoper-root");
    if(seller && !seller.querySelector(".nps-seller-section")) seller.insertAdjacentHTML("beforeend",sellerHtml(sellerId()));
  }
  document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,30));
  window.addEventListener("load",()=>setTimeout(boot,60));
})(window);
