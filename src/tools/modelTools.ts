/**
 * Model tool handlers
 */
import { IModelService } from "../interfaces/services.js";
import {
	ListNoteTypesArgs,
	CreateNoteTypeArgs,
	GetNoteTypeInfoArgs,
} from "../interfaces/schemas.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * ModelTools class handles note type-related MCP tools
 */
export class ModelTools {
	/**
	 * Constructor
	 *
	 * @param modelService Model service
	 */
	constructor(private modelService: IModelService) {}

	/**
	 * List all note types
	 *
	 * @param args Empty arguments object
	 * @returns Promise resolving to tool response with note type list
	 */
	async listNoteTypes(args?: ListNoteTypesArgs) {
		const noteTypes = await this.modelService.listNoteTypes();
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(noteTypes, null, 2),
				},
			],
		};
	}

	/**
	 * Create a new note type
	 *
	 * @param args Note type creation arguments
	 * @returns Promise resolving to tool response with creation result
	 */
	async createNoteType(args: CreateNoteTypeArgs) {
		if (!args) {
			throw new McpError(ErrorCode.InvalidParams, "Arguments are required");
		}

		if (!args.name) {
			throw new McpError(ErrorCode.InvalidParams, "Model name is required");
		}

		if (
			!args.fields ||
			!Array.isArray(args.fields) ||
			args.fields.length === 0
		) {
			throw new McpError(ErrorCode.InvalidParams, "Fields array is required");
		}

		if (
			!args.templates ||
			!Array.isArray(args.templates) ||
			args.templates.length === 0
		) {
			throw new McpError(
				ErrorCode.InvalidParams,
				"Templates array is required",
			);
		}

		await this.modelService.createNoteType(args);
		return {
			content: [
				{
					type: "text",
					text: `Created note type: ${args.name}`,
				},
			],
		};
	}

	/**
	 * Get note type information
	 *
	 * @param args Note type info arguments
	 * @returns Promise resolving to tool response with note type information
	 */
	async getNoteTypeInfo(args: GetNoteTypeInfoArgs) {
		if (!args || !args.modelName) {
			throw new McpError(ErrorCode.InvalidParams, "Model name is required");
		}

		const info = await this.modelService.getNoteTypeInfo(args.modelName);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(info, null, 2),
				},
			],
		};
	}
}
