/* The Diestroyers - Central Configuration */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  /* Admin config-data.js bridge */
  const adminCfg = w.DIESTROYERS_CONFIG_DATA || {};
  D.config = {
    appName: "The Diestroyers",
    storeName: adminCfg.shop?.naam || "Diest",
    shopNr: String(adminCfg.shop?.shopNr || "208"),
    homePage: "home.html",
    focusPage: "mission-control.html",
    resultsPage: "verkopersresultaten.html",
    districtPage: "district.html",
    agendaPage: "agenda.html",
    currentPeriodFallback: new Date().toISOString().slice(0,7),
    big7: adminCfg.big7 || ["life","dsp","insurance","spg","srp","abonnementen","link"],
    theme: {
      red: "#e11919",
      redDark: "#8a1111",
      green: "#2ecc71",
      yellow: "#f2c94c",
      bad: "#ff3434",
      text: "#f6f6f6",
      muted: "#b7b7b7",
      panel: "#111111",
      panel2: "#181818"
    },
    points: {
      green: 3,
      yellow: 1,
      red: 0,
      greenThreshold: 100,
      yellowThreshold: 90
    },
    sTargets: {
      januaryJulyGreen: 50,
      januaryJulyYellow: 40,
      defaultGreen: 35,
      defaultYellow: 28
    }
  };
})(window);
