import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const tickets = await dbService.getCollection('tickets');
    const user = await dbService.getById('users', req.user.id);
    
    if (user.role === 'super_admin') {
      return res.json(tickets);
    }
    
    const myTickets = tickets.filter(t => t.companyId === user.companyId);
    res.json(myTickets);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.post('/', async (req, res) => {
  try {
    const newTicket = await dbService.create('tickets', {
      ...req.body,
      status: 'novo',
      history: [{ status: 'novo', updatedAt: new Date().toISOString(), userId: req.user.id, comment: 'Chamado aberto' }],
      comments: []
    }, req.user.id, req.user.name);
    res.status(201).json(newTicket);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.put('/:id', requireRole(['super_admin', 'admin', 'gestor', 'coordenador', 'operador']), async (req, res) => {
  try {
    const updated = await dbService.update('tickets', req.params.id, req.body, req.user.id, req.user.name);
    if (!updated) return res.status(404).json({ message: 'Chamado não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const ticket = await dbService.getById('tickets', req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado' });

    const newComment = {
      id: `c-${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name,
      content: req.body.content,
      createdAt: new Date().toISOString()
    };

    ticket.comments = ticket.comments || [];
    ticket.comments.push(newComment);
    const updated = await dbService.update('tickets', req.params.id, ticket, req.user.id, req.user.name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

export default router;
