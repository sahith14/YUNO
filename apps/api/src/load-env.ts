// Load .env from the workspace root before anything else.
// Must be the first import in any app entrypoint that needs env vars.
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dotenv-cli style: walk up from this file to find the .env at the repo root
// ./apps/<app>/src/load-env.ts -> ../../../.env
const envPath = path.resolve(__dirname, "../../..", ".env");
config({ path: envPath, override: false });
