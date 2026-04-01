import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 7000;

// Middleware для парсингу даних з HTML-форми
app.use(express.urlencoded({ extended: true }));

// Локальний масив для збереження бронювань
const bookings = [];

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

    // Зберігаємо в локальний масив
    bookings.push(safeData);

    // Виводимо підтвердження користувачу
    res.send(`
        <html>
        <head><title>Booking Confirmed</title></head>
        <body style="font-family: sans-serif; padding: 20px;">
            <h1 style="color: green;">Booking Successfully Received!</h1>
            <p><strong>Name:</strong> ${safeData.name}</p>
            <p><strong>Surname:</strong> ${safeData.surname}</p>
            <p><strong>Email:</strong> ${safeData.email}</p>
            <p><strong>Age:</strong> ${safeData.age}</p>
            <p><strong>Date:</strong> ${safeData.date}</p>
            <br>
            <a href="/">Go back to form</a>
            
            <hr>
            <h3>Total Bookings on Server: ${bookings.length}</h3>
        </body>
        </html>
    `);

    console.log("Bookings:", bookings);
});

app.listen(PORT, () => {
    console.log(`Camp Booking Validator Server is running on http://localhost:${PORT}`);
});