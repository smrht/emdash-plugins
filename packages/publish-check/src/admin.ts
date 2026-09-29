import type { BlockResponse } from "@emdash-cms/blocks";
import type { StorageCollection } from "emdash";
import type { PluginContext } from "emdash/plugin";
import type { PublishCheckReport } from "./types";
import { readSettings, saveSettings, type SettingsFormValues } from "./settings";

/**
 * The plugin declares `storage: { reports: { indexes: ["checkedAt"] } }` in
 * the manifest; the bridge only exposes that one collection.
 */
export function reportsCollection(
	ctx: PluginContext,
): StorageCollection<PublishCheckReport> {
	return ctx.storage.reports as StorageCollection<PublishCheckReport>;
}

export async function renderReports(ctx: PluginContext): Promise<BlockResponse> {
	const reports = reportsCollection(ctx);
	const settings = await readSettings(ctx);
	const [total, recent] = await Promise.all([
		reports.count(),
		reports.query({ orderBy: { checkedAt: "desc" }, limit: 20 }),
	]);

	const blocks: BlockResponse["blocks"] = [
		{ type: "header", text: "Publish Check" },
		{
			type: "section",
			text: "The publish gate for SEO basics. Errors reject publication in block mode; warnings never block.",
		},
		{
			type: "fields",
			fields: [
				{ label: "Total checks", value: String(total) },
				{ label: "Mode", value: settings.mode },
				{ label: "Language", value: settings.language },
			],
		},
	];

	if (recent.items.length === 0) {
		blocks.push({
			type: "empty",
			title: "No checks yet",
			description:
				"Publish or schedule an entry and the check report appears here.",
		});
	} else {
		blocks.push({
			type: "table",
			page_action_id: "reports_page",
			columns: [
				{ key: "time", label: "Time", format: "relative_time", sortable: true },
				{ key: "entry", label: "Entry" },
				{ key: "action", label: "Action" },
				{ key: "result", label: "Result" },
				{ key: "messages", label: "Messages" },
			],
			rows: recent.items.map(({ data }) => ({
				time: data.checkedAt,
				entry:
					(data.title.trim() === "" ? "(no title)" : data.title) +
					(data.slug ? ` · ${data.slug}` : ""),
				action: data.action,
				result: data.rejected
					? "✕ Rejected"
					: data.errors.length > 0
						? "⚠ Errors (warn mode)"
						: data.warnings.length > 0
							? "⚠ Passed with warnings"
							: "✓ Passed",
				messages: [...data.errors, ...data.warnings].join(" · "),
			})),
			empty_text: "No checks yet",
		});
	}

	return { blocks };
}

export async function renderSettingsForm(
	ctx: PluginContext,
	toast?: BlockResponse["toast"],
): Promise<BlockResponse> {
	const settings = await readSettings(ctx);
	const blocks: BlockResponse["blocks"] = [
		{ type: "header", text: "Publish Check settings" },
		{
			type: "context",
			text: "In block mode, errors reject publication with a short reason. Warnings never block; warn mode never blocks.",
		},
		{
			type: "form",
			block_id: "settings",
			fields: [
				{
					type: "select",
					action_id: "mode",
					label: "Mode",
					options: [
						{ label: "Block — reject publication on errors", value: "block" },
						{ label: "Warn — report only, never reject", value: "warn" },
					],
					initial_value: settings.mode,
				},
				{
					type: "select",
					action_id: "language",
					label: "Report language",
					options: [
						{ label: "English", value: "en" },
						{ label: "Nederlands", value: "nl" },
					],
					initial_value: settings.language,
				},
				{
					type: "number_input",
					action_id: "maxTitle",
					label: "Max title length incl. suffix",
					initial_value: settings.maxTitle,
					min: 1,
					max: 200,
				},
				{
					type: "text_input",
					action_id: "titleSuffix",
					label: "Title suffix the site adds",
					initial_value: settings.titleSuffix,
					placeholder: " — EmDash Plugins",
				},
				{
					type: "number_input",
					action_id: "minDesc",
					label: "Min meta description length",
					initial_value: settings.minDesc,
					min: 0,
					max: 500,
				},
				{
					type: "number_input",
					action_id: "maxDesc",
					label: "Max meta description length",
					initial_value: settings.maxDesc,
					min: 1,
					max: 1000,
				},
				{
					type: "number_input",
					action_id: "minInternalLinks",
					label: "Min internal links",
					initial_value: settings.minInternalLinks,
					min: 0,
					max: 20,
				},
				{
					type: "text_input",
					action_id: "siteUrl",
					label: "Site URL (internal-link detection)",
					initial_value: settings.siteUrl,
					placeholder: "https://example.com",
				},
				{
					type: "toggle",
					action_id: "checkTitle",
					label: "Check title",
					initial_value: settings.checkTitle,
				},
				{
					type: "toggle",
					action_id: "checkDescription",
					label: "Check meta description",
					initial_value: settings.checkDescription,
				},
				{
					type: "toggle",
					action_id: "checkH1",
					label: "Reject H1 blocks in the body",
					initial_value: settings.checkH1,
				},
				{
					type: "toggle",
					action_id: "checkAlt",
					label: "Require image alt text",
					initial_value: settings.checkAlt,
				},
				{
					type: "toggle",
					action_id: "checkHeadingOrder",
					label: "Warn on heading level jumps",
					initial_value: settings.checkHeadingOrder,
				},
				{
					type: "toggle",
					action_id: "checkInternalLinks",
					label: "Require internal links",
					initial_value: settings.checkInternalLinks,
				},
				{
					type: "toggle",
					action_id: "checkLinkQuality",
					label: "Warn on empty and http:// links",
					initial_value: settings.checkLinkQuality,
				},
			],
			submit: { label: "Save settings", action_id: "save" },
		},
	];
	return toast ? { blocks, toast } : { blocks };
}

export function invalidSettingsResponse(): BlockResponse {
	return {
		blocks: [
			{
				type: "banner",
				title: "Invalid settings",
				description:
					"Check the numbers and the site URL, then save again. Nothing was changed.",
				variant: "error",
			},
		],
	};
}

export async function saveSettingsResponse(
	ctx: PluginContext,
	values: SettingsFormValues,
): Promise<BlockResponse> {
	await saveSettings(ctx, values);
	return renderSettingsForm(ctx, { message: "Settings saved", type: "success" });
}
