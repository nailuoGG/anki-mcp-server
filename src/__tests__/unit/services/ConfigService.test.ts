/**
 * Unit tests for ConfigService
 */
import { ConfigService } from "../../../services/ConfigService.js";
import { config } from "../../../config/index.js";

describe("ConfigService", () => {
	let configService: ConfigService;

	beforeEach(() => {
		configService = new ConfigService();
	});

	test("should return the correct AnkiConnect URL", () => {
		expect(configService.getAnkiConnectUrl()).toBe(config.ankiConnectUrl);
	});

	test("should return the correct API version", () => {
		expect(configService.getApiVersion()).toBe(config.apiVersion);
	});

	test("should return the correct default deck", () => {
		expect(configService.getDefaultDeck()).toBe(config.defaultDeck);
	});

	test("should return the correct model name for Basic note type in English", () => {
		expect(configService.getModelName("Basic", "en")).toBe(
			config.noteModels.basic.en,
		);
	});

	test("should return the correct model name for Basic note type in Chinese", () => {
		expect(configService.getModelName("Basic", "zh")).toBe(
			config.noteModels.basic.zh,
		);
	});

	test("should return the correct model name for Cloze note type in English", () => {
		expect(configService.getModelName("Cloze", "en")).toBe(
			config.noteModels.cloze.en,
		);
	});

	test("should return the correct model name for Cloze note type in Chinese", () => {
		expect(configService.getModelName("Cloze", "zh")).toBe(
			config.noteModels.cloze.zh,
		);
	});

	test("should return the correct request configuration", () => {
		const requestConfig = configService.getRequestConfig();
		expect(requestConfig.timeout).toBe(config.request.timeout);
		expect(requestConfig.retryTimeout).toBe(config.request.retryTimeout);
		expect(requestConfig.headers).toEqual(config.request.headers);
	});

	test("should return a copy of the headers to prevent mutation", () => {
		const requestConfig = configService.getRequestConfig();
		// Modify the returned headers
		requestConfig.headers["X-Test"] = "test";
		// Get the headers again
		const newRequestConfig = configService.getRequestConfig();
		// The original headers should not be modified
		expect(newRequestConfig.headers["X-Test"]).toBeUndefined();
	});
});
