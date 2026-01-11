import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const readJson = (file) =>
	JSON.parse(readFileSync(path.join(root, file), "utf8"));

const packageJson = readJson("package.json");
const manifestJson = readJson("manifest.json");
const serverJson = readJson("server.json");

const versions = {
	"package.json": packageJson.version,
	"manifest.json": manifestJson.version,
	"server.json": serverJson.version,
	"server.json package entry": serverJson.packages?.[0]?.version,
};

const uniqueVersions = new Set(
	Object.values(versions).filter((version) => Boolean(version))
);

if (uniqueVersions.size !== 1) {
	console.error("❌ Version mismatch detected:");
	for (const [file, version] of Object.entries(versions)) {
		console.error(`- ${file}: ${version || "missing"}`);
	}
	process.exit(1);
}

const refName = process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || "";
const refType = process.env.GITHUB_REF_TYPE || "";
const isTag =
	refType === "tag" || refName.startsWith("refs/tags/") || refName.match(/^v?\d/);
const normalizedTag = refName.replace(/^refs\/tags\//, "").replace(/^v/, "");
const packageVersion = packageJson.version;

if (isTag && normalizedTag && normalizedTag !== packageVersion) {
	console.error(
		`❌ Tag (${normalizedTag}) does not match package version (${packageVersion}).`
	);
	process.exit(1);
}

console.log(
	`✅ Versions are in sync (${packageVersion})` +
		(normalizedTag ? ` and match tag ${normalizedTag}` : "")
);
