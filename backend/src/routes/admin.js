import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);
router.use(requireRole(['super_admin', 'admin']));

router.get('/audit-logs', (req, res) => {
  const logs = dbService.getCollection('auditLogs');
  res.json(logs);
});

router.get('/email-settings', (req, res) => {
  const settings = dbService.getCollection('emailSettings');
  res.json(settings);
});

router.post('/email-settings', (req, res) => {
  const newSetting = dbService.create('emailSettings', req.body, req.user.id, req.user.name);
  res.status(201).json(newSetting);
});

router.get('/automations', (req, res) => {
  const automations = dbService.getCollection('automations');
  res.json(automations);
});

export default router;
