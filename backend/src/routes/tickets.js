import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const tickets = dbService.getCollection('tickets');
  const user = dbService.getById('users', req.user.id);
  
  if (user.role === 'super_admin') {
    return res.json(tickets);
  }
  
  const myTickets = tickets.filter(t => t.companyId === user.companyId);
  res.json(myTickets);
});

router.post('/', (req, res) => {
  const newTicket = dbService.create('tickets', {
    ...req.body,
    status: 'novo',
    history: [{ status: 'novo', updatedAt: new Date().toISOString(), userId: req.user.id, comment: 'Chamado aberto' }],
    comments: []
  }, req.user.id, req.user.name);
  res.status(201).json(newTicket);
});

router.put('/:id', requireRole(['super_admin', 'admin', 'gestor', 'coordenador', 'operador']), (req, res) => {
  const updated = dbService.update('tickets', req.params.id, req.body, req.user.id, req.user.name);
  if (!updated) return res.status(404).json({ message: 'Chamado não encontrado' });
  res.json(updated);
});

router.post('/:id/comments', (req, res) => {
  const ticket = dbService.getById('tickets', req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado' });

  const newComment = {
    id: `c-${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    content: req.body.content,
    createdAt: new Date().toISOString()
  };

  ticket.comments.push(newComment);
  const updated = dbService.update('tickets', req.params.id, ticket, req.user.id, req.user.name);
  res.json(updated);
});

export default router;
