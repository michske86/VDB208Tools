# Nieuwe TV-slide: Gisteren

## Wat is toegevoegd

De TV krijgt voortaan als eerste slide **Gisteren**.

- Winkel: omzet, klanten en concretisatie van de laatste afgesloten dag.
- Verkopers: Life, Insurance, DSP, Abo, SPG en SRP die de vorige dag zijn geschreven.
- Alle actieve verkopers worden getoond, ook wanneer zij die dag 0 stuks hebben geschreven.

## Eenmalig in Excel uitvoeren

1. Maak eerst een reservekopie van je XLSM-bestand.
2. Open de VBA-editor met `Alt + F11`.
3. Importeer of vervang deze modules uit `VBA_Modules_COMPLETE`:
   - `04_DiestroyersCore.bas`
   - `11_WebsiteExport.bas`
   - `15_GisterenServiceExport.bas` (nieuwe module)
4. Kies in de VBA-editor **Debug > Compile VBAProject** en sla het XLSM-bestand op.
5. Voer daarna één gewone **Dagstart** uit.

Tijdens elke volgende dagstart bewaart Excel automatisch eerst de bestaande MTD-servicecijfers, importeert daarna de nieuwe cijfers en publiceert het verschil naar `assets/gisteren-service-data.js`.

Er is geen extra CSV, geen handmatige invoer en geen aanpassing aan je bestaande importbestanden nodig.

## Belangrijk

De eerste update waarin de nieuwe VBA-code is geïmporteerd, vult de dagelijkse servicegegevens na die dagstart. Vóór die eerste dagstart toont de slide enkel de veilige melding dat de cijfers nog beschikbaar worden.