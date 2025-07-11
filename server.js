require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const Room = require('./models/Room');
const Participant = require('./models/Participant');

const app = express();
const server = http.createServer(app);

// WebSocket puro
const wss = new WebSocket.Server({ server });

// Mapas de salas e conexões
const rooms = {}; // { SALA_X: [socket1, socket2] }

wss.on('connection', (socket) => {
  console.log('🔌 Cliente conectado');

  let roomJoined = null;

  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.event === 'join-room') {
        roomJoined = msg.data;
        if (!rooms[roomJoined]) {
          rooms[roomJoined] = [];
        }
        rooms[roomJoined].push(socket);
        console.log(`➡️ Cliente entrou na sala ${roomJoined}`);
      }

      if (msg.event === 'draw-number') {
        const number = Math.floor(Math.random() * 100) + 1;

        // Atualiza no banco
        Room.findOneAndUpdate({ code: roomJoined }, { drawnNumber: number }).exec();

        const payload = JSON.stringify({
          event: 'new-number',
          data: number,
        });

        rooms[roomJoined]?.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });

        console.log(`🎯 Número ${number} enviado para sala ${roomJoined}`);
      }
    } catch (err) {
      console.error('❌ Erro ao processar mensagem:', err);
    }
  });

  socket.on('close', () => {
    if (roomJoined && rooms[roomJoined]) {
      rooms[roomJoined] = rooms[roomJoined].filter((s) => s !== socket);
    }
    console.log('❌ Cliente desconectado');
  });
});

app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB conectado'))
.catch((err) => console.error('❌ Erro MongoDB:', err));

// Rotas HTTP

// Criar sala
app.post('/create-room', async (req, res) => {
  const { code } = req.body;

  const existingRoom = await Room.findOne({ code });
  if (existingRoom) {
    return res.status(400).json({ error: 'Código de sala já existe' });
  }

  const room = new Room({ code });
  await room.save();

  res.json({ code });
});

// Entrar na sala
app.post('/join-room', async (req, res) => {
  const { roomCode, username } = req.body;
  const room = await Room.findOne({ code: roomCode });
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });

  const participant = new Participant({ roomCode, username });
  await participant.save();

  res.json({ success: true, message: 'Usuário entrou na sala com sucesso' });
});

// Consultar sala
app.get('/room/:code', async (req, res) => {
  const room = await Room.findOne({ code: req.params.code });
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });

  res.json({
    code: room.code,
    drawnNumber: room.drawnNumber || null,
  });
});

// Inicializa servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
