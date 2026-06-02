import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const projects = dbService.getCollection('projects');
  // In a real app, we'd filter by companyId and user access. For MVP, return all or company specific.
  const user = dbService.getById('users', req.user.id);
  
  if (user.role === 'super_admin') {
    res.json(projects);
  } else {
    // Filter projects for the user's company
    const myProjects = projects.filter(p => p.companyId === user.companyId);
    res.json(myProjects);
  }
});

router.post('/', requireRole(['super_admin', 'admin', 'gestor']), (req, res) => {
  const newProject = dbService.create('projects', req.body, req.user.id, req.user.name);
  res.status(201).json(newProject);
});

router.put('/:id', requireRole(['super_admin', 'admin', 'gestor']), (req, res) => {
  const updated = dbService.update('projects', req.params.id, req.body, req.user.id, req.user.name);
  if (!updated) return res.status(404).json({ message: 'Projeto não encontrado' });
  res.json(updated);
});

router.delete('/:id', requireRole(['super_admin', 'admin']), (req, res) => {
  const success = dbService.delete('projects', req.params.id, req.user.id, req.user.name);
  if (!success) return res.status(404).json({ message: 'Projeto não encontrado' });
  res.json({ message: 'Projeto excluído com sucesso' });
});

export default router;
