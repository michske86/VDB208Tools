# Professionele audit en herstel V21

## Kritieke oorzaken

1. Alle dynamische `*-data.js`-bestanden hadden binaire VBA Variant-metadata voor `window.DIESTROYERS_...`; daardoor voerde de browser geen enkele databron uit.
2. Meerdere ingebedde VBA-modules bevatten verborgen controlebytes achter geldige procedures; dit veroorzaakte rode tekens en compileerproblemen.
3. De numerieke parser was locale-afhankelijk: tekst `6 875.60` werd als `687560` gelezen.
4. `targets-data.js` exporteerde `PersoneelsNr` in plaats van `ShopNr`.
5. Winkelcodes met voorloopnullen (`045` versus `45`) werden niet overal gelijk gekoppeld.
6. De TV behandelde een onbekende oude verkopersrij als actief.
7. Website-export en district-export onderdrukten fouten en konden geldige bestanden door lege arrays vervangen.
8. ImportEngine wiste importbladen voordat het bronbestand succesvol geopend was.

## Structurele correcties

- Centrale lokale SharePoint/OneDrive-resolver.
- Correct UTF-8 schrijven via lokale TEMP en retry-copy.
- Centrale locale-onafhankelijke nummerparser.
- Config is leidend voor actieve verkopers en districtwinkels.
- Strikte exportvalidatie vóór succesmelding.
- Veilige import: pas wissen na succesvol openen.
- BAS-bestanden zijn CP1252, CRLF, zonder BOM of controlebytes.
