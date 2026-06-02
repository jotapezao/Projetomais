import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

// Buscar salas e canais corporativos padronizados das Lojas Moda Verão
router.get('/rooms', async (req, res) => {
  try {
    const user = await dbService.getById('users', req.user.id);
    const allUsers = await dbService.getCollection('users');

    const rooms = [];

    // 1. Canais Gerais (Gerais e Avisos)
    rooms.push({ id: 'channel-geral', name: 'geral', type: 'general' });
    rooms.push({ id: 'channel-avisos', name: 'avisos', type: 'general' });

    // 2. Canais de Processos (proc-*)
    rooms.push({ id: 'channel-proc-defeitos', name: 'proc-defeitos', type: 'process' });
    rooms.push({ id: 'channel-proc-divergencias', name: 'proc-divergencias', type: 'process' });
    rooms.push({ id: 'channel-proc-verbas', name: 'proc-verbas', type: 'process' });

    // 3. Canais de Departamentos (dep-*)
    rooms.push({ id: 'channel-dep-ti', name: 'dep-ti', type: 'department' });
    rooms.push({ id: 'channel-dep-rh', name: 'dep-rh', type: 'department' });
    rooms.push({ id: 'channel-dep-compras', name: 'dep-compras', type: 'department' });

    // 4. Canais de Lojas / Unidades (loja-*)
    rooms.push({ id: 'channel-loja-01', name: 'loja-01', type: 'store' });
    rooms.push({ id: 'channel-loja-02', name: 'loja-02', type: 'store' });

    // 5. Conversas privadas (DM) com outros membros da equipe
    const otherUsers = allUsers.filter(u => u.id !== user.id && u.status === 'active');
    otherUsers.forEach(u => {
      rooms.push({
        id: `private-${[user.id, u.id].sort().join('-')}`, // Unique ID for direct message between two users
        name: `${u.name} ${u.lastName}`,
        type: 'private'
      });
    });

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar salas de chat' });
  }
});

// Buscar mensagens de uma sala
router.get('/messages/:roomId', async (req, res) => {
  try {
    const allMessages = await dbService.getCollection('chat_messages');
    const roomMessages = allMessages
      .filter(m => m.roomId === req.params.roomId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first
    res.json(roomMessages);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar mensagens' });
  }
});

// Enviar mensagem
router.post('/messages', async (req, res) => {
  try {
    const { roomId, text } = req.body;
    if (!roomId || !text) return res.status(400).json({ message: 'Faltando campos obrigatórios' });

    const messageData = {
      roomId,
      senderId: req.user.id,
      senderName: req.user.name,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMsg = await dbService.create('chat_messages', messageData, req.user.id, req.user.name);
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
});

export default router;
