import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

async function getRoomsForUser(user, allUsers) {
  let dbRooms = [];
  try {
    dbRooms = await dbService.getCollection('chat_rooms');
  } catch (err) {
    console.error("Erro ao buscar salas no banco:", err);
  }

  // If empty, seed default rooms
  if (dbRooms.length === 0) {
    const defaultChannels = [
      { name: 'geral', type: 'general' },
      { name: 'avisos', type: 'general' },
      { name: 'proc-defeitos', type: 'process' },
      { name: 'proc-divergencias', type: 'process' },
      { name: 'proc-verbas', type: 'process' },
      { name: 'dep-ti', type: 'department' },
      { name: 'dep-rh', type: 'department' },
      { name: 'dep-compras', type: 'department' },
      { name: 'loja-01', type: 'store' },
      { name: 'loja-02', type: 'store' }
    ];

    dbRooms = [];
    for (const channel of defaultChannels) {
      try {
        const created = await dbService.create('chat_rooms', {
          name: channel.name,
          type: channel.type,
          companyId: user.companyId || 'comp-1'
        }, 'system', 'System');
        dbRooms.push(created);
      } catch (err) {
        console.error("Erro ao criar canal default:", err);
      }
    }
  }

  // Filter channels by companyId
  const companyRooms = dbRooms.filter(r => r.companyId === user.companyId);

  const rooms = [...companyRooms];

  // Add private DM rooms
  const otherUsers = allUsers.filter(u => u.id !== user.id && u.status === 'active' && u.companyId === user.companyId);
  otherUsers.forEach(u => {
    rooms.push({
      id: `private-${[user.id, u.id].sort().join('-')}`,
      name: `${u.name} ${u.lastName}`,
      type: 'private'
    });
  });

  return rooms;
}

async function canAccessRoom(user, roomId, allUsers) {
  if (roomId.startsWith('private-')) {
    const parts = roomId.replace('private-', '').split('-');
    return parts.includes(user.id);
  }
  try {
    const room = await dbService.getById('chat_rooms', roomId);
    return room && room.companyId === user.companyId;
  } catch (err) {
    return false;
  }
}

// Buscar salas
router.get('/rooms', async (req, res) => {
  try {
    const user = await dbService.getById('users', req.user.id);
    const allUsers = await dbService.getCollection('users');
    const rooms = await getRoomsForUser(user, allUsers);
    res.json(rooms);
  } catch (err) {
    console.error("Erro ao carregar salas:", err);
    res.status(500).json({ message: 'Erro ao carregar salas de chat' });
  }
});

// Criar nova sala
const createRoomHandler = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ message: 'Nome e tipo do canal são obrigatórios.' });
    }

    const user = await dbService.getById('users', req.user.id);
    
    // Check role: allow system_admin, team_admin, channel_admin, super_admin, admin, gestor
    const allowedRoles = ['system_admin', 'team_admin', 'channel_admin', 'super_admin', 'admin', 'gestor'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: 'Apenas administradores e gestores podem criar canais.' });
    }

    const newRoomData = {
      name: name.toLowerCase().trim().replace(/\s+/g, '-'),
      type,
      companyId: user.companyId || 'comp-1'
    };

    const newRoom = await dbService.create('chat_rooms', newRoomData, req.user.id, req.user.name);
    res.status(201).json(newRoom);
  } catch (err) {
    console.error("Erro ao criar canal:", err);
    res.status(500).json({ message: 'Erro ao criar canal de chat' });
  }
};

router.post('/rooms', createRoomHandler);
router.post('/', createRoomHandler);

// Buscar mensagens de uma sala
router.get('/messages/:roomId', async (req, res) => {
  try {
    const user = await dbService.getById('users', req.user.id);
    const allUsers = await dbService.getCollection('users');
    const hasAccess = await canAccessRoom(user, req.params.roomId, allUsers);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Você não tem permissão para acessar esta sala.' });
    }
    const allMessages = await dbService.getCollection('chat_messages');
    const roomMessages = allMessages
      .filter(m => m.roomId === req.params.roomId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first
    res.json(roomMessages);
  } catch (err) {
    console.error("Erro ao buscar mensagens:", err);
    res.status(500).json({ message: 'Erro ao carregar mensagens' });
  }
});

// Enviar mensagem
router.post('/messages', async (req, res) => {
  try {
    const { roomId, text } = req.body;
    if (!roomId || !text) return res.status(400).json({ message: 'Faltando campos obrigatórios' });

    const user = await dbService.getById('users', req.user.id);
    const allUsers = await dbService.getCollection('users');
    const hasAccess = await canAccessRoom(user, roomId, allUsers);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Você não tem permissão para enviar mensagens nesta sala.' });
    }

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
    console.error("Erro ao enviar mensagem:", err);
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
});

export default router;
