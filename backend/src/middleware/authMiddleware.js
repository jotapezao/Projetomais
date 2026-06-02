import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_gestao_2026';

export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'Token não fornecido.' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Acesso não autorizado.' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Permissão negada para esta ação.' });
    }

    // Mapeamento e compatibilidade de papéis corporativos
    const mappedRoles = [...roles];
    if (roles.includes('super_admin') || roles.includes('admin')) {
      mappedRoles.push('system_admin', 'team_admin');
    }
    if (roles.includes('gestor')) {
      mappedRoles.push('team_admin');
    }
    if (roles.includes('coordenador') || roles.includes('operador')) {
      mappedRoles.push('channel_admin');
    }
    if (roles.includes('cliente')) {
      mappedRoles.push('member');
    }

    if (!mappedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permissão negada para esta ação.' });
    }
    next();
  };
};
