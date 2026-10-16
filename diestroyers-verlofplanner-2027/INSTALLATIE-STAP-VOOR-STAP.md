# Diestroyers Verlofplanner 2027 — installatie

## Wat je krijgt
- `index.html`: mobiele website, gehost via GitHub Pages.
- `worker.js`: Cloudflare Worker (API).
- `schema.sql`: database voor nieuwe installatie.
- `migration_v3.sql`: uitsluitend voor upgrade van de eerdere v2-database.
- `wrangler.toml`: Cloudflare-configuratie.
- `README.md`: functionele uitleg.

**Belangrijk:** een GitHub Pages-website alleen kan geen gegevens opslaan voor andere gebruikers. De Worker en D1-database zijn noodzakelijk. De GitHub-repository bevat nooit de adminpincode. Dit pakket is niet vooraf verbonden met jouw Cloudflare-account: je moet de stappen hieronder eenmalig uitvoeren.

## Stap 1 — Cloudflare-account en Node.js
1. Maak een gratis Cloudflare-account op https://dash.cloudflare.com als je er nog geen hebt.
2. Installeer Node.js LTS vanaf https://nodejs.org op je computer.
3. Pak de ZIP uit in een eigen map, bijvoorbeeld `Diestroyers-Verlofplanner-2027`.
4. Open een terminal in die map (Windows: open Verkenner in de map, klik de adresbalk, typ `cmd` en druk Enter).
5. Voer uit: `npx wrangler login`. Bevestig in de browser.

## Stap 2 — D1-database aanmaken
1. In dezelfde terminal: `npx wrangler d1 create diestroyers-verlof-2027`.
2. Kopieer de `database_id` (UUID) uit de uitvoer.
3. Open `wrangler.toml` met Kladblok of VS Code en vervang `VERVANG_DOOR_JE_D1_DATABASE_ID` door die UUID. Sla op.
4. Voor een **nieuwe** database: `npx wrangler d1 execute diestroyers-verlof-2027 --remote --file=schema.sql`.
5. Krijg je een bevestigingsvraag? Bevestig. De tabellen zijn nu aangemaakt.

**Bestaande installatie?** Gebruik geen `schema.sql` op een al bestaande database. Voor een bestaande **v2** zonder kolom `day_off` voer je `migration_v3.sql` uit in plaats van `schema.sql`. Voor een bestaande **v3** met `day_off` en `periods` hoef je geen migratie uit te voeren. Maak vóór een migratie een back-up via Cloudflare D1-export of `npx wrangler d1 export diestroyers-verlof-2027 --remote --output=backup.sql`.

## Stap 3 — drie Cloudflare-secrets instellen
Voer elk commando uit in de terminal; typ de gevraagde waarde wanneer Wrangler daarom vraagt. De invoer verschijnt niet in GitHub.

1. `npx wrangler secret put ADMIN_PIN` → vul je afgesproken beheerpincode in.
2. `npx wrangler secret put ADMIN_SESSION_SECRET` → gebruik een **andere**, lange willekeurige waarde. Bijvoorbeeld genereer in een terminal met Node: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` en kopieer de uitvoer. Deel deze sleutel met niemand.
3. `npx wrangler secret put ALLOWED_ORIGIN` → vul de **origin** van je toekomstige GitHub Pages-URL in, bijvoorbeeld `https://michske86.github.io` (dus zonder repositorypad en zonder afsluitende `/`). Als je meerdere origins nodig hebt, scheid ze met komma's.

Let op: het instellen van een secret kan de Worker al aanmaken. Dat is normaal.

## Stap 4 — Worker online zetten
1. Voer `npx wrangler deploy` uit.
2. Noteer de Worker-URL die je terugkrijgt, bijvoorbeeld `https://diestroyers-verlof-2027.<jouw-subdomein>.workers.dev`.
3. Controleer dat je Worker zichtbaar is in het Cloudflare-dashboard onder Workers & Pages.
4. De URL van de API zelf kan bij openen in een browser `Origin niet toegestaan` of `Niet gevonden` tonen; dat is geen bewijs dat de koppeling kapot is. Test via de GitHub-website in stap 6.

## Stap 5 — website voorbereiden
1. Open `index.html` in een teksteditor.
2. Zoek exact: `https://REPLACE-WITH-YOUR-WORKER.workers.dev`.
3. Vervang dat hele adres door je echte Worker-URL, zonder afsluitende `/`.
4. Sla het bestand op. **Zet de beheerpincode nooit in deze HTML.**

## Stap 6 — GitHub Pages publiceren
1. Log in op https://github.com.
2. Maak een nieuwe repository, bijvoorbeeld `verlofplanner-2027`. Gebruik voor GitHub Pages een **publieke** repository als je GitHub-plan geen Pages op privé-repositories ondersteunt. De websitecode bevat geen geheimen.
3. Upload `index.html` naar de hoofdmap van de repository. `worker.js`, `schema.sql` en `wrangler.toml` hoeven niet naar GitHub (mogen wel zonder secrets, maar eenvoudiger is alleen `index.html`).
4. Ga naar repository **Settings → Pages**.
5. Bij **Build and deployment**, kies **Deploy from a branch**, branch `main`, folder `/(root)` en klik **Save**.
6. Wacht tot GitHub de site-URL toont, bijvoorbeeld `https://michske86.github.io/verlofplanner-2027/`.
7. Open de site. Bovenaan moet de groene melding over gedeelde planning verschijnen. Bij een fout: controleer Worker-URL en `ALLOWED_ORIGIN`.

## Stap 7 — eerste inrichting
1. Open de GitHub Pages-link.
2. Scroll naar **Beheer**.
3. Meld je aan met een van de twee eerder afgesproken beheerderspersoneelsnummers en de pincode die je in Cloudflare hebt ingesteld.
4. Voeg alle verkopers toe: naam, personeelsnummer, jaarbudget en vaste vrije weekdag. Kies `Geen vaste vrije dag` als er geen is.
5. Voeg indicatieve periodes toe zoals krokusvakantie, paasvakantie, zomersolden, wintersolden en uitzonderlijke zondagsopeningen. **Controleer de concrete data** voor jouw winkel; schoolvakanties verschillen tussen gemeenschappen en uitzonderlijke openingen zijn winkelafhankelijk.
6. De 10 wettelijke Belgische feestdagen van 2027 staan automatisch in het overzicht. Vervangingsfeestdagen zijn niet inbegrepen.
7. Test met een verkopersnummer een aanvraag, controleer die op een tweede toestel en trek ze weer in.

## Verlofregels
- Maximaal twee aanvragen per dag als standaard, met uitzonderingen: 1–15 januari: 0; 16–31 januari: 1; 1–11 juli: 1; 12–28 november: 0; 29 november–15 december: 2; 16–25 december: 0.
- Deze maxima zijn uitsluitend **indicatief**: ook boven het maximum kan iedereen aanvragen.
- Zondagen, de ingestelde vaste vrije weekdag en de 10 Belgische wettelijke feestdagen worden niet van het verlofsaldo afgetrokken.
- Zaterdagen worden **wel** aangerekend, tenzij de zaterdag de ingestelde vaste vrije dag is of een feestdag.
- Vervangingsfeestdagen, halve dagen, individuele uurroosters en formele goedkeuring zijn niet ingebouwd.
- Alle geselecteerde dagen verschijnen als aanvraag, ook als ze niet van het verlofsaldo worden afgetrokken.
- De website haalt elke 15 seconden de actuele gegevens op; wijzigingen worden direct in D1 bewaard.

## Aanpassen na publicatie
- Websitewijzigingen: pas `index.html` aan in GitHub en commit; Pages publiceert opnieuw.
- API-wijzigingen: bewerk `worker.js` lokaal en voer `npx wrangler deploy` uit.
- Beheerpincode wijzigen: `npx wrangler secret put ADMIN_PIN` opnieuw uitvoeren. Bestaande beheerderssessies blijven geldig tot hun vervaldatum; wijzig ook `ADMIN_SESSION_SECRET` om alle sessies ongeldig te maken.
- Personeelsgegevens wijzigen: log in via de admin-interface, klik een verkoper in de teamtabel, pas aan en sla op.
- Personeel verwijderen: selecteer een verkoper in de teamtabel, klik op verwijderen en bevestig. Alle aanvragen van die persoon worden dan ook definitief verwijderd.

## Problemen oplossen
- **'Geen verbinding met database'**: controleer de Worker-URL in `index.html`, Cloudflare Worker-deploy, D1-binding en `ALLOWED_ORIGIN`.
- **'Origin niet toegestaan'**: gebruik in `ALLOWED_ORIGIN` exact het protocol + domein van de website, bijvoorbeeld `https://michske86.github.io`, niet de volledige URL met `/verlofplanner-2027/`.
- **'Serverfout. Controleer database/migratie'**: controleer of `schema.sql` is uitgevoerd en de juiste D1 database_id in `wrangler.toml` staat. Bekijk Cloudflare Worker logs.
- **Admin-login mislukt**: controleer het personeelsnummer en of `ADMIN_PIN` als secret op de juiste Worker staat.
- **Lege kalender**: voeg eerst verkopers toe en test een aanvraag.
- **Na hernoemen personeelsnummer**: de medewerker behoudt bestaande aanvragen omdat die aan het interne medewerker-ID gekoppeld zijn.

## Grenzen van de beveiliging
Verkopers gebruiken bewust alleen een personeelsnummer. Iemand die een ander nummer kent, kan aanvragen namens die persoon plaatsen of intrekken. Admin-acties vereisen daarnaast een server-side gecontroleerde pincode. De gedeelde pincode heeft geen brute-forcebescherming ingebouwd; zet desgewenst Cloudflare WAF/rate limiting in op `/api/admin/login`. De website is openbaar toegankelijk; personeelsgegevens en verlofaanvragen zijn daardoor zichtbaar voor bezoekers van de link. Maak bij gebruik met echte gegevens een bewuste afweging over de interne privacyregels.
