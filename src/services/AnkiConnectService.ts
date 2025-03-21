/**
 * AnkiConnect service implementation
 */
import axios, { AxiosRequestConfig } from "axios";
import { IAnkiConnectService } from "../interfaces/services.js";
import { IConfigService } from "../interfaces/services.js";
import { AnkiRequest, AnkiResponse } from "../interfaces/schemas.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * AnkiConnectService centralizes all HTTP communication with AnkiConnect
 */
export class AnkiConnectService implements IAnkiConnectService {
	/**
	 * Constructor
	 *
	 * @param configService Configuration service
	 */
	constructor(private configService: IConfigService) {}

	/**
	 * Invoke an AnkiConnect action
	 *
	 * @param action AnkiConnect action name
	 * @param params Action parameters
	 * @returns Promise resolving to the action result
	 */
	async invoke<T = any>(
		action: string,
		params: Record<string, any> = {},
	): Promise<T> {
		console.info(`[Anki] Sending request: ${action}`, params);
		try {
			const requestData: AnkiRequest = {
				action,
				version: this.configService.getApiVersion(),
				params,
			};
			console.info(
				"[Anki] Request data:",
				JSON.stringify(requestData, null, 2),
			);

			const config: AxiosRequestConfig = {
				headers: this.configService.getRequestConfig().headers,
				timeout: this.configService.getRequestConfig().timeout,
				validateStatus: null,
				maxRedirects: 0,
				httpAgent: new (await import("http")).Agent({
					keepAlive: true,
					maxSockets: 1,
				}),
			};

			const response = await axios.post<AnkiResponse>(
				this.configService.getAnkiConnectUrl(),
				requestData,
				config,
			);

			if (!response) {
				throw new Error(`Anki error: AnkiConnect error`);
			}

			console.info(`[Anki] Response status: ${response?.status}`);
			console.info(
				"[Anki] Response data:",
				JSON.stringify(response.data, null, 2),
			);

			if (response.status !== 200) {
				throw new McpError(
					ErrorCode.InternalError,
					`Anki returned non-200 status: ${response?.status}`,
				);
			}

			if (response.data.error) {
				throw new McpError(
					ErrorCode.InternalError,
					`Anki error: ${response.data.error}`,
				);
			}

			return response.data.result;
		} catch (error) {
			console.info("[Anki] Error:", error);
			if (!axios.isAxiosError(error)) {
				throw error;
			}
			if (error.code === "ECONNREFUSED") {
				throw new McpError(
					ErrorCode.InternalError,
					"Anki is not running. Please start Anki and ensure AnkiConnect plugin is enabled.",
				);
			}
			if (error.code === "ETIMEDOUT" || error.code === "ECONNRESET") {
				console.error("[Anki] Connection error:", error.code);
				// Retry once on timeout or reset
				console.error("[Anki] Retrying request...");
				try {
					// Recreate the request data
					const retryRequestData = {
						action,
						version: this.configService.getApiVersion(),
						params,
					};
					const retryResponse = await axios.post<AnkiResponse>(
						this.configService.getAnkiConnectUrl(),
						retryRequestData,
						{
							headers: this.configService.getRequestConfig().headers,
							timeout: this.configService.getRequestConfig().retryTimeout,
							validateStatus: null,
							maxRedirects: 0,
							httpAgent: new (await import("http")).Agent({
								keepAlive: true,
								maxSockets: 1,
							}),
						},
					);
					console.error("[Anki] Retry successful");
					return retryResponse.data.result;
				} catch (retryError) {
					console.error("[Anki] Retry failed:", retryError);
					throw new McpError(
						ErrorCode.InternalError,
						"Connection to Anki failed after retry. Please check if Anki is running and responsive.",
					);
				}
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to connect to Anki: ${error.message} (${error.code})`,
			);
		}
	}

	/**
	 * Check if AnkiConnect is available
	 *
	 * @returns Promise resolving to true if connection is successful
	 */
	async checkConnection(): Promise<boolean> {
		try {
			await this.getVersion();
			return true;
		} catch (error) {
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to connect to Anki. Please make sure Anki is running and the AnkiConnect plugin is enabled.",
			);
		}
	}

	/**
	 * Get the AnkiConnect version
	 *
	 * @returns Promise resolving to the AnkiConnect version
	 */
	async getVersion(): Promise<number> {
		return this.invoke<number>("version");
	}
}
