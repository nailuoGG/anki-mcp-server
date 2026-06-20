import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { YankiFetchAdapter } from "yanki-connect";
import { AnkiClient } from "./utils.js";

const createJsonResponse = (result: unknown) => ({
	headers: {},
	json: async () => ({ error: null, result }),
	status: 200,
});

describe("AnkiClient request timeouts", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it("passes an abort signal to the configured fetch adapter", async () => {
		const fetchAdapter = jest
			.fn<YankiFetchAdapter>()
			.mockResolvedValue(createJsonResponse(6));
		const client = new AnkiClient({ fetchAdapter, timeout: 100 });

		await expect(client.getVersion()).resolves.toBe(6);

		const [_input, init] = fetchAdapter.mock.calls[0];
		expect(init).toMatchObject({
			method: "POST",
			mode: "cors",
		});
		expect((init as typeof init & { signal?: AbortSignal }).signal).toBeInstanceOf(
			AbortSignal
		);
	});

	it("converts adapter aborts into actionable MCP timeout errors", async () => {
		jest.useFakeTimers();

		const abortError = new Error("The operation was aborted");
		abortError.name = "AbortError";
		const fetchAdapter = jest.fn<YankiFetchAdapter>((_input, init) => {
			const signal = (init as typeof init & { signal?: AbortSignal }).signal;

			return new Promise((_resolve, reject) => {
				signal?.addEventListener("abort", () => reject(abortError), { once: true });
			});
		});
		const client = new AnkiClient({ fetchAdapter, retryTimeout: 1, timeout: 5 });

		const result = client.getVersion();
		const expectation = expect(result).rejects.toThrow(
			"Connection to Anki timed out. Please check if Anki is responsive."
		);

		await jest.advanceTimersByTimeAsync(5);
		await jest.advanceTimersByTimeAsync(1);
		await jest.advanceTimersByTimeAsync(5);

		await expectation;
		expect(fetchAdapter).toHaveBeenCalledTimes(2);
	});
});
