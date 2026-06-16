import express from 'express';
import { dbService, logAudit } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const tasks = await dbService.getCollection('tasks');
    const user = await dbService.getById('users', req.user.id);
    
    if (user.role === 'super_admin') {
      return res.json(tasks);
    }
    
    const myTasks = tasks.filter(t => t.companyId === user.companyId);
    res.json(myTasks);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.post('/', requireRole(['super_admin', 'admin', 'gestor', 'coordenador']), async (req, res) => {
  try {
    const newTask = await dbService.create('tasks', {
      ...req.body,
      companyId: req.user.companyId
    }, req.user.id, req.user.name);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

async function triggerTaskStatusAutomations(updated, req) {
  try {
    const automations = await dbService.getCollection('automations');
    const taskAutos = automations.filter(a => a.trigger === 'task_status_changed' && a.active);
    for (const auto of taskAutos) {
      let toEmail = 'gerente@modaverao.com.br';
      if (auto.action === 'send_email_client') {
        if (updated.assigneeId) {
          const assignee = await dbService.getById('users', updated.assigneeId);
          if (assignee) toEmail = assignee.email;
        }
      } else if (auto.action === 'send_email_manager') {
        toEmail = 'gerente@modaverao.com.br';
      }

      if (auto.action === 'create_log') {
        await dbService.create('simulated_emails', {
          to: 'sistema@modaverao.com.br',
          subject: `[LOG AUTOMATIZAÇÃO] Regra "${auto.name}" disparada`,
          body: `Gatilho: task_status_changed. Tarefa #${updated.id} ("${updated.title}") alterada para status "${updated.status}" (lista: "${updated.list}").`,
          sentAt: new Date().toISOString(),
          status: 'success'
        });
      } else {
        await dbService.create('simulated_emails', {
          to: toEmail,
          subject: `Notificação Automática: Tarefa #${updated.id} Alterada`,
          body: `Automação "${auto.name}": A tarefa "${updated.title}" foi movida para a lista "${updated.list}" (status: ${updated.status}).`,
          sentAt: new Date().toISOString(),
          status: 'sent'
        });
      }
    }
  } catch (autoErr) {
    console.error("Erro ao processar automações de tarefa:", autoErr);
  }
}

router.put('/:id', async (req, res) => {
  try {
    const existing = await dbService.getById('tasks', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Tarefa não encontrada' });
    if (req.user.role !== 'super_admin' && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para editar esta tarefa.' });
    }
    const updated = await dbService.update('tasks', req.params.id, req.body, req.user.id, req.user.name);
    if (!updated) return res.status(404).json({ message: 'Tarefa não encontrada' });
    
    // Check if status or list changed to trigger automation
    if (existing.status !== updated.status || existing.list !== updated.list) {
      await triggerTaskStatusAutomations(updated, req);
    }
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, list } = req.body;
    const task = await dbService.getById('tasks', req.params.id);
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });
    if (req.user.role !== 'super_admin' && task.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para mover esta tarefa.' });
    }

    const oldStatus = task.status;
    const oldList = task.list;
    task.status = status;
    task.list = list;
    
    const updated = await dbService.update('tasks', req.params.id, task, req.user.id, req.user.name);
    
    if (oldStatus !== updated.status || oldList !== updated.list) {
      await triggerTaskStatusAutomations(updated, req);
    }
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.delete('/:id', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const existing = await dbService.getById('tasks', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Tarefa não encontrada' });
    if (req.user.role !== 'super_admin' && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir esta tarefa.' });
    }
    const success = await dbService.delete('tasks', req.params.id, req.user.id, req.user.name);
    if (!success) return res.status(404).json({ message: 'Tarefa não encontrada' });
    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

export default router;
