/**
 * Handles note-related operations and validations
 */
import { INoteService, IModelService } from "../interfaces/services.js";
import {
	CreateNoteArgs,
	BatchCreateNotesArgs,
	SearchNotesArgs,
	GetNoteInfoArgs,
	UpdateNoteArgs,
	DeleteNoteArgs,
} from "../interfaces/schemas.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * NoteTools class handles note-related MCP tools
 */
export class NoteTools {
	/**
	 * @param noteService - Service for note operations
	 * @param modelService - Service for model information retrieval
	 */
	constructor(
		private noteService: INoteService,
		private modelService: IModelService,
	) {}

	/**
	 * Create a new note with validation and field mapping
	 * @param args - Note creation parameters including type, deck, and fields
	 * @returns Object containing creation result
	 */
	async createNote(args: CreateNoteArgs) {
		if (!args) {
			throw new McpError(ErrorCode.InvalidParams, "Arguments are required");
		}

		if (!args.type) {
			throw new McpError(ErrorCode.InvalidParams, "Note type is required");
		}

		if (!args.deck) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		// Retrieve model information for validation
		const modelInfo = await this.modelService.getNoteTypeInfo(args.type);

		if (!args.fields) {
			args.fields = {};
		}

		// Map legacy fields (front/back) to actual field names
		if (args.front && modelInfo.fields.length > 0) {
			args.fields[modelInfo.fields[0]] = args.front;
		}

		if (args.back && modelInfo.fields.length > 1) {
			args.fields[modelInfo.fields[1]] = args.back;
		}

		const requiredFields = new Set(modelInfo.fields);
		const providedFields = new Set(Object.keys(args.fields));

		if (Object.keys(args.fields).length === 0) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`No fields provided. Required fields for '${args.type}' type: ${[
					...requiredFields,
				].join(", ")}`,
			);
		}

		const noteId = await this.noteService.createNote(args);
		return {
			content: [
				{
					type: "text",
					text: `Created note with ID: ${noteId}`,
				},
			],
		};
	}

	/**
	 * Batch create notes with error handling
	 * @param args - Contains array of notes and error handling strategy
	 * @returns Formatted batch operation results
	 */
	async batchCreateNotes(args: BatchCreateNotesArgs) {
		if (!args || !args.notes || !Array.isArray(args.notes)) {
			throw new McpError(ErrorCode.InvalidParams, "Notes array is required");
		}

		const results = await this.noteService.batchCreateNotes(
			args.notes,
			args.stopOnError,
		);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(results, null, 2),
				},
			],
		};
	}

	/**
	 * Search notes using Anki's query syntax
	 * @param args - Contains search query string
	 * @returns Array of matching note IDs
	 */
	async searchNotes(args: SearchNotesArgs) {
		if (!args || !args.query) {
			throw new McpError(ErrorCode.InvalidParams, "Search query is required");
		}

		const noteIds = await this.noteService.searchNotes(args.query);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(noteIds, null, 2),
				},
			],
		};
	}

	/**
	 * Retrieve detailed note information
	 * @param args - Contains target note ID
	 * @returns Structured note data including fields and cards
	 */
	async getNoteInfo(args: GetNoteInfoArgs) {
		if (!args || typeof args.noteId !== "number") {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		const info = await this.noteService.getNoteInfo(args.noteId);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(info, null, 2),
				},
			],
		};
	}

	/**
	 * Update existing note fields and tags
	 * @param args - Contains note ID and update data
	 * @returns Update confirmation
	 */
	async updateNote(args: UpdateNoteArgs) {
		if (!args || typeof args.id !== "number") {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		if (!args.fields || Object.keys(args.fields).length === 0) {
			throw new McpError(
				ErrorCode.InvalidParams,
				"Fields are required for update",
			);
		}

		await this.noteService.updateNote(args);
		return {
			content: [
				{
					type: "text",
					text: `Updated note: ${args.id}`,
				},
			],
		};
	}

	/**
	 * Permanently delete a note
	 * @param args - Contains target note ID
	 * @returns Deletion confirmation
	 */
	async deleteNote(args: DeleteNoteArgs) {
		if (!args || typeof args.noteId !== "number") {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		await this.noteService.deleteNote(args.noteId);
		return {
			content: [
				{
					type: "text",
					text: `Deleted note: ${args.noteId}`,
				},
			],
		};
	}
}
