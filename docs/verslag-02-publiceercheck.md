# Verslag opdracht 2: Publish Check (slug `publish-check`)

Status: **klaar en geverifieerd** (29-09-2026; alle commando's op deze box gedraaid, bewijs in `docs/bewijs/`).

## Wat er nu staat

- `packages/publish-check/` (hernoemd van `publiceercheck`) — de echte plugin, versie **0.2.0**:
  zeven SEO-checks op `content:beforePublish` én `content:beforeSchedule`, instellingen via een
  Block Kit-settingspagina, elke controle opgeslagen in plugin-storage (collection `reports`,
  index op `checkedAt`), en een Block Kit-adminpagina **Publish Check** met de laatste 20 rapporten.
  Manifest: name **Publish Check**, description 131 tekens, 5 keywords, capability uitsluitend
  `hooks.content-policy:register`.
- De harness draait de plugin sandboxed: `EmDash: Loaded sandboxed plugin publish-check:0.2.0 with
  capabilities: [hooks.content-policy:register]`; admin-API: `id publish-check, version 0.2.0,
  enabled true, status active, source config, sandboxed true`.

## Eventvorm: wat we écht krijgen (docs/voorbeeld-event.json)

Gevangen uit een echte `content:beforePublish`-aanroep in de harness (debug-logregel in de
tussenbuild, daarna verwijderd). Belangrijkste bevindingen:

- `event.content` is het hele item: `id`, `slug`, `status`, `data`, **`seo` als sibling van `data`**
  (niet erin), `version`, `locale`, …
- `content.data.content` is echte Portable Text: `_type: "block"` met `style: "h1"…"h6"`,
  `markDefs` met `_type: "link"` + `href`, `_type: "image"`-blokken (alt op blokniveau),
  `_type: "gallery"` met per-image `alt`.
- Image-velden (bv. `featured_image`) staan in het publish-event **geëxpandeerd**:
  `{ id, provider, filename, alt, … }` — de alt uit de mediabibliotheek is meegelezen; in een draft
  kan dezelfde veldwaarde nog `{ $media: { url, alt, filename } }` zijn. De plugin leest beide vormen.
- Volledig event (mooi geprint): `docs/voorbeeld-event.json`.

## De checks (id, ernst, regel)

| id | ernst | regel |
|---|---|---|
| `title` | error | titel aanwezig; (seo.title anders titel) + `titleSuffix` ≤ `maxTitle` (60) |
| `meta-description` | error | seo.description anders excerpt, aanwezig en 120–155 tekens |
| `no-h1` | error | geen H1-blokken in de body |
| `image-alt` | error | elke afbeelding (PT-image, gallery, image-velden) niet-lege alt |
| `heading-order` | warning | geen h3–h6 vóór de eerste h2 |
| `internal-links` | error | minimaal `minInternalLinks` interne links (relatieve href of zelfde host als `siteUrl`) |
| `link-quality` | warning | geen links zonder URL, zonder linktekst, of met `http://` |

Elke check heeft een Engelse én Nederlandse korte melding; de instelling `language` (standaard
`en`) kiest. Mode `block` (standaard) weigert bij errors met een reason van 1–500 tekens
(`Publish Check: <fout> · <fout>`, afgekapt met `…` boven de 500); mode `warn` weigert nooit.

## Instellingen en rapporten

- Settingspagina (Block Kit-formulier op `/_emdash/admin/plugins/publish-check/settings`, opgeslagen
  via plugin-scoped `ctx.settings`): `mode`, `language`, `maxTitle`, `titleSuffix`, `minDesc`,
  `maxDesc`, `minInternalLinks`, `siteUrl` en zeven per-check toggles. Read-time defaults, dus
  bestaande installaties vallen netjes terug (docs/Settings).
- Rapporten: collection `reports` in het manifest (`"storage": { "reports": { "indexes":
  ["checkedAt"] } }`), één rij per controle: `checkedAt`, `collection`, `entryId`, `slug`, `title`,
  `action` (publish/schedule), `mode`, `passed`, `rejected`, `errors[]`, `warnings[]`.
  Mislukte storage-writes worden gelogd en blokkeren publicatie nooit (een hook-error zou
  standaard afbreken).
- Adminpagina **Publish Check** (`/_emdash/admin/plugins/publish-check/reports`): stats (totaal,
  mode, taal) + tabel laatste 20: tijd (relative_time), entry (titel · slug), actie, resultaat
  (✓ Passed / ⛔ Rejected / ⚠ Errors (warn mode) / ⚠ Passed with warnings) en de meldingen.

## Gebruikte capabilities, met bron

| declaratie | waarom | bron |
|---|---|---|
| `hooks.content-policy:register` (enige capability) | EmDash registreert `content:beforePublish`/`beforeSchedule` alléén bij deze declaratie; geeft géén content-reads/-writes, géén publicatie-acties. | docs/emdash-docs/hooks.txt: "content:beforePublish, content:beforeSchedule, content:beforeUnpublish → hooks.content-policy:register — The hooks can reject publication state changes" |
| `storage: { reports: … }` in het manifest | Geen capability: plugin-storage is host-genamespaced naar de plugin en zit in het trust-contract van het manifest (versiebump verplicht bij wijziging — vandaar 0.2.0). | docs/emdash-docs/storage.txt ("Declare each collection and its indexes in the manifest"), manifest.txt ("Trust contract … capabilities, allowedHosts, and storage") |
| `admin.pages` + route `admin` | Block Kit-adminpagina's vereisen geen capability, alleen de manifest-declaratie en een route `admin`. | docs/emdash-docs/manifest.txt ("Admin pages and widgets"), block-kit.txt ("Declare the page in the plugin manifest") |
| `ctx.settings` | "needs no capability because the host fixes its namespace to the current plugin". | docs/emdash-docs/settings.txt |

`allowedHosts` blijft leeg: de plugin doet geen netwerk. Geen `content:read/write`, geen media —
precies het verkoopargument.

## Kwaliteit: tests, validate, bundle

- **Unit-tests per check** met Portable Text-fixtures (`tests/checks.test.ts`, 29 tests): titel
  aanwezig/lengte incl. suffix/seo-voorkeur, meta-description min/max/excerpt-fallback, H1
  (1 en meerdere), image-alt (PT-blok, `$media`-veld, witruimte), heading-order (h3 vóór h2, h1
 genegeerd, herstel na h2), interne links (relatief, zelfde host, andere host), link-kwaliteit
  (geen URL, geen tekst, http://, nette https), `isInternalHref`/`siteHostFromUrl`, en
  `buildReason` (en/nl, 500-tekens-afkapping).
- **Sandbox-testhost** (`tests/plugin.test.ts`, 15 tests via Worker Loader + productie-bridge):
  weigering met exacte reason, rapport-rij `rejected: true`, schone post doorgelaten met passing
  rapport, `content:beforeSchedule` met `action: "schedule"`, mode=warn via een échte
  `form_submit` op de admin-route (nooit weigeren, rapport met errors), ongeldige form-waarden
  geweigerd zonder save, en de twee adminpagina's (rapportentabel + volledig settingsformulier).
- **Uitvoer** (`corepack pnpm run test` in packages/publish-check): `Test Files 2 passed (2)`,
  `Tests 44 passed (44)`. Typecheck: `tsc --noEmit`, exit 0.
- **validate + bundle** (groen):

```
== validate ==
✔ Manifest is valid: .../packages/publish-check/emdash-plugin.jsonc
ℹ Default release hosting: publisher PDS blobs

== bundle ==
ℹ Bundle size: 73.3 KB across 3 files
✔ Validation passed
✔ Created publish-check-0.2.0.tar.gz (18.8KB)
ℹ   SHA-256: 087a280f644779be96008044c721fa8ab7476a84f2e7a79081cb65bb7f9cb51f
```

  Bundle **73,3 KB / tarball 18,8 KB** — ruim onder de 256 KB-grens (zod zit in de bundel voor de
  interaction-validatie; `@emdash-cms/blocks` is types-only).

## E2E in de harness (letterlijke uitkomsten)

Setup: instellingen gezet via een echte POST op de plugin-adminroute (form_submit): `titleSuffix`
" — EmDash Plugins", `siteUrl` http://localhost:4330, verder defaults, mode `block`.

### (a) Slechte post → PUBLISH_REJECTED met de reason (`docs/bewijs/e2e-a-geweigerd.txt`)

De capture-draft (te lange titel, lege meta-description, H1 in de body, twee afbeeldingen zonder
alt, H3-sprong, lege en http://-links):

```
$ corepack pnpm exec emdash content publish posts publish-check-capture --url http://localhost:4330

 ERROR  Publish Check: title is 62 chars incl. suffix (max 60) · meta description is 97 chars (min 120) · 1 H1 block in the body (the title is the H1) · 2 images without alt text

$ curl -X POST -b <admin-sessiecookie> -H "X-EmDash-Request: 1" \
    http://localhost:4330/_emdash/api/content/posts/publish-check-capture/publish
{"success":false,"error":{"code":"PUBLISH_REJECTED","message":"Publish Check: title is 62 chars incl. suffix (max 60) · meta description is 97 chars (min 120) · 1 H1 block in the body (the title is the H1) · 2 images without alt text"}}
```

### (b) Gerepareerde post → gepubliceerd (`docs/bewijs/e2e-b-gepubliceerd.txt`)

Eerste poging leverde meteen een extra bewijs: de "schone" post werd alsnog geweigerd op
`meta description is 116 chars (min 120)` (rapport zichtbaar in de admin). Na verlenging naar 132
tekens:

```
$ corepack pnpm exec emdash content publish posts publish-check-clean --url http://localhost:4330
{
  "success": true
}
✔ Published posts/publish-check-clean

$ curl -s http://localhost:4330/posts/publish-check-clean
HTTP 200
<title>Publish Check waves a clean post through | My Blog</title>
```

### (c) mode=warn → gepubliceerd + rapport zichtbaar (`docs/bewijs/e2e-c-warn.txt`, `docs/bewijs/admin-reports.json`)

Mode `warn` gezet via dezelfde form_submit-route (toast: `Settings saved`), daarna dezelfde
gebroken capture-draft:

```
$ corepack pnpm exec emdash content publish posts publish-check-capture --url http://localhost:4330
{
  "success": true
}
✔ Published posts/publish-check-capture

WARN-PUBLISHED: capture draft published in warn mode (no PUBLISH_REJECTED)
```

De adminpagina toont de rij bovenaan: `⚠ Errors (warn mode) · title is 62 chars incl. suffix
(max 60) · meta description is 97 chars (min 120) …`, mét de twee ⛔ Rejected-rijen uit (a) en de
✓ Passed-rij uit (b) eronder (docs/bewijs/admin-publish-check.png).

## De weigering in de admin-UI laten zien (voor de film)

Headless geverifieerd met agentbox-test-browser (screenshots: `docs/bewijs/admin-publish-weigering.png`,
`docs/bewijs/admin-publish-check.png`):

1. **Inloggen**: open `http://localhost:4330/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin/plugins-manager`
   (dev-bypass tekent de sessiecookie; daarna is de admin ingelogd als Dev Admin).
2. **De geweigerde publicatie in de editor** (het filmshot):
   - Ga naar `http://localhost:4330/_emdash/admin/content/posts/01M3NTM3J23BFMNC1TNNYQNBJP?locale=en`
     (de demo-draft `publish-check-demo-fail`; een draft die expres op de checks zakt).
   - Klik rechtsboven op de blauwe knop **Publish now**
     (selector: `button` met tekst "Publish now"; de knop toont "✓ Saved" eraarnaast).
   - Na ±1–2 s verschijnt rechtsonder de toast **"Failed to publish"** met daaronder de volledige
     reason als platte tekst: `Publish Check: title is 80 chars incl. suffix (max 60) · meta
     description is 9 chars (min 120) · 1 H1 block in the body (the title is the H1) · 0 internal
     links (min 1)`. Selector voor de toasttekst: de body bevat `Failed to publish`; de reason
     staat als tekstknoop in dezelfde toast-container.
   - De entry blijft daarna status `draft` (te controleren via de zijkant: "Draft version — This
     version is not visible on the site").
3. **De rapportenpagina**: ga naar `/_emdash/admin/plugins/publish-check/reports` (of: in de
   linkerkolom onder **Plugins** op **Publish Check** klikken — de nav-links zijn
   `/_emdash/admin/plugins/publish-check/reports` en `…/settings`). De tabel toont per rij tijd,
   entry, actie, resultaat en meldingen.

## Bestanden

```
packages/publish-check/            (hernoemd van packages/publiceercheck; git mv)
  emdash-plugin.jsonc              slug publish-check, name Publish Check, description, keywords,
                                   capability, storage reports, admin-pagina's + settingsSchema
  package.json                     name publish-check, 0.2.0, + zod (dep), @emdash-cms/blocks 1.0.1 (dev)
  src/types.ts                     PublishCheckContent/ContentData/CheckFinding/Settings/Report
  src/pt.ts                        defensieve Portable Text-/image-/link-readers (draft- én publish-vorm)
  src/checks.ts                    de 7 checks + buildReason (1–500 tekens, en/nl)
  src/settings.ts                  defaults, readSettings, form-zod, interaction-zod, saveSettings
  src/admin.ts                     Block Kit: rapportenpagina + settingsformulier
  src/plugin.ts                    beide hooks + admin-route
  tests/checks.test.ts             29 unit-tests, per check
  tests/plugin.test.ts             15 sandbox-testhost-tests
  README.md                        Engels: werking, exacte rechten + waarom, instellingen, MIT, link
harness/package.json               dependency hernoemd: publish-check file:../packages/publish-check
harness/astro.config.mjs           sandboxed: [publishCheck]
docs/voorbeeld-event.json          het echte beforePublish-event
docs/bewijs/e2e-a-geweigerd.txt    (a) letterlijk
docs/bewijs/e2e-b-gepubliceerd.txt (b) letterlijk
docs/bewijs/e2e-c-warn.txt         (c) letterlijk
docs/bewijs/admin-reports.json     page_load-respons van de rapportenpagina (met alle drie de uitkomsten)
docs/bewijs/admin-publish-check.png          admin-UI, rapportentabel (headless test-browser)
docs/bewijs/admin-publish-weigering.png      admin-UI, Failed to publish-toast in de editor
```

Niet gecommit (gitignored): `node_modules/`, `dist/`, `harness/data.db*`, `harness/uploads/`,
`harness/dev.log`. De harness draait nog op http://localhost:4330 (mode staat terug op `block`).

## Open punten / aandachtspunten

1. **`emdash content create --data` neemt `seo` niet aan** ("seo: unknown field") — het SEO-paneel
   gaat via de REST-body (`PUT …/content/posts/<id>` met `"seo": {...}` naast `data`), niet via
   het CLI-data-veld. Voor de E2E is de seo dus via REST gezet.
2. **Create-auto-publish + geweigerde gate**: een `content create` die de gate weigert blijft als
   draft staan (de CLI toont de ERROR). Dat is precies het gewenste gedrag en handig voor de film:
   de demo-draft is zo ontstaan.
3. **`event.content.id`** is aanwezig in publish-events (de docs noemen `id` alleen bij
   beforeSave); het rapport gebruikt hem als `entryId` met een defensieve string-check.
4. De ⛔/✓-resultaatcellen gebruiken emoji; in de headless Chromium-fonts rendert ⛔ als
   tekst-teken (zie screenshot) — cosmetisch, in echte browsers gewoon kleurrijk.
5. `emdash-plugin publish` is nog steeds niet gedraaid (registry-release hoort niet bij deze
   opdracht).
