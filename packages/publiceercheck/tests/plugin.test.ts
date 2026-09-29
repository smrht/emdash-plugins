import { afterEach, describe, expect, it } from "vitest";

import { createPluginTestHost, type PluginTestHost } from "@emdash-cms/plugin-test";

let host: PluginTestHost | undefined;

afterEach(async () => {
	await host?.dispose();
	host = undefined;
});

describe("content:beforePublish", () => {
	it("weigert een lege titel met cancel + reason", async () => {
		host = await createPluginTestHost();
		const result = await host.invokeHook("content:beforePublish", {
			collection: "posts",
			content: { slug: "geen-titel", data: { title: "   " } },
			origin: { source: "api" },
		});
		expect(result).toEqual({
			cancel: true,
			reason: "Titel ontbreekt: vul een titel in voordat je publiceert.",
		});
	});

	it("staat publicatie met een gevulde titel toe", async () => {
		host = await createPluginTestHost();
		const result = await host.invokeHook("content:beforePublish", {
			collection: "posts",
			content: { slug: "wel-titel", data: { title: "Wel een titel" } },
			origin: { source: "api" },
		});
		expect(result).toBeFalsy();
	});
});
