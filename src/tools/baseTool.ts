import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "../utils.js";

export interface IMcpTool {
	name: string;
	description: string;
	inputSchema: Record<string, any>;
	execute(args: any): Promise<{ content: { type: string; text: string }[] }>;
}

export abstract class BaseTool {
	protected ankiClient: AnkiClient;

	constructor(ankiClient: AnkiClient) {
		this.ankiClient = ankiClient;
	}

	protected formatSuccessResponse(data: any) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(data, null, 2),
				},
			],
		};
	}

	protected handleError(error: unknown) {
		if (error instanceof McpError) {
			throw error;
		}

		return {
			content: [
				{
					type: "text",
					text: `Error: ${
						error instanceof Error ? error.message : String(error)
					}`,
				},
			],
			isError: true,
		};
	}
}
