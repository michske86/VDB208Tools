# Maandarchief

Elk bestand `YYYY-MM.json` bewaart de gepubliceerde winkel- en verkopersresultaten van één afgesloten maand, inclusief KPI-details en maandhistoriek. De snapshot bevat de bronrevisie, de targets uit de Admin-configuratie op het moment van afsluiten en een log van resultaatcorrecties. De actuele targetconfiguratie blijft via Admin → Targets bewerkbaar.

## Een maand afsluiten

De eerste succesvolle Dagstart die omzet- en winkelcijfers voor de nieuwe maand publiceert, sluit de vorige beschikbare maand automatisch af. De afsluiting bewaart de laatst gepubliceerde stand van die maand. Dagstart publiceert de nieuwe archiefbestanden in dezelfde GitHub-commit als de actuele cijfers.

Een maand die nog loopt is alleen-lezen. Een oudere Excel-correctie voor dezelfde maand moet eerst zichtbaar zijn in de gepubliceerde cijfers. Een afgesloten maand kan daarna via **Bewerk resultaten** worden gecorrigeerd. Eén GitHub-commit bewaart de maandsnapshot, de gewijzigde configuratierevisie en de leesversie voor de website en TV.

## Dagstart en lezers

Dagstart blijft de bestaande bundel maken vanuit Excel. Bij het laden van de website vult `assets/archief.js` alleen de gearchiveerde maanden in. De lopende maand, regiostanden, NPS, Akte Van Vertrouwen, dagcijfers en de overige exports komen via hun bestaande bronnen. Als het archief niet beschikbaar is of de revisies verschillen, gebruiken de lezers de bestaande Dagstart-bundel. Admin blokkeert in dat geval archiefbewerkingen.

`assets/archief-data.js` wordt bij elke archiefwijziging gegenereerd uit de maandsnapshots. GitHub bewaart de versiegeschiedenis. Gebruik voor gewone correcties de Admin-interface. `node Diestroyers/tools/seed-maandarchief.cjs` was de eenmalige controle voor de eerste migratie en bewaakt dat de onbewerkte snapshots dezelfde resultaatrijen opleveren als de basisbundel.
