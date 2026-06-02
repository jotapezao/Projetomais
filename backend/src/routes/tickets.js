import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

// Buscar todos os chamados
router.get('/', async (req, res) => {
  try {
    const tickets = await dbService.getCollection('tickets');
    const user = await dbService.getById('users', req.user.id);
    
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'gestor' || user.role === 'coordenador' || user.role === 'operador') {
      return res.json(tickets);
    }
    
    const myTickets = tickets.filter(t => t.companyId === user.companyId);
    res.json(myTickets);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Buscar categorias de chamados
router.get('/categories', async (req, res) => {
  try {
    const categories = await dbService.getCollection('ticket_categories');
    if (categories.length === 0) {
      const defaultCategories = [
        { id: 'cat-1', name: 'TI e Infraestrutura' },
        { id: 'cat-2', name: 'Sistemas e Bugs' },
        { id: 'cat-3', name: 'Recursos Humanos' },
        { id: 'cat-4', name: 'Financeiro' }
      ];
      for (const cat of defaultCategories) {
        await dbService.create('ticket_categories', cat);
      }
      return res.json(defaultCategories);
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

// Criar categoria de chamado
router.post('/categories', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const newCategory = await dbService.create('ticket_categories', req.body, req.user.id, req.user.name);
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar categoria' });
  }
});

// Deletar categoria de chamado
router.delete('/categories/:id', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const success = await dbService.delete('ticket_categories', req.params.id, req.user.id, req.user.name);
    if (!success) return res.status(404).json({ message: 'Categoria não encontrada' });
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir categoria' });
  }
});

// Abrir chamado
router.post('/', async (req, res) => {
  try {
    const user = await dbService.getById('users', req.user.id);
    const now = new Date();
    // SLA base: 4h para critica, 24h para alta, 48h para outros
    const hoursToAdd = req.body.priority === 'critica' ? 4 : (req.body.priority === 'alta' ? 24 : 48);
    const slaLimit = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);

    const newTicket = await dbService.create('tickets', {
      ...req.body,
      status: 'novo',
      companyId: user.companyId,
      createdBy: req.user.id,
      createdByName: req.user.name,
      slaEscalationTime: slaLimit.toISOString(),
      history: [{ status: 'novo', updatedAt: now.toISOString(), userId: req.user.id, userName: req.user.name, comment: 'Chamado aberto pelo cliente' }],
      comments: []
    }, req.user.id, req.user.name);

    // Automation Trigger: ticket_created
    try {
      const automations = await dbService.getCollection('automations');
      const createAuto = automations.find(a => a.trigger === 'ticket_created' && a.active);
      if (createAuto) {
        await dbService.create('simulated_emails', {
          to: req.user.email || 'cliente@alphacorp.com',
          subject: `Confirmação de Chamado Aberto: #${newTicket.id}`,
          body: `Olá! Seu chamado "${newTicket.subject}" foi registrado no sistema sob o ID #${newTicket.id} com prioridade ${newTicket.priority}.`,
          sentAt: new Date().toISOString(),
          status: 'sent'
        });
      }
    } catch (autoErr) {
      console.error("Erro ao rodar automação de criação de chamado:", autoErr);
    }

    res.status(201).json(newTicket);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor ao criar chamado' });
  }
});

// Atualizar chamado completo
router.put('/:id', async (req, res) => {
  try {
    const updated = await dbService.update('tickets', req.params.id, req.body, req.user.id, req.user.name);
    if (!updated) return res.status(404).json({ message: 'Chamado não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Alterar Status do chamado com log de histórico automático
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, comment } = req.body;
    const ticket = await dbService.getById('tickets', req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado' });

    ticket.status = status;
    ticket.history = ticket.history || [];
    ticket.history.push({
      status,
      updatedAt: new Date().toISOString(),
      userId: req.user.id,
      userName: req.user.name,
      comment: comment || `Status alterado para ${status}`
    });

    const updated = await dbService.update('tickets', req.params.id, ticket, req.user.id, req.user.name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar status do chamado' });
  }
});

// Enviar comentário
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
    res.status(500).json({ message: 'Erro no servidor ao salvar comentário' });
  }
});

export default router;
