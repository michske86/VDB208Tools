# VBA-installatie — definitieve complete set

## Waarom importeren?

De websitebestanden zijn al hersteld. De VBA-modules zijn nodig zodat elke
volgende klik op **Dagstart** of **Website updaten** opnieuw correcte bestanden
produceert.

## Stap 1 — Back-up

Maak een kopie van `diestroyers.xlsm`.

## Stap 2 — Oude standaardmodules verwijderen

Open de VBA-editor met `Alt+F11`.

Verwijder uitsluitend deze standaardmodules:

- `DiestroyersCore`
- `ImportEngine`
- `ResultatenEngine`
- `HistoriekEngine`
- `DistrictEngine`
- `WebsiteExport`
- `AdminSync`
- `DashboardUI`
- `HistoriekBackfill`

Verwijder niet:

- `ThisWorkbook`;
- de Sheet-objecten;
- eventuele modules die niet bij Diestroyers horen.

## Stap 3 — Volledige set importeren

Importeer alle `.bas`-bestanden uit `VBA_Modules_COMPLETE` in numerieke volgorde.

De bestandsnamen hebben nummers, maar de interne modulenamen blijven de
correcte VBA-namen.

## Stap 4 — Opslaan en synchroniseren

Sla de XLSM op en run:

```vb
SynchroniseerAdminConfiguratieMetMelding
```

Run daarna:

```vb
Diestroyers_AlleenWebsiteUpdaten
```

Run ten slotte:

```vb
Diestroyers_VoerVolledigeControleUit
```

## Dagelijkse werking

### Dagstart

```vb
Diestroyers_DagstartAlles
```

Doet:

1. adminconfiguratie synchroniseren;
2. resultaatbestanden importeren;
3. resultaten en S correct verwerken;
4. niet-actieve verkopers verwijderen;
5. historiek bijwerken;
6. districtresultaten en districttargets verwerken;
7. website en TV publiceren.

### Website updaten

```vb
Diestroyers_AlleenWebsiteUpdaten
```

Doet zonder nieuwe bronimport:

1. adminconfiguratie synchroniseren;
2. targets toepassen;
3. niet-actieve verkopers verwijderen;
4. S opnieuw berekenen uit de reeds geïmporteerde tabbladen;
5. district bijwerken;
6. website en TV publiceren.
