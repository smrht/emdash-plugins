# Opdracht 2: Publiceercheck (slug `publish-check`), de echte plugin

Werkmap /home/agent/emdash-plugins, pakket packages/publiceercheck (hernoem map/slug naar `publish-check` als dat nog niet zo is).
Bouwt voort op de harness uit opdracht 1 (lees docs/verslag-01-harness.md voor start/inlog). Denk grondig na.
Harde regels: zelfde als brief-01 (agentbox-run-heavy zonder `--`, niets in /tmp, eigen PID's stoppen, niet pushen).
Uitgever: `emdashplugins.bsky.social` = `did:plc:p5t4ri3u4rr24wglznjsb5uv` (publisher in elk manifest).

## Productidee
"The publish gate for SEO basics." Editors klikken Publish; de plugin controleert het concept en weigert publicatie
met een duidelijke, korte reden als basis-SEO kapot is. Eén recht: `hooks.content-policy:register`. Geen netwerk, geen
content:read/write. Dat minimale rechtenpakket is het verkoopargument: vermeld het prominent in README en description.

## Checks (op event.content.data van content:beforePublish; ook content:beforeSchedule)
Zoek eerst in de harness uit welke velden je echt krijgt (titel, slug, excerpt/description, SEO-panel: seo.title?,
seo.description?, Portable Text body, afbeeldingsvelden met alt). Log één echt event naar docs/voorbeeld-event.json.
1. Titel aanwezig; lengte (SEO-titel als die er is, anders titel) + ingestelde titel-suffix ≤ maxTitle (standaard 60).
2. Meta description (SEO-panel, anders excerpt) aanwezig en tussen minDesc 120 en maxDesc 155 tekens.
3. Geen H1-blokken in de body (de titel is de H1): Portable Text-blokken met style "h1" = fout.
4. Elke afbeelding (Portable Text image-blok én image-velden) heeft een niet-lege alt-tekst.
5. Koppen springen niet: geen h3 vóór de eerste h2 (waarschuwing).
6. Minstens N interne links (standaard 1; interne = relatieve href of zelfde host als siteUrl-instelling).
7. Geen lege links en geen http:// links (waarschuwing).
Elke check heeft een id, ernst (error/warning) en een korte Engelse én Nederlandse melding (taalinstelling, standaard en).

## Gedrag en instellingen (Block Kit settings, ctx.settings/KV)
- mode: "block" (standaard: errors weigeren publicatie) | "warn" (nooit weigeren, alleen rapporteren).
- maxTitle, titleSuffix (bv. " — EmDash Plugins"), minDesc, maxDesc, minInternalLinks, language (en/nl), per check aan/uit.
- De reason (1–500 tekens platte tekst) somt de errors op, kort, bv.
  "Publish Check: title is 74 chars incl. suffix (max 60) · 2 images without alt text".
- Sla elke controle op in plugin-storage (collection `reports`, index op checkedAt) en toon in een Block Kit-adminpagina
  "Publish Check" de laatste 20: entry-titel, tijd, geslaagd/geweigerd, meldingen. Controleer in de docs of storage en een
  admin-pagina extra capabilities vereisen; voeg alleen toe wat echt nodig is en noteer waarom.

## Kwaliteit
- Unit-tests (vitest) per check met Portable Text-fixtures; `emdash-plugin validate` + `bundle` groen; bundle ≤256 KB.
- In de harness: echte E2E via admin-API of CLI: (a) post met te lange titel + H1 in body + beeld zonder alt → PUBLISH_REJECTED
  met de reason; (b) gerepareerde post → gepubliceerd; (c) mode=warn → gepubliceerd + rapport zichtbaar.
- README.md (Engels): wat het doet, exacte rechten en waarom, instellingen, screenshots-map, licentie MIT, link
  https://emdashplugins.nl. Manifest: name "Publish Check", description ≤140 tekens, ≤5 keywords.

## Acceptatie → docs/verslag-02-publiceercheck.md
Testuitvoer, validate/bundle-uitvoer met grootte, de drie E2E-uitkomsten letterlijk, gebruikte capabilities met bron,
en exacte stappen om in de headless browser de weigering in de admin-UI te laten zien (welke pagina, welke knop, welke
selectors), want die filmen we. Commit alles.
