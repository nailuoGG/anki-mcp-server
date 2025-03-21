/**
 * Input/output schemas for the Anki MCP Server
 */

/**
 * Tool argument schemas
 */

/**
 * List decks arguments
 */
export interface ListDecksArgs {
	[key: string]: never;
}

/**
 * Create deck arguments
 */
export interface CreateDeckArgs {
	name: string;
}

/**
 * Create note arguments
 */
export interface CreateNoteArgs {
	type: "Basic" | "Cloze";
	deck: string;
	front?: string;
	back?: string;
	text?: string;
	backExtra?: string;
	fields?: Record<string, string>;
	tags?: string[];
}

/**
 * Batch create notes arguments
 */
export interface BatchCreateNotesArgs {
	notes: {
		type: "Basic" | "Cloze";
		deck: string;
		front?: string;
		back?: string;
		text?: string;
		backExtra?: string;
		fields?: Record<string, string>;
		tags?: string[];
	}[];
	stopOnError?: boolean;
}

/**
 * Search notes arguments
 */
export interface SearchNotesArgs {
	query: string;
}

/**
 * Get note info arguments
 */
export interface GetNoteInfoArgs {
	noteId: number;
}

/**
 * Update note arguments
 */
export interface UpdateNoteArgs {
	id: number;
	fields: Record<string, string>;
	tags?: string[];
}

/**
 * Delete note arguments
 */
export interface DeleteNoteArgs {
	noteId: number;
}

/**
 * List note types arguments
 */
export interface ListNoteTypesArgs {
	[key: string]: never;
}

/**
 * Create note type arguments
 */
export interface CreateNoteTypeArgs {
	name: string;
	fields: string[];
	css?: string;
	templates: {
		name: string;
		front: string;
		back: string;
	}[];
}

/**
 * Get note type info arguments
 */
export interface GetNoteTypeInfoArgs {
	modelName: string;
}

/**
 * AnkiConnect request/response types
 */

/**
 * AnkiConnect request
 */
export interface AnkiRequest {
	action: string;
	version: number;
	params: Record<string, any>;
}

/**
 * AnkiConnect response
 */
export interface AnkiResponse {
	result: any;
	error: string | null;
}
