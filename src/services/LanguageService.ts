/**
 * Language service implementation
 */
import {
	ILanguageService,
	IAnkiConnectService,
	IConfigService,
} from "../interfaces/services.js";
import { Language, NoteType, FieldNames } from "../interfaces/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * LanguageService handles language detection and field name mapping
 */
export class LanguageService implements ILanguageService {
	/**
	 * Current detected language
	 */
	private language: Language = "en"; // Default to English

	/**
	 * Constructor
	 *
	 * @param ankiConnectService AnkiConnect service
	 * @param configService Configuration service
	 */
	constructor(
		private ankiConnectService: IAnkiConnectService,
		private configService: IConfigService,
	) {}

	/**
	 * Detect the Anki interface language
	 *
	 * 检测Anki界面语言，通过检查模型名称来判断
	 */
	async detectLanguage(): Promise<void> {
		try {
			// Get list of model names
			const modelNames: string[] =
				await this.ankiConnectService.invoke<string[]>("modelNames");

			// Check if English basic model exists
			if (modelNames.includes(this.configService.getModelName("Basic", "en"))) {
				this.language = "en";
				console.error("[Anki] Detected language: English");
			}
			// Check if Chinese basic model exists
			else if (
				modelNames.includes(this.configService.getModelName("Basic", "zh"))
			) {
				this.language = "zh";
				console.error("[Anki] Detected language: Chinese");
			}
			// Default to English if can't detect
			else {
				this.language = "en";
				console.error(
					"[Anki] Could not detect language, defaulting to English",
				);
			}
		} catch (error) {
			// Default to English on error
			this.language = "en";
			console.error(
				"[Anki] Error detecting language, defaulting to English:",
				error,
			);
		}
	}

	/**
	 * Get the current language
	 *
	 * @returns Current language
	 */
	getLanguage(): Language {
		return this.language;
	}

	/**
	 * Get the model name for a note type
	 *
	 * @param type Note type (Basic or Cloze)
	 * @returns Model name for the specified type in the current language
	 */
	getModelName(type: NoteType): string {
		return this.configService.getModelName(type, this.language);
	}

	/**
	 * Get the field names for a note type
	 *
	 * @param type Note type (Basic or Cloze)
	 * @returns Field names for the specified type in the current language
	 */
	getFieldNames(type: NoteType): FieldNames {
		if (this.language === "en") {
			return type === "Basic"
				? { front: "Front", back: "Back" }
				: { front: "Text", back: "Back Extra" };
		} else {
			// Chinese field names
			return type === "Basic"
				? { front: "正面", back: "背面" }
				: { front: "文字", back: "额外的" };
		}
	}
}
