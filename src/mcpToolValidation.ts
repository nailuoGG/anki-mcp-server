import type { AnkiClient } from "./utils.js";

export type NoteInput = {
	type: string;
	deck: string;
	fields: Record<string, string>;
	tags: string[];
};

export type BatchNoteResult = {
	success: boolean;
	index: number;
	noteId?: number;
	error?: string;
};

export type AnkiNoteInfo = Awaited<ReturnType<AnkiClient["notesInfo"]>>[number];

export const requireString = (value: unknown, fieldName: string): string => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${fieldName} must be a non-empty string`);
	}

	return value;
};

export const optionalBoolean = (value: unknown, defaultValue = false): boolean => {
	if (value === undefined) {
		return defaultValue;
	}

	if (typeof value !== "boolean") {
		throw new Error("Boolean option must be true or false");
	}

	return value;
};

export const requirePositiveInteger = (value: unknown, fieldName: string): number => {
	if (!Number.isInteger(value) || (value as number) <= 0) {
		throw new Error(`${fieldName} must be a positive integer`);
	}

	return value as number;
};

export const parseNoteIds = (value: unknown): number[] => {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error("noteIds must be a non-empty array");
	}

	return value.map((id, index) => requirePositiveInteger(id, `noteIds[${index}]`));
};

export const optionalInteger = (
	value: unknown,
	fieldName: string,
	defaultValue: number,
	minimum: number,
	maximum?: number
): number => {
	if (value === undefined) {
		return defaultValue;
	}

	if (!Number.isInteger(value) || (value as number) < minimum) {
		throw new Error(`${fieldName} must be an integer >= ${minimum}`);
	}

	if (maximum !== undefined && (value as number) > maximum) {
		throw new Error(`${fieldName} must be <= ${maximum}`);
	}

	return value as number;
};

export const requireStringArray = (value: unknown, fieldName: string): string[] => {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(`${fieldName} must be a non-empty array of strings`);
	}

	const values = value.map((item) => requireString(item, `${fieldName} item`));
	const duplicates = values.filter((item, index) => values.indexOf(item) !== index);
	if (duplicates.length > 0) {
		throw new Error(
			`${fieldName} contains duplicate value(s): ${[...new Set(duplicates)].join(", ")}`
		);
	}

	return values;
};

export const parseTags = (value: unknown): string[] => {
	if (value === undefined) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new Error("tags must be an array of strings");
	}

	return value.map((tag) => requireString(tag, "tag"));
};

export const parseFields = (value: unknown): Record<string, string> => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("fields must be an object");
	}

	const entries = Object.entries(value).map(([key, fieldValue]) => {
		if (typeof fieldValue === "string") {
			return [key, fieldValue] as const;
		}

		if (typeof fieldValue === "number" || typeof fieldValue === "boolean") {
			return [key, String(fieldValue)] as const;
		}

		throw new Error(`Field '${key}' must be a string, number, or boolean`);
	});

	if (entries.length === 0) {
		throw new Error("fields must include at least one field");
	}

	return Object.fromEntries(entries);
};

export const parseStringRecord = (value: Record<string, unknown>): Record<string, string> =>
	Object.fromEntries(
		Object.entries(value).map(([key, fieldValue]) => {
			if (typeof fieldValue === "string") {
				return [key, fieldValue] as const;
			}

			if (typeof fieldValue === "number" || typeof fieldValue === "boolean") {
				return [key, String(fieldValue)] as const;
			}

			throw new Error(`Field '${key}' must be a string, number, or boolean`);
		})
	);

export const parseNoteInput = (value: unknown, index?: number): NoteInput => {
	const label = index === undefined ? "note" : `notes[${index}]`;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}

	const data = value as Record<string, unknown>;
	return {
		type: requireString(data.type, `${label}.type`),
		deck: requireString(data.deck, `${label}.deck`),
		fields: parseFields(data.fields),
		tags: parseTags(data.tags),
	};
};

export const normalizeFields = (
	modelName: string,
	modelFields: string[],
	inputFields: Record<string, string>
): Record<string, string> => {
	const allowedNames = new Set([
		...modelFields,
		...modelFields.map((field) => field.toLowerCase()),
	]);
	const unknownFields = Object.keys(inputFields).filter((field) => !allowedNames.has(field));

	if (unknownFields.length > 0) {
		throw new Error(
			`Unknown field(s) for '${modelName}': ${unknownFields.join(", ")}. Valid fields: ${modelFields.join(", ")}`
		);
	}

	return Object.fromEntries(
		modelFields.map((field) => [
			field,
			inputFields[field] ?? inputFields[field.toLowerCase()] ?? "",
		])
	);
};
