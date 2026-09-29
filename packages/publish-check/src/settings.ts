import { z } from "zod";
import type { PluginContext } from "emdash/plugin";
import type { Lang, PublishCheckSettings } from "./types";

export const SETTINGS_DEFAULTS: PublishCheckSettings = {
	mode: "block",
	language: "en",
	maxTitle: 60,
	titleSuffix: "",
	minDesc: 120,
	maxDesc: 155,
	minInternalLinks: 1,
	siteUrl: "",
	checkTitle: true,
	checkDescription: true,
	checkH1: true,
	checkAlt: true,
	checkHeadingOrder: true,
	checkInternalLinks: true,
	checkLinkQuality: true,
};

const SETTING_KEYS = Object.keys(SETTINGS_DEFAULTS) as Array<
	keyof PublishCheckSettings
>;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, Math.round(value)));
}

function oneOf<T extends string>(value: unknown, allowed: Array<T>, fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function asText(value: unknown, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}

/**
 * Reads all settings with read-time defaults, so existing installations
 * pick up new settings without a migration (see EmDash settings docs).
 */
export async function readSettings(ctx: PluginContext): Promise<PublishCheckSettings> {
	const stored = await Promise.all(
		SETTING_KEYS.map(async (key) => [key, await ctx.settings.get(key)] as const),
	);
	const value = Object.fromEntries(stored) as Record<string, unknown>;
	return {
		mode: oneOf(value.mode, ["block", "warn"], SETTINGS_DEFAULTS.mode),
		language: oneOf(value.language, ["en", "nl"], SETTINGS_DEFAULTS.language),
		maxTitle: clampNumber(value.maxTitle, 60, 1, 200),
		titleSuffix: asText(value.titleSuffix, ""),
		minDesc: clampNumber(value.minDesc, 120, 0, 500),
		maxDesc: clampNumber(value.maxDesc, 155, 1, 1000),
		minInternalLinks: clampNumber(value.minInternalLinks, 1, 0, 20),
		siteUrl: asText(value.siteUrl, ""),
		checkTitle: asBoolean(value.checkTitle, true),
		checkDescription: asBoolean(value.checkDescription, true),
		checkH1: asBoolean(value.checkH1, true),
		checkAlt: asBoolean(value.checkAlt, true),
		checkHeadingOrder: asBoolean(value.checkHeadingOrder, true),
		checkInternalLinks: asBoolean(value.checkInternalLinks, true),
		checkLinkQuality: asBoolean(value.checkLinkQuality, true),
	};
}

/** Values as the Block Kit settings form submits them. */
export const settingsFormSchema = z.object({
	mode: z.enum(["block", "warn"]),
	language: z.enum(["en", "nl"]),
	maxTitle: z.coerce.number().int().min(1).max(200),
	titleSuffix: z.string().max(200),
	minDesc: z.coerce.number().int().min(0).max(500),
	maxDesc: z.coerce.number().int().min(1).max(1000),
	minInternalLinks: z.coerce.number().int().min(0).max(20),
	siteUrl: z
		.string()
		.max(500)
		.refine(
			(value) => {
				if (value === "") return true;
				try {
					new URL(value);
					return true;
				} catch {
					return false;
				}
			},
			{ message: "siteUrl must be empty or an absolute URL" },
		),
	checkTitle: z.boolean(),
	checkDescription: z.boolean(),
	checkH1: z.boolean(),
	checkAlt: z.boolean(),
	checkHeadingOrder: z.boolean(),
	checkInternalLinks: z.boolean(),
	checkLinkQuality: z.boolean(),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export async function saveSettings(
	ctx: PluginContext,
	values: SettingsFormValues,
): Promise<void> {
	for (const [key, value] of Object.entries(values)) {
		await ctx.settings.set(key, value);
	}
}

/** The Block Kit interactions the admin route can receive. */
export const interactionSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("page_load"), page: z.string() }),
	z.object({
		type: z.literal("block_action"),
		action_id: z.string(),
		block_id: z.string().optional(),
		value: z.unknown().optional(),
	}),
	z.object({
		type: z.literal("form_submit"),
		action_id: z.string(),
		block_id: z.string().optional(),
		values: z.record(z.string(), z.unknown()),
		page: z.string().optional(),
	}),
]);
