# Verslag opdracht 1: lokale EmDash-testomgeving (harness) + publiceercheck-skelet

Status: **klaar en geverifieerd** (zie "Bewijs" onderaan; alle commando's getest op deze box, 29-09-2026).

## Wat er nu staat

- `harness/` — EmDash-site (blogtemplate), **poort 4330**, Node-adapter (standalone) + SQLite (`harness/data.db`, gitignored) + lokale media-opslag (`harness/uploads/`, gitignored). `emdash` exact **1.0.1**; transitieve `@emdash-cms/*`-pakketten komen exact mee zoals emdash 1.0.1 ze zelf pint (admin/auth/blocks 1.0.1, plugin-types 0.5.0, registry-client 0.7.0, registry-lexicons 0.7.0). Sandbox-runner voor Node geconfigureerd.
- `packages/publiceercheck/` — sandboxed plugin (scaffold via `pnpm dlx @emdash-cms/plugin-cli@0.13.0 init`), met één `content:beforePublish`-hook en capability `hooks.content-policy:register`. Publisher is inmiddels de echte DID `did:plc:p5t4ri3u4rr24wglznjsb5uv` (emdashplugins.bsky.social, door hoofdsessie gezet; validate is daarna opnieuw groen).
- De gebundelde plugin is lokaal geladen in de harness (`pnpm add file:../packages/publiceercheck` + `sandboxed: [publiceercheck]` in `harness/astro.config.mjs`) en draait **in de sandbox**: bij de start logt de site `EmDash: Loaded sandboxed plugin publiceercheck:0.1.0 with capabilities: [hooks.content-policy:register]`, en de admin toont hem als sandboxed en actief.

### Pins en afwijkingen daarop

| Pakket | Pin | Opmerking |
|---|---|---|
| `emdash` (harness) | `1.0.1` exact | was `^1.0.1` in de template |
| `@emdash-cms/sandbox-workerd` | `0.9.1` exact | **bestaat niet op 1.0.1**; 0.9.1 is de laatste en eist zelf exact `emdash@1.0.1` |
| `workerd` (peer van de runner) | `1.20260927.1` exact | bewust niet de versie van vandaag (minimumReleaseAge) |
| `emdash` (plugin devDep, voor types) | `1.0.1` exact | scaffold had `>=0.12.0 <1.0.0` — dat zou 1.0.0 kunnen kiezen |
| `@emdash-cms/plugin-test` | `0.2.6` exact | 0.x-pakket, nieuwste |
| `@emdash-cms/plugin-cli` | `0.13.0` exact | door scaffold |

### minimumReleaseAge (pnpm 12)

`emdash@1.0.1` en `@emdash-cms/sandbox-workerd@0.9.1` zijn **gisteren** (28-09) gepubliceerd. De template-`pnpm-workspace.yaml` van de harness heeft daarom al `minimumReleaseAge: 1440` met excludes `emdash` en `@emdash-cms/*`; `workerd: false` heb ik op `true` gezet in `allowBuilds` (de runner heeft de workerd-binary nodig). In `packages/publiceercheck/pnpm-workspace.yaml` heeft pnpm 12.6.0 bij de installatie zelf **8 exacte `minimumReleaseAgeExclude`-regels** weggeschreven (`@emdash-cms/admin@1.0.1`, `@emdash-cms/auth@1.0.1`, `@emdash-cms/blocks@1.0.1`, `@emdash-cms/cloudflare@1.0.1`, `@emdash-cms/gutenberg-to-portable-text@1.0.1`, `@emdash-cms/plugin-cli@0.13.1`, `@emdash-cms/plugin-test@0.2.6`, `emdash@1.0.1`) — exact het formaat uit de brief.

## Harness starten en stoppen

```bash
# starten (vanuit /home/agent/emdash-plugins/harness)
corepack pnpm dev
# health-check
curl -s http://localhost:4330/_emdash/api/health
# stoppen
corepack pnpm exec astro dev stop
```

`astro dev` draait als daemon en is na `pnpm dev` meteen bereikbaar; logs via `corepack pnpm exec astro dev logs`. Poort 4330 staat in `harness/astro.config.mjs` (`server.port`), dus elke startmethode gebruikt hem.

## Inloggen in /_emdash/admin zonder mens (de cruciale route)

De dev-server print de route zelf bij de start:

```
› Dev bypass  http://localhost:4330/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin
  Skips passkey setup/auth and signs you in as a dev admin
```

Stap voor stap, headless bruikbaar:

1. `GET http://localhost:4330/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`
   - maakt bij eerste keer de admin-gebruiker `dev@emdash.local` ("Dev Admin", role 50) en zet `emdash:setup_complete = true`;
   - past de seed toe (collections `posts`/`pages` + voorbeeldcontent; `?content=0` slaat content over);
   - **zet direct de sessiecookie** (`astro-session`, HttpOnly) en levert bij `?redirect=` een HTML-redirect naar de admin.
2. Daarna is `/_emdash/admin` (en elke deep link zoals `/_emdash/admin/plugins-manager`) gewoon ingelogd te gebruiken in dezelfde browsercontext.
3. Werken in curl/API: zelfde GET met een cookie-jar (`curl -c jar.txt`), daarna `-b jar.txt` op admin-API's mét header `X-EmDash-Request: 1` (CSRF). Wil je liever een Bearer-token: `?token` aan de bypass-URL toevoegen creates een API-token en geeft die in het JSON-antwoord.
4. CLI: `npx emdash … --url http://localhost:4330` — op localhost authenticeert de CLI automatisch via dev-bypass (`emdash whoami` meldt "Auth method: dev-bypass"). Zonder `--url` probeert hij poort 4321 en faalt hij met "fetch failed".

Niet werkende routes, voor de volledigheid: magic-link-login (`/api/auth/magic-link/send`) eist een geconfigureerde e-mailprovider (`EMAIL_NOT_CONFIGURED`, 503) en de setup-wizard gebruikt passkeys — beide zijn niet headless. De dev-bypass is de enige mensloze route, en precies daarvoor bedoeld (alleen in `import.meta.env.DEV`).

Bewijs dat het in een echte (headless) browser werkt: `docs/bewijs/bewijs-admin-plugins.png` — genavigeerd als anonieme browser: eerst de bypass-URL, dan `/_emdash/admin/plugins-manager`: ingelogd als "Dev Admin", plugin zichtbaar.

## Plugin: publiceercheck

- `emdash-plugin.jsonc`: slug `publiceercheck`, publisher `did:plc:p5t4ri3u4rr24wglznjsb5uv`, licentie MIT, author `emdashplugins.nl` (https://emdashplugins.nl), security `security@emdashplugins.nl`, repo `https://github.com/smrht/emdash-plugins`, capability `hooks.content-policy:register`, geen storage, geen allowedHosts.
- `src/plugin.ts`: `content:beforePublish` → weigert met `{ cancel: true, reason: "Titel ontbreekt: vul een titel in voordat je publiceert." }` als `content.data.title` ontbreekt, geen string is of alleen witruimte is; anders `undefined` (toestaan). De echte regels komen in opdracht 2.

### validate + bundle (beide groen)

```
$ pnpm run validate
✔ Manifest is valid: .../packages/publiceercheck/emdash-plugin.jsonc
ℹ Default release hosting: publisher PDS blobs

$ pnpm run bundle
✔ Plugin: did:plc:p5t4ri3u4rr24wglznjsb5uv/publiceercheck@0.1.0
ℹ   Capabilities: hooks.content-policy:register
✔ Validation passed
ℹ Bundle size: 2.1 KB across 3 files
✔ Created publiceercheck-0.1.0.tar.gz (1.2KB)
ℹ   SHA-256: 93b517d801762e2ef3b264d7a80fdceb35831ea9e894c5819b0e2b973a162ac7
```

(Typecheck groen; unit-tests via de sandbox-testhost 2/2 groen: weigering bij witruimte-titel, toestaan bij gevulde titel. De scaffold-test op de oude `hello`-route is vervangen door deze twee hoekgevallen.)

## Bewijs: weigering en geslaagde publicatie

Setup: draft met alleen-witruimte-titel `"   "` is opgeslagen (schema-validatie eist een string, niet een niet-lege) — daarmee bereikt de lege titel de plugin-hook.

**Publiceren met lege titel → geweigerd** (volledige uitvoer in `docs/bewijs/weigering-lege-titel.txt`):

```
$ emdash content publish posts 01M3NDVF8DN62Q80JPBKP78Y7A --url http://localhost:4330
 ERROR  Titel ontbreekt: vul een titel in voordat je publiceert.

$ curl -X POST -b <admin-sessiecookie> -H "X-EmDash-Request: 1" \
    http://localhost:4330/_emdash/api/content/posts/01M3NDVF8DN62Q80JPBKP78Y7A/publish
{
    "success": false,
    "error": {
        "code": "PUBLISH_REJECTED",
        "message": "Titel ontbreekt: vul een titel in voordat je publiceert."
    }
}
```

**Publiceren mét titel → gepubliceerd** (volledige uitvoer in `docs/bewijs/publicatie-met-titel.txt`): `emdash content create posts --data '{"title": "Publicatiecheck werkt", …}'` (create auto-publiceert) → id `01M3NDXF4BWMH6CFXDVJGD9W06`, `status: "published"`, en de front-endpagina `/posts/publicatiecheck-werkt` geeft HTTP 200 met de titel erin.

**Plugin in de admin onder Plugins**: `docs/bewijs/bewijs-admin-plugins.png` (headless test-browser, ingelogd via de bypass-route). Pagina `/_emdash/admin/plugins-manager` toont `publiceercheck v0.1.0`, ingeschakeld, met uitgeklapt: CAPABILITIES "Review and block publishing, scheduling, and unpublishing content". De admin-API bevestigt:

```json
{"success":true,"data":{"items":[{"id":"publiceercheck","version":"0.1.0","enabled":true,"status":"active","source":"config","sandboxed":true,"capabilities":["hooks.content-policy:register"]}]}}
```

Let op de admin-routenaam: de pagina heet `/_emdash/admin/plugins-manager` (`/_emdash/admin/plugins` geeft "Not Found" in de SPA).

Na een cold restart (`astro dev stop` + `pnpm dev`) laadt de plugin opnieuw in de sandbox en weigert hij de lege titel opnieuw — de hele keten is dus reproduceerbaar.

## Alle aangemaakte/gewijzigde bestanden

```
harness/                                  (nieuw; blogtemplate van create-emdash, daarna aangepast)
  astro.config.mjs                        poort 4330, sandboxRunner, sandboxed: [publiceercheck]
  package.json                            emdash 1.0.1 exact, + sandbox-workerd 0.9.1, + workerd, + publiceercheck file-dep
  pnpm-workspace.yaml                     allowBuilds.worker­d true
  .gitignore                              + dev.log, dev.pid
  pnpm-lock.yaml, seed/, src/, AGENTS.md, skills …  (template-bestanden, ongewijzigd waar niet genoemd)
packages/publiceercheck/                  (nieuw; scaffold van plugin-cli)
  emdash-plugin.jsonc                     publisher-DID, capability hooks.content-policy:register
  src/plugin.ts                           content:beforePublish-hook (lege titel weigeren)
  tests/plugin.test.ts                    2 tests via de sandbox-testhost
  package.json                            emdash 1.0.1 exact als devDep, plugin-test 0.2.6 exact
  pnpm-workspace.yaml                     minimumReleaseAgeExclude (8 exacte regels, door pnpm geschreven)
docs/verslag-01-harness.md                dit verslag
docs/bewijs/                              screenshot + tekst- en JSON-uitvoer van de proofs
```

Niet gecommit (gitignored): `node_modules/`, `dist/`, `harness/data.db`, `harness/uploads/`, `harness/.env` (EMDASH_ENCRYPTION_KEY), `.emdash/`, `harness/dev.log`.

## Open punten / aandachtspunten

1. **`pnpm --dir` valkuil**: corepack kiest de pnpm-versie van de *huidige* map. Buiten de harness aangeroepen (`pnpm --dir harness exec …`) pakt hij 12.6.0 en weigert pnpm de project-pin 11.9.0 (`ERR_PNPM_BAD_PM_VERSION`). Rodelen: `cd harness` en daar `corepack pnpm …`. Overweging voor later: één `packageManager`-pin op repniveau.
2. **`pnpm dlx`/testhost gebruiken intern os.tmpdir()** (`/tmp/emdash-build-*` voor de vitest-probe-build). Dat is gedrag van de tool zelf, geen door mij geplaatste build-output; de vaste installaties en builds staan allemaal in de repo.
3. **Data.db is bewust niet gecommit**: verse start = `pnpm dev` + één keer de bypass-URL aanroepen en de seed+admin zijn er weer. Het verslag bevat alle stappen.
4. **Registry-/publish-flow verder niet aangeraakt** (hoort bij opdracht 2); `emdash-plugin publish` is niet gedraaid.
5. De plugin-scaffold had `emdash ">=0.12.0 <1.0.0"` als devDependency; dat is expliciet naar `1.0.1` gepind zodat de types bij de runtime-versie horen (1.0.0 wordt nooit geïnstalleerd).
