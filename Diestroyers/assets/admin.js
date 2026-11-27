/* Scoreblad-configuratiebeheer. Publiceert het bestaande config-data.js-formaat. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? "").trim().toLowerCase();
  const escape = value => String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const base = window.DIESTROYERS_CONFIG_DATA;
  const state = JSON.parse(JSON.stringify(base || {}));
  const monthly = window.DIESTROYERS_TV_INCENTIVES;
  const december = window.DIESTROYERS_DECEMBER;
  const configEndpoint = "https://api.github.com/repos/michske86/VDB208Tools/contents/Diestroyers/assets/config-data.js";
  const tokenKey = "diestroyers.admin.github-token";
  const adminCookie = "diestroyers_admin_open";
  const adminDigest = "cfc296e3e9d28185380f4a1ecbb6531be86f830f3f224785e6f23f7653fdfd91";
  const months = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
  const kpis = [
    ["OmzetTarget","Omzet","€"],["LifeTarget","Life","stuks"],["InsuranceTargetPct","Insurance","%"],
    ["AboTargetPct","Abonnementen","%"],["DSPTargetPct","DSP","%"],["SPGTargetPct","SPG","%"],
    ["SRPTargetPct","SRP","%"],["AccessoiresTargetPct","Accessoires","% van omzet"],["LinkTargetPct","Link","%"],
    ["MonsterTarget","Monster","€"],["NPSTarget","NPS","score"]
  ];
  const inactive = new Set(["nee","no","0","false","n","inactief"]);
  const active = row => !inactive.has(norm(row.Actief ?? row.actief ?? "ja"));
  const period = (year,index) => `${year}-${String(index+1).padStart(2,"0")}`;
  const alias = field => field[0].toLowerCase()+field.slice(1);
  const sellerDrafts = new WeakSet();
  let published = JSON.stringify(base);
  let remembered = readToken();

  function showEntry() {
    const app = $("adminApp"), dialog = $("adminEntry");
    const unlock = () => { app.inert = false; if (dialog.open) dialog.close(); $("adminSection").focus(); };
    if (document.cookie.split(";").some(item=>item.trim()===adminCookie+"=1")) {
      unlock();
      return;
    }
    const form = $("adminEntryForm"), input = $("adminPassword"), message = $("adminEntryMessage");
    const submit = form.querySelector("button");
    dialog.addEventListener("cancel",event=>event.preventDefault());
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        const bytes = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input.value));
        const hash = Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
        if (hash !== adminDigest) {
          message.textContent = "Dat wachtwoord klopt niet.";
          input.select();
          return;
        }
        const path = location.pathname.slice(0,location.pathname.lastIndexOf("/")+1);
        document.cookie = adminCookie+"=1; Path="+path+"; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
        input.value = "";
        unlock();
      } catch {
        message.textContent = "Het wachtwoord kon niet worden gecontroleerd.";
      } finally {
        submit.disabled = false;
      }
    });
    dialog.showModal();
  }

  function updateShop() {
    const name = $("shopName").value.trim(), number = $("shopNr").value.trim();
    if (name && number) {
      for (const target of state.targets) if (norm(target.EntiteitType || target.entiteitType) === "winkel") {
        target.Naam = name;
        target.ShopNr = number;
      }
    }
    state.shop = {...state.shop,naam:name,shopNr:number};
    $("adminShop").textContent = [name,number].filter(Boolean).join(" · ");
  }

  const listDefinitions = {
    verkopers: {id:"sellerTable", name:"Naam", key:"PersoneelsNr", type:"verkoper", labels:[
      ["Naam","Naam"],["PersoneelsNr","Personeelsnummer"],["ShopNr","Winkelnummer"],["Avatar","Avatarbestand"],["ImportAlias","Importalias"],["Actief","Status"]
    ]},
    district: {id:"districtTable", name:"Winkel", key:"ShopNr", type:"districtwinkel", labels:[
      ["Winkel","Winkelnaam"],["ShopNr","Winkelnummer"],["Regio","Regio"],["Actief","Status"]
    ]}
  };
  function renderRecords(kind, selected = -1) {
    const list = state[kind], definition = listDefinitions[kind], container = $(definition.id);
    container.innerHTML = list.map((entry,index)=>{
      const fields = definition.labels.map(([key,label])=>key==="Actief"
        ? `<label class="score-field">${label}<select data-key="${key}"><option value="Ja"${active(entry)?" selected":""}>Actief</option><option value="Nee"${active(entry)?"":" selected"}>Inactief</option></select></label>`
        : `<label class="score-field">${label}<input data-key="${key}" value="${escape(entry[key] ?? entry[alias(key)])}"></label>`).join("");
      const action = kind==="district" ? "Winkel verwijderen" : active(entry) ? "Deactiveren" : "";
      const discard = sellerDrafts.has(entry) ? '<button type="button" class="score-button" data-discard>Nieuwe verkoper verwijderen</button>' : "";
      return `<details class="admin-record"${index===selected?" open":""}><summary>${escape(entry[definition.name] || entry[alias(definition.name)] || "Nieuw")}${active(entry)?"":"<small>Inactief</small>"}</summary>
        <div class="admin-editor"><div class="admin-grid">${fields}</div>${action?`<button type="button" class="score-button" data-remove>${action}</button>`:""}${discard}</div></details>`;
    }).join("") || '<p class="score-empty">Geen records.</p>';
    [...container.querySelectorAll("details")].forEach((panel,index)=>{
      const entry = list[index];
      const summary = panel.querySelector("summary");
      const updateSummary = () => {
        summary.textContent = entry[definition.name] || entry[alias(definition.name)] || "Nieuw";
        if (!active(entry)) {
          const status = document.createElement("small");
          status.textContent = "Inactief";
          summary.append(status);
        }
      };
      for (const field of panel.querySelectorAll("[data-key]")) field.onchange = () => {
        const key = field.dataset.key;
        const previous = entry[key] ?? entry[alias(key)];
        const value = field.value.trim();
        if (key===definition.name && value && list.some(other=>other!==entry && norm(other[key] ?? other[alias(key)])===norm(value))) {
          field.value=previous ?? "";
          status($("saveStatus"),["Deze naam komt al voor. Kies een unieke naam."]);
          return;
        }
        entry[key] = value;
        if (Object.hasOwn(entry,alias(key))) entry[alias(key)] = value;
        if (key===definition.name && value && previous) for (const target of state.targets) {
          if (norm(target.EntiteitType || target.entiteitType)===definition.type && norm(target.Naam || target.naam)===norm(previous)) target.Naam=value;
        }
        if (key==="ShopNr" && value && previous) for (const target of state.targets) {
          if (norm(target.EntiteitType || target.entiteitType)===definition.type &&
            norm(target.Naam || target.naam)===norm(entry[definition.name] || entry[alias(definition.name)])) target.ShopNr=value;
        }
        updateSummary();
      };
      const remove = panel.querySelector("[data-remove]");
      if (remove) remove.onclick = () => {
        if (kind==="verkopers") {
          entry.Actief="Nee";
          if (Object.hasOwn(entry,"actief")) entry.actief="Nee";
        } else if (!confirm("Deze winkel uit de districtconfiguratie verwijderen?")) return;
        else list.splice(index,1);
        renderRecords(kind);
      };
      const discard = panel.querySelector("[data-discard]");
      if (discard) discard.onclick = () => {
        list.splice(index,1);
        if (entry.Naam) state.targets = state.targets.filter(target => norm(target.EntiteitType || target.entiteitType)!=="verkoper" ||
          norm(target.Naam || target.naam)!==norm(entry.Naam));
        renderRecords(kind);
      };
    });
    if (selected>=0) container.querySelector("details[open] input")?.focus();
  }

  function entities() {
    const mode = $("targetMode").value;
    if (mode==="winkel") return [{type:"Winkel", name:state.shop.naam, shopNr:state.shop.shopNr}];
    if (mode==="district") return state.district.filter(active).map(row=>({type:"DistrictWinkel",name:row.Winkel,shopNr:String(row.ShopNr || "")}));
    return state.verkopers.filter(active).map(row=>({type:"Verkoper",name:row.Naam,shopNr:String(row.ShopNr || state.shop.shopNr)}));
  }
  function targetRow(entity,per) {
    return state.targets.find(row=>row.Periode===per && norm(row.EntiteitType || row.entiteitType)===norm(entity.type) &&
      norm(row.Naam || row.naam)===norm(entity.name) && (!(row.ShopNr || row.shopNr) || String(row.ShopNr || row.shopNr)===String(entity.shopNr)));
  }
  function valueFor(row,field) {
    return row?.[field] ?? row?.[alias(field)];
  }
  function setTarget(entity,per,field,value) {
    let row = targetRow(entity,per);
    if (!row) {
      row = {Periode:per, EntiteitType:entity.type, Naam:entity.name, ShopNr:entity.shopNr};
      state.targets.push(row);
    }
    row[field] = value;
    if (Object.hasOwn(row,alias(field))) row[alias(field)] = value;
  }
  function renderTargets() {
    const picker = $("targetEntity"), last = picker.value, items = entities().filter(item=>item.name);
    picker.innerHTML = items.map((item,index)=>`<option value="${index}|${escape(item.name)}">${escape(item.name)}</option>`).join("");
    if ([...picker.options].some(option=>option.value===last)) picker.value=last;
    const entity = items[picker.selectedIndex], year = $("targetYear"), editor = $("targetEditor");
    if (!entity || !year.value || !year.checkValidity()) {
      editor.innerHTML='<p class="score-empty">Kies een geldig jaar en een verkoper of winkel.</p>';
      return;
    }
    const per = period(Number(year.value),Number($("targetMonth").value));
    const [key,,unit] = kpis.find(([field])=>field===$("targetKpi").value);
    const current = valueFor(targetRow(entity,per),key);
    editor.innerHTML = `<div class="admin-record admin-editor"><label class="score-field">Target · ${unit}
      <input id="targetValue" type="number" step="any" min="0" inputmode="decimal" value="${escape(current)}" placeholder="Geen eigen target"></label>
      <button class="score-button" type="button" id="removeTarget"${current===undefined?" disabled":""}>Target verwijderen</button>
      <p class="score-muted">Zonder eigen target geldt de beschikbare Excel-waarde of de standaard van de KPI.</p></div>`;
    const input = $("targetValue"), remove = $("removeTarget");
    input.oninput = () => {
      if (!input.value || !input.checkValidity()) return;
      setTarget(entity,per,key,input.valueAsNumber);
      remove.disabled=false;
    };
    input.onblur = () => {
      if (!input.value || !input.checkValidity()) input.value=valueFor(targetRow(entity,per),key) ?? "";
    };
    remove.onclick = () => {
      const row = targetRow(entity,per);
      if (!row) return;
      delete row[key];
      delete row[alias(key)];
      const defaultKeys = new Set(["Periode","periode","EntiteitType","entiteitType","Naam","naam","ShopNr","shopNr"]);
      if (Object.keys(row).every(field=>defaultKeys.has(field))) state.targets.splice(state.targets.indexOf(row),1);
      renderTargets();
      $("targetValue").focus();
    };
  }
  function copyTargets(previousYear) {
    const year = $("targetYear");
    if (!year.value || !year.reportValidity()) return;
    if (!confirm(previousYear?"Targets van vorig jaar kopiëren?":"Het januari-target naar alle maanden kopiëren?")) return;
    const fields = previousYear ? kpis.map(([key])=>key) : [$("targetKpi").value];
    for (const entity of entities().filter(item=>item.name)) {
      months.forEach((_,index)=>{
        if (!previousYear && index===0) return;
        const source = targetRow(entity,period(Number(year.value)-(previousYear?1:0),previousYear?index:0));
        for (const key of fields) {
          const value = valueFor(source,key);
          if (value!==undefined && value!==null && value!=="") setTarget(entity,period(Number(year.value),index),key,value);
        }
      });
    }
    renderTargets();
  }

  function showIncentives(selected = -1) {
    const container = $("tvIncentiveTable");
    const totals = monthly.monthlyCounts(window.DIESTROYERS_RESULTATEN || [],window.DIESTROYERS_HISTORIEK_MAAND || [],state.shop);
    const report = [...totals.keys()].sort().at(-1);
    container.innerHTML = state.tvIncentives.map((entry,index)=>`<details class="admin-record"${index===selected?" open":""}>
      <summary>${escape(entry.name || "Nieuwe incentive")}</summary>
      <div class="admin-editor">
        <label class="admin-checkbox"><input data-field="active" type="checkbox"${entry.active?" checked":""}> Actief op TV</label>
        <div class="admin-grid">
          <label class="score-field">Naam<input data-field="name" maxlength="55" value="${escape(entry.name)}"></label>
          <label class="score-field">Startdatum<input data-field="startDate" type="date" value="${escape(entry.startDate)}"></label>
          <label class="score-field">Einddatum<input data-field="endDate" type="date" value="${escape(entry.endDate)}"></label>
          <label class="score-field">Doel in stuks<input data-field="goal" type="number" min="1" max="500" step="1" value="${escape(entry.goal)}"></label>
        </div>
        <p class="score-muted" data-progress></p>
        <button class="score-button" data-remove type="button">Incentive verwijderen</button>
      </div></details>`).join("") || '<p class="score-empty">Geen incentives ingesteld.</p>';
    [...container.querySelectorAll("details")].forEach((panel,index)=>{
      const entry = state.tvIncentives[index], progress = panel.querySelector("[data-progress]");
      function update() {
        if (!monthly.valid(entry)) { progress.textContent="Controleer de instellingen."; return; }
        const counts = monthly.progress(entry,totals,report);
        progress.textContent = counts.available ? `Winkelstand: ${counts.life+counts.insurance} / ${entry.goal}${counts.missing?" · onvolledig":""}` : "Nog geen resultaten.";
      }
      for (const input of panel.querySelectorAll("[data-field]")) input.oninput=()=>{
        entry[input.dataset.field]=input.type==="checkbox"?input.checked:input.type==="number"?input.valueAsNumber:input.value;
        panel.querySelector("summary").textContent=entry.name || "Nieuwe incentive";
        update();
      };
      panel.querySelector("[data-remove]").onclick=()=>{
        if (!confirm("Deze incentive verwijderen?")) return;
        state.tvIncentives.splice(index,1);
        showIncentives();
      };
      update();
    });
    if (selected>=0) container.querySelector("details[open] input[data-field=name]")?.focus();
  }
  function addIncentive() {
    const date = new Date(), year = date.getFullYear(), month = date.getMonth();
    const start = period(year,month);
    state.tvIncentives.push({name:"Incentive "+months[month],active:false,startDate:start+"-01",endDate:start+"-"+new Date(year,month+1,0).getDate(),goal:110});
    showIncentives(state.tvIncentives.length-1);
  }

  function bindDecember() {
    const fields = {decemberActive:"active",decemberStart:"startDate",decemberEnd:"endDate"};
    const button = $("decemberOpenAll");
    let rule = state.decemberIncentive || december.defaults(), staged;
    const update = () => {
      const issues = december.issues(rule);
      const result = issues.length ? null : december.snapshot(rule,[],null);
      button.disabled = !(rule.active && result?.pending);
      $("decemberStatus").textContent = issues.join(" ") ||
        (staged && result?.today?.date===staged ? "Sla de wijzigingen op om het deurtje op alle schermen te openen." :
          result?.today ? "Het deurtje van vandaag is geopend in deze configuratie." : "");
    };
    button.onclick = () => {
      const pending = december.snapshot(rule,[],null).pending;
      if (!rule.active || !pending) return;
      staged = pending.date;
      state.decemberIncentive = rule;
      rule.openedDates = [...(Array.isArray(rule.openedDates)?rule.openedDates:[]),staged];
      update();
    };
    for (const [id,key] of Object.entries(fields)) {
      const input = $(id);
      if (input.type==="checkbox") input.checked=rule[key]===true;
      else input.value=rule[key] ?? "";
      input.oninput=()=>{
        state.decemberIncentive=rule;
        rule[key]=input.type==="checkbox"?input.checked:input.value;
        update();
      };
    }
    update();
  }

  function issues() {
    updateShop();
    const errors = [];
    if (!base) errors.push("De bestaande configuratie is niet geladen.");
    if (!state.shop.shopNr || !state.shop.naam) errors.push("Vul de winkelnaam en het winkelnummer in.");
    for (const [kind,definition] of Object.entries(listDefinitions)) {
      const keys = new Set(), names = new Set();
      for (const entry of state[kind]) {
        const name = norm(entry[definition.name] ?? entry[alias(definition.name)]);
        const key = norm(entry[definition.key] ?? entry[alias(definition.key)]);
        const label = entry[definition.name] || entry[definition.key] || kind;
        if (!name || !key) errors.push(label+": vul naam en nummer in.");
        if (key && keys.has(key)) errors.push(label+": dit nummer komt meermaals voor.");
        if (name && names.has(name)) errors.push(label+": deze naam komt meermaals voor.");
        if (key) keys.add(key);
        if (name) names.add(name);
      }
    }
    for (const [index,entry] of state.tvIncentives.entries()) {
      const label = entry.name?.trim() || "Incentive "+(index+1);
      const dateIssue = monthly.dateError(entry);
      if (!entry.name?.trim()) errors.push(label+": naam ontbreekt.");
      if (!monthly.validGoal(entry.goal)) errors.push(label+": vul een geheel doel tussen 1 en 500 in.");
      if (dateIssue) errors.push(label+": "+dateIssue);
    }
    if (state.decemberIncentive) errors.push(...december.issues(state.decemberIncentive));
    return errors;
  }
  function status(element,messages,ok=false) {
    element.innerHTML = `<div class="${ok?"admin-ok":"admin-warning"}">${messages.map(escape).join("<br>")}</div>`;
  }
  function validate() {
    const errors = issues();
    status($("validationOutput"),errors.length?errors:["Geen blokkerende fouten gevonden."],!errors.length);
    return errors;
  }

  function readToken() { try { return sessionStorage.getItem(tokenKey)||""; } catch { return ""; } }
  function rememberToken(value) {
    remembered=value;
    try {
      if (value) sessionStorage.setItem(tokenKey,value);
      else sessionStorage.removeItem(tokenKey);
    } catch { /* Opslaan blijft mogelijk zonder browseropslag. */ }
  }
  function requestToken() {
    const dialog = $("githubSaveDialog"), field = $("githubSaveToken");
    dialog.querySelector("form").reset();
    dialog.returnValue="";
    return new Promise(resolve=>{
      dialog.addEventListener("close",()=>{
        const token=dialog.returnValue==="publish"?field.value.trim():"";
        field.value="";
        resolve(token);
      },{once:true});
      dialog.showModal();
    });
  }
  function parseConfig(file) {
    if (file.encoding!=="base64" || !file.sha) throw new Error("GitHub gaf geen leesbare configuratie terug.");
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,"")),char=>char.charCodeAt(0));
    const source = new TextDecoder().decode(bytes);
    const match = source.match(/^\s*window\.DIESTROYERS_CONFIG_DATA\s*=\s*([\s\S]+);\s*$/);
    if (!match) throw new Error("De configuratie op GitHub heeft een ongeldige indeling.");
    return JSON.stringify(JSON.parse(match[1]));
  }
  function base64(text) {
    let bytes="";
    for (const byte of new TextEncoder().encode(text)) bytes+=String.fromCharCode(byte);
    return btoa(bytes);
  }
  function checkResponse(response) {
    if (response.ok) return;
    if ([401,403,404].includes(response.status)) {
      rememberToken("");
      throw new Error("GitHub weigert toegang. Controleer de schrijfrechten van je token voor Contents.");
    }
    if ([409,422].includes(response.status)) throw new Error("GitHub accepteerde de wijziging niet. Download je versie en herlaad Admin.");
    throw new Error("GitHub kon de configuratie niet opslaan (HTTP "+response.status+").");
  }
  function snapshot() {
    return {...state,version:new Date().toISOString(),source:"admin"};
  }
  function serialize(data) {
    return "window.DIESTROYERS_CONFIG_DATA = "+JSON.stringify(data,null,2)+";\n";
  }
  async function save() {
    const button = $("saveConfig"), output = $("saveStatus"), errors = validate();
    if (errors.length) { status(output,errors); return; }
    button.disabled=true;
    try {
      const token = remembered || await requestToken();
      if (!token) return;
      output.textContent="Configuratie wordt opgeslagen op GitHub…";
      const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json"};
      const current=await fetch(configEndpoint+"?ref=main",{headers,cache:"no-store"});
      checkResponse(current);
      const file=await current.json();
      if (parseConfig(file)!==published) throw new Error("De configuratie is intussen gewijzigd. Download je versie en herlaad Admin.");
      const pendingErrors = validate();
      if (pendingErrors.length) { status(output,pendingErrors); return; }
      const saved=snapshot();
      const submittedDrafts=state.verkopers.filter(person=>sellerDrafts.has(person));
      const sent=JSON.stringify(saved);
      const response=await fetch(configEndpoint,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},
        body:JSON.stringify({branch:"main",sha:file.sha,message:"Update Diestroyers configuration from Admin",content:base64(serialize(saved))})});
      checkResponse(response);
      published=sent;
      submittedDrafts.forEach(person=>sellerDrafts.delete(person));
      renderRecords("verkopers");
      rememberToken(token);
      status(output,["Opgeslagen op GitHub. De wijziging wordt zichtbaar nadat GitHub Pages de configuratie heeft gepubliceerd."],true);
    } catch (error) {
      status(output,[error.message || "Opslaan op GitHub is mislukt."]);
    } finally { button.disabled=false; }
  }
  function download() {
    const errors = validate();
    if (errors.length) { status($("saveStatus"),errors); return; }
    const link = document.createElement("a");
    link.href=URL.createObjectURL(new Blob([serialize(snapshot())],{type:"text/javascript;charset=utf-8"}));
    link.download="config-data.js";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  function showSection() {
    const current = $("adminSection").value;
    for (const panel of document.querySelectorAll(".admin-section")) panel.hidden=panel.id!==current;
    if (current==="targets") { updateShop(); renderTargets(); }
    if (current==="tv-incentives") { updateShop(); showIncentives(); }
    if (current==="validatie") validate();
  }
  function init() {
    state.shop ??= {shopNr:"208",naam:"Diest"};
    for (const key of ["district","verkopers","targets","tvIncentives"]) if (!Array.isArray(state[key])) state[key]=[];
    $("shopNr").value=state.shop.shopNr || "";
    $("shopName").value=state.shop.naam || "";
    $("adminShop").textContent=[state.shop.naam,state.shop.shopNr].filter(Boolean).join(" · ");
    $("shopNr").onchange=updateShop;
    $("shopName").onchange=updateShop;
    $("adminSection").onchange=showSection;
    $("addSeller").onclick=()=>{
      const person={Naam:"",PersoneelsNr:"",ShopNr:state.shop.shopNr,Avatar:"",Actief:"Ja",ImportAlias:""};
      sellerDrafts.add(person);
      state.verkopers.push(person);
      renderRecords("verkopers",state.verkopers.length-1);
    };
    $("addDistrict").onclick=()=>{
      state.district.push({ShopNr:"",Winkel:"",Regio:"Regio",Actief:"Ja"});
      renderRecords("district",state.district.length-1);
    };
    $("addTvIncentive").onclick=addIncentive;
    const date=new Date();
    $("targetYear").value=String(date.getFullYear());
    $("targetMonth").innerHTML=months.map((month,index)=>`<option value="${index}">${month}</option>`).join("");
    $("targetMonth").value=String(date.getMonth());
    $("targetKpi").innerHTML=kpis.map(([key,label])=>`<option value="${key}">${label}</option>`).join("");
    $("targetKpi").value="LifeTarget";
    for (const key of ["targetYear","targetMonth","targetKpi","targetMode","targetEntity"]) $(key).onchange=renderTargets;
    $("copyPreviousYear").onclick=()=>copyTargets(true);
    $("copyJanuaryTargets").onclick=()=>copyTargets(false);
    $("saveConfig").onclick=save;
    $("downloadConfig").onclick=download;
    $("validateConfig").onclick=()=>{ $("adminSection").value="validatie"; showSection(); };
    renderRecords("verkopers");
    renderRecords("district");
    bindDecember();
    showSection();
    showEntry();
  }
  document.addEventListener("DOMContentLoaded",init,{once:true});
})();
