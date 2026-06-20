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
	parseNoteIds,
	parseStringRecord,
	parseTags,
	requirePositiveInteger,
	requireString,
} from "./mcpToolValidation.js";
import type { AnkiClient } from "./utils.js";

type NotePayload = Parameters<AnkiClient["addNote"]>[0];

type PreparedNote =
	| {
			index: number;
			payload: NotePayload;
	  }
	| {
			index: number;
			error: string;
	  };

type PreparedPayload = Extract<PreparedNote, { payload: NotePayload }>;
type PreparedError = Extract<PreparedNote, { error: string }>;
type CheckedNote =
	| (PreparedPayload & { canAdd: true })
	| (PreparedPayload & { canAdd: false; error: string });

const hasPayload = (item: PreparedNote): item is PreparedPayload => "payload" in item;
const hasError = (item: PreparedNote): item is PreparedError => "error" in item;
const canAdd = (item: CheckedNote): item is PreparedPayload & { canAdd: true } => item.canAdd;

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

	if (stopOnError) {
		return batchCreateNotesSequential(ankiClient, notes, allowDuplicate);
	}

	const prepared = await prepareBatchPayloads(ankiClient, notes, allowDuplicate);
	const results = await createPreparedBatch(ankiClient, prepared);
	return batchResult(notes.length, results);
};

const batchResult = (total: number, results: BatchNoteResult[]): CallToolResult => {
	const successful = results.filter((item) => item.success).length;
	const failed = results.filter((item) => !item.success).length;
	return toolResult(
		{
			results,
			total,
			successful,
			failed,
		},
		{ isError: failed > 0 }
	);
};

const batchCreateNotesSequential = async (
	ankiClient: AnkiClient,
	notes: ReturnType<typeof parseNoteInput>[],
	allowDuplicate: boolean
): Promise<CallToolResult> => {
	const prepared = await prepareBatchPayloads(ankiClient, notes, allowDuplicate, true);
	const [firstError] = prepared.filter(hasError);
	const ready = prepared.filter(hasPayload);
	const created = await createPreparedBatch(ankiClient, ready);
	const errors = firstError
		? [{ success: false, error: firstError.error, index: firstError.index }]
		: [];

	return batchResult(
		notes.length,
		[...created, ...errors].sort((a, b) => a.index - b.index)
	);
};

const prepareBatchPayloads = async (
	ankiClient: AnkiClient,
	notes: ReturnType<typeof parseNoteInput>[],
	allowDuplicate: boolean,
	stopOnError = false
): Promise<PreparedNote[]> => {
	let knownDecks = new Set(await ankiClient.getDeckNames());
	const knownModels = new Set(await ankiClient.getModelNames());
	const fieldsCache = new Map<string, string[]>();
	let prepared: PreparedNote[] = [];

	for (let index = 0; index < notes.length; index++) {
		const preparedNote = await prepareBatchPayload(
			ankiClient,
			notes[index],
			index,
			allowDuplicate,
			knownDecks,
			knownModels,
			fieldsCache
		);
		prepared = [...prepared, preparedNote.item];
		knownDecks = preparedNote.knownDecks;

		if (stopOnError && "error" in preparedNote.item) {
			break;
		}
	}

	return prepared;
};

const prepareBatchPayload = async (
	ankiClient: AnkiClient,
	note: ReturnType<typeof parseNoteInput>,
	index: number,
	allowDuplicate: boolean,
	knownDecks: Set<string>,
	knownModels: Set<string>,
	fieldsCache: Map<string, string[]>
): Promise<{ item: PreparedNote; knownDecks: Set<string> }> => {
	try {
		if (!knownModels.has(note.type)) {
			throw new Error(`Note type not found: ${note.type}`);
		}

		const nextDecks = await ensureDeckExists(ankiClient, knownDecks, note.deck);
		const modelFields = await getCachedModelFields(ankiClient, note.type, fieldsCache);
		const fields = normalizeFields(note.type, modelFields, note.fields);

		return {
			item: {
				index,
				payload: {
					deckName: note.deck,
					modelName: note.type,
					fields,
					tags: note.tags,
					options: { allowDuplicate },
				},
			},
			knownDecks: nextDecks,
		};
	} catch (error) {
		return {
			item: { error: errorMessage(error), index },
			knownDecks,
		};
	}
};

const ensureDeckExists = async (
	ankiClient: AnkiClient,
	knownDecks: Set<string>,
	deck: string
): Promise<Set<string>> => {
	if (knownDecks.has(deck)) {
		return knownDecks;
	}

	await ankiClient.createDeck(deck);
	return new Set([...knownDecks, deck]);
};

const createPreparedBatch = async (
	ankiClient: AnkiClient,
	prepared: PreparedNote[]
): Promise<BatchNoteResult[]> => {
	const initialErrors = prepared
		.filter(hasError)
		.map((item) => ({ success: false, error: item.error, index: item.index }));
	const ready = prepared.filter(hasPayload);
	const checked = await checkPreparedNotes(ankiClient, ready);
	const creatable = checked.filter(canAdd);
	const created = await addPreparedNotes(ankiClient, creatable);
	const rejected = checked
		.filter((item) => !item.canAdd)
		.map((item) => ({ success: false, error: item.error, index: item.index }));

	return [...initialErrors, ...rejected, ...created].sort((a, b) => a.index - b.index);
};

const checkPreparedNotes = async (
	ankiClient: AnkiClient,
	ready: PreparedPayload[]
): Promise<CheckedNote[]> => {
	if (ready.length === 0) {
		return [];
	}

	const checks = await ankiClient.canAddNotesWithErrorDetail(ready.map((item) => item.payload));
	return ready.map((item, index) => {
		const check = checks[index];
		return check?.canAdd
			? { ...item, canAdd: true as const }
			: {
					...item,
					canAdd: false as const,
					error: `Cannot create note: ${check && "error" in check ? check.error : "Anki rejected the note"}`,
				};
	});
};

const addPreparedNotes = async (
	ankiClient: AnkiClient,
	creatable: (PreparedPayload & { canAdd: true })[]
): Promise<BatchNoteResult[]> => {
	if (creatable.length === 0) {
		return [];
	}

	const noteIds = await ankiClient.addNotes(creatable.map((item) => item.payload));
	return creatable.map((item, index) => {
		const noteId = noteIds?.[index] ?? null;
		return noteId === null
			? {
					success: false,
					error: "Anki rejected note creation without returning a note ID.",
					index: item.index,
				}
			: { success: true, noteId, index: item.index };
	});
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
