import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "../utils.js";

/**
 * MCP tool interface definition
 * All Anki tools must implement this interface
 */
export interface IMcpTool {
	/** Tool name - used for identification and invocation */
	name: string;

	/** Tool description - explains the tool's functionality and purpose */
	description: string;

	/** Input parameter schema definition - defines the parameter structure that the tool accepts */
	inputSchema: Record<string, any>;

	/**
	 * Execute tool operation
	 * @param args Input parameters
	 * @returns Formatted response result
	 */
	execute(args: any): Promise<{
		content: {
			type: string;
			text: string;
		}[];
		isError?: boolean;
	}>;
}

/**
 * Tool base class - provides common functionality and error handling
 * All concrete tools should inherit from this class to get consistent behavior
 */
export abstract class BaseTool {
	protected ankiClient: AnkiClient;

	/**
	 * Constructor
	 * @param ankiClient Anki client instance
	 */
	constructor(ankiClient: AnkiClient) {
		this.ankiClient = ankiClient;
	}

	/**
	 * Format success response
	 * @param data Data to return
	 * @returns Standardized success response format
	 */
	protected formatSuccessResponse(data: any): {
		content: {
			type: string;
			text: string;
		}[];
	} {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(data, null, 2),
				},
			],
		};
	}

	/**
	 * Format error response
	 * @param error Error object or error message
	 * @returns Standardized error response format
	 */
	protected formatErrorResponse(error: any): {
		content: {
			type: string;
			text: string;
		}[];
		isError: boolean;
	} {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			content: [
				{
					type: "text",
					text: `Error: ${errorMessage}`,
				},
			],
			isError: true,
		};
	}

	/**
	 * Handle errors during tool execution
	 * @param error Caught error
	 * @returns Formatted error response
	 */
	protected handleError(error: any): {
		content: {
			type: string;
			text: string;
		}[];
		isError: boolean;
	} {
		console.error(`Tool execution error [${this.constructor.name}]:`, error);
		return this.formatErrorResponse(error);
	}

	/**
	 * Validate required parameters
	 * @param args Input parameters
	 * @param requiredFields Required field list
	 * @throws Throws error if required parameters are missing
	 */
	protected validateRequiredArgs(args: any, requiredFields: string[]): void {
		for (const field of requiredFields) {
			if (
				args[field] === undefined ||
				args[field] === null ||
				args[field] === ""
			) {
				throw new Error(`Missing required parameter: ${field}`);
			}
		}
	}

	/**
	 * Safely extract string parameter
	 * @param args Parameter object
	 * @param key Parameter key name
	 * @param defaultValue Default value
	 * @returns String value
	 */
	protected getStringArg(
		args: any,
		key: string,
		defaultValue: string = "",
	): string {
		const value = args[key];
		return typeof value === "string" ? value : defaultValue;
	}

	/**
	 * Safely extract number parameter
	 * @param args Parameter object
	 * @param key Parameter key name
	 * @param defaultValue Default value
	 * @returns Number value
	 */
	protected getNumberArg(
		args: any,
		key: string,
		defaultValue: number = 0,
	): number {
		const value = args[key];
		return typeof value === "number" ? value : defaultValue;
	}

	/**
	 * Safely extract boolean parameter
	 * @param args Parameter object
	 * @param key Parameter key name
	 * @param defaultValue Default value
	 * @returns Boolean value
	 */
	protected getBooleanArg(
		args: any,
		key: string,
		defaultValue: boolean = false,
	): boolean {
		const value = args[key];
		return typeof value === "boolean" ? value : defaultValue;
	}

	/**
	 * Safely extract array parameter
	 * @param args Parameter object
	 * @param key Parameter key name
	 * @param defaultValue Default value
	 * @returns Array value
	 */
	protected getArrayArg<T>(
		args: any,
		key: string,
		defaultValue: T[] = [],
	): T[] {
		const value = args[key];
		return Array.isArray(value) ? value : defaultValue;
	}

	/**
	 * Limit array length to avoid performance issues
	 * @param array Input array
	 * @param maxLength Maximum length
	 * @returns Trimmed array
	 */
	protected limitArrayLength<T>(array: T[], maxLength: number = 100): T[] {
		if (array.length > maxLength) {
			console.warn(
				`Array length ${array.length} exceeds limit ${maxLength}, trimming`,
			);
			return array.slice(0, maxLength);
		}
		return array;
	}

	/**
	 * Format timestamp to readable string
	 * @param timestamp Timestamp
	 * @returns Formatted time string
	 */
	protected formatTimestamp(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleString("en-US");
	}

	/**
	 * Clean HTML content, keeping only plain text
	 * @param html HTML string
	 * @returns Plain text content
	 */
	protected stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, "").trim();
	}

	/**
	 * Truncate long text
	 * @param text Original text
	 * @param maxLength Maximum length
	 * @returns Truncated text
	 */
	protected truncateText(text: string, maxLength: number = 200): string {
		if (text.length <= maxLength) {
			return text;
		}
		return text.substring(0, maxLength) + "...";
	}
}
