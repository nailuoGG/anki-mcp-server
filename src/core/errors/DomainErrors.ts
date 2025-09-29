import { ErrorCategory, ErrorSeverity } from "./ErrorTypes.js";

/**
 * Base domain error class that all other errors extend
 */
export abstract class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly category: ErrorCategory,
		public readonly severity: ErrorSeverity,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = this.constructor.name;

		// Maintain proper stack trace (Node.js specific)
		if (typeof (Error as any).captureStackTrace === "function") {
			(Error as any).captureStackTrace(this, this.constructor);
		}
	}
}

/**
 * Anki connection related errors
 */
export class AnkiConnectionError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"ANKI_CONNECTION_ERROR",
			ErrorCategory.CONNECTION,
			ErrorSeverity.HIGH,
			cause,
		);
	}
}

/**
 * Anki API timeout errors
 */
export class AnkiTimeoutError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"ANKI_TIMEOUT_ERROR",
			ErrorCategory.CONNECTION,
			ErrorSeverity.MEDIUM,
			cause,
		);
	}
}

/**
 * Anki API errors
 */
export class AnkiApiError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"ANKI_API_ERROR",
			ErrorCategory.INFRASTRUCTURE,
			ErrorSeverity.MEDIUM,
			cause,
		);
	}
}

/**
 * Invalid note data errors
 */
export class InvalidNoteError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"INVALID_NOTE_ERROR",
			ErrorCategory.VALIDATION,
			ErrorSeverity.LOW,
			cause,
		);
	}
}

/**
 * Invalid deck data errors
 */
export class InvalidDeckError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"INVALID_DECK_ERROR",
			ErrorCategory.VALIDATION,
			ErrorSeverity.LOW,
			cause,
		);
	}
}

/**
 * Configuration errors
 */
export class ConfigurationError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"CONFIGURATION_ERROR",
			ErrorCategory.INFRASTRUCTURE,
			ErrorSeverity.CRITICAL,
			cause,
		);
	}
}

/**
 * MCP protocol errors
 */
export class McpProtocolError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"MCP_PROTOCOL_ERROR",
			ErrorCategory.INFRASTRUCTURE,
			ErrorSeverity.HIGH,
			cause,
		);
	}
}

/**
 * Business logic validation errors
 */
export class BusinessLogicError extends DomainError {
	constructor(message: string, cause?: Error) {
		super(
			message,
			"BUSINESS_LOGIC_ERROR",
			ErrorCategory.BUSINESS_LOGIC,
			ErrorSeverity.MEDIUM,
			cause,
		);
	}
}
