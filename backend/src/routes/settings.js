import { Router } from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

const DEFAULT_SETTINGS = {
  systemName: "Mais Tecnologia",
  accentColor: "indigo",
  passwordMinLength: 6,
  sessionTimeout: 60,
  allowRegister: true,
  dashboardRefreshRate: 30,
  enableSparklines: true,
  defaultProjectLists: ["Backlog", "Planejada", "Em andamento", "Concluída"],
  allowTaskSelfAssign: true,
  chatFileSharing: true,
  chatEmojis: ["👍", "❤️", "😂", "😮", "😢", "🎉"],
  kbRequireApproval: false,
  kbCategories: ["TI", "Recursos Humanos", "Financeiro", "Dúvidas Frequentes", "Processos Internos"],
  slaLowHours: 48,
  slaMediumHours: 24,
  slaHighHours: 12,
  slaCriticalHours: 4
};

// GET /api/settings - Obter configurações globais
router.get('/', verifyToken, async (req, res) => {
  try {
    let config = await dbService.getById('settings', 'global-config');
    if (!config) {
      config = { id: 'global-config', ...DEFAULT_SETTINGS };
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Erro ao recuperar configurações globais.", error: error.message });
  }
});

// PUT /api/settings - Atualizar configurações globais (Apenas Administradores)
router.put('/', verifyToken, async (req, res) => {
  const isAdmin = ['system_admin', 'team_admin', 'super_admin', 'admin', 'gestor'].includes(req.user.role);
  if (!isAdmin) {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores e gestores podem alterar as configurações globais." });
  }

  try {
    const dataToSave = { ...req.body, id: 'global-config' };
    let updated = await dbService.update('settings', 'global-config', dataToSave, req.user.id, req.user.name);
    
    if (!updated) {
      // Cria o registro caso não exista
      updated = await dbService.create('settings', dataToSave, req.user.id, req.user.name);
    }
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar as configurações globais.", error: error.message });
  }
});

export default router;
