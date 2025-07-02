import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "./utils.js";

/**
 * MCP Resource Handler - responsible for exposing Anki data as readable resources
 */
export class McpResourceHandler {
	private ankiClient: AnkiClient;

	constructor(ankiClient: AnkiClient) {
		this.ankiClient = ankiClient;
	}

	/**
	 * List all available resources
	 * Including: decks, note types, server configuration, etc.
	 */
	async listResources(): Promise<{
		resources: {
			uri: string;
			name: string;
			type: string;
			description: string;
		}[];
	}> {
		const resources = [];

		// Deck resources
		const decks = await this.ankiClient.getDeckNames();
		for (const deckName of decks) {
			resources.push({
				uri: `/decks/${encodeURIComponent(deckName)}`,
				name: deckName,
				type: "deck",
				description: `Anki deck: ${deckName}`,
			});

			// Notes resources under deck
			resources.push({
				uri: `/decks/${encodeURIComponent(deckName)}/notes`,
				name: `${deckName} - Note List`,
				type: "deck_notes",
				description: `All notes in deck ${deckName}`,
			});

			// Deck analysis resources
			resources.push({
				uri: `/decks/${encodeURIComponent(deckName)}/analysis`,
				name: `${deckName} - Learning Analysis`,
				type: "deck_analysis",
				description: `Learning progress and statistical analysis for deck ${deckName}`,
			});
		}

		// Note type resources
		const noteTypes = await this.ankiClient.getModelNames();
		for (const noteType of noteTypes) {
			resources.push({
				uri: `/noteTypes/${encodeURIComponent(noteType)}`,
				name: noteType,
				type: "noteType",
				description: `Anki note type: ${noteType}`,
			});
		}

		// Search resources (dynamic resource templates)
		resources.push({
			uri: "/search/notes",
			name: "Note Search",
			type: "search",
			description: "Search Anki notes (use query parameter ?query=search_term)",
		});

		resources.push({
			uri: "/search/cards",
			name: "Card Search",
			type: "search",
			description: "Search Anki cards (use query parameter ?query=search_term)",
		});

		// Server configuration resources
		resources.push({
			uri: "/server/config",
			name: "Server Configuration",
			type: "configuration",
			description: "Anki MCP server configuration information",
		});

		// Learning statistics resources
		resources.push({
			uri: "/stats/overview",
			name: "Learning Overview",
			type: "statistics",
			description: "Overall learning progress and statistical data",
		});

		return { resources };
	}

	/**
	 * List resource templates
	 * Provides templates for creating new resources
	 */
	async listResourceTemplates(): Promise<{
		templates: {
			uri: string;
			name: string;
			type: string;
			description: string;
			schema: Record<string, any>;
		}[];
	}> {
		const templates = [];

		// New deck creation template
		templates.push({
			uri: "/templates/deck",
			name: "New Deck Template",
			type: "deck",
			description: "Template for creating new Anki deck",
			schema: {
				type: "object",
				properties: {
					name: { type: "string", description: "Deck name" },
					description: { type: "string", description: "Deck description" },
				},
				required: ["name"],
			},
		});

		// New note type creation template
		templates.push({
			uri: "/templates/noteType",
			name: "New Note Type Template",
			type: "noteType",
			description: "Template for creating new Anki note type",
			schema: {
				type: "object",
				properties: {
					name: { type: "string", description: "Note type name" },
					fields: {
						type: "array",
						items: { type: "string" },
						description: "List of field names",
					},
					css: { type: "string", description: "CSS styling" },
					templates: {
						type: "array",
						items: {
							type: "object",
							properties: {
								name: { type: "string", description: "Template name" },
								front: { type: "string", description: "Front template" },
								back: { type: "string", description: "Back template" },
							},
							required: ["name", "front", "back"],
						},
						description: "Card templates",
					},
				},
				required: ["name", "fields", "templates"],
			},
		});

		// Note search template
		templates.push({
			uri: "/templates/search",
			name: "Search Query Template",
			type: "search",
			description: "Template for Anki search queries",
			schema: {
				type: "object",
				properties: {
					query: { type: "string", description: "Search query string" },
					type: {
						type: "string",
						enum: ["notes", "cards"],
						description: "Search type: notes or cards",
					},
					limit: {
						type: "number",
						description: "Limit on number of results returned",
						default: 50,
					},
				},
				required: ["query", "type"],
			},
		});

		return { templates };
	}

	/**
	 * Read the content of specified resource
	 * Returns corresponding resource data based on URI path
	 */
	async readResource(uri: string): Promise<{
		content: { type: string; text: string }[];
	}> {
		// Parse query parameters
		const [path, queryString] = uri.split("?");
		const queryParams = new URLSearchParams(queryString || "");

		// Handle deck resources
		if (path.startsWith("/decks/")) {
			return await this.handleDeckResource(path, queryParams);
		}

		// Handle note type resources
		if (path.startsWith("/noteTypes/")) {
			return await this.handleNoteTypeResource(path);
		}

		// Handle search resources
		if (path.startsWith("/search/")) {
			return await this.handleSearchResource(path, queryParams);
		}

		// Handle single note resources
		if (path.startsWith("/notes/")) {
			return await this.handleNoteResource(path);
		}

		// Handle single card resources
		if (path.startsWith("/cards/")) {
			return await this.handleCardResource(path);
		}

		// Handle statistics resources
		if (path.startsWith("/stats/")) {
			return await this.handleStatsResource(path);
		}

		// Handle server configuration
		if (path === "/server/config") {
			return await this.handleServerConfig();
		}

		throw new McpError(ErrorCode.MethodNotFound, `Resource not found: ${uri}`);
	}

	/**
	 * Handle deck-related resources
	 */
	private async handleDeckResource(path: string, queryParams: URLSearchParams) {
		const pathParts = path.split("/");
		const deckName = decodeURIComponent(pathParts[2]);

		if (pathParts.length === 3) {
			// Get basic deck information
			const stats = await this.ankiClient.getDeckStats(deckName);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								deckName,
								stats,
								description: `Statistics for deck ${deckName}`,
							},
							null,
							2,
						),
					},
				],
			};
		}

		if (pathParts[3] === "notes") {
			// Get notes in the deck
			const noteIds = await this.ankiClient.findNotes(`deck:"${deckName}"`);
			const limit = parseInt(queryParams.get("limit") || "20");
			const limitedIds = noteIds.slice(0, limit);

			if (limitedIds.length > 0) {
				const notes = await this.ankiClient.notesInfo(limitedIds);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									deckName,
									totalNotes: noteIds.length,
									displayedNotes: limitedIds.length,
									notes: notes.map((note) => ({
										id: note.noteId,
										type: note.modelName,
										tags: note.tags,
										fields: note.fields,
									})),
								},
								null,
								2,
							),
						},
					],
				};
			} else {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									deckName,
									totalNotes: 0,
									notes: [],
									message: "No notes found in this deck",
								},
								null,
								2,
							),
						},
					],
				};
			}
		}

		if (pathParts[3] === "analysis") {
			// Get deck learning analysis
			const stats = await this.ankiClient.getDeckStats(deckName);
			const noteIds = await this.ankiClient.findNotes(`deck:"${deckName}"`);
			const cardIds = await this.ankiClient.findCards(`deck:"${deckName}"`);

			let cardsInfo = [];
			if (cardIds.length > 0) {
				// Limit number of cards analyzed to avoid performance issues
				const limitedCardIds = cardIds.slice(0, 100);
				cardsInfo = await this.ankiClient.cardsInfo(limitedCardIds);
			}

			const analysis = {
				deckName,
				overview: {
					totalNotes: noteIds.length,
					totalCards: cardIds.length,
					...stats,
				},
				cardDistribution: this.analyzeCardDistribution(cardsInfo),
				learningProgress: this.calculateLearningProgress(cardsInfo),
				recommendations: this.generateRecommendations(stats, cardsInfo),
			};

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(analysis, null, 2),
					},
				],
			};
		}

		throw new McpError(
			ErrorCode.MethodNotFound,
			`Invalid deck resource path: ${path}`,
		);
	}

	/**
	 * Handle note type resources
	 */
	private async handleNoteTypeResource(path: string) {
		const modelName = decodeURIComponent(path.substring("/noteTypes/".length));
		const [fields, templates, styling] = await Promise.all([
			this.ankiClient.getModelFieldNames(modelName),
			this.ankiClient.getModelTemplates(modelName),
			this.ankiClient.getModelStyling(modelName),
		]);

		const info = {
			modelName,
			fields,
			templates,
			css: styling.css,
			description: `Complete definition of note type ${modelName}`,
		};

		return {
			content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
		};
	}

	/**
	 * Handle search resources
	 */
	private async handleSearchResource(
		path: string,
		queryParams: URLSearchParams,
	) {
		const query = queryParams.get("query");
		if (!query) {
			throw new McpError(
				ErrorCode.InvalidParams,
				"Search query parameter 'query' is required",
			);
		}

		const limit = parseInt(queryParams.get("limit") || "50");

		if (path === "/search/notes") {
			const noteIds = await this.ankiClient.findNotes(query);
			const limitedIds = noteIds.slice(0, limit);

			if (limitedIds.length > 0) {
				const notes = await this.ankiClient.notesInfo(limitedIds);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									query,
									totalFound: noteIds.length,
									displayed: limitedIds.length,
									notes: notes.map((note) => ({
										id: note.noteId,
										type: note.modelName,
										tags: note.tags,
										fields: note.fields,
									})),
								},
								null,
								2,
							),
						},
					],
				};
			} else {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									query,
									totalFound: 0,
									notes: [],
									message: "No matching notes found",
								},
								null,
								2,
							),
						},
					],
				};
			}
		}

		if (path === "/search/cards") {
			const cardIds = await this.ankiClient.findCards(query);
			const limitedIds = cardIds.slice(0, limit);

			if (limitedIds.length > 0) {
				const cards = await this.ankiClient.cardsInfo(limitedIds);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									query,
									totalFound: cardIds.length,
									displayed: limitedIds.length,
									cards: cards.map((card) => ({
										id: card.cardId,
										noteId: card.noteId,
										deckName: card.deckName,
										question: card.question,
										answer: card.answer,
										type: card.type,
										queue: card.queue,
										due: card.due,
										interval: card.interval,
										factor: card.factor,
										reviews: card.reps,
										lapses: card.lapses,
									})),
								},
								null,
								2,
							),
						},
					],
				};
			} else {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									query,
									totalFound: 0,
									cards: [],
									message: "No matching cards found",
								},
								null,
								2,
							),
						},
					],
				};
			}
		}

		throw new McpError(
			ErrorCode.MethodNotFound,
			`Invalid search resource path: ${path}`,
		);
	}

	/**
	 * Handle single note resources
	 */
	private async handleNoteResource(path: string) {
		const noteId = parseInt(path.substring("/notes/".length));
		if (isNaN(noteId)) {
			throw new McpError(ErrorCode.InvalidParams, "Invalid note ID");
		}

		const notes = await this.ankiClient.notesInfo([noteId]);
		if (notes.length === 0) {
			throw new McpError(ErrorCode.MethodNotFound, `Note not found: ${noteId}`);
		}

		const note = notes[0];
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							id: note.noteId,
							type: note.modelName,
							tags: note.tags,
							fields: note.fields,
							description: `Detailed information for note ${noteId}`,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Handle single card resources
	 */
	private async handleCardResource(path: string) {
		const cardId = parseInt(path.substring("/cards/".length));
		if (isNaN(cardId)) {
			throw new McpError(ErrorCode.InvalidParams, "Invalid card ID");
		}

		const cards = await this.ankiClient.cardsInfo([cardId]);
		if (cards.length === 0) {
			throw new McpError(ErrorCode.MethodNotFound, `Card not found: ${cardId}`);
		}

		const card = cards[0];
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							id: card.cardId,
							noteId: card.noteId,
							deckName: card.deckName,
							question: card.question,
							answer: card.answer,
							type: card.type,
							queue: card.queue,
							due: card.due,
							interval: card.interval,
							factor: card.factor,
							reviews: card.reps,
							lapses: card.lapses,
							description: `Detailed information for card ${cardId}`,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Handle statistics resources
	 */
	private async handleStatsResource(path: string) {
		if (path === "/stats/overview") {
			const decks = await this.ankiClient.getDeckNames();
			const overview = {
				totalDecks: decks.length,
				deckStats: {} as Record<string, any>,
				summary: {
					description: "Anki learning data overview",
				},
			};

			// Get statistics for each deck
			for (const deckName of decks.slice(0, 10)) {
				// Limit quantity to avoid performance issues
				try {
					overview.deckStats[deckName] =
						await this.ankiClient.getDeckStats(deckName);
				} catch (error) {
					overview.deckStats[deckName] = {
						error: "Unable to retrieve statistics data",
					};
				}
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(overview, null, 2),
					},
				],
			};
		}

		throw new McpError(
			ErrorCode.MethodNotFound,
			`Invalid statistics resource path: ${path}`,
		);
	}

	/**
	 * Handle server configuration
	 */
	private async handleServerConfig() {
		const config = {
			ankiConnectUrl: "http://localhost:8765",
			apiVersion: 6,
			features: {
				resources: true,
				tools: true,
				prompts: true, // ✅ Implemented
				sampling: false, // Future feature
			},
			version: "0.1.5+",
			description: "Anki MCP server configuration information",
			capabilities: {
				resources:
					"Supports multiple resource types including decks, notes, search, statistics, etc.",
				tools: "Provides complete Anki operation toolkit",
				prompts: "Provides 8 professional learning assistant prompt templates",
			},
		};

		return {
			content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
		};
	}

	/**
	 * Analyze card distribution
	 */
	private analyzeCardDistribution(cardsInfo: any[]) {
		const distribution = {
			byType: {} as Record<string, number>,
			byQueue: {} as Record<string, number>,
			total: cardsInfo.length,
		};

		cardsInfo.forEach((card) => {
			// Distribution by type
			const type = card.type || "unknown";
			distribution.byType[type] = (distribution.byType[type] || 0) + 1;

			// Distribution by queue
			const queue = card.queue || "unknown";
			distribution.byQueue[queue] = (distribution.byQueue[queue] || 0) + 1;
		});

		return distribution;
	}

	/**
	 * Calculate learning progress
	 */
	private calculateLearningProgress(cardsInfo: any[]) {
		const progress = {
			mature: 0, // Mature cards (interval >= 21 days)
			young: 0, // Young cards (interval < 21 days)
			learning: 0, // Learning
			relearning: 0, // Relearning
			suspended: 0, // Suspended
			buried: 0, // Buried
		};

		cardsInfo.forEach((card) => {
			const interval = card.interval || 0;
			const queue = card.queue || 0;

			if (queue === -1) {
				progress.suspended++;
			} else if (queue === -2 || queue === -3) {
				progress.buried++;
			} else if (queue === 1 || queue === 3) {
				progress.learning++;
			} else if (queue === 2) {
				if (interval >= 21) {
					progress.mature++;
				} else {
					progress.young++;
				}
			}
		});

		return progress;
	}

	/**
	 * Generate learning recommendations
	 */
	private generateRecommendations(stats: any, cardsInfo: any[]) {
		const recommendations = [];

		// Recommendations based on statistical data
		if (stats.new_count && stats.new_count > 50) {
			recommendations.push(
				"Recommend controlling new card quantity appropriately, focus on reviewing learned content",
			);
		}

		if (stats.learn_count && stats.learn_count > 100) {
			recommendations.push(
				"Many cards are in learning phase, suggest prioritizing completion of these cards",
			);
		}

		// Recommendations based on card analysis
		const progress = this.calculateLearningProgress(cardsInfo);
		const total =
			progress.mature +
			progress.young +
			progress.learning +
			progress.relearning;

		if (total > 0) {
			const matureRate = progress.mature / total;
			if (matureRate < 0.3) {
				recommendations.push(
					"Low proportion of mature cards, recommend persistent review to consolidate memory",
				);
			}

			if (progress.suspended > total * 0.1) {
				recommendations.push(
					"Many suspended cards, consider reactivating some important content",
				);
			}
		}

		return recommendations.length > 0
			? recommendations
			: ["Keep up the good learning habits!"];
	}
}
