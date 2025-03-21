/**
 * Configuration service implementation
 */
import { IConfigService } from "../interfaces/services.js";
import { config } from "../config/index.js";
import { Language, NoteType } from "../interfaces/types.js";

/**
 * ConfigService provides access to application configuration
 */
export class ConfigService implements IConfigService {
	/**
	 * Get the AnkiConnect URL
	 */
	getAnkiConnectUrl(): string {
		return config.ankiConnectUrl;
	}

	/**
	 * Get the API version
	 */
	getApiVersion(): number {
		return config.apiVersion;
	}

	/**
	 * Get the default deck name
	 */
	getDefaultDeck(): string {
		return config.defaultDeck;
	}

	/**
	 * Get the model name for a note type and language
	 *
	 * @param type Note type (Basic or Cloze)
	 * @param language Language (en or zh)
	 * @returns Model name for the specified type and language
	 */
	getModelName(type: NoteType, language: Language): string {
		return config.noteModels[type.toLowerCase() as "basic" | "cloze"][language];
	}

	/**
	 * Get the request configuration
	 */
	getRequestConfig(): {
		timeout: number;
		retryTimeout: number;
		headers: Record<string, string>;
	} {
		return {
			timeout: config.request.timeout,
			retryTimeout: config.request.retryTimeout,
			headers: { ...config.request.headers },
		};
	}
}
