import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolResult } from "./mcpToolResponses.js";
import { parseNoteIds, requirePositiveInteger, requireStringArray } from "./mcpToolValidation.js";
import type { AnkiClient } from "./utils.js";

export const listTags = async (ankiClient: AnkiClient): Promise<CallToolResult> => {
	const tags = await ankiClient.getTags();
	return toolResult({ tags, count: tags.length });
};

export const addNoteTags = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const noteIds = parseTargetNoteIds(args);
	const tags = parseTagsForAction(args.tags);

	await ankiClient.addTags({ noteIds, tags });
	return tagMutationResult("added", noteIds, tags);
};

export const removeNoteTags = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const noteIds = parseTargetNoteIds(args);
	const tags = parseTagsForAction(args.tags);

	await ankiClient.removeTags({ noteIds, tags });
	return tagMutationResult("removed", noteIds, tags);
};

const parseTargetNoteIds = (args: Record<string, unknown>): number[] => {
	const hasNoteId = args.noteId !== undefined;
	const hasNoteIds = args.noteIds !== undefined;

	if (hasNoteId === hasNoteIds) {
		throw new Error("Provide exactly one of noteId or noteIds");
	}

	return hasNoteId ? [requirePositiveInteger(args.noteId, "noteId")] : parseNoteIds(args.noteIds);
};

const parseTagsForAction = (value: unknown): string[] => {
	const tags = requireStringArray(value, "tags");
	const invalidTags = tags.filter((tag) => /\s/.test(tag));

	if (invalidTags.length > 0) {
		throw new Error(
			`tags must not contain whitespace for this operation: ${invalidTags.join(", ")}`
		);
	}

	return tags;
};

const tagMutationResult = (operation: "added" | "removed", noteIds: number[], tags: string[]) =>
	toolResult({
		success: true,
		operation,
		noteIds,
		tags,
		updatedCount: noteIds.length,
	});
