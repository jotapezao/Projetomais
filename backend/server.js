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
import knowledgeRoutes from './src/routes/knowledge.js';
import chatRoutes from './src/routes/chat.js';
import dashboardRoutes from './src/routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = process.env.CORS_ORIGIN
  ? {
      origin: process.env.CORS_ORIGIN.split(',').map((item) => item.trim()),
      credentials: true
    }
  : {};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ... (existing mock routes)
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

import { initializeDB, dbService } from './src/database/db.js';

// Background Automation and SLA Monitor Service
function startBackgroundWorkers() {
  console.log("Serviço de automações e SLA iniciado.");
  
  setInterval(async () => {
    try {
      const tickets = await dbService.getCollection('tickets');
      const automations = await dbService.getCollection('automations');
      
      const slaAlertAuto = automations.find(a => a.trigger === 'ticket_priority_critical' && a.active);
      if (!slaAlertAuto) return;

      const now = new Date();
      
      for (const ticket of tickets) {
        // If ticket is critical and not closed/resolved
        if (ticket.priority === 'critica' && ticket.status !== 'concluido' && ticket.status !== 'fechado') {
          const createdTime = new Date(ticket.createdAt || ticket.slaEscalationTime);
          const diffMinutes = Math.floor((now - createdTime) / 60000);
          
          // Trigger alert if it exceeds threshold and hasn't been alerted yet
          if (diffMinutes >= (slaAlertAuto.delayMinutes || 30) && !ticket.slaAlertTriggered) {
            console.log(`[SLA ALERT] Chamado crítico #${ticket.id} violou SLA de tempo!`);
            
            // Mark as alerted
            ticket.slaAlertTriggered = true;
            ticket.history = ticket.history || [];
            ticket.history.push({
              status: ticket.status,
              updatedAt: now.toISOString(),
              userId: 'system',
              comment: 'Alerta de violação de SLA de criticidade disparado automaticamente.'
            });
            
            await dbService.update('tickets', ticket.id, ticket);
            
            // Create a simulated email notification
            await dbService.create('simulated_emails', {
              to: 'gestor@maistecnologia.com',
              subject: `⚠️ ALERTA SLA: Chamado Crítico #${ticket.id} Atrasado`,
              body: `O chamado "${ticket.subject}" classificado como Crítico está sem solução há mais de ${diffMinutes} minutos. Favor verificar urgentemente.`,
              sentAt: now.toISOString(),
              status: 'sent'
            });
          }
        }
      }
    } catch (err) {
      console.error("Erro no worker de SLA:", err);
    }
  }, 30000); // Executa a cada 30 segundos
}

initializeDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    startBackgroundWorkers();
  });
}).catch(err => {
  console.error("Falha ao iniciar o banco de dados:", err);
});
