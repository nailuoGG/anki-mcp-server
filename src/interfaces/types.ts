/**
 * Common types for the Anki MCP Server
 */

/**
 * Supported note types
 */
export type NoteType = "Basic" | "Cloze";

/**
 * Supported languages
 */
export type Language = "en" | "zh";

/**
 * Field names for different note types and languages
 */
export interface FieldNames {
	front: string;
	back: string;
}

/**
 * Note parameters
 */
export interface NoteParams {
	type: "Basic" | "Cloze";
	deck: string;
	front?: string;
	back?: string;
	text?: string;
	backExtra?: string;
	tags?: string[];
	fields?: Record<string, string>;
}

/**
 * Note update parameters
 */
export interface NoteUpdateParams {
	id: number;
	fields: Record<string, string>;
	tags?: string[];
}

/**
 * Note type creation parameters
 */
export interface NoteTypeParams {
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
 * Note information
 */
export interface NoteInfo {
	id: number;
	modelName: string;
	fields: Record<string, { value: string; order: number }>;
	tags: string[];
	cards: number[];
}

/**
 * Note type information
 */
export interface NoteTypeInfo {
	modelName: string;
	fields: string[];
	templates: Record<string, { Front: string; Back: string }>;
	css: string;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T> {
	success: boolean;
	error?: string;
	data?: T;
}

/**
 * Batch operation results
 */
export interface BatchOperationResults<T> {
	results: BatchOperationResult<T>[];
}
