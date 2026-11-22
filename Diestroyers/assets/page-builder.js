/* The Diestroyers - Generic Page Builder */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  function renderGenericKpi(){
    const root = document.getElementById("kpi-dossier-root");
    if(!root) return;
    const params = new URLSearchParams(location.search);
    const kpi = params.get("kpi") || params.get("k") || root.dataset.kpi || "omzet";
    root.dataset.kpi = kpi;
    if(typeof w.renderKpiDossier === "function") w.renderKpiDossier();
  }
  function normalizeLegacyKpiPages(){
    const root = document.getElementById("kpi-dossier-root");
    if(!root) return;
    const file = (location.pathname.split("/").pop() || "").replace(".html","");
    const match = (D.registry?.kpis || []).find(k => (k.legacyPage || "").replace(".html","") === file);
    if(match && !root.dataset.kpi) root.dataset.kpi = match.id;
  }
  function boot(){
    normalizeLegacyKpiPages();
    renderGenericKpi();
  }
  D.pageBuilder = {boot, renderGenericKpi};
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
})(window);
