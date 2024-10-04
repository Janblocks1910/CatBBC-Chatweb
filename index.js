const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs'); // Importiere das 'fs' Modul für Dateizugriffe
const moment = require('moment'); // Importiere das 'moment' Modul für Zeitformatierung

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let onlineUsers = new Set(); // Set für die Speicherung der Online-Benutzer
const logFilePath = path.join(__dirname, 'Textverlauf', 'chat_log.txt'); // Pfad zur Logdatei

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Weiterleitung zur Login-Seite bei Zugriff auf die Haupt-URL
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

io.on('connection', (socket) => {
  console.log('Ein Benutzer hat sich verbunden');

  // Zähle, wenn ein Benutzer sich verbindet
  socket.on('user connected', (username) => {
    onlineUsers.add(username);
    io.emit('user count', onlineUsers.size); // Sende die Anzahl der Online-Benutzer an alle Clients
    console.log(`${username} ist online. Online Benutzer: ${onlineUsers.size}`);
  });

  socket.on('chat message', (data) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss'); // Erhalte den Zeitstempel
    const logEntry = `${timestamp} - ${data.username}: ${data.message}\n`; // Erstelle den Logeintrag

    // Schreibe den Logeintrag in die Datei
    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) {
        console.error('Fehler beim Schreiben in die Datei:', err);
      }
    });

    console.log(logEntry.trim());
    io.emit('chat message', data);
  });

  // Zähle, wenn ein Benutzer sich trennt
  socket.on('user disconnected', (username) => {
    onlineUsers.delete(username);
    io.emit('user count', onlineUsers.size); // Aktualisiere die Benutzeranzahl
    console.log(`${username} ist offline. Online Benutzer: ${onlineUsers.size}`);
  });

  socket.on('disconnect', () => {
    console.log('Ein Benutzer hat sich getrennt');
  });
});

// Server starten
server.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});
