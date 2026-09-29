import type { SandboxedPlugin } from "emdash/plugin";

/**
 * Publiceercheck — weigert publicatie als de titel leeg is.
 *
 * De echte regels volgen in opdracht 2; dit is het skelet met één
 * concrete regel zodat de hook-pipeline end-to-end bewezen is.
 */
const plugin: SandboxedPlugin = {
	hooks: {
		"content:beforePublish": {
			handler: async (event, ctx) => {
				const data = event.content.data;
				const title =
					typeof data === "object" && data !== null && "title" in data
						? data.title
						: undefined;

				if (typeof title !== "string" || title.trim() === "") {
					ctx.log.info("Publicatie geweigerd: lege titel", {
						collection: event.collection,
						slug: event.content.slug,
					});
					return {
						cancel: true,
						reason:
							"Titel ontbreekt: vul een titel in voordat je publiceert.",
					};
				}

				return undefined;
			},
		},
	},
};

export default plugin;
