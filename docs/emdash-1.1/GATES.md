# Gates: EmDash 1.1 plugin en interactieve werkplaats

OWNS: packages/publish-check/src/**, packages/publish-check/tests/**, packages/publish-check/package.json, packages/publish-check/pnpm-lock.yaml, packages/publish-check/emdash-plugin.jsonc, packages/publish-check/README.md, docs/emdash-1.1/**

Scope: Publish Check controleert statische HTML en embeds onder EmDash 1.1; een publieke interactieve werkplaats op EmDashPlugins.nl gebruikt dezelfde checker en toont haar beperkingen.

- [x] G1: HTML links, afbeeldingen en koppen worden gecontroleerd zonder scripts uit te voeren; iframe-bronnen worden gevalideerd en bestaande content blijft ondersteund.
  EVIDENCE: 61/61 tests, html.test.ts en checks.test.ts; script/template skipped, HTTPS credentials/srcdoc checks,1000blocks+32768UTF16limit.
- [x] G2: Validatie, typecheck, sandboxtests en bundel slagen met EmDash 1.1; publiceren, inplannen en warn-mode worden via runtimeacties bewezen.
  EVIDENCE: Pluginvalidate/typecheck en61sandboxtests groen; echte1.1publish/schedule/warn; publiek teruggedownloade50175bytebundel matches SHA256d4fb98070cff1171e24fbb055c813c17cbd00c6c461a25d8fc019a3217db6434.
- [x] G3: De demo gebruikt dezelfde checker als de plugin en geeft correcte resultaten voor goede, foutieve, lege en grensinvoer; export en herstel werken.
  EVIDENCE: Live browser-functional.json: good0/bad6/empty3,limietfout,inertscript;11→9→invalid→11;HTML/JSONdownloads,copy,standalone9→18,native1.1frame9→18+blankrejection.
- [x] G4: Ontwerp heeft een eigen compositie en betekenisvolle motion; toetsenbord, reduced-motion en 320/375/390/414/768/desktop zijn gecontroleerd.
  EVIDENCE: Live design-check geslaagd,0hardfailures;keyboardHome/Arrow;both tabs320/375/390/414/768/1440nooverflow,reducedmotion0;actuallive desktop/mobile screenshots.
- [x] G5: Hoofdinhoudcontract en onafhankelijke review keuren de werkelijk geteste versie goed vóór publicatie.
  EVIDENCE: PluginreviewNW-fe117073 GOEDGEKEURD; werkplaatsNW-3705e4f7 GOEDGEKEURD vóórdeploy. Receipts bound to candidate/brief. Agentreviews, no human-review claim.
- [x] G6: Pluginrelease en publieke demo zijn gepubliceerd via hun bestaande route en publiek teruggelezen; screenshotbewijs is getoond.
  EVIDENCE: PublishCheck0.3.0 publicPDSrelease+blobbyteproof;https://emdashplugins.nl/werkplaats GET200/liveprimaryroutepassed;Cloudflare8db33c98-d63d-4ae1-a615-79c549d0a736;registryHTTP200.
- [x] G7: Eigen werk is gecommit en gepusht in beide projectrepos; bestaande Notion-projectpagina en sites-beheer bevatten korte resultaatregistratie.
  EVIDENCE: Code commits c119f80(plugin),0044614(site),05edc59(liveproof) pushedmain. Notion3b0fd0b4-7c91-814c-9c43-e8184f2dbd15 updated/readback. Centralrecordreports/emdash-werkplaats-2026-10-02.
