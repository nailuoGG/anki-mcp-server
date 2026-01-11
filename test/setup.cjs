// Avoid hitting real Anki/yanki-connect during tests
jest.mock("yanki-connect");

// Allow extending default timeout for slower startup tests if needed
jest.setTimeout(10000);
