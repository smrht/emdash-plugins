# EmDash plugins by emdashplugins.nl

Free, sandboxed plugins for [EmDash CMS](https://emdashcms.com), built and maintained by
[EmDash plugins](https://emdashplugins.nl), a Dutch studio that builds plugins and handles
WordPress to EmDash migrations.

Every plugin here asks for as few permissions as possible. We list them up front, because
in EmDash you approve a plugin's permissions before it runs.

## Plugins

| Plugin | What it does | Permissions |
|---|---|---|
| [Publish Check](packages/publish-check) | Blocks publishing when the title, meta description, headings, alt text or links are broken. | 1: `hooks.content-policy:register`. No network, no content read or write. |

More are on the way. Follow [emdashplugins.nl](https://emdashplugins.nl) or
[@emdashplugins.bsky.social](https://bsky.app/profile/emdashplugins.bsky.social).

## Install

Publish Check is published to the EmDash plugin registry as
`@emdashplugins.bsky.social/publish-check`. On a site with a sandbox runner, open
**Registry** in the admin, search for "Publish Check", review the permission and install.
On Cloudflare the sandbox needs the Workers Paid plan and a `LOADER` binding; on Node it
runs on `workerd`.

## Need something bigger?

Moving a WordPress site to EmDash, or need a plugin that does not exist yet? We build
paid plugins such as [EmDash Forms](https://emdashplugins.nl/forms) and help with
[WordPress to EmDash migrations](https://emdashplugins.nl/blog/wordpress-naar-emdash-migreren).
See [emdashplugins.nl](https://emdashplugins.nl).

## Development

`harness/` is a local EmDash 1.0.1 site (Node + SQLite, sandbox via workerd) used to test
plugins end to end. `packages/<plugin>/` holds each plugin, `video/` the promo videos.

## License

The plugins in this repository are MIT licensed. See each package's `LICENSE` or
`emdash-plugin.jsonc`.
