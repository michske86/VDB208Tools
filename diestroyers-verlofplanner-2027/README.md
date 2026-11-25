# The Diestroyers — Verlofplanner 2027

Responsive gedeelde verlofplanner met GitHub Pages als website en Cloudflare Worker + D1 voor directe centrale opslag.

**Begin met `INSTALLATIE-STAP-VOOR-STAP.md`.**

## Functies
- Aanmelden voor aanvragen met enkel personeelsnummer.
- Eén dag of aaneengesloten periode aanvragen; opslag in één databasebatch.
- Aanvragen intrekken, overzicht van eigen dagen en verlofsaldo.
- Maandkalender met indicatieve maximumbezetting en namen van aanvragers.
- Richtmaximum per datum instellen of herstellen via **Beheer → Regels & periodes**.
- Beheer voor de twee vooraf ingestelde beheerdersnummers, aanvullend beveiligd met een geheime pincode in Cloudflare.
- Medewerkers toevoegen, wijzigen, verwijderen, inclusief vaste vrije weekdag en jaarbudget.
- Aanvragen als beheerder verwijderen.
- De 10 wettelijke Belgische feestdagen van 2027 zichtbaar in kalender en overzicht.
- Indicatieve periodes toevoegen, wijzigen, verwijderen; geen invloed op verlofsaldo.
- Automatische synchronisatie elke 15 seconden.

## Technische bestanden
- `index.html` — frontend
- `worker.js` — API en servervalidatie
- `schema.sql` — D1-schema voor nieuwe installatie
- `migration_v3.sql` — migratie van eerdere v2, niet uitvoeren op nieuwe/v3 database
- `migration_day_limits.sql` — voegt voor een bestaande installatie een aparte tabel voor daguitzonderingen toe. Voer deze uit op de bestaande D1-database vóór de bijgewerkte Worker wordt gepubliceerd.
- `wrangler.toml` — Cloudflare configuratie

## Niet inbegrepen
Geen vervangingsfeestdagen, halve dagen, afwijkende roosters, login voor verkopers of wachtwoordherstel. GitHub Pages is niet de database. Voor alle installatie-instructies en aandachtspunten: zie handleiding.
