/* Eenmalige migratie vanaf een gecontroleerde checkout van de gepubliceerde bundel. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const crypto=require("node:crypto");
const archive=require("../assets/archief.js");

const site=path.resolve(__dirname,"..");
const source={};
const load=file=>vm.runInNewContext(fs.readFileSync(path.join(site,"assets",file),"utf8"),{window:source},{filename:file});
load("dashboard-data.js");
load("config-data.js");
const version=JSON.parse(fs.readFileSync(path.join(site,"dashboard-version.json"),"utf8"));
const bundle=fs.readFileSync(path.join(site,"assets","dashboard-data.js"),"utf8");
const body=bundle.slice(bundle.indexOf("\n")+1);
assert.equal(version.format,2);
assert.equal(source.DIESTROYERS_DATA_REVISION,version.dataRevision);
assert.equal(crypto.createHash("sha256").update(body).digest("hex"),version.dataRevision);
const config=source.DIESTROYERS_CONFIG_DATA;
const date=new Date();
const periods=archive.periods(source).filter(period=>period<archive.currentMonth(date));
assert(periods.length,"Geen afgesloten maanden in de gepubliceerde bundel.");
assert(!config.archiefVersie,"Het maandarchief is al geïnitieerd.");
const pending=config.resultaatCorrecties||[];
assert(!pending.some(row=>periods.includes(row.periode)),"Verwerk of beoordeel eerst oude Excel-correcties voor deze maanden.");
const projection={format:1,versie:date.toISOString(),maanden:{}};
for(const period of periods) projection.maanden[period]=archive.capture(source,period,config.targets,date);
const before=JSON.stringify(archive.read(source));
source.DIESTROYERS_ARCHIEF=projection;
config.archiefVersie=projection.versie;
assert(archive.apply(source));
assert(JSON.stringify(archive.read(source))===before,"Het archief moet de huidige publicatie exact reproduceren.");
console.log(periods.length+" maanden gecontroleerd · "+periods[0]+" t.e.m. "+periods.at(-1));
if(process.argv.includes("--write")){
  const dest=path.join(site,"archief");
  fs.mkdirSync(dest,{recursive:true});
  for(const period of periods) fs.writeFileSync(path.join(dest,period+".json"),JSON.stringify(projection.maanden[period],null,2)+"\n",{flag:"wx"});
  fs.writeFileSync(path.join(site,"assets","archief-data.js"),archive.project(projection),{flag:"wx"});
  config.version=projection.versie;
  fs.writeFileSync(path.join(site,"assets","config-data.js"),"window.DIESTROYERS_CONFIG_DATA = "+JSON.stringify(config,null,2)+";\n");
}
