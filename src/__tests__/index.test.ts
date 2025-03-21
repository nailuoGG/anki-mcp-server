import axios, { AxiosStatic } from "axios";
import MockAdapter from "axios-mock-adapter";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { MockAnkiConnect } from "./helpers/mockAnkiConnect.js";
import { testConfig } from "../config/index.js";
import {
	cleanupTestResources,
	createTestBasicNote,
	createTestDeck,
	initializeTestTracking,
} from "./helpers/testUtils.js";

describe("AnkiServer", () => {
	let mockAxios: MockAdapter;
	let mockAnkiConnect: MockAnkiConnect;
	let axiosInstance: AxiosStatic;

	beforeAll(() => {
		// Create a fresh axios instance for testing
		axiosInstance = axios;
		// @ts-ignore - Type mismatch in axios-mock-adapter
		mockAxios = new MockAdapter(axiosInstance);
		mockAnkiConnect = new MockAnkiConnect();
		initializeTestTracking();
	});

	beforeEach(async () => {
		await cleanupTestResources(mockAnkiConnect);
		mockAxios.reset();

		// Setup mock responses
		mockAxios.onPost(testConfig.ankiConnectUrl).reply(async (config) => {
			try {
				const request = JSON.parse(config.data);
				const method = request.action as keyof MockAnkiConnect;
				const handler = mockAnkiConnect[method];

				if (typeof handler === "function") {
					const result = await handler.bind(mockAnkiConnect)(request.params);
					return [200, { result, error: null }];
				}
				throw new Error(`Invalid action: ${request.action}`);
			} catch (error) {
				if (error instanceof McpError) {
					return [200, { result: null, error: error.message }];
				}
				return [500, { result: null, error: "Internal server error" }];
			}
		});
	});

	afterAll(async () => {
		await cleanupTestResources(mockAnkiConnect);
		mockAxios.restore();
	});

	afterEach(async () => {
		await cleanupTestResources(mockAnkiConnect);
	});

	describe("Error Handling and Edge Cases", () => {
		test("should handle connection timeout", async () => {
			mockAxios.reset();
			mockAxios.onPost(testConfig.ankiConnectUrl).timeout();

			const response = await axiosInstance
				.post(testConfig.ankiConnectUrl, {
					action: "deckNames",
					version: testConfig.apiVersion,
					params: {},
				})
				.catch((e) => e);

			expect(response).toHaveProperty("code", "ECONNABORTED");
		});

		test("should handle connection errors", async () => {
			mockAxios.reset();
			mockAxios.onPost(testConfig.ankiConnectUrl).networkError();

			await expect(
				axiosInstance.post(testConfig.ankiConnectUrl, {
					action: "deckNames",
					version: testConfig.apiVersion,
					params: {},
				}),
			).rejects.toThrow();
		});

		test("should handle malformed request data", async () => {
			mockAxios.reset();
			mockAxios.onPost(testConfig.ankiConnectUrl).reply(async (config: any) => {
				try {
					JSON.parse(config.data);
					return [200, { result: null, error: null }];
				} catch (error) {
					return [500, { error: "Invalid JSON" }];
				}
			});

			try {
				await axiosInstance.post(testConfig.ankiConnectUrl, "invalid json");
				fail("Expected request to fail");
			} catch (error: any) {
				expect(error.response.status).toBe(500);
				expect(error.response.data.error).toBe("Invalid JSON");
			}
		});

		test("should handle invalid parameters", async () => {
			const response = await axiosInstance.post(testConfig.ankiConnectUrl, {
				action: "addNote",
				version: testConfig.apiVersion,
				params: {
					note: {
						// Missing required fields
						deckName: "Default",
					},
				},
			});

			expect(response.data.error).toBeTruthy();
		});

		test("should handle non-existent note updates", async () => {
			const response = await axiosInstance.post(testConfig.ankiConnectUrl, {
				action: "updateNoteFields",
				version: testConfig.apiVersion,
				params: {
					note: {
						id: 99999,
						fields: {
							Front: "New Front",
						},
					},
				},
			});

			expect(response.data.error).toContain("Note not found");
		});
	});

	describe("Concurrent Operations", () => {
		test("should handle multiple operations concurrently", async () => {
			const testDeck = createTestDeck();
			const operations = [
				axiosInstance.post(testConfig.ankiConnectUrl, {
					action: "createDeck",
					version: testConfig.apiVersion,
					params: { deck: testDeck.name },
				}),
				axiosInstance.post(testConfig.ankiConnectUrl, {
					action: "modelNames",
					version: testConfig.apiVersion,
					params: {},
				}),
				axiosInstance.post(testConfig.ankiConnectUrl, {
					action: "deckNames",
					version: testConfig.apiVersion,
					params: {},
				}),
			];

			const results = await Promise.all(operations);
			expect(results.every((r) => r.status === 200)).toBe(true);
			expect(results.every((r) => r.data.error === null)).toBe(true);
		});
	});

	describe("Cleanup Verification", () => {
		test("should properly clean up test resources", async () => {
			// Create test resources
			const testDeck = createTestDeck();
			await axiosInstance.post(testConfig.ankiConnectUrl, {
				action: "createDeck",
				version: testConfig.apiVersion,
				params: { deck: testDeck.name },
			});

			const note = createTestBasicNote(testDeck.name);
			const noteResponse = await axiosInstance.post(testConfig.ankiConnectUrl, {
				action: "addNote",
				version: testConfig.apiVersion,
				params: {
					note: {
						deckName: note.deck,
						modelName: testConfig.noteModels.basic.zh,
						fields: {
							正面: note.front,
							背面: note.back,
						},
						tags: note.tags,
					},
				},
			});

			// Verify resources were created
			expect(mockAnkiConnect.getDeck(testDeck.name)).toBe(true);
			expect(mockAnkiConnect.getNote(noteResponse.data.result)).toBeDefined();

			// Run cleanup
			await cleanupTestResources(mockAnkiConnect);

			// Verify cleanup
			expect(mockAnkiConnect.getDeck(testDeck.name)).toBe(false);
			expect(mockAnkiConnect.getNote(noteResponse.data.result)).toBeUndefined();

			// Verify deck list doesn't contain test deck
			const decksResponse = await axiosInstance.post(
				testConfig.ankiConnectUrl,
				{
					action: "deckNames",
					version: testConfig.apiVersion,
					params: {},
				},
			);
			expect(decksResponse.data.result).not.toContain(testDeck.name);
		});

		test("should handle cleanup of non-existent resources", async () => {
			// Attempt cleanup without creating any resources
			await expect(
				cleanupTestResources(mockAnkiConnect),
			).resolves.not.toThrow();
		});
	});
});
