/**
 * Handles Anki-related resource routing and operations
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
	ErrorCode,
	ListResourcesRequestSchema,
	ListResourceTemplatesRequestSchema,
	McpError,
	ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { IDeckService, IModelService } from "../../interfaces/services.js";
import { ConnectionManager } from "../managers/ConnectionManager.js";

/**
 * ResourceRouter
 */
export class ResourceRouter {
	/**
	 * @param server MCP server instance
	 * @param deckService Deck service interface
	 * @param modelService Note type service interface
	 * @param connectionManager Connection manager
	 */
	constructor(
		private server: Server,
		private deckService: IDeckService,
		private modelService: IModelService,
		private connectionManager: ConnectionManager,
	) {
		this.setupResourceHandlers();
	}

	/** Initialize all resource request handlers */
	private setupResourceHandlers() {
		this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
			await this.connectionManager.checkConnection();

			return {
				resources: [
					{
						uri: "anki://decks/current",
						name: "Current Deck",
						description: "Information about the currently selected deck",
						mimeType: "application/json",
					},
					{
						uri: "anki://decks/all",
						name: "All Decks",
						description: "List of all available decks in Anki",
						mimeType: "application/json",
					},
				],
			};
		});

		this.server.setRequestHandler(
			ListResourceTemplatesRequestSchema,
			async () => {
				await this.connectionManager.checkConnection();

				return {
					resourceTemplates: [
						{
							uriTemplate: "anki://note-types/{modelName}",
							name: "Note Type Schema",
							description:
								"Detailed structure information for a specific note type",
							mimeType: "application/json",
						},
						{
							uriTemplate: "anki://note-types/all",
							name: "All Note Types",
							description: "List of all available note types",
							mimeType: "application/json",
						},
						{
							uriTemplate: "anki://decks/current",
							name: "Current Deck",
							description: "Currently active deck in Anki",
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
			},
		);

		this.server.setRequestHandler(
			ReadResourceRequestSchema,
			async (request) => {
				await this.connectionManager.checkConnection();

				const uri = request.params.uri;

				if (uri === "anki://decks/current") {
					const currentDeck = await this.deckService.getCurrentDeck();
					return {
						contents: [
							{
								uri,
								mimeType: "application/json",
								text: JSON.stringify(
									{
										name: currentDeck,
										uri: `anki://decks/current`,
									},
									null,
									2,
								),
							},
						],
					};
				}

				if (uri === "anki://decks/all") {
					const decks = await this.deckService.listDecks();
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
									2,
								),
							},
						],
					};
				}

				const noteTypeMatch = uri.match(/^anki:\/\/note-types\/(.+)$/);
				if (noteTypeMatch) {
					const modelName = decodeURIComponent(noteTypeMatch[1]);
					try {
						const modelInfo =
							await this.modelService.getNoteTypeInfo(modelName);
						return {
							contents: [
								{
									uri,
									mimeType: "application/json",
									text: JSON.stringify(
										{
											...modelInfo,
											createTool: `create_${modelName.replace(
												/\s+/g,
												"_",
											)}_note`,
											requiredFields: [modelInfo.fields[0]],
										},
										null,
										2,
									),
								},
							],
						};
					} catch (error) {
						throw new McpError(
							ErrorCode.InvalidParams,
							`Note type '${modelName}' does not exist`,
						);
					}
				}

				throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
			},
		);
	}
}
