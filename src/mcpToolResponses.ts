import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const toolResult = <T extends Record<string, unknown>>(
	data: T,
	options: { isError?: boolean } = {}
): CallToolResult => ({
	content: [
		{
			type: "text",
			text: JSON.stringify(data, null, 2),
		},
	],
	structuredContent: data,
	...(options.isError ? { isError: true } : {}),
});

export const toolErrorResult = (error: unknown): CallToolResult => ({
	content: [
		{
			type: "text",
			text: `Error: ${errorMessage(error)}`,
		},
	],
	isError: true,
});

export const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);
