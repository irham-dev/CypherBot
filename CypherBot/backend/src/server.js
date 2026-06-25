require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const initWebSocketServer = require('./websocketServer');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database_history.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS chat_sessions (id_session TEXT PRIMARY KEY, judul TEXT, username TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS chat_messages (id_chat INTEGER PRIMARY KEY AUTOINCREMENT, id_session TEXT, peran TEXT, konten TEXT)");
});

app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: err.message });
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username udah terpakai' });
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, username: username });
        });
    });
});

app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: 'Username tidak ditemukan' });

        bcrypt.compare(password, row.password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!isMatch) return res.status(400).json({ error: 'Password salah' });
            res.json({ success: true, username: row.username });
        });
    });
});

app.get('/api/sessions', (req, res) => {
    const { username } = req.query;
    db.all("SELECT id_session, judul FROM chat_sessions WHERE username = ? ORDER BY id_session DESC", [username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/messages/:sessionId', (req, res) => {
    db.all("SELECT peran, konten FROM chat_messages WHERE id_session = ? ORDER BY id_chat ASC", [req.params.sessionId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(5000, () => {
    console.log('Server Express berjalan di http://localhost:5000');
});

initWebSocketServer(db);