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

// Registrar Usuário Corporativo
router.post('/register', async (req, res) => {
  try {
    const { name, lastName, email, password } = req.body;
    if (!name || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    // Validação estrita do domínio corporativo @modaverao.com.br
    const corporateRegex = /^[a-zA-Z0-9._%+-]+@modaverao\.com\.br$/;
    if (!corporateRegex.test(email.toLowerCase())) {
      return res.status(400).json({ message: 'Cadastro permitido apenas para e-mails institucionais @modaverao.com.br.' });
    }

    // Verificar se o usuário já existe
    const users = await dbService.getCollection('users');
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
    }

    // Hash da senha
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = await dbService.create('users', {
      name,
      lastName,
      email: email.toLowerCase(),
      password: passwordHash,
      role: 'member', // Default role is member
      companyId: 'comp-1', // Default company is Lojas Moda Verão
      status: 'active'
    });

    await logAudit(newUser.id, `${newUser.name} ${newUser.lastName}`, 'register', 'users', newUser.id, 'Novo cadastro de usuário corporativo');

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao cadastrar usuário' });
  }
});

export default router;
