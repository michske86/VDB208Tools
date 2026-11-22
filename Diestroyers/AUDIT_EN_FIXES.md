# Audit en volledig herstel — The Diestroyers V19

## Gecontroleerde onderdelen

Het volledige aangeleverde project is onderzocht:

- `diestroyers.xlsm`, inclusief de daadwerkelijk ingebedde VBA-modules;
- `config-data.js`;
- alle resultaat-, target-, district-, historiek- en KPI-detailbestanden;
- de adminpagina en targetplanner;
- de normale websitepagina’s;
- `tv.html`;
- de menu- en verkopersregistratie;
- de dagelijkse en website-only VBA-workflows.

## Vastgestelde hoofdoorzaken

### 1. S werd uit verschillende verkeerde bronnen gelezen

De winkelwaarde voor **S** werd in `ResultatenEngine` uit `I_LeaderS` gelezen.
De winkelwaarde hoort uit `I_S` te komen:

- kolom F: S-stuks;
- kolom G: S-euro;
- kolom I: S-ratio.

Bij verkopers werd de ratio uit `I_LeaderS` bovendien opnieuw met 100
vermenigvuldigd. Daardoor werden bijvoorbeeld `0,98%` en `0,53%` als
`98%` en `53%` opgeslagen.

Dit is gecorrigeerd.

### 2. Nio bleef als verouderde resultaatrij bestaan

De adminconfiguratie bevatte Nio niet meer, maar de actuele rij in
`Resultaten` werd nooit verwijderd. De TV-logica behandelde een verkoper die
niet in de registry werd gevonden bovendien ten onrechte als actief.

Dit is op drie niveaus gecorrigeerd:

- actuele resultaatrijen van niet-actieve verkopers worden verwijderd;
- de website gebruikt de actieve verkopers uit `config-data.js` als waarheid;
- de TV weigert nu onbekende verkopers wanneer er een actieve registry is.

### 3. Targets bestonden dubbel

Er waren targetrijen zonder `ShopNr` met correcte waarden en nieuwe targetrijen
met `ShopNr` maar met overal nul. De adminplanner zocht exact op `ShopNr` en
toonde daardoor de nieuwe nulrij.

De targets zijn:

- samengevoegd;
- ontdubbeld;
- gekoppeld aan de juiste verkoper of winkel;
- vooraf ingevuld in de adminplanner;
- teruggebracht tot één unieke rij per periode, type, naam en winkel.

### 4. Districttargets werden genegeerd

`DistrictEngine` kopieerde altijd de Diest-targets naar alle winkels. De nieuwe
`DistrictWinkel`-targets uit de adminpagina werden niet gebruikt.

De engine zoekt nu eerst het target van de specifieke winkel en maand.
Ontbrekende velden vallen terug op het eigen winkeltarget.

### 5. KPI-detail en historiek bevatten nog oude S- en Nio-data

`kpi-detail-data.js` en `historiek-maand-data.js` bevatten nog:

- Nio;
- dubbele S-regels;
- de verkeerde S-ratio’s voor Sam en Tom;
- een lege winkel-S.

Deze bestanden en de runtimefilter zijn opgeschoond.

### 6. Verschillende JS-bestanden gebruikten uiteenlopende coderingen

Alle JS-bestanden zijn genormaliseerd naar UTF-8. De nieuwe VBA-export schrijft
eveneens UTF-8.

## Huidig gevalideerd resultaat

Voor periode `2026-07`:

- actieve verkopers: Bert, Burcu, Maya, Myron, Sam en Tom;
- Nio komt niet meer voor in runtime-resultaten, KPI-detail of websitehistoriek;
- Diest S: **13,59%**, **32 stuks**, **€ 7.356,41**;
- Sam S: **0,98%**;
- Tom S: **0,53%**;
- Bert target juli: **€ 130.000 omzet** en **15 Life**;
- 240 unieke targetrijen;
- geen dubbele targetkeys;
- 13 districtwinkels worden automatisch in de adminplanner getoond.

## Extra veiligheidslaag

`assets/data-bridge.js` zorgt ervoor dat:

- de actieve verkopers uit de adminconfiguratie altijd voorrang krijgen;
- verouderde verkopersresultaten niet worden getoond;
- configtargets over resultaatrijen worden gelegd;
- winkel-S kan terugvallen op de actuele districtwaarde;
- KPI-detail en historiek worden opgeschoond voordat de pagina’s renderen.

Deze veiligheidslaag vervangt de VBA-fix niet, maar voorkomt dat een oude of
onvolledige export onmiddellijk opnieuw zichtbaar wordt.
