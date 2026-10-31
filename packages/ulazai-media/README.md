# UlazAI Media for EmDash

Generate an article image with [UlazAI](https://ulazai.com), check its progress, and save a completed result in the EmDash media library. You can also import an existing generation by ID without starting a new generation.

## Install

Requires EmDash 1.1 or newer and an enabled plugin sandbox. In **Plugins → Registry**, search for `@emdashplugins.bsky.social/ulazai-media`, inspect the permissions, then install. On Cloudflare, the plugin sandbox requires the Workers Paid plan; Node installations use workerd.

1. Open the plugin’s settings and enter an API key from your UlazAI dashboard. EmDash must have `EMDASH_ENCRYPTION_KEY` configured; the host encrypts secret settings. The plugin never prints your key or sends it to an image host.
2. Open **UlazAI Media**, then **Load available models**. The list comes from your account’s model API, including accepted sizes, qualities and estimated credits. The plugin prefers GPT Image 2.5 Flare when available; you choose the model explicitly.
3. Enter the prompt, aspect ratio and quality. Choose **Check settings and prepare**, read the estimate, then confirm **Generate using UlazAI credits**. The service sets the final charge.
4. Choose **Refresh status**. When completed, choose **Save in media library**. Select the imported image in your article and add alt text in EmDash.

For an existing result, enter its generation UUID and choose **Look up existing image**. A new generation is not required.

## Permissions and data

- `network:request:unrestricted`: authenticated requests to `ulazai.com`, and downloads from image URLs returned by that API. Image providers can use different CDN hosts. No authorization header is sent to image hosts. The EmDash bridge enforces its own network restrictions; the plugin also rejects private IP literals, credentials in URLs and non-HTTPS image URLs.
- `media:write`: upload a completed image to this site’s media library. This permission also grants media reads in EmDash.
- The private admin route requires `plugins:manage`. This is a site-wide integration for trusted administrators, using the site’s configured UlazAI account.

Prompts are sent to UlazAI only after confirmation. Model metadata, the latest result, one-use confirmation records and imported media IDs stay in this site’s plugin storage. New generations require an eligible UlazAI account and credits. Loading models, reading status and importing an existing result do not start a paid generation.

## Limits and recovery

PNG, JPEG and WebP imports up to 4 MiB. No SVG or remote HTML imports. Redirecting image downloads are refused. Each confirmation can submit once; the plugin does not automatically retry a paid POST after a network error. If a submission outcome is unknown, inspect your UlazAI history before preparing another generation. A failed or interrupted import stays locked to prevent a duplicate upload: check the media library first. Version 0.1 does not automatically attach the image to an entry or generate alt text.

The same site-wide key and latest-result panel are shared by administrators. Do not connect a personal account on a site where other administrators should not access its generations.

## Development and verification

`pnpm install`, then `pnpm validate`, `pnpm typecheck`, `pnpm test`, `pnpm bundle`. The test suite invokes the built plugin through EmDash’s production Cloudflare sandbox and host bridge. It covers encrypted settings, explicit generation, duplicate submission, real PNG bytes in test R2 and repeat import. External API calls in deterministic tests use fixtures; this does not claim a paid production generation was tested.

MIT for this package. UlazAI service usage follows its own terms and pricing. Report security issues to security@emdashplugins.nl.

## Distributed licenses

MIT License

Copyright (c) 2026 Samautomation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Zod

MIT License

Copyright (c) 2025 Colin McDonnell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
