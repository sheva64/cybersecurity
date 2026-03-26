document.getElementById("login-btn").addEventListener("click", async () => {
    const user = document.getElementById("login-username").value;
    const pass = document.getElementById("login-password").value;
    
    try {
        const res = await fetch(`/login?username=${user}&password=${pass}`);
        if (res.ok) {
            const data = await res.json();
            window.csrfToken = data.csrfToken; // Зберігаємо отриманий токен в пам'яті клієнта
        
            document.getElementById("username").textContent = `Logged in as ${user}`;
            document.getElementById("login-section").style.display = "none";
            document.getElementById("email-container").style.display = "flex";
            document.getElementById("logout-btn").style.display = "inline-block";
            loadEmails();
        } else {
            alert("Invalid login or password!");
        }
    } catch (err) {
        console.error("Login error:", err);
    }
});

// Клієнтська частина виходу
document.getElementById("logout-btn").addEventListener("click", async () => {
    // Надсилаємо запит на сервер для видалення сесії
    try {
        await fetch("/logout");
    } catch (err) {
        console.error("Logout error:", err);
    }
    
    // Очищаємо локальні кукі браузера
    document.cookie = "SessionID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Оновлюємо сторінку для повернення до екрану логіну
    location.reload();
});

async function loadEmails() {
    const res = await fetch("/emails");
    
    // Обробка помилки 401 Unauthorized (сесія недійсна або прострочена)
    if (!res.ok) {
        if (res.status === 401) {
            alert("Session expired or unauthorized. Please log in again.");
            document.cookie = "SessionID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            location.reload();
        }
        return;
    }

    const emailList = await res.json();
    const mainArea = document.querySelector("#email-content");
    const listArea = document.querySelector("#email-list");
    
    listArea.innerHTML = ""; 

    emailList.forEach(email => {
        const emailEl = document.createElement("li");
        emailEl.textContent = "From: " + email.sender;
    
        // Створюємо та додаємо кнопку видалення
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.marginLeft = "15px";
        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await fetch(`/api/emails/delete/${email.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ _csrf_token: window.csrfToken })
            });
            loadEmails();
        });
        emailEl.append(deleteBtn);
    
        emailEl.addEventListener("click", () => {
            mainArea.innerHTML = `<p>Subject: <b>${email.subject}</b></p> <p>${email.body}</p>`;
        });
        listArea.append(emailEl);
    });
}