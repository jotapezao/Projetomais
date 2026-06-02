import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);
router.use(requireRole(['super_admin', 'admin']));

router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await dbService.getCollection('auditLogs');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.get('/email-settings', async (req, res) => {
  try {
    const settings = await dbService.getCollection('emailSettings');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.post('/email-settings', async (req, res) => {
  try {
    const newSetting = await dbService.create('emailSettings', req.body, req.user.id, req.user.name);
    res.status(201).json(newSetting);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.get('/automations', async (req, res) => {
  try {
    const automations = await dbService.getCollection('automations');
    res.json(automations);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

export default router;
