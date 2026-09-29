# Publish Check

The publish gate for SEO basics. Editors click **Publish**; Publish Check inspects the
entry and rejects publication with a short, plain reason when basic SEO is broken —
instead of letting a broken page go live.

- One capability: `hooks.content-policy:register`. That is the entire trust contract.
  No `content:read`, no `content:write`, no network, no media access. The hook may
  only reject (or allow) the publication it is invoked for.
- No configuration secrets, no external services. Everything runs inside the sandbox.

## What it checks

Runs on `content:beforePublish` and `content:beforeSchedule`, against
`event.content.data` plus the core SEO panel (`event.content.seo`):

| # | Check id | Severity | Rule |
|---|----------|----------|------|
| 1 | `title` | error | Title present; (SEO title if set, else title) + configured title suffix ≤ `maxTitle` (default 60). |
| 2 | `meta-description` | error | Meta description (SEO panel, else excerpt) present and between `minDesc` (120) and `maxDesc` (155) characters. |
| 3 | `no-h1` | error | No H1 blocks in the Portable Text body — the title is the H1. |
| 4 | `image-alt` | error | Every image (Portable Text image and gallery blocks, and image fields) has non-empty alt text. |
| 5 | `heading-order` | warning | No H3–H6 heading before the first H2. |
| 6 | `internal-links` | error | At least `minInternalLinks` internal links (relative href, or absolute on the configured `siteUrl` host). |
| 7 | `link-quality` | warning | No links without URL, no links without link text, no insecure `http://` links. |

Every check has an id, a severity, and a short English and Dutch message; the
`language` setting (default `en`) picks the wording used in reports and reasons.

## Modes

- **block** (default): errors reject the publication with a plain-text reason,
  e.g. `Publish Check: title is 62 chars incl. suffix (max 60) · 2 images without alt text`.
  Warnings never block.
- **warn**: never blocks; every check is only recorded in the reports table.

Reasons are 1–500 characters of plain text, truncated with an ellipsis when needed.

## Settings

Managed from the plugin's **Settings** page in the EmDash admin (Block Kit form,
stored via plugin-scoped `ctx.settings`):

| Setting | Default | Meaning |
|---------|---------|---------|
| `mode` | `block` | `block` rejects on errors; `warn` only reports. |
| `language` | `en` | `en` or `nl` messages. |
| `maxTitle` | `60` | Max title length including suffix. |
| `titleSuffix` | *(empty)* | Suffix the site template appends to titles. |
| `minDesc` / `maxDesc` | `120` / `155` | Meta description bounds. |
| `minInternalLinks` | `1` | Minimum number of internal links. |
| `siteUrl` | *(empty)* | Site URL, so absolute URLs on the same host count as internal. |
| `checkTitle`, `checkDescription`, `checkH1`, `checkAlt`, `checkHeadingOrder`, `checkInternalLinks`, `checkLinkQuality` | `true` | Switch each check on or off. |

## Reports

Every publish/schedule check is stored in the plugin's `reports` storage collection
(indexed on `checkedAt`; declared in the manifest). The **Publish Check** admin page
shows the last 20: entry title, time, action, result (passed / rejected / errors in
warn mode) and the messages.

## Why these capabilities

- `hooks.content-policy:register` — required by EmDash to register
  `content:beforePublish`/`content:beforeSchedule` (see the EmDash hooks reference).
  It grants no content reads or writes.
- `storage: reports` — declared in the manifest, not a capability. Plugin storage is
  namespaced to the plugin by the host.
- Admin pages — Block Kit through the private `admin` route; no capability needed.
- `ctx.settings` — plugin-namespaced by the host; no capability needed.

## Development

```bash
pnpm run validate   # manifest check
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest through the sandbox test host
pnpm run bundle     # release tarball (≤256 KB)
```

Unit tests cover every check with Portable Text fixtures; the sandbox-host tests
exercise both hooks, the reports storage, the settings form, and both admin pages.

## Links

- Website: https://emdashplugins.nl
- Repository: https://github.com/smrht/emdash-plugins
- License: MIT
