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
    const newTask = await dbService.create('tasks', req.body, req.user.id, req.user.name);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await dbService.update('tasks', req.params.id, req.body, req.user.id, req.user.name);
    if (!updated) return res.status(404).json({ message: 'Tarefa não encontrada' });
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

    task.status = status;
    task.list = list;
    
    const updated = await dbService.update('tasks', req.params.id, task, req.user.id, req.user.name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.delete('/:id', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const success = await dbService.delete('tasks', req.params.id, req.user.id, req.user.name);
    if (!success) return res.status(404).json({ message: 'Tarefa não encontrada' });
    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

export default router;
