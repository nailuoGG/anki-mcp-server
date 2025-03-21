/**
 * Factory for creating and managing tool instances
 */
import {
	IDeckService,
	IModelService,
	INoteService,
} from "../../interfaces/services.js";
import { DeckTools } from "../../tools/deckTools.js";
import { ModelTools } from "../../tools/modelTools.js";
import { NoteTools } from "../../tools/noteTools.js";

export class ToolFactory {
	private deckTools: DeckTools;
	private noteTools: NoteTools;
	private modelTools: ModelTools;

	/**
	 * @param modelService Required for model-specific tool generation
	 */
	constructor(
		private deckService: IDeckService,
		private noteService: INoteService,
		private modelService: IModelService,
	) {
		// Initialize core tools
		this.deckTools = this.createDeckTools();
		this.noteTools = this.createNoteTools();
		this.modelTools = this.createModelTools();
	}

	private createDeckTools(): DeckTools {
		return new DeckTools(this.deckService);
	}

	private createNoteTools(): NoteTools {
		return new NoteTools(this.noteService, this.modelService);
	}

	private createModelTools(): ModelTools {
		return new ModelTools(this.modelService);
	}

	getDeckTools(): DeckTools {
		return this.deckTools;
	}

	getNoteTools(): NoteTools {
		return this.noteTools;
	}

	getModelTools(): ModelTools {
		return this.modelTools;
	}

	/**
	 * Generates dynamic tools for specific note types
	 * @param modelNames Target models for tool generation
	 * @returns Array of tool definitions with generated schemas
	 */
	async createTypeSpecificTools(modelNames: string[]) {
		const tools = [];

		for (const modelName of modelNames) {
			try {
				// 获取模型信息
				const modelInfo = await this.modelService.getNoteTypeInfo(modelName);

				// 创建工具名称（替换空格为下划线）
				const toolName = `create_${modelName.replace(/\s+/g, "_")}_note`;

				// 生成字段属性
				const fieldProperties: Record<string, any> = {};
				modelInfo.fields.forEach((field) => {
					fieldProperties[field] = {
						type: "string",
						description: `${field} 字段内容`,
					};
				});

				// 添加工具定义
				tools.push({
					name: toolName,
					description: `创建 ${modelName} 类型的笔记`,
					inputSchema: {
						type: "object",
						properties: {
							deck: {
								type: "string",
								description: "牌组名称",
							},
							...fieldProperties,
							tags: {
								type: "array",
								items: {
									type: "string",
								},
								description: "标签列表",
							},
						},
						required: ["deck", modelInfo.fields[0]],
					},
				});
			} catch (error) {
				console.error(`创建 ${modelName} 类型工具失败:`, error);
			}
		}

		return tools;
	}

	/**
	 * Handles note creation for dynamically generated model tools
	 * @param modelName Target model type from Anki
	 * @param args Input arguments matching generated schema
	 * @throws When required fields or deck are missing
	 */
	async handleTypeSpecificNoteTool(modelName: string, args: any) {
		if (!args?.deck) throw new Error("Deck name is required");

		const modelInfo = await this.modelService.getNoteTypeInfo(modelName);
		const fields: Record<string, string> = {};

		// Extract fields from args using model definition
		modelInfo.fields.forEach((field) => {
			if (args[field] !== undefined) {
				fields[field] = args[field];
			}
		});

		if (!fields[modelInfo.fields[0]]) {
			throw new Error(`${modelInfo.fields[0]} field is required`);
		}

		const noteId = await this.noteService.createNote({
			type: modelName as any,
			deck: args.deck,
			fields,
			tags: args.tags,
		});

		return {
			content: [
				{
					type: "text",
					text: `Created ${modelName} note (ID: ${noteId})`,
				},
			],
		};
	}
}
