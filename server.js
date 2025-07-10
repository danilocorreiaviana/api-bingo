require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const Room = require('./models/Room');
const Participant = require('./models/Participant');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

// Conecta ao MongoDB usando variável de ambiente
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB conectado'))
.catch((err) => console.error('❌ Erro MongoDB:', err));

// WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Usuário conectado:', socket.id);

  socket.on('join-room', (roomCode) => {
    socket.join(roomCode);
    console.log(`➡️ Socket ${socket.id} entrou na sala ${roomCode}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Usuário desconectado:', socket.id);
  });
});

// Rotas

// Criar sala
app.post('/create-room', async (req, res) => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
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

// Sortear número
app.post('/draw-number', async (req, res) => {
  const { roomCode } = req.body;
  const room = await Room.findOne({ code: roomCode });
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });

  const number = Math.floor(Math.random() * 100) + 1;
  room.drawnNumber = number;
  await room.save();

  io.to(roomCode).emit('new-number', number);
  res.json({ drawnNumber: number });
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

// Iniciar servidor
server.listen(3000, () => {
  console.log('🚀 Servidor rodando na porta 3000');
});
