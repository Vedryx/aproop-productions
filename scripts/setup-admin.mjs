import { randomBytes } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
const path = new URL("../.env.local", import.meta.url);
let text = await readFile(path, "utf8").catch((error) => {
  if (error.code === "ENOENT") return "";
  throw error;
});
const defaults = {
  MONGODB_URI: "mongodb://127.0.0.1:27019/?directConnection=true",
  MONGODB_DB: "aproop",
  APP_ORIGIN: "http://localhost:3000",
  ADMIN_EMAIL: "admin@aproop.local",
  ADMIN_PASSWORD: randomBytes(18).toString("base64url"),
  ADMIN_JWT_SECRET: randomBytes(48).toString("base64url"),
};
for (const [key, value] of Object.entries(defaults)) {
  const entry = new RegExp(`^${key}=([^\\r\\n]*)$`, "m");
  const existing = text.match(entry);
  if (!existing) text += `\n${key}=${JSON.stringify(value)}\n`;
  else if (["", '""', "''"].includes(existing[1].trim())) {
    text = text.replace(entry, `${key}=${JSON.stringify(value)}`);
  }
}
await writeFile(path, text, { mode: 0o600 });
await chmod(path, 0o600);
console.log(
  "Local admin settings are ready in .env.local. Existing settings were preserved.",
);
