/**
 * ==========================================
 * PONTO DE ENTRADA DO BACKEND (ENTRY POINT)
 * ==========================================
 * Arquivo principal do servidor Node.js/Express.
 * 
 * RESPONSABILIDADES:
 * 1. Inicializar as variáveis de ambiente (.env).
 * 2. Configurar os middlewares globais (CORS, JSON parser).
 * 3. Montar todas as rotas da API REST (Auth, Projetos, Tarefas, Chamados, Admin).
 * 4. Servir os arquivos estáticos do Frontend (React/Vite) em ambiente de Produção (ex: Railway).
 * 5. Inicializar o Banco de Dados (PostgreSQL) antes de abrir a porta do servidor.
 * 
 * GUIA PARA A IA E DESENVOLVEDORES:
 * - Se precisar adicionar um novo módulo (ex: Faturamento), crie a rota em `src/routes/faturamento.js` e monte-a aqui usando `app.use('/api/faturamento', faturamentoRoutes)`.
 * - Este arquivo usa ES Modules (`import/export`).
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import projectRoutes from './src/routes/projects.js';
import taskRoutes from './src/routes/tasks.js';
import ticketRoutes from './src/routes/tickets.js';
import adminRoutes from './src/routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// ... (existing mock routes)
app.get('/api/chat/messages', (req, res) => res.json([]));
app.get('/api/emails/simulated', (req, res) => res.json([]));

// Serve a basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

import { initializeDB } from './src/database/db.js';

initializeDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
  });
}).catch(err => {
  console.error("Falha ao iniciar o banco de dados:", err);
});
