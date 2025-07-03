/**
 * Error response format for MCP protocol
 */
export interface McpErrorResponse {
	content: {
		type: string;
		text: string;
	}[];
	isError: boolean;
}

/**
 * Health status for system monitoring
 */
export interface HealthStatus {
	status: "healthy" | "unhealthy" | "degraded";
	checks: HealthCheck[];
	timestamp: Date;
}

export interface HealthCheck {
	name: string;
	status: "fulfilled" | "rejected";
	details?: any;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
	CONNECTION = "connection",
	VALIDATION = "validation",
	AUTHORIZATION = "authorization",
	BUSINESS_LOGIC = "business_logic",
	INFRASTRUCTURE = "infrastructure",
	UNKNOWN = "unknown",
}
