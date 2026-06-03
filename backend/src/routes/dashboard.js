import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/summary', async (req, res) => {
  try {
    const [user, projects, tasks, tickets, logs] = await Promise.all([
      dbService.getById('users', req.user.id),
      dbService.getCollection('projects'),
      dbService.getCollection('tasks'),
      dbService.getCollection('tickets'),
      dbService.getCollection('auditLogs')
    ]);

    const isSuperAdmin = user?.role === 'super_admin';
    const scope = (items) => isSuperAdmin ? items : items.filter(item => item.companyId === user.companyId);

    const scopedProjects = scope(projects);
    const scopedTasks = scope(tasks);
    const scopedTickets = scope(tickets);
    const scopedLogs = isSuperAdmin ? logs : logs.filter(log => !log.companyId || log.companyId === user.companyId);

    const now = new Date();
    const pendingTasks = scopedTasks.filter(task => !['concluida', 'concluído', 'concluida', 'fechada'].includes(String(task.status || '').toLowerCase()));
    const overdueTasks = scopedTasks.filter(task => task.deadline && new Date(task.deadline) < now && !['concluida', 'concluído', 'fechada'].includes(String(task.status || '').toLowerCase()));
    const openTickets = scopedTickets.filter(ticket => !['resolvido', 'fechado', 'encerrado'].includes(String(ticket.status || '').toLowerCase()));
    const resolvedTickets = scopedTickets.filter(ticket => ['resolvido', 'fechado', 'encerrado'].includes(String(ticket.status || '').toLowerCase()));

    const slaOnTime = scopedTickets.filter(ticket => {
      if (!ticket.slaEscalationTime) return false;
      if (['resolvido', 'fechado', 'encerrado'].includes(String(ticket.status || '').toLowerCase())) {
        const resolvedAt = new Date(ticket.updatedAt || ticket.createdAt || ticket.slaEscalationTime);
        return resolvedAt <= new Date(ticket.slaEscalationTime);
      }
      return now <= new Date(ticket.slaEscalationTime);
    });

    const byTaskList = scopedTasks.reduce((acc, task) => {
      const key = task.list || 'Sem lista';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byTicketStatus = scopedTickets.reduce((acc, ticket) => {
      const key = ticket.status || 'novo';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totals: {
        projects: scopedProjects.length,
        tasks: scopedTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        openTickets: openTickets.length,
        resolvedTickets: resolvedTickets.length,
        knowledgeArticles: scope(await dbService.getCollection('knowledge')).length
      },
      slaHitRate: scopedTickets.length > 0 ? Math.round((slaOnTime.length / scopedTickets.length) * 100) : 100,
      charts: {
        tasksByList: Object.entries(byTaskList).map(([label, value]) => ({ label, value })),
        ticketsByStatus: Object.entries(byTicketStatus).map(([label, value]) => ({ label, value }))
      },
      recentActivity: scopedLogs.slice(0, 8)
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao montar resumo executivo' });
  }
});

export default router;
