const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const passwordFilePath = path.join(__dirname, "data", "passwords.json");

// Stelle sicher, dass die passwords.json existiert
fs.access(passwordFilePath, fs.constants.F_OK, (err) => {
    if (err) {
        fs.writeFileSync(passwordFilePath, JSON.stringify({}));
    }
});

// Erstelle einen neuen Chatverlauf-Textdatei beim Serverstart
const createChatLogFile = () => {
    const date = new Date();
    const formattedDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const formattedTime = date.toTimeString().slice(0, 5).replace(":", "_"); // HH_MM
    const logFileName = `${formattedDate}_${formattedTime}_Textverlauf.txt`;
    return path.join(__dirname, logFileName);
};

const chatLogFilePath = createChatLogFile();

// Bei jeder gesendeten Nachricht den Chatverlauf speichern
io.on("connection", (socket) => {
    socket.on("chat message", (data) => {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp}: ${data.username}: ${data.message}\n`;

        // Speichere die Nachricht in der Chatverlauf-Datei
        fs.appendFile(chatLogFilePath, logEntry, (err) => {
            if (err) console.error("Fehler beim Schreiben in die Chatverlauf-Datei:", err);
        });

        io.emit("chat message", data);
    });

    // Online Nutzer Zähler
    let onlineUsers = 0;
    onlineUsers++;
    io.emit("online-users", onlineUsers);

    socket.on("disconnect", () => {
        onlineUsers--;
        io.emit("online-users", onlineUsers);
    });
});

// Registrierung
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(passwordFilePath));

    if (users[username]) {
        return res.status(400).send("Benutzername bereits vergeben.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = hashedPassword;
    fs.writeFileSync(passwordFilePath, JSON.stringify(users));
    res.status(201).send("Registrierung erfolgreich.");
});

// Anmelden
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(passwordFilePath));

    if (!users[username] || !(await bcrypt.compare(password, users[username]))) {
        return res.status(401).send("Ungültiger Benutzername oder Passwort.");
    }

    res.status(200).send("Erfolgreich angemeldet.");
});

// Server starten
server.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
