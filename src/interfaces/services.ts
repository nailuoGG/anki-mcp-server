/**
 * Service interfaces for the Anki MCP Server
 */
import {
	Language,
	FieldNames,
	NoteType,
	NoteParams,
	NoteUpdateParams,
	NoteTypeParams,
	NoteInfo,
	NoteTypeInfo,
	BatchOperationResults,
} from "./types.js";

/**
 * Configuration service interface
 */
export interface IConfigService {
	/**
	 * Get the AnkiConnect URL
	 */
	getAnkiConnectUrl(): string;

	/**
	 * Get the API version
	 */
	getApiVersion(): number;

	/**
	 * Get the default deck name
	 */
	getDefaultDeck(): string;

	/**
	 * Get the model name for a note type and language
	 */
	getModelName(type: NoteType, language: Language): string;

	/**
	 * Get the request configuration
	 */
	getRequestConfig(): {
		timeout: number;
		retryTimeout: number;
		headers: Record<string, string>;
	};
}

/**
 * AnkiConnect service interface
 */
export interface IAnkiConnectService {
	/**
	 * Invoke an AnkiConnect action
	 */
	invoke<T = any>(action: string, params?: Record<string, any>): Promise<T>;

	/**
	 * Check if AnkiConnect is available
	 */
	checkConnection(): Promise<boolean>;

	/**
	 * Get the AnkiConnect version
	 */
	getVersion(): Promise<number>;
}

/**
 * Language service interface
 */
export interface ILanguageService {
	/**
	 * Detect the Anki interface language
	 */
	detectLanguage(): Promise<void>;

	/**
	 * Get the current language
	 */
	getLanguage(): Language;

	/**
	 * Get the model name for a note type
	 */
	getModelName(type: NoteType): string;

	/**
	 * Get the field names for a note type
	 */
	getFieldNames(type: NoteType): FieldNames;
}

/**
 * Deck service interface
 */
export interface IDeckService {
	/**
	 * List all decks
	 */
	listDecks(): Promise<string[]>;

	/**
	 * Create a new deck
	 */
	createDeck(name: string): Promise<boolean>;

	/**
	 * Check if a deck exists
	 */
	deckExists(name: string): Promise<boolean>;

	/**
	 * Get the current deck
	 */
	getCurrentDeck(): Promise<string>;
}

/**
 * Note service interface
 */
export interface INoteService {
	/**
	 * Create a new note
	 */
	createNote(params: NoteParams): Promise<number>;

	/**
	 * Create multiple notes
	 */
	batchCreateNotes(
		notes: NoteParams[],
		stopOnError?: boolean,
	): Promise<BatchOperationResults<number>>;

	/**
	 * Search for notes
	 */
	searchNotes(query: string): Promise<number[]>;

	/**
	 * Get note information
	 */
	getNoteInfo(noteId: number): Promise<NoteInfo>;

	/**
	 * Update a note
	 */
	updateNote(params: NoteUpdateParams): Promise<boolean>;

	/**
	 * Delete a note
	 */
	deleteNote(noteId: number): Promise<boolean>;
}

/**
 * Model service interface
 */
export interface IModelService {
	/**
	 * List all note types
	 */
	listNoteTypes(): Promise<string[]>;

	/**
	 * Create a new note type
	 */
	createNoteType(params: NoteTypeParams): Promise<boolean>;

	/**
	 * Get note type information
	 */
	getNoteTypeInfo(modelName: string): Promise<NoteTypeInfo>;
}
