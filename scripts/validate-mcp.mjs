import { readFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const schemaPath = fileURLToPath(new URL("../server.schema.json", import.meta.url));
const serverPath = fileURLToPath(new URL("../server.json", import.meta.url));

try {
	const ajv = new Ajv({ allErrors: true, strict: false, verbose: true });
	addFormats(ajv);
	const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
	const data = JSON.parse(readFileSync(serverPath, "utf8"));
	const validate = ajv.compile(schema);

	if (!validate(data)) {
		console.log("Validation errors:", validate.errors);
		process.exitCode = 1;
	} else {
		console.log("server.json is valid!");
	}
} finally {
	try {
		unlinkSync(schemaPath);
	} catch (error) {
		if (error?.code !== "ENOENT") {
			throw error;
		}
	}
}
