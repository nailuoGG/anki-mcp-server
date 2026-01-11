import { jest } from "@jest/globals";

class MockYankiConnect {
	deck = {
		deckNames: jest.fn<() => Promise<string[]>>().mockResolvedValue([]),
		createDeck: jest.fn<({ deck: string }) => Promise<number>>().mockResolvedValue(1),
	};

	model = {
		modelNames: jest.fn<() => Promise<string[]>>().mockResolvedValue([]),
		modelFieldNames: jest
			.fn<({ modelName: string }) => Promise<string[]>>()
			.mockResolvedValue([]),
		modelTemplates: jest
			.fn<({ modelName: string }) => Promise<Record<string, { Front: string; Back: string }>>>()
			.mockResolvedValue({}),
		modelStyling: jest
			.fn<({ modelName: string }) => Promise<{ css: string }>>()
			.mockResolvedValue({ css: "" }),
		createModel: jest
			.fn<
				({
					modelName,
					inOrderFields,
					css,
					cardTemplates,
				}: {
					modelName: string;
					inOrderFields: string[];
					css: string;
					cardTemplates: { name: string; Front: string; Back: string }[];
				}) => Promise<void>
			>()
			.mockResolvedValue(),
	};

	note = {
		addNote: jest
			.fn<
				({
					note,
				}: {
					note: {
						deckName: string;
						modelName: string;
						fields: Record<string, string>;
						tags: string[];
						options: { allowDuplicate: boolean; duplicateScope: string };
					};
				}) => Promise<number | null>
			>()
			.mockResolvedValue(1),
		addNotes: jest
			.fn<
				({
					notes,
				}: {
					notes: {
						deckName: string;
						modelName: string;
						fields: Record<string, string>;
						tags: string[];
						options: { allowDuplicate: boolean; duplicateScope: string };
					}[];
				}) => Promise<(string | null)[] | null>
			>()
			.mockResolvedValue([1]),
		findNotes: jest.fn<({ query: string }) => Promise<number[]>>().mockResolvedValue([]),
		notesInfo: jest
			.fn<({ notes }: { notes: number[] }) => Promise<unknown>>()
			.mockResolvedValue([]),
		updateNoteFields: jest
			.fn<
				({
					note,
				}: {
					note: {
						id: number;
						fields: Record<string, string>;
					};
				}) => Promise<void>
			>()
			.mockResolvedValue(),
		deleteNotes: jest
			.fn<({ notes }: { notes: number[] }) => Promise<void>>()
			.mockResolvedValue(),
	};

	invoke = jest.fn<(action: string) => Promise<unknown>>().mockResolvedValue(6);

	constructor(public options: { host: string; port: number }) {}
}

export { MockYankiConnect as YankiConnect };
