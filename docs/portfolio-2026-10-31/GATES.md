# Gates: EmDash product plugins

OWNS: packages/ulazai-media/**, packages/backlinksbeheer-links/**, docs/portfolio-2026-10-31/**

Scope: Build, test and publish useful EmDash registry plugins for UlazAI and Backlinksbeheer using the existing publisher; preserve Publish Check and unrelated work.

- [x] G1: Product contracts identify real tasks, public API/SDK contracts and costs; code contains no secrets.
  EVIDENCE: PLAN.md, real API/catalog and source contracts, zero actual-key matches in source. Existing owner API reads only, no paid generation; private QA key stored outside repo.
- [ ] G2: UlazAI supports explicit generation, asynchronous status and saving an existing completed image into media, with safe errors and no implicit paid retries.
  EVIDENCE: pending
- [ ] G3: Backlinksbeheer checks links from actual EmDash content on demand and shows HTTP evidence, timestamps and unknown results without labelling blocked hosts broken.
  EVIDENCE: pending
- [ ] G4: Both packages pass manifest validation, type checks, functional tests and sandbox build/bundle limits; actual runtime admin routes are exercised.
  CHECK: node docs/portfolio-2026-10-31/verify-builds.mjs
  EXPECT: BUILD_ARTIFACTS_VERIFIED
  EVIDENCE: pending
- [ ] G5: Both releases are published and public registry pages and author links are read back; approvals pending at provider are explicitly distinguished.
  EVIDENCE: pending
- [ ] G6: Source is pushed and existing project administration records result URLs and exact tested limits.
  EVIDENCE: pending
