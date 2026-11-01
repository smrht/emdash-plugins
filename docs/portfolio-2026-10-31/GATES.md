# Gates: EmDash product plugins

OWNS: packages/ulazai-media/**, packages/backlinksbeheer-links/**, docs/portfolio-2026-10-31/**

Scope: Build, test and publish useful EmDash registry plugins for UlazAI and Backlinksbeheer using the existing publisher; preserve Publish Check and unrelated work.

- [x] G1: Product contracts identify real tasks, public API/SDK contracts and costs; code contains no secrets.
  EVIDENCE: PLAN.md, real API/catalog and source contracts, zero actual-key matches in source. Existing owner API reads only, no paid generation; private QA key stored outside repo.
- [x] G2: UlazAI supports explicit generation, asynchronous status and saving an existing completed image into media, with safe errors and no implicit paid retries.
  EVIDENCE: 16 passing final sandbox tests incl. blank site URL, encrypted settings, one-use paid intent and byte-identical PNG in test R2; real models/status/image reads HTTP200. No paid QA generation. Node1.4 upload persisted bytes; its return-link error was fixed and covered by the final test.
- [x] G3: Backlinksbeheer checks links from actual EmDash content on demand and shows HTTP evidence, timestamps and unknown results without labelling blocked hosts broken.
  EVIDENCE: 15 passing final tests; browser-proof.json shows real HTTP200 and404 observations through EmDash1.4 Node/workerd,1440/390screenshots and no root overflow.
- [x] G4: Both packages pass manifest validation, type checks, functional tests and sandbox build/bundle limits; actual runtime admin routes are exercised.
  CHECK: node docs/portfolio-2026-10-31/verify-builds.mjs
  EXPECT: BUILD_ARTIFACTS_VERIFIED
  EVIDENCE: mac-build-summary.json and both test logs:31tests,types,validation,bundles all pass; verify-builds.mjs BUILD_ARTIFACTS_VERIFIED, real1.4admin routes andscreenshots.
- [x] G5: Both releases are published and public registry pages and author links are read back; approvals pending at provider are explicitly distinguished.
  EVIDENCE: registry-publication-2026-11-01.json: authorised fresh Executor attempt unlocked the vault; official domain-matching Bitwarden button filled the publisher login and CLI OAuth completed for the pinned DID. Both immutable 0.1.0 releases created, PDS records read back, profile/release assessments passed and both public pages HTTP200. registry-browser-2026-11-01.json: correct canonical, author links without nofollow/sponsored/ugc, desktop1440/mobile390 and no overflow. Runtime archives unchanged.
- [x] G6: Source is pushed and existing project administration records result URLs and exact tested limits.
  EVIDENCE: Source commits2bda953 and163fcdb pushed; GitHub release live, both archives HTTP200 and byte-identical. notion-publication-2026-11-01.json confirms the new public registry URLs read back from all3 existing project pages. Registry publication and browser evidence recorded underG5; own final evidence committed and pushed.
