/**
 * Unit tests for AnkiConnectService
 */
import axios from "axios";
import { AnkiConnectService } from "../../../services/AnkiConnectService.js";
import { ConfigService } from "../../../services/ConfigService.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { beforeAll } from "@jest/globals";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("AnkiConnectService", () => {
	let configService: ConfigService;
	let ankiConnectService: AnkiConnectService;

	beforeAll(() => {
		// Mock http module for httpAgent
		jest.mock("http", () => ({
			Agent: jest.fn().mockImplementation((...rest) => {
				console.log(rest);
				return {};
			}),
		}));
	});

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Create services
		configService = new ConfigService();
		ankiConnectService = new AnkiConnectService(configService);
	});

	describe("invoke", () => {
		test("should make a POST request to AnkiConnect with the correct parameters", async () => {
			// Mock successful response
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: {
					result: "success",
					error: null,
				},
			});

			// Call the method
			const result = await ankiConnectService.invoke("testAction", {
				param: "value",
			});

			// Verify axios was called correctly
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
			expect(mockedAxios.post).toHaveBeenCalledWith(
				configService.getAnkiConnectUrl(),
				{
					action: "testAction",
					version: configService.getApiVersion(),
					params: { param: "value" },
				},
				expect.objectContaining({
					headers: configService.getRequestConfig().headers,
					timeout: configService.getRequestConfig().timeout,
				}),
			);

			// Verify result
			expect(result).toBe("success");
		});

		test("should throw McpError when AnkiConnect returns an error", async () => {
			// Mock error response
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: {
					result: null,
					error: "AnkiConnect error",
				},
			});

			// Call the method and expect it to throw
			await expect(ankiConnectService.invoke("testAction")).rejects.toThrow(
				McpError,
			);
			await expect(ankiConnectService.invoke("testAction")).rejects.toThrow(
				"Anki error: AnkiConnect error",
			);
		});

		test("should throw McpError when AnkiConnect returns non-200 status", async () => {
			// Mock non-200 response
			mockedAxios.post.mockResolvedValueOnce({
				status: 500,
				data: {},
			});

			// Call the method and expect it to throw
			const actual = ankiConnectService.invoke("testAction");
			await expect(actual).rejects.toThrow(McpError);
			await expect(actual).rejects.toThrow("Anki returned non-200 status: 500");
		});

		// test('should handle connection refused error', async () => {
		//     // Mock connection refused error
		//     const error = new Error('Connection refused');
		//     // mockedAxios.post.mockRejectedValueOnce(error);
		//
		//     // Call the method and expect it to throw
		//     const actual = ankiConnectService.invoke('testAction');
		//     await expect(actual).rejects.toThrow(McpError);
		//     await expect(actual).rejects.toThrow('Anki is not running');
		// });
		//
		// test('should retry on timeout error', async () => {
		//     // Mock timeout error
		//     const error = new Error('Timeout');
		//     (error as any).code = 'ETIMEDOUT';
		//     mockedAxios.post.mockRejectedValueOnce(error);
		//
		//     // Mock successful retry
		//     mockedAxios.post.mockResolvedValueOnce({
		//         status: 200,
		//         data: {
		//             result: 'retry success',
		//             error: null,
		//         },
		//     });
		//
		//     // Call the method
		//     const result = await ankiConnectService.invoke('testAction');
		//
		//     // Verify axios was called twice (original + retry)
		//     expect(mockedAxios.post).toHaveBeenCalledTimes(2);
		//
		//     // Second call should use retry timeout
		//     expect(mockedAxios.post.mock.calls[1][2]).toHaveProperty(
		//         'timeout',
		//         configService.getRequestConfig().retryTimeout
		//     );
		//
		//     // Verify result
		//     expect(result).toBe('retry success');
		// });
	});

	describe("checkConnection", () => {
		test("should return true when connection is successful", async () => {
			// Mock successful version check
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: {
					result: 6,
					error: null,
				},
			});

			// Call the method
			const result = await ankiConnectService.checkConnection();

			// Verify result
			expect(result).toBe(true);
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
			expect(mockedAxios.post.mock.calls[0][1]).toHaveProperty(
				"action",
				"version",
			);
		});

		test("should throw McpError when connection fails", async () => {
			// Mock connection error
			mockedAxios.post.mockRejectedValueOnce(new Error("Connection error"));

			// Call the method and expect it to throw
			await expect(ankiConnectService.checkConnection()).rejects.toThrow(
				McpError,
			);
			await expect(ankiConnectService.checkConnection()).rejects.toThrow(
				"Failed to connect to Anki",
			);
		});
	});

	describe("getVersion", () => {
		test("should return the AnkiConnect version", async () => {
			// Mock successful version check
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: {
					result: 6,
					error: null,
				},
			});

			// Call the method
			const result = await ankiConnectService.getVersion();

			// Verify result
			expect(result).toBe(6);
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
			expect(mockedAxios.post.mock.calls[0][1]).toHaveProperty(
				"action",
				"version",
			);
		});
	});
});
