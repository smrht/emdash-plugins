import type {
	ContentPolicyDecision,
	ContentPolicyEvent,
	PluginContext,
	SandboxedPlugin,
} from "emdash/plugin";
import type { StorageCollection } from "emdash";
import { buildReason, runChecks } from "./checks";
import {
	interactionSchema,
	readSettings,
	settingsFormSchema,
} from "./settings";
import {
	renderReports,
	renderSettingsForm,
	reportsCollection,
	invalidSettingsResponse,
} from "./admin";
import { saveSettings } from "./settings";
import type { ContentData, PublishCheckContent, PublishCheckReport } from "./types";

/**
 * The gate itself. Runs every enabled check over the effective draft,
 * stores a report row, and only rejects in block mode when there are
 * errors. Storage failures are logged and never block publication —
 * an unexpected hook error would abort the action by default.
 */
async function gate(
	event: ContentPolicyEvent,
	ctx: PluginContext,
	action: "publish" | "schedule",
): Promise<ContentPolicyDecision> {
	const settings = await readSettings(ctx);
	const content = (event.content ?? {}) as PublishCheckContent;
	const data = (content.data ?? {}) as ContentData;
	const findings = runChecks(content, settings);
	const errors = findings.filter((finding) => finding.severity === "error");
	const warnings = findings.filter((finding) => finding.severity === "warning");
	const language = settings.language;
	const rejected = settings.mode === "block" && errors.length > 0;

	try {
		const reports = reportsCollection(ctx);
		const report: PublishCheckReport = {
			checkedAt: new Date().toISOString(),
			collection: event.collection,
			entryId: typeof content.id === "string" ? content.id : null,
			slug: typeof content.slug === "string" ? content.slug : null,
			title: typeof data.title === "string" ? data.title : "",
			action,
			mode: settings.mode,
			passed: errors.length === 0,
			rejected,
			errors: errors.map((finding) =>
				language === "nl" ? finding.nl : finding.en,
			),
			warnings: warnings.map((finding) =>
				language === "nl" ? finding.nl : finding.en,
			),
		};
		await reports.put(`${Date.now()}-${crypto.randomUUID()}`, report);
	} catch (error) {
		ctx.log.warn("Publish Check: failed to store report", {
			error: String(error),
		});
	}

	if (rejected) {
		return { cancel: true, reason: buildReason(findings, language) };
	}
	return undefined;
}

const plugin: SandboxedPlugin = {
	hooks: {
		"content:beforePublish": (event, ctx) => gate(event, ctx, "publish"),
		"content:beforeSchedule": (event, ctx) => gate(event, ctx, "schedule"),
	},
	routes: {
		admin: {
			handler: async (routeCtx, ctx) => {
				const parsed = interactionSchema.safeParse(routeCtx.input);
				if (!parsed.success) return { blocks: [] };
				const interaction = parsed.data;
				if (interaction.type === "page_load") {
					return interaction.page === "/settings"
						? renderSettingsForm(ctx)
						: renderReports(ctx);
				}
				if (interaction.type === "form_submit" && interaction.action_id === "save") {
					const values = settingsFormSchema.safeParse(interaction.values);
					if (!values.success) return invalidSettingsResponse();
					await saveSettings(ctx, values.data);
					return renderSettingsForm(ctx, {
						message: "Settings saved",
						type: "success",
					});
				}
				return { blocks: [] };
			},
		},
	},
};

export default plugin;
