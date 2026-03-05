import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 6001; // використовуємо 6001 замість 6000 щоб уникнути помилки ERR_UNSAFE_PORT у браузері

const versionPath = new URL("version.txt", import.meta.url);
const version = fs.readFileSync(versionPath, "utf-8").trim();

const configPath = new URL("config.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

console.log(`[System] Starting ${config.appName} v${version}...`);

let mode = config.mode;
const args = process.argv;
const modeIndex = args.indexOf("--mode");
if (modeIndex !== -1 && args[modeIndex + 1]) {
    mode = args[modeIndex + 1];
}

if (mode === "mode1") {
    app.use(cors());
}

app.use("/", express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
    console.log(
        `Server started on port ${PORT} in mode "${mode}" on port ${PORT}.`
    );
});