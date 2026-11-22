/* The Diestroyers - KPI Registry + Navigation Registry */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  D.registry = D.registry || {};

  D.registry.kpis = [
    {id:"omzet", key:"Omzet", label:"Omzet", type:"bedrag", unit:"€", page:"kpi.html?kpi=omzet", legacyPage:"omzet.html", category:"core"},
    {id:"life", key:"Life", label:"Life", type:"stuks", unit:"stuks", page:"kpi.html?kpi=life", legacyPage:"life.html", category:"big7"},
    {id:"insurance", key:"Insurance", label:"Insurance", type:"ratio", unit:"%", page:"kpi.html?kpi=insurance", legacyPage:"insurance.html", category:"big7", detail:["Mobiel","Multimedia"]},
    {id:"abonnementen", key:"Abo", label:"Abonnementen", type:"ratio", unit:"%", page:"kpi.html?kpi=abonnementen", legacyPage:"abonnementen.html", category:"big7"},
    {id:"dsp", key:"DSP", label:"DSP", type:"ratio", unit:"%", page:"kpi.html?kpi=dsp", legacyPage:"dsp.html", category:"big7"},
    {id:"spg", key:"SPG", label:"SPG", type:"ratio", unit:"%", page:"kpi.html?kpi=spg", legacyPage:"spg.html", category:"big7"},
    {id:"srp", key:"SRP", label:"SRP", type:"ratio", unit:"%", page:"kpi.html?kpi=srp", legacyPage:"srp.html", category:"big7"},
    {id:"accessoires", key:"Accessoires", label:"Accessoires", type:"accessoires", unit:"€", page:"kpi.html?kpi=accessoires", legacyPage:"accessoires.html", category:"core"},
    {id:"link", key:"Link", label:"Link", type:"percentage", unit:"%", page:"kpi.html?kpi=link", legacyPage:"link.html", category:"big7", detail:["GEM","PEM","RTV","COMM","MM"]},
    {id:"monster", key:"Monster", label:"Monster", type:"bedrag", unit:"€", page:"kpi.html?kpi=monster", legacyPage:"accessoires.html", category:"sub"},
    {id:"buyway", key:"BuyWay", label:"BuyWay", type:"ratio", unit:"%", page:"kpi.html?kpi=buyway", legacyPage:"buyway.html", category:"core"},
    {id:"leaders", key:"Leaders", label:"Leaders", type:"ratio", unit:"%", page:"kpi.html?kpi=leaders", legacyPage:"leaders.html", category:"core"},
    {id:"s", key:"S", label:"Laatste stuks - S", type:"percentage", unit:"%", page:"kpi.html?kpi=s", legacyPage:"laatste-stuks.html", category:"core"},
    {id:"nps", key:"NPS", label:"NPS", type:"score", unit:"score", page:"kpi.html?kpi=nps", legacyPage:"nps.html", category:"core"}
  ];

  D.registry.kpiById = Object.fromEntries(D.registry.kpis.map(k => [k.id, k]));
  D.registry.kpiByKey = Object.fromEntries(D.registry.kpis.map(k => [k.key, k]));

  D.registry.navigation = [
    {id:"home", label:"Home", url:"home.html", type:"dropdown", items:"home"},
    {id:"focus", label:"Focus Analyse", url:"mission-control.html", type:"link"},
    {id:"results", label:"Resultaten", url:"verkopersresultaten.html", type:"dropdown", items:"sellers"},
    {id:"kpis", label:"KPIs", url:"kpi.html?kpi=omzet", type:"dropdown", items:"kpis"},
    {id:"district", label:"District", url:"district.html", type:"link"},
    {id:"agenda", label:"Agenda", url:"agenda.html", type:"link"},
    {id:"admin", label:"Admin", url:"admin.html", type:"link"}
  ];
})(window);
