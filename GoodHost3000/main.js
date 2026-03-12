document.getElementById("login-btn").addEventListener("click", async () => {
    const user = document.getElementById("login-username").value;
    const pass = document.getElementById("login-password").value;
    
    try {
        const res = await fetch(`/login?username=${user}&password=${pass}`);
        if (res.ok) {
            document.getElementById("username").textContent = `Logged in as ${user}`;
            document.getElementById("login-section").style.display = "none";
            document.getElementById("email-container").style.display = "flex";
            loadEmails();
        } else {
            alert("Invalid login or password!");
        }
    } catch (err) {
        console.error("Login error:", err);
    }
});

async function loadEmails() {
    const emailList = await fetch("/emails").then(res => res.json()); // Можна замінити на "/api/emails" для 4 завдання Lab 4
    const mainArea = document.querySelector("#email-content");
    const listArea = document.querySelector("#email-list");
    
    listArea.innerHTML = ""; // Очищаємо список перед завантаженням

    emailList.forEach(email => {
        const emailEl = document.createElement("li");
        emailEl.textContent = "From: " + email.sender;
        emailEl.addEventListener("click", () => {
            mainArea.innerHTML = `<p>Subject: <b>${email.subject}</b></p> <p>${email.body}</p>`;
        });
        listArea.append(emailEl);
    });
}