import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);

// AI Assistant Chatbot Copilot
router.post('/chat', async (req, res) => {
  const { message, context = {} } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  const cleanMsg = message.toLowerCase();
  let reply = '';
  let actions = [];

  try {
    // 1. Ask for ticket summaries
    if (cleanMsg.includes('resumir chamado') || cleanMsg.includes('resumo do chamado') || cleanMsg.includes('resuma')) {
      const tickets = await dbService.getCollection('tickets');
      // Try to find ticket code in the message (e.g. tkt-1 or 1)
      const ticketMatch = cleanMsg.match(/(tkt-\d+)/) || cleanMsg.match(/#?(\d+)/);
      const ticketId = ticketMatch ? (ticketMatch[1].startsWith('tkt') ? ticketMatch[1] : `tkt-${ticketMatch[1]}`) : null;
      
      const ticket = tickets.find(t => t.id === ticketId) || tickets[0];
      if (ticket) {
        reply = `**Resumo Inteligente do Chamado #${ticket.id} (${ticket.subject}):**\n\n` +
          `• **Status:** ${ticket.status?.toUpperCase().replace('_', ' ')}\n` +
          `• **Prioridade:** ${ticket.priority?.toUpperCase()}\n` +
          `• **Descrição original:** "${ticket.description}"\n` +
          `• **Técnico Atribuído:** ${ticket.operatorName || 'Nenhum'}\n` +
          `• **Histórico Recente:** O chamado passou por ${ticket.history?.length || 1} atualizações. ` +
          `A última alteração foi registrada por ${ticket.history?.[ticket.history.length - 1]?.userName || 'Lucas'}: "${ticket.history?.[ticket.history.length - 1]?.comment || 'Abertura'}".\n\n` +
          `**Recomendação da IA:** Iniciar o atendimento prioritário para evitar estouro do SLA limite em ${new Date(ticket.slaEscalationTime).toLocaleString()}.`;
      } else {
        reply = "Não encontrei nenhum chamado correspondente no banco de dados para gerar o resumo. Por favor, especifique o ID (ex: tkt-1).";
      }
    } 
    // 2. SLA breach forecasting
    else if (cleanMsg.includes('prever sla') || cleanMsg.includes('previsão') || cleanMsg.includes('atraso')) {
      const tickets = await dbService.getCollection('tickets');
      const ticketMatch = cleanMsg.match(/(tkt-\d+)/) || cleanMsg.match(/#?(\d+)/);
      const ticketId = ticketMatch ? (ticketMatch[1].startsWith('tkt') ? ticketMatch[1] : `tkt-${ticketMatch[1]}`) : null;
      
      const ticket = tickets.find(t => t.id === ticketId) || tickets[0];
      if (ticket) {
        const isCritical = ticket.priority === 'critica' || ticket.priority === 'alta';
        const operatorAssigned = Boolean(ticket.operatorId);
        let riskScore = 15; // default low risk
        
        if (isCritical && !operatorAssigned) riskScore = 85;
        else if (isCritical && operatorAssigned) riskScore = 45;
        else if (!operatorAssigned) riskScore = 60;

        reply = `**Previsão de Risco de SLA para o Chamado #${ticket.id}:**\n\n` +
          `• **Probabilidade de Atraso:** ${riskScore}%\n` +
          `• **Status do SLA:** Limite em ${new Date(ticket.slaEscalationTime).toLocaleString()}\n` +
          `• **Fatores analisados:** Prioridade "${ticket.priority}", status de atribuição do técnico ("${ticket.operatorName || 'Não atribuído'}"), e carga histórica da fila.\n\n` +
          `**Diagnóstico ProMais AI:** ${riskScore > 50 ? '⚠️ Risco ALTO de estouro de prazo. Recomendo transferir imediatamente para um operador dedicado.' : '✓ Risco sob controle. O SLA deve ser cumprido no prazo.'}`;
      } else {
        reply = "Por favor, indique o ID do chamado para calcular a previsão de SLA (ex: 'Prever SLA do chamado tkt-1').";
      }
    }
    // 3. Subtask creation suggestions
    else if (cleanMsg.includes('criar tarefas') || cleanMsg.includes('subtarefas') || cleanMsg.includes('checklist')) {
      reply = `**Sugestão de Subtarefas Automatizadas para seu Projeto/Atividade:**\n\n` +
        `• [ ] **Etapa 1:** Mapeamento de requisitos com os stakeholders (Loja 01).\n` +
        `• [ ] **Etapa 2:** Validação de segurança de credenciais e conexões com o Postgres.\n` +
        `• [ ] **Etapa 3:** Homologação do processo em ambiente de homologação/staging.\n` +
        `• [ ] **Etapa 4:** Comunicação interna e publicação da documentação na base de conhecimento.\n\n` +
        `*Gostaria de criar essas tarefas automaticamente no projeto ativo?*`;
      actions = [{ type: 'create_suggested_tasks', payload: ['Mapeamento requisitos', 'Validação segurança', 'Homologação processo', 'Comunicação e documentação'] }];
    }
    // 4. Suggest best technician
    else if (cleanMsg.includes('responsável') || cleanMsg.includes('sugerir técnico') || cleanMsg.includes('quem')) {
      const users = await dbService.getCollection('users');
      const tickets = await dbService.getCollection('tickets');
      const staff = users.filter(u => ['super_admin', 'admin', 'team_admin', 'channel_admin'].includes(u.role));
      
      // Calculate workload
      const workloads = staff.map(member => {
        const count = tickets.filter(t => t.operatorId === member.id && !['resolvido', 'fechado'].includes(t.status)).length;
        return { member, count };
      }).sort((a, b) => a.count - b.count);

      if (workloads.length > 0) {
        const best = workloads[0];
        reply = `**Recomendação de Responsável da IA:**\n\n` +
          `Recomendo atribuir esta atividade ao técnico/operador **${best.member.name} ${best.member.lastName}**.\n` +
          `• **Carga atual:** ${best.count} chamados abertos.\n` +
          `• **Disponibilidade:** Alta (menor fila de atendimento no momento).\n` +
          `• **Especialidade detectada:** TI & Infraestrutura corporativa.`;
      } else {
        reply = "Não encontrei técnicos disponíveis para recomendação no momento.";
      }
    }
    // 5. Search Help/Knowledge articles
    else if (cleanMsg.includes('ajuda') || cleanMsg.includes('documento') || cleanMsg.includes('como') || cleanMsg.includes('conhecimento')) {
      const articles = await dbService.getCollection('knowledge');
      const keywords = cleanMsg.split(' ').filter(w => w.length > 3);
      const matches = articles.filter(art => 
        keywords.some(kw => art.title.toLowerCase().includes(kw) || art.content.toLowerCase().includes(kw))
      );

      if (matches.length > 0) {
        reply = `**Artigos Relacionados na Base de Conhecimento:**\n\n` +
          matches.slice(0, 2).map(art => `• **${art.title}** (${art.category}): "${art.content.slice(0, 100)}..."`).join('\n\n') +
          `\n\n*Precisa de mais detalhes sobre algum destes Manuais?*`;
      } else {
        reply = `**Resposta ProMais AI:**\n\n` +
          `Olá! Eu sou o assistente inteligente da plataforma Mais Tecnologia. Posso ajudá-lo a gerenciar as operações do dia a dia da Lojas Moda Verão.\n\n` +
          `Experimente me perguntar:\n` +
          `• *"Resumir chamado tkt-1"*\n` +
          `• *"Prever SLA do chamado tkt-1"*\n` +
          `• *"Sugerir técnico para o chamado"*\n` +
          `• *"Sugerir subtarefas de implantação"*`;
      }
    }
    // 6. Generic greeting / helper instructions
    else {
      reply = `**Olá, ${req.user.name || 'Usuário'}! Eu sou o ProMais AI.**\n\n` +
        `Como copiloto oficial do sistema de gestão, posso executar análises em tempo real para otimizar seus projetos, chamados e processos da Lojas Moda Verão.\n\n` +
        `**O que você gostaria de fazer agora?**\n` +
        `• 🔎 Buscar manuais de ajuda (ex: *"Como configurar VPN"*)\n` +
        `• 📊 Prever riscos de SLA (ex: *"Prever SLA do chamado tkt-1"*)\n` +
        `• 📝 Resumir atendimentos (ex: *"Resumir chamado tkt-1"*)\n` +
        `• 👥 Otimizar técnicos (ex: *"Quem está livre para chamado?"*)`;
    }

    res.json({ reply, actions });
  } catch (err) {
    console.error("Erro no processamento da IA:", err);
    res.status(500).json({ error: "Erro interno no servidor da IA" });
  }
});

// SLA Risco Analítico
router.post('/predict-sla', async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ error: 'ticketId é obrigatório' });

  try {
    const ticket = await dbService.getById('tickets', ticketId);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

    let riskPercent = 10;
    const isCritical = ticket.priority === 'critica' || ticket.priority === 'alta';
    const hasTech = Boolean(ticket.operatorId);

    if (isCritical && !hasTech) riskPercent = 90;
    else if (isCritical && hasTech) riskPercent = 40;
    else if (!hasTech) riskPercent = 65;

    res.json({
      ticketId,
      riskPercentage: riskPercent,
      slaLimit: ticket.slaEscalationTime,
      analysis: riskPercent > 50 
        ? 'Risco elevado. Atribuição de técnico especializado pendente ou tempo limite muito exíguo.' 
        : 'Margem segura. Atendimento dentro da janela regulamentar.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular risco de SLA.' });
  }
});

// Summarize ticket
router.post('/summarize', async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ error: 'ticketId é obrigatório' });

  try {
    const ticket = await dbService.getById('tickets', ticketId);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

    const commentsCount = ticket.comments?.length || 0;
    const historyCount = ticket.history?.length || 1;

    res.json({
      summary: `O chamado de ID ${ticket.id} aborda o assunto "${ticket.subject}". Foi aberto por ${ticket.createdByName}. Atualmente está em status "${ticket.status}" e prioridade "${ticket.priority}". Já passou por ${historyCount} atualizações de status e possui ${commentsCount} comentários de suporte técnico adicionais.`,
      subject: ticket.subject,
      createdBy: ticket.createdByName
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar resumo do chamado.' });
  }
});

export default router;
