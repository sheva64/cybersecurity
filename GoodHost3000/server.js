import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import crypto from "crypto";
import https from "https";
import http from "http";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HTTPS_PORT = 3443; // Порт для HTTPS згідно з Task 2

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

// Додано для Task 4: HSTS (Strict-Transport-Security)
app.use((req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
});

app.use((req, res, next) => {
    if (mode === "csp-strict") {
        res.setHeader("Content-Security-Policy", "default-src 'self';");
    } else if (mode === "csp-balanced") {
        res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; img-src *; style-src *; script-src 'self' http://localhost:4000 http://localhost:6001;"
        );
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

function getSessionIdFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/SessionID=([^;]+)/);
    return match ? match[1] : null;
}

let emailsDb = JSON.parse(fs.readFileSync(new URL("data.json", import.meta.url), "utf8"));

app.get("/emails", (req, res) => {
    const sessionId = getSessionIdFromCookie(req.headers.cookie);

    if (!sessionId || !sessions[sessionId]) {
        return res.status(401).send("Unauthorized: Invalid or missing session.");
    }

    const session = sessions[sessionId];
    const now = Date.now();

    if (now - session.createdAt > 2 * 60 * 1000) { 
        delete sessions[sessionId];
        return res.status(401).send("Unauthorized: Session expired.");
    }

    res.json(emailsDb);
});

app.use(express.json());

app.get('/login', (req, res) => {
    const { username, password } = req.query;

    if (users[username] && users[username] === password) {
        const sessionId = `abc-123-xyz-${username}`;
        const csrfToken = crypto.randomBytes(16).toString("hex");
        
        sessions[sessionId] = {
            username: username,
            createdAt: Date.now(),
            csrfToken: csrfToken
        };

        // Прапорець Secure тут вже встановлений, що виконує вимогу з Task 4
        res.setHeader('Set-Cookie', `SessionID=${sessionId}; HttpOnly; Secure; Path=/; SameSite=Strict`);
        res.json({ message: "Login Successful!", csrfToken: csrfToken });
    } else {
        res.status(401).send("Invalid credentials");
    }
});

app.post("/api/emails/delete/:id", (req, res) => {
    const sessionId = getSessionIdFromCookie(req.headers.cookie);
    if (!sessionId || !sessions[sessionId]) return res.status(401).send("Unauthorized");

    const clientToken = req.body._csrf_token;
    if (!clientToken || clientToken !== sessions[sessionId].csrfToken) {
        return res.status(403).send("Forbidden: Invalid CSRF Token"); 
    }

    const emailId = parseInt(req.params.id);
    emailsDb = emailsDb.filter(email => email.id !== emailId);
    
    res.send("Email deleted");
});

app.get('/logout', (req, res) => {
    const sessionId = getSessionIdFromCookie(req.headers.cookie);
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }
    res.send("Logged out successfully");
});


// Завантаження ключів (Task 2)
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

// Запуск захищеного HTTPS сервера на порту 3443 (Task 2)
https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`[System] Secure Server started in mode "${mode}" on https://localhost:${HTTPS_PORT}.`);
});

// Запуск HTTP сервера для перенаправлення на порту 3000 (Task 3)
http.createServer((req, res) => {
    // Повертаємо код 301 та новий URL
    res.writeHead(301, { "Location": `https://localhost:${HTTPS_PORT}${req.url}` });
    res.end();
}).listen(PORT, () => {
    console.log(`[System] HTTP Redirect Server listening on http://localhost:${PORT} -> redirecting to HTTPS.`);
});