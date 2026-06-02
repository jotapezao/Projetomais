import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService, logAudit } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_gestao_2026';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await dbService.getCollection('users');
    const user = users.find(u => u.email === email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Conta inativa ou suspensa.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: `${user.name} ${user.lastName}` },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit(user.id, `${user.name} ${user.lastName}`, 'login', 'auth', user.id, 'Login realizado com sucesso', req.ip);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await dbService.getById('users', req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

export default router;
