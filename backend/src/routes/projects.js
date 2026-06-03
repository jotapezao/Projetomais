import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const projects = await dbService.getCollection('projects');
    const user = await dbService.getById('users', req.user.id);
    
    if (user.role === 'super_admin') {
      res.json(projects);
    } else {
      const myProjects = projects.filter(p => p.companyId === user.companyId);
      res.json(myProjects);
    }
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await dbService.getCollection('users');
    const currentUser = await dbService.getById('users', req.user.id);
    
    if (currentUser.role === 'super_admin') {
      res.json(users);
    } else {
      const companyUsers = users.filter(u => u.companyId === currentUser.companyId);
      res.json(companyUsers);
    }
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.post('/', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const payload = {
      ...req.body,
      companyId: req.user.companyId
    };
    const newProject = await dbService.create('projects', payload, req.user.id, req.user.name);
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.put('/:id', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const existing = await dbService.getById('projects', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Projeto não encontrado' });
    if (req.user.role !== 'super_admin' && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este projeto.' });
    }
    const updated = await dbService.update('projects', req.params.id, req.body, req.user.id, req.user.name);
    if (!updated) return res.status(404).json({ message: 'Projeto não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.delete('/:id', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const existing = await dbService.getById('projects', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Projeto não encontrado' });
    if (req.user.role !== 'super_admin' && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir este projeto.' });
    }
    const success = await dbService.delete('projects', req.params.id, req.user.id, req.user.name);
    if (!success) return res.status(404).json({ message: 'Projeto não encontrado' });
    res.json({ message: 'Projeto excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

export default router;
