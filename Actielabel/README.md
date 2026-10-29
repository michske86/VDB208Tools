# Actielabel Lab — GitHub + Cloudflare

De volledige actuele app, inclusief live uitlezing, winkelselectie,
combineerbare filters, bewerken, eigen labels, QR-codes en echte PDF-export.

**Broncode op GitHub; de volledige website en API op Cloudflare Workers.**
Geen database, API-sleutel of GitHub Pages nodig. Alle onderdelen gebruiken
hetzelfde Cloudflare-adres.

## Wat je nodig hebt

- Een GitHub-account en Cloudflare-account voor de installatie.
- Een recente Chrome- of Edge-browser om labels te exporteren.
- Collega’s hebben na publicatie alleen de link nodig, zonder account.
- De app gebruikt geen ChatGPT-account of ChatGPT-berichtlimiet. Hosting en
  aanvragen vallen onder je Cloudflare-plan. Een volledige import vraagt veel
  bronpagina’s op; controleer je gebruik bij inzet door meerdere winkels.

## 1. Op GitHub zetten

1. Pak deze ZIP volledig uit.
2. Maak een nieuwe GitHub-repository, bijvoorbeeld `actielabel-lab`.
   Die mag private zijn.
3. Kies **Add file → Upload files** en upload de **inhoud** van de projectmap.
   `package.json`, `package-lock.json` en `wrangler.jsonc` moeten rechtstreeks
   in de hoofdmap staan. Vermijd een extra bovenliggende map.
4. Neem de mappen `web`, `worker`, `scripts`, `tests` en `.gitignore` mee.
5. Commit naar branch `main`. Upload geen `node_modules`.

## 2. Koppelen aan Cloudflare Workers

1. Open het Cloudflare-dashboard → **Workers & Pages**.
2. Maak een nieuwe **Worker** en kies de optie om een Git-repository te
   importeren. Knopnamen kunnen wijzigen: kies **Workers**, niet Pages.
3. Verbind GitHub, selecteer je repository en branch `main`.
4. Vul de instellingen hieronder in.

| Instelling | Waarde |
|---|---|
| Worker-/projectnaam | `actielabel-lab` |
| Root directory | Hoofdmap van de repository (`/`) |
| Build command | `npm test` |
| Deploy command | `npx wrangler deploy` |
| Node.js-versie | 24 LTS |
| Install command, indien gevraagd | `npm ci` |
| Databases / storage bindings | Geen |
| Runtime secrets / API-sleutels | Geen |

Stel indien nodig bij de buildvariabelen `NODE_VERSION` in op `24`.
Dit is een buildinstelling, geen runtime-secret.

De Worker-naam moet gelijk zijn aan `name` in `wrangler.jsonc`.
Voor een andere naam pas je die op **beide plaatsen** aan.

5. Start de publicatie en wacht op een geslaagde build/deploy.
6. Open het `workers.dev`-adres dat Cloudflare toont.
7. Selecteer de winkel en klik **Controleer Lopende Acties**.

Cloudflare regelt de autorisatie voor de Git-koppeling via het dashboard.
Voor deze route hoef je geen Cloudflare-token in GitHub of de code te zetten.
Elke volgende push naar de gekoppelde productiebranch bouwt en publiceert
opnieuw. Het project is niet gekoppeld aan de eerdere ChatGPT-hosting.

## 3. Optioneel: lokaal testen of handmatig publiceren

Installeer Node.js 24 LTS en open een terminal in de projectmap:

```sh
npm ci
npm test
npm run dev
```

Open het lokale adres dat Wrangler toont. Stop met Ctrl+C.
Deze lokale installatie is niet nodig voor de dashboardroute hierboven.

Handmatig publiceren:

```sh
npx wrangler login
npm run deploy
```

Alleen het publicatiepakket controleren, zonder live te publiceren:

```sh
npm run check:deploy
```

## Gegevens, toegang en beperkingen

- Imports, eigen foto's en bewerkingen blijven **per browser/pc** bewaard.
- Nieuw Of Gewijzigd vergelijkt met de vorige import in dezelfde browser.
- Bij een eerste import zijn alle labels nieuw.
- Gegevens op het oude online of lokale adres worden niet automatisch
  overgezet naar het nieuwe Cloudflare-adres.
- Internet is nodig voor acties, winkelstatus en afbeeldingen.
- Geen importhistoriek of voorbeeldacties zijn meegeleverd. De bestanden in
  `tests/fixtures` worden alleen tijdens tests gebruikt en niet door de app.
- Deze zelfstandige versie heeft geen ingebouwde aanmeldbeveiliging.
  Met `workers_dev: true` is de website openbaar bereikbaar. Een private
  GitHub-repository maakt de website zelf niet privé.
- Bereikbaarheid van de VDB-bron blijft een afhankelijkheid. Een blokkering,
  timeout of gewijzigde pagina kan ook bij correcte hosting controle vereisen.

## Labels naar PDF exporteren

1. Open je Cloudflare-adres en kies de winkel (standaard Diest).
2. Klik **Controleer Lopende Acties** en wacht tot de import klaar is.
3. Combineer desgewenst **Alle Aanwezige Acties**, **Acties van Merk** en
   **Nieuw Of Gewijzigd Sinds Laatste Import**.
4. Vink labels aan en klik **Exporteer Geselecteerde Acties**, of kies
   **Exporteer Alle Gefilterde Acties**. Labels die controle nodig hebben
   worden overgeslagen. Bewerk en bevestig die met het potloodje.
5. Klik in het **PDF-voorbeeld** op **Exporteer Naar PDF**. Het bestand wordt
   gedownload. Blijft de download uit, gebruik dan **Download PDF**.
6. Open de PDF en druk af op **A4 staand, 100% / Ware grootte**.
   Kies geen ‘Aanpassen aan pagina’. Browserinstellingen voor
   achtergrondafbeeldingen zijn voor deze PDF-export niet nodig.

Elke pagina heeft 10 posities (2 kolommen × 5 rijen), elk 105 × 59,4 mm.
Bij 11 labels krijg je twee pagina’s, waarvan de tweede één label bevat.
De PDF bewaart de labelopmaak verliesvrij als beeld op 300 dpi, inclusief
curve, afbeeldingen, tekst en QR-codes. Een eigen label maak je onder
**Eigen label** en exporteer je met **Exporteer Eigen Label**.

Om de uiterste papierranden te bedrukken moet de printer randloos kunnen
printen. Test de uiteindelijke afdruk op jullie eigen printer.

## Bestanden aanpassen

| Bestand | Inhoud |
|---|---|
| `web/index.html` | Interface en labelopmaak |
| `web/app.js` | Import, filters, bewerken, QR-codes en labelvoorbeeld |
| `web/pdf.js` | PDF-opbouw en export op 300 dpi |
| `worker/backend.js` | Live uitlezen van acties, productbedragen en winkelstatus |
| `scripts/embed.mjs` | Bouwt de zelfstandige Worker met de interface erin |
| `wrangler.jsonc` | Cloudflare-instellingen |
| `tests/` | Tests voor de acties, import, filters en foutherstel |

`worker/index.js` wordt automatisch bij het bouwen gemaakt; bewerk dit niet.

## Problemen oplossen

**package.json niet gevonden:** controleer de mapstructuur in GitHub en de
root directory in Cloudflare.

**Naamconflict:** maak de Worker-naam gelijk aan `name` in `wrangler.jsonc`.

**Bouwfout:** gebruik Node.js 24 LTS, neem de lockfile mee en controleer
`npm ci` en `npm test`. De app gebruikt geen productie-secrets.

**PDF maken mislukt:** gebruik een recente Chrome of Edge. Een productfoto
kan tijdelijk onbereikbaar zijn; probeer opnieuw. Controleer bij een
uitblijvende download de downloadlijst van je browser of de link Download PDF.

**Acties laden niet:** bekijk de melding op de pagina en de Worker-logs in
Cloudflare. HTTP 522/timeout of browsercontrole bij de bron kan tijdelijk
zijn. Onbekend wordt niet als afwezig behandeld.

**Wijziging niet zichtbaar:** controleer branch, build en deploystatus;
vernieuw daarna de browserpagina.

## Officiële documentatie

- [Git-koppeling](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Build- en deployinstellingen](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Wrangler-configuratie](https://developers.cloudflare.com/workers/wrangler/configuration/)

De QR-generator is qrcode-generator 2.0.4 (MIT). De originele licentie staat
in `web/vendor/qrcode.js`, met bronvermelding in `web/vendor/README.md`.

De PDF-beeldgenerator is html-to-image 1.11.13 (MIT), lokaal meegeleverd.
De originele licentie staat in `web/vendor/html-to-image-LICENSE`.
Er is geen externe PDF-dienst of CDN nodig.

## Een bestaande installatie bijwerken

Vervang `web/`, `worker/backend.js`, `scripts/embed.mjs` en `tests/` door de
nieuwe bestanden en commit naar `main`. Behoud je eigen Worker-naam.
De nieuwe bestanden `web/pdf.js` en `web/vendor/html-to-image.js` moeten
meegaan. Je kunt ook alle pakketbestanden vervangen, met behoud van je
gekozen naam in `wrangler.jsonc`.

Publiceer deze app niet via GitHub Pages: deze versie heeft servercode nodig.

## Gecontroleerd voor deze export

Alle 13 tests slagen, inclusief PDF-bestandsstructuur, paginagrootte en
verliesvrije beeldgegevens. `wrangler deploy --dry-run` is gecontroleerd
zonder vereiste bindings. PDF-download is op de bestaande openbare site
getest; 11 labels over twee pagina’s en ingesloten afbeeldingen zijn in de
browser gecontroleerd. Voor dit pakket is geen nieuwe Cloudflare-site gemaakt.
