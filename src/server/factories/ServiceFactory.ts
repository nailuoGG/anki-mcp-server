/**
 * Central factory for creating and managing service dependencies
 */
import {
	IAnkiConnectService,
	IConfigService,
	IDeckService,
	ILanguageService,
	IModelService,
	INoteService,
} from "../../interfaces/services.js";
import { AnkiConnectService } from "../../services/AnkiConnectService.js";
import { DeckService } from "../../services/DeckService.js";
import { LanguageService } from "../../services/LanguageService.js";
import { ModelService } from "../../services/ModelService.js";
import { NoteService } from "../../services/NoteService.js";

export class ServiceFactory {
	private ankiConnectService: IAnkiConnectService;
	private languageService: ILanguageService;
	private deckService: IDeckService;
	private noteService: INoteService;
	private modelService: IModelService;

	/**
	 * @param configService Required for service configuration
	 */
	constructor(private configService: IConfigService) {
		// Initialize core infrastructure services first
		this.ankiConnectService = this.createAnkiConnectService();
		this.languageService = this.createLanguageService();

		// Initialize domain services with core dependencies
		this.deckService = this.createDeckService();
		this.modelService = this.createModelService();
		this.noteService = this.createNoteService();
	}

	private createAnkiConnectService(): IAnkiConnectService {
		return new AnkiConnectService(this.configService);
	}

	private createLanguageService(): ILanguageService {
		return new LanguageService(this.ankiConnectService, this.configService);
	}

	private createDeckService(): IDeckService {
		// Deck service depends on language detection
		return new DeckService(this.ankiConnectService, this.languageService);
	}

	private createModelService(): IModelService {
		return new ModelService(this.ankiConnectService, this.languageService);
	}

	private createNoteService(): INoteService {
		return new NoteService(this.ankiConnectService, this.languageService);
	}

	// Service accessors
	getAnkiConnectService(): IAnkiConnectService {
		return this.ankiConnectService;
	}
	getLanguageService(): ILanguageService {
		return this.languageService;
	}
	getDeckService(): IDeckService {
		return this.deckService;
	}
	getNoteService(): INoteService {
		return this.noteService;
	}
	getModelService(): IModelService {
		return this.modelService;
	}
}
