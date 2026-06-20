import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getCachedModelFields, getModelFields } from "./mcpModelTools.js";
import { errorMessage, toolResult } from "./mcpToolResponses.js";
import {
	type AnkiNoteInfo,
	type BatchNoteResult,
	normalizeFields,
	optionalBoolean,
	optionalInteger,
	parseFields,
	parseNoteInput,
	parseStringRecord,
	parseTags,
	requirePositiveInteger,
	requireString,
} from "./mcpToolValidation.js";
import type { AnkiClient } from "./utils.js";

export const createNote = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const note = parseNoteInput(args);
	const allowDuplicate = optionalBoolean(args.allowDuplicate, false);
	const modelFields = await prepareDeckAndModel(ankiClient, note.deck, note.type);
	const fields = normalizeFields(note.type, modelFields, note.fields);
	const payload = {
		deckName: note.deck,
		modelName: note.type,
		fields,
		tags: note.tags,
		options: { allowDuplicate },
	};

	await requireCanAddNote(ankiClient, payload);
	const noteId = await ankiClient.addNote(payload);
	if (noteId === null) {
		throw new Error("Anki rejected note creation without returning a note ID.");
	}

	return toolResult({ noteId, deck: note.deck, modelName: note.type });
};

export const createModelSpecificNote = async (
	ankiClient: AnkiClient,
	modelName: string,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const deck = requireString(args.deck, "deck");
	const tags = parseTags(args.tags);
	const modelFields = await prepareDeckAndModel(ankiClient, deck, modelName);
	const fieldArgs = Object.fromEntries(
		Object.entries(args).filter(([key]) => key !== "deck" && key !== "tags")
	);
	const fields = normalizeFields(modelName, modelFields, parseStringRecord(fieldArgs));
	const payload = { deckName: deck, modelName, fields, tags };

	await requireCanAddNote(ankiClient, payload);
	const noteId = await ankiClient.addNote(payload);
	if (noteId === null) {
		throw new Error("Anki rejected note creation without returning a note ID.");
	}

	return toolResult({ noteId, deck, modelName });
};

export const batchCreateNotes = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	if (!Array.isArray(args.notes) || args.notes.length === 0) {
		throw new Error("notes must be a non-empty array");
	}

	if (args.notes.length > 50) {
		throw new Error("notes cannot contain more than 50 items");
	}

	const notes = args.notes.map((note, index) => parseNoteInput(note, index));
	const allowDuplicate = optionalBoolean(args.allowDuplicate, false);
	const stopOnError = optionalBoolean(args.stopOnError, false);
	const knownDecks = new Set(await ankiClient.getDeckNames());
	const knownModels = new Set(await ankiClient.getModelNames());
	const fieldsCache = new Map<string, string[]>();
	let results: BatchNoteResult[] = [];

	for (let index = 0; index < notes.length; index++) {
		try {
			const note = notes[index];
			if (!knownModels.has(note.type)) {
				throw new Error(`Note type not found: ${note.type}`);
			}

			if (!knownDecks.has(note.deck)) {
				await ankiClient.createDeck(note.deck);
				knownDecks.add(note.deck);
			}

			const modelFields = await getCachedModelFields(ankiClient, note.type, fieldsCache);
			const fields = normalizeFields(note.type, modelFields, note.fields);
			const payload = {
				deckName: note.deck,
				modelName: note.type,
				fields,
				tags: note.tags,
				options: { allowDuplicate },
			};

			await requireCanAddNote(ankiClient, payload);
			const noteId = await ankiClient.addNote(payload);
			if (noteId === null) {
				throw new Error("Anki rejected note creation without returning a note ID.");
			}

			results = [...results, { success: true, noteId, index }];
		} catch (error) {
			results = [...results, { success: false, error: errorMessage(error), index }];
			if (stopOnError) {
				break;
			}
		}
	}

	const successful = results.filter((item) => item.success).length;
	const failed = results.filter((item) => !item.success).length;
	return toolResult(
		{
			results,
			total: notes.length,
			successful,
			failed,
		},
		{ isError: failed > 0 }
	);
};

export const searchNotes = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const query = requireString(args.query, "query");
	const limit = optionalInteger(args.limit, "limit", 20, 1, 100);
	const offset = optionalInteger(args.offset, "offset", 0, 0);
	const noteIds = await ankiClient.findNotes(query);
	const selectedIds = noteIds.slice(offset, offset + limit);
	const notes = selectedIds.length > 0 ? await ankiClient.notesInfo(selectedIds) : [];
	const nextOffset = offset + notes.length;
	const hasMore = nextOffset < noteIds.length;

	return toolResult({
		query,
		total: noteIds.length,
		offset,
		limit,
		notes,
		hasMore,
		...(hasMore ? { nextOffset } : {}),
	});
};

export const getNoteInfo = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const noteId = requirePositiveInteger(args.noteId, "noteId");
	const note = await requireNote(ankiClient, noteId);
	return toolResult(note as unknown as Record<string, unknown>);
};

export const updateNote = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const id = requirePositiveInteger(args.id, "id");
	const fields = args.fields === undefined ? undefined : parseFields(args.fields);
	const tags = args.tags === undefined ? undefined : parseTags(args.tags);

	if (fields === undefined && tags === undefined) {
		throw new Error("Provide fields and/or tags to update");
	}

	await requireNote(ankiClient, id);

	if (fields !== undefined) {
		await ankiClient.updateNoteFields({ id, fields });
	}

	if (tags !== undefined) {
		await ankiClient.updateNoteTags({ id, tags });
	}

	return toolResult({
		success: true,
		noteId: id,
		updatedFields: fields !== undefined,
		updatedTags: tags !== undefined,
	});
};

export const deleteNote = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const hasNoteId = args.noteId !== undefined;
	const hasNoteIds = args.noteIds !== undefined;

	if (hasNoteId === hasNoteIds) {
		throw new Error("Provide exactly one of noteId or noteIds");
	}

	const noteIds = hasNoteId
		? [requirePositiveInteger(args.noteId, "noteId")]
		: parseNoteIds(args.noteIds);

	await ankiClient.deleteNotes(noteIds);
	return toolResult({
		success: true,
		deletedCount: noteIds.length,
		noteIds,
	});
};

const parseNoteIds = (value: unknown): number[] => {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error("noteIds must be a non-empty array");
	}

	return value.map((id, index) => requirePositiveInteger(id, `noteIds[${index}]`));
};

const prepareDeckAndModel = async (
	ankiClient: AnkiClient,
	deckName: string,
	modelName: string
): Promise<string[]> => {
	const [decks, modelFields] = await Promise.all([
		ankiClient.getDeckNames(),
		getModelFields(ankiClient, modelName),
	]);

	if (!decks.includes(deckName)) {
		await ankiClient.createDeck(deckName);
	}

	return modelFields;
};

const requireCanAddNote = async (
	ankiClient: AnkiClient,
	note: {
		deckName: string;
		modelName: string;
		fields: Record<string, string>;
		tags?: string[];
		options?: { allowDuplicate?: boolean };
	}
): Promise<void> => {
	const [check] = await ankiClient.canAddNotesWithErrorDetail([note]);
	if (!check?.canAdd) {
		throw new Error(
			`Cannot create note: ${check && "error" in check ? check.error : "Anki rejected the note"}`
		);
	}
};

const requireNote = async (ankiClient: AnkiClient, noteId: number): Promise<AnkiNoteInfo> => {
	const notes = await ankiClient.notesInfo([noteId]);
	const note = notes[0];
	if (!note) {
		throw new Error(`Note not found: ${noteId}`);
	}

	return note;
};
