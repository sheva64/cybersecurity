import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const versionPath = new URL("version.txt", import.meta.url);
const version = fs.readFileSync(versionPath, "utf-8").trim();

const configPath = new URL("config.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

let mode = config.mode;
const args = process.argv;
const modeIndex = args.indexOf("--mode");
if (modeIndex !== -1 && args[modeIndex + 1]) mode = args[modeIndex + 1];
console.log(`[System] Starting ${config.appName} v.${version}...`);


if (mode === "mode1") {
    app.use(cors());
}

app.use((req, res, next) => {
    if (mode === "csp-strict") {
        res.setHeader("Content-Security-Policy", "default-src 'self';");
        // Браузер дозволить завантажувати ресурси тільки з порту 3000.
        // Логотип, стилі (з порту 6001), скрипти підтримки та погоди (порти 4000 і 5000) завантажуватися не будуть.
    } else if (mode === "csp-balanced") {
        res.setHeader(  
            "Content-Security-Policy", 
            "default-src 'self'; img-src *; style-src *; script-src 'self' http://localhost:4000 http://localhost:6001;"
        );
        // Логотип та CSS з порту 6001, чат підтримки з порту 4000 працюватимуть. 
        // Щоб чат працював повноцінно, заголовок потрібно було б доповнити, дозволивши з'єднання з портом 4000:
        // (script-src 'self' http://localhost:4000 http://localhost:6001; connect-src 'self' http://localhost:4000;)
        // Скрипт погоди з порту 5000 буде заблокований, оскільки його немає у списку дозволених джерел script-src.
    }
    next();
});

// Можна замінити на "/api/emails" для 4 завдання Lab 4
app.get("/emails", (req, res) => {
    const emails = JSON.parse(fs.readFileSync(new URL("data.json", import.meta.url), "utf8"));
    res.json(emails);
});

let sriIntegrity = "";
if (mode === "mode-sri-active") {
    try {
        const reactMockContent = fs.readFileSync(path.join(__dirname, "../StaticHost6000/public/react-mock.js"));
        const hash = crypto.createHash('sha256').update(reactMockContent).digest('base64');
        sriIntegrity = `sha256-${hash}`;
        console.log(`[SRI] Hash generated: ${sriIntegrity}`);
    } catch (err) {
        console.error("Error generating SRI hash:", err);
    }
}

app.get("/", (req, res) => {
    let html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

    if (mode === "mode-sri-active") {
        html = html.replace(
            '<script src="http://localhost:6001/react-mock.js"></script>',
            `<script src="http://localhost:6001/react-mock.js" integrity="${sriIntegrity}" crossorigin="anonymous"></script>`
        );
    }

    res.send(html);
});

app.get("/main.js", (req, res) => {
    res.sendFile(path.join(__dirname, "main.js"));
});

const users = {
    "bohdan": "123",
    "bob": "000"
};

const sessions = {};

// Ендпоінт для логіну
app.get('/login', (req, res) => {
    const { username, password } = req.query;

    if (users[username] && users[username] === password) {
        const sessionId = `abc-123-xyz-${username}`;
        sessions[sessionId] = username;

        // Завдання 1.1: Наївне налаштування кукі (без безпеки)
        // res.setHeader('Set-Cookie', `SessionID=${sessionId}; Path=/`);

        // Завдання 3: Захист за допомогою HttpOnly
        // Не допомагає при "Man-in-the-Middle" (Lab5)
        // res.setHeader('Set-Cookie', `SessionID=${sessionId}; Path=/; HttpOnly`);

        // Завдання 4: Обмеження шляху
        // res.setHeader('Set-Cookie', `SessionID=${sessionId}; Path=/api; HttpOnly`);

        // Прапорець Secure гарантує, що кукі відправляються лише через HTTPS (Lab5)
        // Для тестування потрібно використовувати http://192.168.1.2:8080/ (localhost ігнорує обмеження Secure)
        res.setHeader('Set-Cookie', `SessionID=${sessionId}; HttpOnly; Secure; Path=/`);

        res.send("Login Successful!");
    } else {
        res.status(401).send("Invalid credentials");
    }
});

app.listen(PORT, () => {
    console.log(`[System] Server started in mode "${mode}" on port ${PORT}.`);
})