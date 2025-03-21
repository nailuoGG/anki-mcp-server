/**
 * Anki server configuration
 */
export const config = {
	/**
	 * Anki-Connect service URL
	 */
	ankiConnectUrl: "http://localhost:8765",

	/**
	 * Anki-Connect API version
	 */
	apiVersion: 6,

	/**
	 * Default deck name
	 */
	defaultDeck: "Default",

	/**
	 * Note model configuration
	 */
	noteModels: {
		basic: {
			en: "Basic",
			zh: "基础",
		},
		cloze: {
			en: "Cloze",
			zh: "填空题",
		},
	},

	/**
	 * Request configuration
	 */
	request: {
		/**
		 * Request timeout in milliseconds
		 */
		timeout: 5000,

		/**
		 * Retry timeout in milliseconds
		 */
		retryTimeout: 10000,

		/**
		 * Headers
		 */
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Connection: "keep-alive",
		},
	},
} as const;

/**
 * Test-specific configuration
 */
export const testConfig = {
	...config,
	test: {
		/**
		 * Default CSS for test note types
		 */
		defaultCss: ".card { font-family: arial; }",

		/**
		 * Default tags for test notes
		 */
		tags: {
			basic: "test,basic",
			cloze: "test,cloze",
		},

		/**
		 * Default field names for test note types
		 */
		fields: {
			basic: ["正面", "背面"],
		},

		/**
		 * Default card templates
		 */
		templates: {
			basic: {
				name: "Card 1",
				front: "{{正面}}",
				back: '{{FrontSide}}<hr id="answer">{{背面}}',
			},
		},
	},
} as const;
