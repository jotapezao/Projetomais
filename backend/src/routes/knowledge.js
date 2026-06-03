import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

// Buscar todos os artigos
router.get('/', async (req, res) => {
  try {
    const articles = await dbService.getCollection('knowledge');
    const user = await dbService.getById('users', req.user.id);
    if (req.user.role === 'super_admin') {
      return res.json(articles);
    }

    const companyArticles = articles.filter(article => article.companyId === user.companyId || !article.companyId);
    res.json(companyArticles);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar artigos' });
  }
});

// Buscar um artigo específico
router.get('/:id', async (req, res) => {
  try {
    const article = await dbService.getById('knowledge', req.params.id);
    if (!article) return res.status(404).json({ message: 'Artigo não encontrado' });
    if (req.user.role !== 'super_admin' && article.companyId && article.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para visualizar este artigo.' });
    }
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar artigo' });
  }
});

// Criar artigo
router.post('/', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const newArticle = await dbService.create('knowledge', {
      ...req.body,
      createdBy: req.user.id,
      createdByName: req.user.name,
      companyId: req.user.companyId
    }, req.user.id, req.user.name);
    res.status(201).json(newArticle);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar artigo' });
  }
});

// Atualizar artigo
router.put('/:id', requireRole(['super_admin', 'admin', 'gestor']), async (req, res) => {
  try {
    const existing = await dbService.getById('knowledge', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Artigo não encontrado' });
    if (req.user.role !== 'super_admin' && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este artigo.' });
    }
    const updated = await dbService.update('knowledge', req.params.id, req.body, req.user.id, req.user.name);
    if (!updated) return res.status(404).json({ message: 'Artigo não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar artigo' });
  }
});

// Deletar artigo
router.delete('/:id', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const existing = await dbService.getById('knowledge', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Artigo não encontrado' });
    if (req.user.role !== 'super_admin' && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir este artigo.' });
    }
    const success = await dbService.delete('knowledge', req.params.id, req.user.id, req.user.name);
    if (!success) return res.status(404).json({ message: 'Artigo não encontrado' });
    res.json({ message: 'Artigo excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir artigo' });
  }
});

export default router;
