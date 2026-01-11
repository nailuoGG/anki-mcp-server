/**
 * MCP Resource handlers for Anki
 */
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "./utils.js";

/**
 * Handles all MCP resource operations for Anki
 */
export class McpResourceHandler {
	private ankiClient: AnkiClient;
	private modelSchemaCache: Map<string, ModelSchema>;
	private allModelSchemasCache: ModelSchema[] | null;
	private cacheExpiry: number;
	private lastCacheUpdate: number;

	constructor() {
		this.ankiClient = new AnkiClient();
		this.modelSchemaCache = new Map();
		this.allModelSchemasCache = null;
		this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
		this.lastCacheUpdate = 0;
	}

	/**
	 * List all available resources
	 */
	async listResources(): Promise<{
		resources: {
			uri: string;
			name: string;
			description?: string;
			mimeType?: string;
		}[];
	}> {
		await this.ankiClient.checkConnection();

		return {
			resources: [
				{
					uri: "anki://decks/all",
					name: "All Decks",
					description: "List of all available decks in Anki",
					mimeType: "application/json",
				},
			],
		};
	}

	/**
	 * List all available resource templates
	 */
	async listResourceTemplates(): Promise<{
		resourceTemplates: {
			uriTemplate: string;
			name: string;
			description?: string;
			mimeType?: string;
		}[];
	}> {
		await this.ankiClient.checkConnection();

		return {
			resourceTemplates: [
				{
					uriTemplate: "anki://note-types/{modelName}",
					name: "Note Type Schema",
					description: "Detailed structure information for a specific note type",
					mimeType: "application/json",
				},
				{
					uriTemplate: "anki://note-types/all",
					name: "All Note Types",
					description: "List of all available note types",
					mimeType: "application/json",
				},
				{
					uriTemplate: "anki://note-types/all-with-schemas",
					name: "All Note Types with Schemas",
					description: "Detailed structure information for all note types",
					mimeType: "application/json",
				},
				{
					uriTemplate: "anki://decks/all",
					name: "All Decks",
					description: "Complete list of available decks",
					mimeType: "application/json",
				},
			],
		};
	}

	/**
	 * Read a resource by URI
	 */
	async readResource(uri: string): Promise<{
		contents: {
			uri: string;
			mimeType?: string;
			text: string;
		}[];
	}> {
		await this.ankiClient.checkConnection();
		if (uri === "anki://decks/all") {
			const decks = await this.ankiClient.getDeckNames();
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify(
							{
								decks,
								count: decks.length,
							},
							null,
							2
						),
					},
				],
			};
		}

		if (uri === "anki://note-types/all") {
			const modelNames = await this.ankiClient.getModelNames();
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify(
							{
								noteTypes: modelNames,
								count: modelNames.length,
							},
							null,
							2
						),
					},
				],
			};
		}

		if (uri === "anki://note-types/all-with-schemas") {
			const schemas = await this.getAllModelSchemas();
			return {
				contents: [
					{
						uri,
						mimeType: "application/json",
						text: JSON.stringify(
							{
								noteTypes: schemas,
								count: schemas.length,
							},
							null,
							2
						),
					},
				],
			};
		}

		const noteTypeMatch = uri.match(/^anki:\/\/note-types\/(.+)$/);
		if (noteTypeMatch) {
			const modelName = decodeURIComponent(noteTypeMatch[1]);
			try {
				const schema = await this.getModelSchema(modelName);
				return {
					contents: [
						{
							uri,
							mimeType: "application/json",
							text: JSON.stringify(
								{
									modelName: schema.modelName,
									fields: schema.fields,
									templates: schema.templates,
									css: schema.css,
									createTool: `create_${modelName.replace(/\s+/g, "_")}_note`,
								},
								null,
								2
							),
						},
					],
				};
			} catch (_error) {
				throw new McpError(ErrorCode.InvalidParams, `Note type '${modelName}' does not exist`);
			}
		}

		throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
	}

	/**
	 * Get schema for a specific model
	 */
	private async getModelSchema(modelName: string): Promise<ModelSchema> {
		if (!modelName) {
			throw new McpError(ErrorCode.InvalidParams, "Model name is required");
		}

		// Check cache first
		const now = Date.now();
		const cached = this.modelSchemaCache.get(modelName);
		if (cached && now - this.lastCacheUpdate < this.cacheExpiry) {
			return cached;
		}

		// Check if model exists
		const existingModels = await this.ankiClient.getModelNames();
		if (!existingModels.includes(modelName)) {
			throw new McpError(ErrorCode.InvalidParams, `Note type not found: ${modelName}`);
		}

		// Get model information in parallel
		const [fields, templates, styling] = await Promise.all([
			this.ankiClient.getModelFieldNames(modelName),
			this.ankiClient.getModelTemplates(modelName),
			this.ankiClient.getModelStyling(modelName),
		]);

		const modelSchema = {
			modelName,
			fields,
			templates,
			css: styling.css,
		};

		// Update cache
		this.modelSchemaCache.set(modelName, modelSchema);
		this.lastCacheUpdate = now;

		return modelSchema;
	}

	/**
	 * Get schemas for all models
	 */
	private async getAllModelSchemas(): Promise<ModelSchema[]> {
		// Check cache first
		const now = Date.now();
		if (this.allModelSchemasCache && now - this.lastCacheUpdate < this.cacheExpiry) {
			return this.allModelSchemasCache;
		}

		const modelNames = await this.ankiClient.getModelNames();
		const schemas = await Promise.all(
			modelNames.map((modelName) => this.getModelSchema(modelName))
		);

		// Update cache
		this.allModelSchemasCache = schemas;
		this.lastCacheUpdate = now;

		return schemas;
	}

	/**
	 * Clear all cached data
	 */
	clearCache(): void {
		this.modelSchemaCache.clear();
		this.allModelSchemasCache = null;
		this.lastCacheUpdate = 0;
	}
}

/**
 * Model schema type
 */
interface ModelSchema {
	modelName: string;
	fields: string[];
	templates: Record<string, { Front: string; Back: string }>;
	css: string;
}
