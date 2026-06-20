import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolResult } from "./mcpToolResponses.js";
import { optionalBoolean, requireString, requireStringArray } from "./mcpToolValidation.js";
import type { AnkiClient } from "./utils.js";

type CardTemplateInput = {
	name: string;
	front: string;
	back: string;
};

export const listNoteTypes = async (ankiClient: AnkiClient): Promise<CallToolResult> => {
	const noteTypes = await ankiClient.getModelNames();
	return toolResult({ noteTypes, count: noteTypes.length });
};

export const createNoteType = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>,
	onCatalogChanged?: () => void
): Promise<CallToolResult> => {
	const name = requireString(args.name, "name");
	const fields = requireStringArray(args.fields, "fields");
	const css = args.css === undefined ? "" : String(args.css);
	const templates = parseTemplates(args.templates);

	const existingModels = await ankiClient.getModelNames();
	if (existingModels.includes(name)) {
		throw new Error(`Note type already exists: ${name}`);
	}

	await ankiClient.createModel({
		modelName: name,
		inOrderFields: fields,
		css,
		cardTemplates: templates,
	});
	onCatalogChanged?.();

	return toolResult({
		success: true,
		modelName: name,
		fields,
		templates: templates.length,
	});
};

export const getNoteTypeInfo = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const modelName = requireString(args.modelName, "modelName");
	const includeCss = optionalBoolean(args.includeCss, false);
	await requireModel(ankiClient, modelName);

	const [fields, templates] = await Promise.all([
		ankiClient.getModelFieldNames(modelName),
		ankiClient.getModelTemplates(modelName),
	]);

	if (!includeCss) {
		return toolResult({ modelName, fields, templates });
	}

	const styling = await ankiClient.getModelStyling(modelName);
	return toolResult({ modelName, fields, templates, css: styling.css });
};

export const requireModel = async (ankiClient: AnkiClient, modelName: string): Promise<void> => {
	const models = await ankiClient.getModelNames();
	if (!models.includes(modelName)) {
		throw new Error(`Note type not found: ${modelName}`);
	}
};

export const getModelFields = async (
	ankiClient: AnkiClient,
	modelName: string,
	cache?: Map<string, string[]>
): Promise<string[]> => {
	await requireModel(ankiClient, modelName);
	return getCachedModelFields(ankiClient, modelName, cache);
};

export const getCachedModelFields = async (
	ankiClient: AnkiClient,
	modelName: string,
	cache?: Map<string, string[]>
): Promise<string[]> => {
	const cached = cache?.get(modelName);
	if (cached) {
		return cached;
	}

	const fields = await ankiClient.getModelFieldNames(modelName);
	cache?.set(modelName, fields);
	return fields;
};

const parseTemplates = (value: unknown): CardTemplateInput[] => {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error("templates must be a non-empty array");
	}

	return value.map((template, index) => {
		if (!template || typeof template !== "object" || Array.isArray(template)) {
			throw new Error(`templates[${index}] must be an object`);
		}

		const data = template as Record<string, unknown>;
		return {
			name: requireString(data.name, `templates[${index}].name`),
			front: requireString(data.front, `templates[${index}].front`),
			back: requireString(data.back, `templates[${index}].back`),
		};
	});
};
