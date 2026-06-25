const WebSocket = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const initWebSocketServer = (db) => {
    const wss = new WebSocket.Server({ port: 3001 });
    console.log('server WS ready di port 3001');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    wss.on('connection', (ws) => {
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                let sessionId = data.sessionId;
                const username = data.username;

                if (!sessionId) {
                    sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 900) + 100}`;
                    const judul = data.text.split(' ').slice(0, 5).join(' ');
                    db.run("INSERT INTO chat_sessions (id_session, judul, username) VALUES (?, ?, ?)", [sessionId, judul, username]);
                    ws.send(JSON.stringify({ type: 'session_created', sessionId: sessionId, judul: judul }));
                }

                db.run("INSERT INTO chat_messages (id_session, peran, konten) VALUES (?, ?, ?)", [sessionId, "user", data.text]);

                ws.send(JSON.stringify({ type: 'start' }));

                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                
                const historyRows = await new Promise((resolve, reject) => {
                    db.all("SELECT peran, konten FROM chat_messages WHERE id_session = ? ORDER BY id_chat ASC", [sessionId], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                const formattedHistory = historyRows.slice(0, -1).map(row => ({
                    role: row.peran === 'user' ? 'user' : 'model',
                    parts: [{ text: row.konten }]
                }));

                const chat = model.startChat({ history: formattedHistory });
                const result = await chat.sendMessageStream(data.text);

                let fullAiResponse = "";

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        fullAiResponse += chunkText;
                        ws.send(JSON.stringify({ type: 'stream', text: chunkText }));
                    }
                }

                db.run("INSERT INTO chat_messages (id_session, peran, konten) VALUES (?, ?, ?)", [sessionId, "assistant", fullAiResponse]);

                ws.send(JSON.stringify({ type: 'end' }));
            } catch (error) {
                console.error(error);
                ws.send(JSON.stringify({ type: 'error', text: 'Maaf, AI lagi Erorr' }));
            }
        });
    });
};

module.exports = initWebSocketServer;
