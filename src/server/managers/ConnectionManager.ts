/**
 * Manages connection to Anki through AnkiConnect
 */
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { IAnkiConnectService } from "../../interfaces/services.js";

/**
 * Handles Anki connection lifecycle and error handling
 */
export class ConnectionManager {
	constructor(private ankiConnectService: IAnkiConnectService) {}

	/**
	 * Verifies AnkiConnect availability
	 * @throws McpError with connection failure details
	 */
	async checkConnection(): Promise<void> {
		try {
			await this.ankiConnectService.checkConnection();
		} catch (error) {
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to connect to Anki. Please make sure Anki is running and the AnkiConnect plugin is enabled.",
			);
		}
	}
}
