/**
 * Handles tool routing and dynamic tool registration
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { IModelService } from "../../interfaces/services.js";
import { ConnectionManager } from "../managers/ConnectionManager.js";
import { ToolFactory } from "../factories/ToolFactory.js";

/**
 * ToolRouter
 */
export class ToolRouter {
	/**
	 * @param server - MCP server instance
	 * @param toolFactory - Factory for tool creation
	 * @param modelService - Service for model operations
	 * @param connectionManager - Handles Anki connection state
	 */
	constructor(
		private server: Server,
		private toolFactory: ToolFactory,
		private modelService: IModelService,
		private connectionManager: ConnectionManager,
	) {
		this.setupToolHandlers();
	}

	/**
	 * Registers tool handlers and dynamic model-specific tools
	 */
	private async setupToolHandlers() {
		// Get all existing note types for dynamic tool generation
		const modelNames = await this.modelService.listNoteTypes();
		const typeSpecificTools =
			await this.toolFactory.createTypeSpecificTools(modelNames);

		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				// 动态生成的类型专用工具
				...typeSpecificTools,
				{
					name: "list_decks",
					description: "List all available Anki decks",
					inputSchema: {
						type: "object",
						properties: {},
						required: [],
					},
				},
				{
					name: "create_deck",
					description: "Create a new Anki deck",
					inputSchema: {
						type: "object",
						properties: {
							name: {
								type: "string",
								description: "Name of the deck to create",
							},
						},
						required: ["name"],
					},
				},
				{
					name: "get_note_type_info",
					description: "Get detailed structure of a note type",
					inputSchema: {
						type: "object",
						properties: {
							modelName: {
								type: "string",
								description: "Name of the note type/model",
							},
						},
						required: ["modelName"],
					},
				},
				{
					name: "create_note",
					description:
						"Create a new note (supports Basic/Cloze types and custom fields)",
					inputSchema: {
						type: "object",
						properties: {
							// Note: Fields are dynamically validated based on model
							type: {
								type: "string",
								enum: ["Basic", "Cloze"],
								description: "Note type",
							},
							deck: {
								type: "string",
								description: "Deck name",
							},
							front: {
								type: "string",
								description: "Front content (for Basic notes)",
							},
							back: {
								type: "string",
								description: "Back content (for Basic notes)",
							},
							text: {
								type: "string",
								description: "Cloze text (for Cloze notes)",
							},
							backExtra: {
								type: "string",
								description: "Additional back content (for Cloze notes)",
							},
							fields: {
								type: "object",
								description: "Custom fields for the note",
								additionalProperties: true,
							},
							tags: {
								type: "array",
								items: {
									type: "string",
								},
								description: "Tags for the note",
							},
						},
						required: ["type", "deck"],
					},
				},
				{
					name: "batch_create_notes",
					description: "Create multiple notes at once",
					inputSchema: {
						type: "object",
						properties: {
							notes: {
								type: "array",
								items: {
									type: "object",
									properties: {
										type: {
											type: "string",
											enum: ["Basic", "Cloze"],
										},
										deck: {
											type: "string",
										},
										front: {
											type: "string",
										},
										back: {
											type: "string",
										},
										text: {
											type: "string",
										},
										backExtra: {
											type: "string",
										},
										fields: {
											type: "object",
											additionalProperties: true,
										},
										tags: {
											type: "array",
											items: {
												type: "string",
											},
										},
									},
									required: ["type", "deck"],
								},
							},
							stopOnError: {
								type: "boolean",
								description: "Whether to stop on first error",
							},
						},
						required: ["notes"],
					},
				},
				{
					name: "search_notes",
					description: "Search for notes using Anki query syntax",
					inputSchema: {
						type: "object",
						properties: {
							query: {
								type: "string",
								description: "Anki search query",
							},
						},
						required: ["query"],
					},
				},
				{
					name: "get_note_info",
					description: "Get detailed information about a note",
					inputSchema: {
						type: "object",
						properties: {
							noteId: {
								type: "number",
								description: "Note ID",
							},
						},
						required: ["noteId"],
					},
				},
				{
					name: "update_note",
					description: "Update an existing note",
					inputSchema: {
						type: "object",
						properties: {
							id: {
								type: "number",
								description: "Note ID",
							},
							fields: {
								type: "object",
								description: "Fields to update",
							},
							tags: {
								type: "array",
								items: {
									type: "string",
								},
								description: "New tags for the note",
							},
						},
						required: ["id", "fields"],
					},
				},
				{
					name: "delete_note",
					description: "Delete a note",
					inputSchema: {
						type: "object",
						properties: {
							noteId: {
								type: "number",
								description: "Note ID to delete",
							},
						},
						required: ["noteId"],
					},
				},
				{
					name: "list_note_types",
					description: "List all available note types",
					inputSchema: {
						type: "object",
						properties: {},
						required: [],
					},
				},
				{
					name: "create_note_type",
					description: "Create a new note type",
					inputSchema: {
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
					},
				},
			],
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			await this.connectionManager.checkConnection();

			const deckTools = this.toolFactory.getDeckTools();
			const noteTools = this.toolFactory.getNoteTools();
			const modelTools = this.toolFactory.getModelTools();

			switch (request.params.name) {
				// Deck tools
				case "list_decks":
					return deckTools.listDecks(request.params.arguments as any);

				case "create_deck":
					return deckTools.createDeck(request.params.arguments as any);

				// Note tools
				case "create_note":
					return noteTools.createNote(request.params.arguments as any);

				case "batch_create_notes":
					return noteTools.batchCreateNotes(request.params.arguments as any);

				case "search_notes":
					return noteTools.searchNotes(request.params.arguments as any);

				case "get_note_info":
					return noteTools.getNoteInfo(request.params.arguments as any);

				case "update_note":
					return noteTools.updateNote(request.params.arguments as any);

				case "delete_note":
					return noteTools.deleteNote(request.params.arguments as any);

				// Model tools
				case "list_note_types":
					return modelTools.listNoteTypes(request.params.arguments as any);

				case "create_note_type":
					return modelTools.createNoteType(request.params.arguments as any);

				case "get_note_type_info":
					return modelTools.getNoteTypeInfo(request.params.arguments as any);

				// Dynamic model-specific note creation
				default:
					const typeToolMatch = request.params.name.match(/^create_(.+)_note$/);
					if (typeToolMatch) {
						const modelName = typeToolMatch[1].replace(/_/g, " ");
						return this.toolFactory.handleTypeSpecificNoteTool(
							modelName,
							request.params.arguments,
						);
					}

					throw new McpError(
						ErrorCode.MethodNotFound,
						`Unknown tool: ${request.params.name}`,
					);
			}
		});
	}
}
