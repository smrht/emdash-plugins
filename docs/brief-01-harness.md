# Opdracht 1: lokale EmDash-testomgeving met sandbox-runner (Node) + publiceercheck-skelet

Werkmap: /home/agent/emdash-plugins (publieke git-repo smrht/emdash-plugins, MIT). Denk grondig na.
Commit in deze repo met duidelijke berichten. NIET pushen (de hoofdsessie pusht na controle).

## Harde regels
- Builds/installs zwaar werk via `/home/agent/bin/agentbox-run-heavy <commando>` (GEEN `--` ervoor; exit 75 = capaciteit vol, 2 min wachten, max 5x). Geen `timeout` eromheen.
- Niets in /tmp of /dev/shm. Geen secrets committen. Geen remote Cloudflare-commando's (dit is een Node/SQLite-site).
- pnpm 12 weigert vandaag-gepubliceerde versies (minimumReleaseAge): voeg dan per pakket exacte `minimumReleaseAgeExclude`-regels toe in pnpm-workspace.yaml, zoals eerder in /home/agent/emdashplugins.nl/site/pnpm-workspace.yaml.
- Docs (offline kopie): /home/agent/emdash-plugins/docs/emdash-docs/*.txt. Lees minimaal your-first-plugin, hooks, capabilities, block-kit, settings, storage, testing, cli, manifest, plugin-sandbox.
- Stop achtergrondprocessen die je start (alleen je eigen PID's; gebruik nooit `pkill -f`).

## Taken
1. `harness/`: maak een EmDash 1.0.1-site voor Node + SQLite met het blogtemplate
   (`npm create astro@latest -- --template @emdash-cms/template-blog` of `npm create emdash@latest`, niet-interactief).
   Pin `emdash` en `@emdash-cms/*` exact op 1.0.1 (NOOIT 1.0.0). Configureer de sandbox-runner voor Node:
   `sandboxRunner: "@emdash-cms/sandbox-workerd/sandbox"` + `workerd` (zie plugin-sandbox.txt). Poort 4330.
2. Doorloop de eerste setup zodat er een admin-gebruiker en voorbeeldcontent zijn. **Zoek uit en documenteer hoe je in
   /_emdash/admin inlogt op deze lokale dev-site zonder mens** (setup-wizard, magic link in de console/log, dev-bypass,
   of een API-token via de CLI). Dit is cruciaal: we moeten later in een headless browser door de admin kunnen klikken.
3. `packages/publiceercheck/`: scaffold met `pnpm dlx @emdash-cms/plugin-cli init publiceercheck` (niet-interactief waar
   mogelijk; publisher tijdelijk `did:plc:placeholder` als hij iets moet hebben, dit vervangen we later), licentie MIT,
   author "emdashplugins.nl" url https://emdashplugins.nl, security email security@emdashplugins.nl,
   repo https://github.com/smrht/emdash-plugins.
   Laat de plugin voorlopig alleen een `content:beforePublish`-hook hebben met capability `hooks.content-policy:register`
   die weigert (`{ cancel: true, reason }`) als de titel leeg is. (De echte regels bouwen we in opdracht 2.)
4. `emdash-plugin validate` en `emdash-plugin bundle` groen. Laad de gebundelde plugin LOKAAL in de harness-site
   (via `sandboxed: [...]` in astro.config of de lokale installatieroute uit de docs), zodat hij in de sandbox draait.
5. Bewijs dat het werkt: probeer via de admin-API of CLI een post met lege titel te publiceren → PUBLISH_REJECTED met de
   reason; met titel → gepubliceerd. En toon dat de plugin in de admin onder Plugins staat.

## Acceptatie (schrijf naar /home/agent/emdash-plugins/docs/verslag-01-harness.md)
- Exacte commando's om de harness te starten en te stoppen, poort, en de inlogroute voor de admin (stap voor stap,
  headless bruikbaar, bv. hoe je aan een sessiecookie of magic link komt).
- Uitvoer van validate + bundle (bundlegrootte), en de API-/CLI-uitvoer van de weigering en de geslaagde publicatie.
- Alle gewijzigde/aangemaakte bestanden, open problemen. Commit alles (zonder node_modules, .emdash, databestanden).
