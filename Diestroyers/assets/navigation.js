/* The Diestroyers - Central Navigation Renderer */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  const esc = s => D.components?.esc ? D.components.esc(s) : String(s ?? "");
  function activeSellers(){
    const arr = w.DIESTROYERS_CONFIG_DATA?.verkopers || w.DIESTROYERS_VERKOPERS || [];
    return arr.filter(v=>{
      const a = String(v.Actief ?? v.actief ?? "JA").toLowerCase();
      return !(a==="nee"||a==="no"||a==="0"||a==="false"||a==="n");
    });
  }
  function sellerId(v){return String(v.PersoneelsNr ?? v.personeelsNr ?? v.id ?? "").trim();}
  function sellerName(v){return String(v.Naam ?? v.naam ?? "").trim();}
  function sellerUrl(v){
    const id = sellerId(v);
    return id ? `verkoper.html?id=${encodeURIComponent(id)}` : `verkoper.html?naam=${encodeURIComponent(sellerName(v))}`;
  }
  function kpiItems(){
    return (D.registry?.kpis || []).map(k => `<a href="${esc(k.page)}">${esc(k.label)}</a>`).join("");
  }
  function homeItems(){
    return `<a href="home.html">Dashboard</a><a href="export.html">Export</a>`;
  }
  function sellerItems(){
    return `<a href="diest.html">Diest</a><a href="verkopersresultaten.html">Alle verkopers</a>` + activeSellers().map(v => `<a href="${esc(sellerUrl(v))}">${esc(sellerName(v))}</a>`).join("");
  }
  function itemHtml(item){
    if(item.type === "dropdown"){
      const items = item.items === "kpis" ? kpiItems() : (item.items === "home" ? homeItems() : sellerItems());
      return `<div class="dropdown"><a class="dropbtn" href="${esc(item.url)}">${esc(item.label)}</a><div class="submenu">${items}</div></div>`;
    }
    return `<a class="navitem" href="${esc(item.url)}">${esc(item.label)}</a>`;
  }
  function currentFile(){return (location.pathname.split("/").pop() || "home.html").toLowerCase();}
  function markActive(nav){
    const file = currentFile();
    nav.querySelectorAll("a[href]").forEach(a=>{
      const href = (a.getAttribute("href") || "").split("?")[0].toLowerCase();
      if(href && href === file) a.classList.add("active");
      if(file === "kpi.html" && (a.getAttribute("href")||"").includes("kpi.html")) {
        const cur = new URLSearchParams(location.search).get("kpi") || new URLSearchParams(location.search).get("k") || "";
        const own = new URLSearchParams((a.getAttribute("href")||"").split("?")[1]||"").get("kpi") || "";
        if(cur && own === cur) a.classList.add("active");
      }
    });
  }
  function renderNavigation(){
    const navs = document.querySelectorAll("header.topbar nav.nav");
    if(!navs.length) return;
    const menu = (D.registry?.navigation || []).map(itemHtml).join("");
    navs.forEach(nav=>{
      const tvShortcut = currentFile() === "home.html" ? `<a class="tv-menu-link" href="tv.html" title="TV dashboard" aria-label="TV dashboard"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="11.5" rx="2.2"></rect><path d="M8 20h8M10 16.5 9 20M14 16.5l1 3.5"></path></svg><span>TV</span></a>` : "";
      nav.innerHTML = `<a class="brand" href="home.html">The <span>Diestroyers</span></a>${tvShortcut}<button class="hamb" type="button">Menu</button><div class="menu">${menu}</div>`;
      nav.querySelector(".hamb")?.addEventListener("click",()=>nav.querySelector(".menu")?.classList.toggle("open"));
      nav.querySelectorAll(".dropdown .dropbtn").forEach(btn=>btn.addEventListener("click",e=>{
        if(matchMedia("(max-width:820px)").matches){ e.preventDefault(); btn.closest(".dropdown")?.classList.toggle("open"); }
      }));
      markActive(nav);
    });
  }
  D.navigation = {render:renderNavigation};
  document.addEventListener("DOMContentLoaded", renderNavigation);
  window.addEventListener("load", renderNavigation);
})(window);
