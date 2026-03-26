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

// Допоміжна функція для розбору кукі
function getSessionIdFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/SessionID=([^;]+)/);
    return match ? match[1] : null;
}

// Ендпоінт для отримання листів (з валідацією сесії)
app.get("/emails", (req, res) => {
    const sessionId = getSessionIdFromCookie(req.headers.cookie);

    // Перевірка чи існує сесія в списку активних
    if (!sessionId || !sessions[sessionId]) {
        return res.status(401).send("Unauthorized: Invalid or missing session.");
    }

    const session = sessions[sessionId];
    const now = Date.now();

    // Перевірка чи не старіша сесія за 2 хвилини
    if (now - session.createdAt > 2 * 60 * 1000) { // 2 хвилини в мілісекундах
        delete sessions[sessionId];
        return res.status(401).send("Unauthorized: Session expired.");
    }

    // Якщо все добре, віддаємо листи
    const emails = JSON.parse(fs.readFileSync(new URL("data.json", import.meta.url), "utf8"));
    res.json(emails);
});

// Ендпоінт для логіну
app.get('/login', (req, res) => {
    const { username, password } = req.query;

    if (users[username] && users[username] === password) {
        const sessionId = `abc-123-xyz-${username}`;
        
        // Зберігаємо не тільки ім'я, але й час створення (Timestamp)
        sessions[sessionId] = {
            username: username,
            createdAt: Date.now() 
        };

        res.setHeader('Set-Cookie', `SessionID=${sessionId}; HttpOnly; Secure; Path=/`);
        res.send("Login Successful!");
    } else {
        res.status(401).send("Invalid credentials");
    }
});

// Ендпоінт для виходу
app.get('/logout', (req, res) => {
    const sessionId = getSessionIdFromCookie(req.headers.cookie);
    
    // Видаляємо SessionID зі списку активних сесій на сервері
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }
    
    res.send("Logged out successfully");
});

app.listen(PORT, () => {
    console.log(`[System] Server started in mode "${mode}" on port ${PORT}.`);
});