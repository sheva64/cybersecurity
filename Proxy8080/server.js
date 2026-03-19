import express from "express";
import http from "http";

const app = express();
const PORT = 8080;
const TARGET_PORT = 3000;

const args = process.argv;
const modeIndex = args.indexOf("--mode");
const mode = (modeIndex !== -1 && args[modeIndex + 1]) ? args[modeIndex + 1] : "normal";

console.log(`[Proxy] Starting Proxy Server on port ${PORT} in '${mode}' mode...`);

app.use((req, res) => {
    // Якщо увімкнено Breach Mode, перехоплюємо та логуємо кукі
    if (mode === "breach") {
        console.log(`[Breach Mode] Перехоплено запит до: ${req.url}`);
        if (req.headers.cookie) {
            console.log(`[СТАЛО ВІДОМО КУКІ]: ${req.headers.cookie}`);
        } else {
            console.log(`[Breach Mode] Кукі відсутні у запиті.`);
        }
    }

    // Перенаправляємо весь трафік на Port 3000
    const options = {
        hostname: 'localhost',
        port: TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (e) => {
        console.error(`[Proxy Error] ${e.message}`);
        res.status(500).send("Proxy Error");
    });
});

app.listen(PORT, () => {
    console.log(`[Proxy] Слухаю трафік на http://localhost:${PORT}`);
});