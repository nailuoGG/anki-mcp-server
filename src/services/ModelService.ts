/**
 * Model service implementation
 */
import {
	IModelService,
	IAnkiConnectService,
	ILanguageService,
} from "../interfaces/services.js";
import { NoteTypeParams, NoteTypeInfo } from "../interfaces/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * ModelService handles note type operations
 */
export class ModelService implements IModelService {
	/**
	 * Constructor
	 *
	 * @param ankiConnectService AnkiConnect service
	 * @param languageService Language service
	 */
	constructor(
		private ankiConnectService: IAnkiConnectService,
		private languageService: ILanguageService,
	) {}

	/**
	 * List all note types
	 *
	 * 获取所有笔记类型列表
	 *
	 * @returns Promise resolving to an array of note type names
	 */
	async listNoteTypes(): Promise<string[]> {
		return this.ankiConnectService.invoke<string[]>("modelNames");
	}

	/**
	 * Create a new note type
	 *
	 * 创建新的笔记类型
	 *
	 * @param params Note type parameters
	 * @returns Promise resolving to true if successful
	 */
	async createNoteType(params: NoteTypeParams): Promise<boolean> {
		const { name, fields, css, templates } = params;

		if (!name) {
			throw new McpError(ErrorCode.InvalidParams, "Model name is required");
		}

		if (!fields || fields.length === 0) {
			throw new McpError(ErrorCode.InvalidParams, "Fields are required");
		}

		if (!templates || templates.length === 0) {
			throw new McpError(ErrorCode.InvalidParams, "Templates are required");
		}

		// Check if model already exists
		const existingModels = await this.listNoteTypes();
		if (existingModels.includes(name)) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Note type already exists: ${name}`,
			);
		}

		await this.ankiConnectService.invoke("createModel", {
			modelName: name,
			inOrderFields: fields,
			css: css || "",
			cardTemplates: templates,
		});

		return true;
	}

	/**
	 * Get note type information
	 *
	 * 获取笔记类型信息
	 *
	 * @param modelName Note type name
	 * @returns Promise resolving to note type information
	 */
	async getNoteTypeInfo(modelName: string): Promise<NoteTypeInfo> {
		if (!modelName) {
			throw new McpError(ErrorCode.InvalidParams, "Model name is required");
		}

		// Check if model exists
		const existingModels = await this.listNoteTypes();
		if (!existingModels.includes(modelName)) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Note type not found: ${modelName}`,
			);
		}

		// Get model information in parallel
		const [fields, templates, styling] = await Promise.all([
			this.ankiConnectService.invoke<string[]>("modelFieldNames", {
				modelName,
			}),
			this.ankiConnectService.invoke<
				Record<string, { Front: string; Back: string }>
			>("modelTemplates", { modelName }),
			this.ankiConnectService.invoke<{ css: string }>("modelStyling", {
				modelName,
			}),
		]);

		return {
			modelName,
			fields,
			templates,
			css: styling.css,
		};
	}
}
