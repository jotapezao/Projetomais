import express from 'express';
import { dbService, logAudit } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const tasks = dbService.getCollection('tasks');
  const user = dbService.getById('users', req.user.id);
  
  if (user.role === 'super_admin') {
    return res.json(tasks);
  }
  
  const myTasks = tasks.filter(t => t.companyId === user.companyId);
  res.json(myTasks);
});

router.post('/', requireRole(['super_admin', 'admin', 'gestor', 'coordenador']), (req, res) => {
  const newTask = dbService.create('tasks', req.body, req.user.id, req.user.name);
  res.status(201).json(newTask);
});

router.put('/:id', (req, res) => {
  const updated = dbService.update('tasks', req.params.id, req.body, req.user.id, req.user.name);
  if (!updated) return res.status(404).json({ message: 'Tarefa não encontrada' });
  res.json(updated);
});

router.patch('/:id/status', (req, res) => {
  const { status, list } = req.body;
  const task = dbService.getById('tasks', req.params.id);
  if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

  task.status = status;
  task.list = list;
  
  const updated = dbService.update('tasks', req.params.id, task, req.user.id, req.user.name);
  res.json(updated);
});

router.delete('/:id', requireRole(['super_admin', 'admin', 'gestor']), (req, res) => {
  const success = dbService.delete('tasks', req.params.id, req.user.id, req.user.name);
  if (!success) return res.status(404).json({ message: 'Tarefa não encontrada' });
  res.json({ message: 'Tarefa excluída com sucesso' });
});

export default router;
