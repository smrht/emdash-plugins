# EmDash product integrations

Goal: useful installable registry products that expose owned SaaS brands to EmDash users.
Authorised: Sam 31 October: build and set up for other projects, after UlazAI proposal.
Architecture: independent sandboxed TypeScript packages in the existing public EmDash plugin repository; existing publisher account, individual product author links. Block Kit admin UI inherits EmDash layout and accessibility. No new accounts, subscriptions or DNS changes. No paid QA generations without explicit budget.

Selected: UlazAI article-image workflow (existing public API); Backlinksbeheer on-demand outbound link inspection (self-contained product extension, no account data sync).
Rejected: a catalog of link-only shells (no user value); SamDesk customer-data integration (requires separate OAuth/inbox scope); WordPress management in another CMS (poor fit); portfolio content sites without a product task (poor fit).

Implementation: establish API and current SDK contracts; write failing behavioral tests; implement each plugin with validation, bounded network requests and honest states; bundle and execute real sandbox runtime; publish through existing Atmosphere identity; read public pages and links; commit/push explicit paths and update existing Notion project records.
Evidence distinguishes fixture tests, real external reads, runtime checks and any paid generation not run. No claims of end-to-end paid generation without actual result.
