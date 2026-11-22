# Herstel Gisteren-slide en TV-volgorde

Deze versie herstelt de dagelijkse verkoperscijfers op de slide **Gisteren** en zet de TV-volgorde als volgt:

1. Gisteren
2. Omzet
3. Today's Mission Service Overzicht
4. District Ranking Big 7
5. NPS
6. Akte Van Vertrouwen
7. Service Overzicht: Omzet, Life, Insurance, Abonnementen, DSP, SPG en SRP
8. Carrousel

## Eenmalig: VBA-broncode vervangen

Open `diestroyers.xlsm`, druk `Alt+F11` en importeer/vervang deze vier modules uit `VBA_Modules_COMPLETE`:

- `04_DiestroyersCore.bas`
- `11_WebsiteExport.bas`
- `14_AkteVanVertrouwenExport.bas`
- `15_GisterenServiceExport.bas`

Kies daarna in de VBA-editor **Debug > Compile VBAProject** en sla het bestand op als `.xlsm`.

## Dagelijkse werking

Gebruik na de import één keer **Dagstart** (niet alleen **Website bijwerken**). De dagstart bewaart de MTD-stand vóór de import en publiceert daarna per verkoper uitsluitend het verschil: omzet, Life, Insurance, Abo, DSP, SPG en SRP van gisteren.

Een gewone **Website bijwerken** bewaart voortaan de laatst geldige Gisteren-export en kan die niet meer overschrijven met lege verkopersdata.
