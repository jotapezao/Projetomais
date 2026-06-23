import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

// ─── STATS (KPIs agregados) ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const tickets = await dbService.getCollection('tickets');
    const user = await dbService.getById('users', req.user.id);

    let scoped = tickets;
    if (!['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'].includes(user.role)) {
      scoped = tickets.filter(t => t.companyId === user.companyId);
    }

    const now = new Date();
    const total = scoped.length;
    const novo = scoped.filter(t => t.status === 'novo').length;
    const em_atendimento = scoped.filter(t => t.status === 'em_atendimento').length;
    const resolvido = scoped.filter(t => t.status === 'resolvido').length;
    const fechado = scoped.filter(t => t.status === 'fechado').length;

    const slaViolated = scoped.filter(t => {
      if (t.status === 'resolvido' || t.status === 'fechado') return false;
      return t.slaEscalationTime && new Date(t.slaEscalationTime) < now;
    }).length;

    // Calcular MTTR (tempo médio de resolução em horas)
    const resolvedTickets = scoped.filter(t => t.status === 'resolvido' || t.status === 'fechado');
    let avgResolutionHours = null;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((acc, t) => {
        const created = new Date(t.createdAt || t.history?.[0]?.updatedAt || t.slaEscalationTime);
        const resEvent = t.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
        const resolved = resEvent ? new Date(resEvent.updatedAt) : now;
        return acc + (resolved - created);
      }, 0);
      avgResolutionHours = parseFloat((totalMs / resolvedTickets.length / 3600000).toFixed(1));
    }

    // Taxa de SLA cumprido
    const slaCheckedTickets = resolvedTickets.filter(t => t.slaEscalationTime);
    let slaComplianceRate = null;
    if (slaCheckedTickets.length > 0) {
      const compliant = slaCheckedTickets.filter(t => {
        const resEvent = t.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
        if (!resEvent) return false;
        return new Date(resEvent.updatedAt) <= new Date(t.slaEscalationTime);
      }).length;
      slaComplianceRate = Math.round((compliant / slaCheckedTickets.length) * 100);
    }

    res.json({
      total,
      novo,
      em_atendimento,
      resolvido,
      fechado,
      slaViolated,
      avgResolutionHours,
      slaComplianceRate
    });
  } catch (err) {
    console.error('Erro ao calcular stats de chamados:', err);
    res.status(500).json({ message: 'Erro ao calcular estatísticas' });
  }
});

// ─── BUSCAR TODOS OS CHAMADOS ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tickets = await dbService.getCollection('tickets');
    const user = await dbService.getById('users', req.user.id);

    if (['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'].includes(user.role)) {
      return res.json(tickets);
    }

    const myTickets = tickets.filter(t => t.companyId === user.companyId);
    res.json(myTickets);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// ─── BUSCAR CATEGORIAS ───────────────────────────────────────────────────────
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

// ─── CRIAR CATEGORIA ─────────────────────────────────────────────────────────
router.post('/categories', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const newCategory = await dbService.create('ticket_categories', req.body, req.user.id, req.user.name);
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar categoria' });
  }
});

// ─── DELETAR CATEGORIA ───────────────────────────────────────────────────────
router.delete('/categories/:id', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const success = await dbService.delete('ticket_categories', req.params.id, req.user.id, req.user.name);
    if (!success) return res.status(404).json({ message: 'Categoria não encontrada' });
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir categoria' });
  }
});

// ─── ABRIR CHAMADO ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const user = await dbService.getById('users', req.user.id);
    const now = new Date();
    const slaHours = { critica: 4, alta: 12, media: 24, baixa: 48 };
    const hoursToAdd = slaHours[req.body.priority] || 48;
    const slaLimit = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);

    const newTicket = await dbService.create('tickets', {
      ...req.body,
      status: 'novo',
      companyId: user.companyId,
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdAt: now.toISOString(),
      slaEscalationTime: slaLimit.toISOString(),
      operatorId: null,
      operatorName: null,
      rating: null,
      ratingFeedback: null,
      history: [{ status: 'novo', updatedAt: now.toISOString(), userId: req.user.id, userName: req.user.name, comment: 'Chamado aberto pelo solicitante', type: 'created' }],
      comments: []
    }, req.user.id, req.user.name);

    // Automation Trigger: ticket_created
    try {
      const automations = await dbService.getCollection('automations');
      const createAutos = automations.filter(a => a.trigger === 'ticket_created' && a.active);
      for (const auto of createAutos) {
        let toEmail = 'gestor@modaverao.com.br';
        if (auto.action === 'send_email_client') toEmail = user.email || 'membro@modaverao.com.br';
        else if (auto.action === 'send_email_manager') toEmail = 'gerente@modaverao.com.br';

        if (auto.action === 'create_log') {
          await dbService.create('simulated_emails', {
            to: 'sistema@modaverao.com.br',
            subject: `[LOG AUTOMATIZAÇÃO] Regra "${auto.name}" disparada`,
            body: `Gatilho: ticket_created. Chamado #${newTicket.id} criado por ${user.name}.`,
            sentAt: new Date().toISOString(), status: 'success'
          });
        } else {
          await dbService.create('simulated_emails', {
            to: toEmail,
            subject: `Notificação Automática: Chamado #${newTicket.id} Aberto`,
            body: `Automação "${auto.name}": O chamado "${newTicket.subject}" foi registrado no sistema sob o ID #${newTicket.id} com prioridade ${newTicket.priority}.`,
            sentAt: new Date().toISOString(), status: 'sent'
          });
        }
      }
    } catch (autoErr) {
      console.error("Erro ao rodar automação de criação de chamado:", autoErr);
    }

    res.status(201).json(newTicket);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor ao criar chamado' });
  }
});

// ─── ATUALIZAR CHAMADO COMPLETO ───────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await dbService.getById('tickets', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Chamado não encontrado' });
    if (req.user.role !== 'super_admin' && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este chamado.' });
    }

    const STAFF_ROLES = ['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'];
    const isStaff = STAFF_ROLES.includes(req.user.role);

    // Validar se a atribuição de operador está sendo alterada
    if (req.body.operatorId !== existing.operatorId) {
      if (!isStaff) {
        return res.status(403).json({ message: 'Apenas técnicos ou administradores podem atribuir chamados.' });
      }

      // Se estiver atribuindo para um operador, validar se este usuário existe e é técnico
      if (req.body.operatorId) {
        const targetUser = await dbService.getById('users', req.body.operatorId);
        if (!targetUser || !STAFF_ROLES.includes(targetUser.role)) {
          return res.status(400).json({ message: 'O usuário atribuído deve ser um técnico ou administrador.' });
        }
      }
    }

    const updated = await dbService.update('tickets', req.params.id, req.body, req.user.id, req.user.name);
    if (!updated) return res.status(404).json({ message: 'Chamado não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// ─── ALTERAR STATUS COM LOG ───────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const STAFF_ROLES = ['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'];
    const isStaff = STAFF_ROLES.includes(req.user.role);
    if (!isStaff) {
      return res.status(403).json({ message: 'Apenas técnicos ou administradores podem alterar o status do chamado.' });
    }

    const { status, comment } = req.body;
    const ticket = await dbService.getById('tickets', req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado' });
    if (req.user.role !== 'super_admin' && ticket.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para alterar este chamado.' });
    }

    const typeMap = {
      novo: 'created', em_atendimento: 'attending', resolvido: 'resolved',
      fechado: 'closed', aguardando: 'waiting'
    };

    ticket.status = status;
    ticket.history = ticket.history || [];
    ticket.history.push({
      status,
      type: typeMap[status] || 'status_change',
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

// ─── AVALIAÇÃO DE SATISFAÇÃO ──────────────────────────────────────────────────
router.patch('/:id/rating', async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Avaliação deve ser entre 1 e 5 estrelas.' });
    }

    const ticket = await dbService.getById('tickets', req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado' });

    if (ticket.status !== 'resolvido' && ticket.status !== 'fechado') {
      return res.status(400).json({ message: 'Apenas chamados resolvidos ou fechados podem ser avaliados.' });
    }

    ticket.rating = rating;
    ticket.ratingFeedback = feedback || null;
    ticket.ratedAt = new Date().toISOString();
    ticket.history = ticket.history || [];
    ticket.history.push({
      status: ticket.status,
      type: 'rated',
      updatedAt: new Date().toISOString(),
      userId: req.user.id,
      userName: req.user.name,
      comment: `Chamado avaliado com ${rating} estrela(s). ${feedback ? `"${feedback}"` : ''}`
    });

    const updated = await dbService.update('tickets', req.params.id, ticket, req.user.id, req.user.name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao registrar avaliação.' });
  }
});

// ─── ENVIAR COMENTÁRIO ────────────────────────────────────────────────────────
router.post('/:id/comments', async (req, res) => {
  try {
    const ticket = await dbService.getById('tickets', req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado' });
    if (req.user.role !== 'super_admin' && ticket.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para comentar neste chamado.' });
    }

    const isStaff = ['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'].includes(req.user.role);
    const newComment = {
      id: `c-${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      isStaff,
      content: req.body.content,
      createdAt: new Date().toISOString()
    };

    ticket.comments = ticket.comments || [];
    ticket.comments.push(newComment);

    // Adicionar evento ao histórico
    ticket.history = ticket.history || [];
    ticket.history.push({
      status: ticket.status,
      type: 'comment',
      updatedAt: new Date().toISOString(),
      userId: req.user.id,
      userName: req.user.name,
      comment: `${req.user.name} adicionou uma resposta`
    });

    const updated = await dbService.update('tickets', req.params.id, ticket, req.user.id, req.user.name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor ao salvar comentário' });
  }
});

export default router;
