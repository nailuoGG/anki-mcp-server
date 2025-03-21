/**
 * Note service implementation
 */
import {
	INoteService,
	IAnkiConnectService,
	ILanguageService,
} from "../interfaces/services.js";
import {
	NoteParams,
	NoteUpdateParams,
	NoteInfo,
	BatchOperationResults,
} from "../interfaces/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * NoteService handles note-related operations
 */
export class NoteService implements INoteService {
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
	 * Create a new note
	 *
	 * 创建新的笔记
	 *
	 * @param params Note parameters
	 * @returns Promise resolving to the note ID
	 */
	async createNote(params: NoteParams): Promise<number> {
		const { type, deck, tags } = params;
		const modelName = this.languageService.getModelName(type);
		const fieldNames = this.languageService.getFieldNames(type);

		let fields: Record<string, string>;

		if (params.fields) {
			// Use provided fields directly
			fields = params.fields;
		} else if (type === "Basic") {
			// Basic note with front/back
			if (!("front" in params) || !("back" in params)) {
				throw new McpError(
					ErrorCode.InvalidParams,
					"Basic notes require front and back content",
				);
			}
			if (!params.front || !params.back) {
				throw new McpError(
					ErrorCode.InvalidParams,
					"Basic notes require front and back content",
				);
			}
			fields = {
				[fieldNames.front]: params.front,
				[fieldNames.back]: params.back,
			};
		} else if (type === "Cloze") {
			// Cloze note with text
			if (!("text" in params)) {
				throw new McpError(
					ErrorCode.InvalidParams,
					"Cloze notes require text content",
				);
			}
			if (!params.text) {
				throw new McpError(
					ErrorCode.InvalidParams,
					"Cloze notes require text content",
				);
			}
			fields = {
				[fieldNames.front]: params.text,
				[fieldNames.back]: params.backExtra || "",
			};
		} else {
			throw new McpError(ErrorCode.InvalidParams, "Invalid note type");
		}

		const note = {
			deckName: deck,
			modelName,
			fields,
			tags: tags || [],
		};

		return this.ankiConnectService.invoke<number>("addNote", { note });
	}

	/**
	 * Create multiple notes
	 *
	 * 批量创建笔记
	 *
	 * @param notes Array of note parameters
	 * @param stopOnError Whether to stop on first error
	 * @returns Promise resolving to batch operation results
	 */
	async batchCreateNotes(
		notes: NoteParams[],
		stopOnError: boolean = false,
	): Promise<BatchOperationResults<number>> {
		const results: BatchOperationResults<number> = { results: [] };

		for (const noteParams of notes) {
			try {
				const noteId = await this.createNote(noteParams);
				results.results.push({ success: true, data: noteId });
			} catch (error) {
				results.results.push({
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
				if (stopOnError) {
					break;
				}
			}
		}

		return results;
	}

	/**
	 * Search for notes
	 *
	 * 搜索笔记
	 *
	 * @param query Search query
	 * @returns Promise resolving to an array of note IDs
	 */
	async searchNotes(query: string): Promise<number[]> {
		if (!query) {
			throw new McpError(ErrorCode.InvalidParams, "Search query is required");
		}
		return this.ankiConnectService.invoke<number[]>("findNotes", { query });
	}

	/**
	 * Get note information
	 *
	 * 获取笔记信息
	 *
	 * @param noteId Note ID
	 * @returns Promise resolving to note information
	 */
	async getNoteInfo(noteId: number): Promise<NoteInfo> {
		if (typeof noteId !== "number" || noteId <= 0) {
			throw new McpError(ErrorCode.InvalidParams, "Valid note ID is required");
		}

		const info = await this.ankiConnectService.invoke<NoteInfo[]>("notesInfo", {
			notes: [noteId],
		});

		if (!info || info.length === 0) {
			throw new McpError(ErrorCode.InvalidParams, `Note not found: ${noteId}`);
		}

		return info[0];
	}

	/**
	 * Update a note
	 *
	 * 更新笔记
	 *
	 * @param params Note update parameters
	 * @returns Promise resolving to true if successful
	 */
	async updateNote(params: NoteUpdateParams): Promise<boolean> {
		const { id, fields, tags } = params;

		if (typeof id !== "number" || id <= 0) {
			throw new McpError(ErrorCode.InvalidParams, "Valid note ID is required");
		}

		if (!fields || Object.keys(fields).length === 0) {
			throw new McpError(
				ErrorCode.InvalidParams,
				"Fields are required for update",
			);
		}

		// Update fields
		const note = { id, fields };
		await this.ankiConnectService.invoke("updateNoteFields", { note });

		// Update tags if provided
		if (tags) {
			await this.ankiConnectService.invoke("clearTags", { notes: [id] });
			await this.ankiConnectService.invoke("addTags", {
				notes: [id],
				tags: tags.join(" "),
			});
		}

		return true;
	}

	/**
	 * Delete a note
	 *
	 * 删除笔记
	 *
	 * @param noteId Note ID
	 * @returns Promise resolving to true if successful
	 */
	async deleteNote(noteId: number): Promise<boolean> {
		if (typeof noteId !== "number" || noteId <= 0) {
			throw new McpError(ErrorCode.InvalidParams, "Valid note ID is required");
		}

		await this.ankiConnectService.invoke("deleteNotes", {
			notes: [noteId],
		});

		return true;
	}
}
