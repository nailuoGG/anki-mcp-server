import { ErrorHandler } from '../../../../src/core/errors/ErrorHandler.js';
import { 
	DomainError, 
	AnkiConnectionError, 
	AnkiTimeoutError,
	InvalidNoteError,
	ConfigurationError 
} from '../../../../src/core/errors/DomainErrors.js';
import { ErrorCategory, ErrorSeverity } from '../../../../src/core/errors/ErrorTypes.js';

// Mock console.error to avoid noise in test output
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorHandler', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('handle', () => {
		it('should handle domain errors correctly', () => {
			const error = new AnkiConnectionError('Connection failed');
			const response = ErrorHandler.handle(error);

			expect(response.isError).toBe(true);
			expect(response.content).toHaveLength(1);
			expect(response.content[0].type).toBe('text');
			expect(response.content[0].text).toContain('CONNECTION Error');
			expect(response.content[0].text).toContain('ANKI_CONNECTION_ERROR');
			expect(response.content[0].text).toContain('Connection failed');
		});

		it('should handle timeout errors with appropriate severity', () => {
			const error = new AnkiTimeoutError('Request timed out');
			const response = ErrorHandler.handle(error);

			expect(response.isError).toBe(true);
			expect(response.content[0].text).toContain('CONNECTION Error');
			expect(response.content[0].text).toContain('ANKI_TIMEOUT_ERROR');
		});

		it('should handle validation errors', () => {
			const error = new InvalidNoteError('Invalid note format');
			const response = ErrorHandler.handle(error);

			expect(response.isError).toBe(true);
			expect(response.content[0].text).toContain('VALIDATION Error');
			expect(response.content[0].text).toContain('INVALID_NOTE_ERROR');
		});

		it('should handle configuration errors', () => {
			const error = new ConfigurationError('Invalid configuration');
			const response = ErrorHandler.handle(error);

			expect(response.isError).toBe(true);
			expect(response.content[0].text).toContain('INFRASTRUCTURE Error');
			expect(response.content[0].text).toContain('CONFIGURATION_ERROR');
		});

		it('should handle unknown errors', () => {
			const error = new Error('Unknown error');
			const response = ErrorHandler.handle(error);

			expect(response.isError).toBe(true);
			expect(response.content[0].text).toContain('Unexpected Error');
			expect(response.content[0].text).toContain('Unknown error');
		});

		it('should log errors when handling them', () => {
			const error = new AnkiConnectionError('Connection failed');
			ErrorHandler.handle(error);

			expect(console.error).toHaveBeenCalledWith('[ERROR] AnkiConnectionError: Connection failed');
			expect(console.error).toHaveBeenCalledWith('  Code: ANKI_CONNECTION_ERROR');
			expect(console.error).toHaveBeenCalledWith('  Category: connection');
			expect(console.error).toHaveBeenCalledWith('  Severity: high');
		});
	});

	describe('isRecoverable', () => {
		it('should identify recoverable connection errors', () => {
			const error = new AnkiConnectionError('Connection failed');
			const isRecoverable = ErrorHandler.isRecoverable(error);

			expect(isRecoverable).toBe(true);
		});

		it('should identify recoverable validation errors', () => {
			const error = new InvalidNoteError('Invalid format');
			const isRecoverable = ErrorHandler.isRecoverable(error);

			expect(isRecoverable).toBe(true);
		});

		it('should identify non-recoverable critical errors', () => {
			const error = new ConfigurationError('Critical config error');
			const isRecoverable = ErrorHandler.isRecoverable(error);

			expect(isRecoverable).toBe(false);
		});

		it('should default to non-recoverable for unknown errors', () => {
			const error = new Error('Unknown error');
			const isRecoverable = ErrorHandler.isRecoverable(error);

			expect(isRecoverable).toBe(false);
		});
	});

	describe('toMcpError', () => {
		it('should convert domain errors to MCP errors', () => {
			const domainError = new AnkiConnectionError('Connection failed');
			const mcpError = ErrorHandler.toMcpError(domainError);

			expect(mcpError.message).toBe('Connection failed');
			// The specific error code depends on the implementation
			expect(mcpError.code).toBeDefined();
		});

		it('should convert unknown errors to MCP errors', () => {
			const unknownError = new Error('Unknown error');
			const mcpError = ErrorHandler.toMcpError(unknownError);

			expect(mcpError.message).toBe('Unknown error');
		});
	});

	describe('error categorization', () => {
		it('should properly categorize different error types', () => {
			const connectionError = new AnkiConnectionError('Connection failed');
			const validationError = new InvalidNoteError('Invalid format');
			const configError = new ConfigurationError('Bad config');

			expect(connectionError.category).toBe(ErrorCategory.CONNECTION);
			expect(validationError.category).toBe(ErrorCategory.VALIDATION);
			expect(configError.category).toBe(ErrorCategory.INFRASTRUCTURE);
		});

		it('should assign appropriate severity levels', () => {
			const connectionError = new AnkiConnectionError('Connection failed');
			const validationError = new InvalidNoteError('Invalid format');
			const configError = new ConfigurationError('Bad config');

			expect(connectionError.severity).toBe(ErrorSeverity.HIGH);
			expect(validationError.severity).toBe(ErrorSeverity.LOW);
			expect(configError.severity).toBe(ErrorSeverity.CRITICAL);
		});
	});
});