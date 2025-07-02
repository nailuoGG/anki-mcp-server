import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "../utils.js";
import { BaseTool, IMcpTool } from "./baseTool.js";

export class ListNoteTypesTool extends BaseTool implements IMcpTool {
	name = "list_note_types";
	description = "List all available note types";
	inputSchema = {
		type: "object",
		properties: {},
		required: [],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(
		args: any,
	): Promise<{ content: { type: string; text: string }[] }> {
		try {
			const noteTypes = await this.ankiClient.getModelNames();
			return this.formatSuccessResponse({ noteTypes, count: noteTypes.length });
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class CreateNoteTypeTool extends BaseTool implements IMcpTool {
	name = "create_note_type";
	description = "Create a new note type";
	inputSchema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				description: "Name of the new note type",
			},
			fields: {
				type: "array",
				items: {
					type: "string",
				},
				description: "Field names for the note type",
			},
			css: {
				type: "string",
				description: "CSS styling for the note type",
			},
			templates: {
				type: "array",
				items: {
					type: "object",
					properties: {
						name: {
							type: "string",
						},
						front: {
							type: "string",
						},
						back: {
							type: "string",
						},
					},
					required: ["name", "front", "back"],
				},
				description: "Card templates",
			},
		},
		required: ["name", "fields", "templates"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: {
		name: string;
		fields: string[];
		css?: string;
		templates: { name: string; front: string; back: string }[];
	}): Promise<{ content: { type: string; text: string }[] }> {
		try {
			if (!args.name) {
				throw new McpError(
					ErrorCode.InvalidParams,
					"Note type name is required",
				);
			}

			if (!args.fields || args.fields.length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Fields are required");
			}

			if (!args.templates || args.templates.length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Templates are required");
			}

			// Check if model already exists
			const existingModels = await this.ankiClient.getModelNames();
			if (existingModels.includes(args.name)) {
				throw new McpError(
					ErrorCode.InvalidParams,
					`Note type already exists: ${args.name}`,
				);
			}

			await this.ankiClient.createModel({
				modelName: args.name,
				inOrderFields: args.fields,
				css: args.css || "",
				cardTemplates: args.templates,
			});

			return this.formatSuccessResponse({
				success: true,
				modelName: args.name,
				fields: args.fields,
				templates: args.templates.length,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class UpdateNoteTypeTemplatesTool extends BaseTool implements IMcpTool {
	name = "update_note_type_templates";
	description = "Update the templates of a note type";
	inputSchema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				description: "Name of the note type to update",
			},
			templates: {
				type: "array",
				items: {
					type: "object",
					properties: {
						name: {
							type: "string",
						},
						front: {
							type: "string",
						},
						back: {
							type: "string",
						},
					},
					required: ["name", "front", "back"],
				},
				description: "New card templates",
			},
		},
		required: ["name", "templates"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: {
		name: string;
		templates: { name: string; front: string; back: string }[];
	}): Promise<{ content: { type: string; text: string }[] }> {
		try {
			if (!args.name) {
				throw new McpError(
					ErrorCode.InvalidParams,
					"Note type name is required",
				);
			}

			if (!args.templates || args.templates.length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Templates are required");
			}

			await this.ankiClient.updateModelTemplates({
				modelName: args.name,
				cardTemplates: args.templates,
			});

			return this.formatSuccessResponse({
				success: true,
				modelName: args.name,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class GetNoteTypeInfoTool extends BaseTool implements IMcpTool {
	name = "get_note_type_info";
	description = "Get detailed structure of a note type";
	inputSchema = {
		type: "object",
		properties: {
			modelName: {
				type: "string",
				description: "Name of the note type/model",
			},
			includeCss: {
				type: "boolean",
				description: "Whether to include CSS information",
			},
		},
		required: ["modelName"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { modelName: string; includeCss?: boolean }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.modelName) {
				throw new McpError(ErrorCode.InvalidParams, "Model name is required");
			}

			// Check if model exists
			const existingModels = await this.ankiClient.getModelNames();
			if (!existingModels.includes(args.modelName)) {
				throw new McpError(
					ErrorCode.InvalidParams,
					`Note type not found: ${args.modelName}`,
				);
			}

			// Get model information in parallel
			const [fields, templates] = await Promise.all([
				this.ankiClient.getModelFieldNames(args.modelName),
				this.ankiClient.getModelTemplates(args.modelName),
			]);

			const result: any = {
				modelName: args.modelName,
				fields,
				templates,
			};

			if (args.includeCss) {
				const styling = await this.ankiClient.getModelStyling(args.modelName);
				result.css = styling.css;
			}

			return this.formatSuccessResponse(result);
		} catch (error) {
			return this.handleError(error);
		}
	}
}
