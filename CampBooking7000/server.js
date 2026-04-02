import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3"; // Додано імпорт SQLite

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 7000;

// Middleware для парсингу даних з HTML-форми
app.use(express.urlencoded({ extended: true }));

// Підключення до локального файлу SQLite
const db = new sqlite3.Database(path.join(__dirname, 'camp.db'), (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to SQLite database.");
});

// GET маршрут для віддачі HTML-форми
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Функція для екранування виводу для захисту від XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// POST маршрут для обробки форми
app.post("/book", (req, res) => {
    const { name, surname, email, age, date } = req.body;

    // Перевірка присутності всіх необхідних полів
    if (!name || !surname || !email || !age || !date) {
        return res.status(400).send("Bad Request: All fields are required.");
    }

    // Валідація email за допомогою Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send("Bad Request: Invalid email format.");
    }

    // Перевірка віку (має бути числом у дозволеному діапазоні)
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 100) {
        return res.status(400).send("Bad Request: Age must be a number between 5 and 100.");
    }

    // Валідація дати
    const parsedDate = Date.parse(date);
    if (isNaN(parsedDate)) {
        return res.status(400).send("Bad Request: Invalid date format.");
    }

    // Екранування виводу для захисту від XSS
    const safeData = {
        name: escapeHtml(name),
        surname: escapeHtml(surname),
        email: escapeHtml(email),
        age: parsedAge,
        date: escapeHtml(date)
    };

    // Запис у базу даних SQLite
    const insertQuery = `INSERT INTO bookings (name, surname, email, age, date) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(insertQuery, [safeData.name, safeData.surname, safeData.email, safeData.age, safeData.date], function(err) {
        if (err) {
            console.error("DB Insert Error:", err.message);
            return res.status(500).send("Internal Server Error while saving to database.");
        }

        // Отримуємо загальну кількість бронювань з БД
        db.get("SELECT COUNT(*) AS count FROM bookings", [], (err, row) => {
            const totalBookings = row ? row.count : "Unknown";

            // Виводимо підтвердження користувачу
            res.send(`
                <html>
                <head><title>Booking Confirmed</title></head>
                <body style="font-family: sans-serif; padding: 20px;">
                    <h1 style="color: green;">Booking Successfully Received and Saved to DB!</h1>
                    <p><strong>Name:</strong> ${safeData.name}</p>
                    <p><strong>Surname:</strong> ${safeData.surname}</p>
                    <p><strong>Email:</strong> ${safeData.email}</p>
                    <p><strong>Age:</strong> ${safeData.age}</p>
                    <p><strong>Date:</strong> ${safeData.date}</p>
                    <br>
                    <a href="/">Go back to form</a>
                    
                    <hr>
                    <h3>Total Bookings on Server: ${totalBookings}</h3>
                </body>
                </html>
            `);
        });
    });
});

// GET маршрут для пошуку
app.get("/search-bookings", (req, res) => {
    const searchName = req.query.name || "";

    // Уразлива логіка (SQL Injection) 
    // const query = "SELECT * FROM bookings WHERE name = '" + searchName + "'";
    // db.all(query, [], (err, rows) => {
    //     if (err) return res.status(500).send(err.message);
    //     renderResults(res, searchName, rows);
    // });

    // Захищена логіка (Parameterized Queries)
    const query = "SELECT * FROM bookings WHERE name = ?";
    db.all(query, [searchName], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        renderResults(res, searchName, rows);
    });
});

// Допоміжна функція для виведення результатів пошуку
function renderResults(res, searchName, rows) {
    let html = `
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>Search Results for: "${escapeHtml(searchName)}"</h2>
            <ul>
    `;
    if (rows && rows.length > 0) {
        rows.forEach(row => {
            html += `<li>ID: ${row.id} | Name: ${escapeHtml(row.name)} ${escapeHtml(row.surname)} | Email: ${escapeHtml(row.email)} | Age: ${row.age} | Date: ${escapeHtml(row.date)}</li>`;
        });
    } else {
        html += `<li>No bookings found.</li>`;
    }
    html += `</ul><br><a href="/">Go back</a></div>`;
    res.send(html);
}

app.listen(PORT, () => {
    console.log(`Camp Booking Server is running on http://localhost:${PORT}`);
});