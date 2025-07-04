import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { DomainError } from "./DomainErrors.js";
import {
	McpErrorResponse,
	ErrorCategory,
	ErrorSeverity,
} from "./ErrorTypes.js";

/**
 * Centralized error handler for the application
 */
export class ErrorHandler {
	/**
	 * Handle any error and convert to appropriate MCP response
	 */
	static handle(error: Error): McpErrorResponse {
		if (error instanceof DomainError) {
			return ErrorHandler.handleDomainError(error);
		}

		if (error instanceof McpError) {
			return ErrorHandler.handleMcpError(error);
		}

		return ErrorHandler.handleUnknownError(error);
	}

	/**
	 * Handle domain-specific errors
	 */
	private static handleDomainError(error: DomainError): McpErrorResponse {
		// Log error for monitoring
		ErrorHandler.logError(error);

		return {
			content: [
				{
					type: "text",
					text: `${error.category.toUpperCase()} Error [${error.code}]: ${
						error.message
					}`,
				},
			],
			isError: true,
		};
	}

	/**
	 * Handle MCP protocol errors
	 */
	private static handleMcpError(error: McpError): McpErrorResponse {
		ErrorHandler.logError(error);

		return {
			content: [
				{
					type: "text",
					text: `MCP Error [${error.code}]: ${error.message}`,
				},
			],
			isError: true,
		};
	}

	/**
	 * Handle unknown errors
	 */
	private static handleUnknownError(error: Error): McpErrorResponse {
		ErrorHandler.logError(error);

		return {
			content: [
				{
					type: "text",
					text: `Unexpected Error: ${error.message}`,
				},
			],
			isError: true,
		};
	}

	/**
	 * Convert domain errors to MCP errors for protocol compliance
	 */
	static toMcpError(error: Error): McpError {
		if (error instanceof DomainError) {
			const mcpCode = ErrorHandler.getMcpErrorCode(
				error.category,
				error.severity,
			);
			return new McpError(mcpCode, error.message);
		}

		return new McpError(ErrorCode.InternalError, error.message);
	}

	/**
	 * Get appropriate MCP error code based on domain error attributes
	 */
	private static getMcpErrorCode(
		category: ErrorCategory,
		severity: ErrorSeverity,
	): ErrorCode {
		switch (category) {
			case ErrorCategory.CONNECTION:
				return ErrorCode.InternalError;
			case ErrorCategory.VALIDATION:
				return ErrorCode.InvalidParams;
			case ErrorCategory.AUTHORIZATION:
				return ErrorCode.InvalidParams;
			case ErrorCategory.BUSINESS_LOGIC:
				return ErrorCode.InvalidRequest;
			case ErrorCategory.INFRASTRUCTURE:
				return severity === ErrorSeverity.CRITICAL
					? ErrorCode.InternalError
					: ErrorCode.InternalError;
			default:
				return ErrorCode.InternalError;
		}
	}

	/**
	 * Log error for monitoring and debugging
	 */
	private static logError(error: Error): void {
		// In a real implementation, this would integrate with a logging system
		console.error(`[ERROR] ${error.name}: ${error.message}`);

		if (error instanceof DomainError) {
			console.error(`  Code: ${error.code}`);
			console.error(`  Category: ${error.category}`);
			console.error(`  Severity: ${error.severity}`);
			if (error.cause) {
				console.error(`  Cause: ${error.cause.message}`);
			}
		}

		if (error.stack) {
			console.error(`  Stack: ${error.stack}`);
		}
	}

	/**
	 * Check if an error is recoverable
	 */
	static isRecoverable(error: Error): boolean {
		if (error instanceof DomainError) {
			// Critical errors are not recoverable
			if (error.severity === ErrorSeverity.CRITICAL) {
				return false;
			}

			// Connection errors might be recoverable with retry
			if (error.category === ErrorCategory.CONNECTION) {
				return true;
			}

			// Validation errors are typically recoverable
			if (error.category === ErrorCategory.VALIDATION) {
				return true;
			}
		}

		return false;
	}
}
