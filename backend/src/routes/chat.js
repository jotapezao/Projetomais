import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

// Buscar salas e canais
router.get('/rooms', async (req, res) => {
  try {
    const user = await dbService.getById('users', req.user.id);
    const projects = await dbService.getCollection('projects');
    const allUsers = await dbService.getCollection('users');

    const rooms = [];

    // 1. Canal Geral da Empresa do usuário
    const company = await dbService.getById('companies', user.companyId);
    rooms.push({
      id: `company-${user.companyId}`,
      name: `Geral ${company ? company.tradingName : 'Empresa'}`,
      type: 'company'
    });

    // 2. Canais de Projetos daquela empresa
    const companyProjects = projects.filter(p => p.companyId === user.companyId);
    companyProjects.forEach(p => {
      rooms.push({
        id: `project-${p.id}`,
        name: `Projeto: ${p.name}`,
        type: 'project'
      });
    });

    // 3. Conversas privadas com outros usuários
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
