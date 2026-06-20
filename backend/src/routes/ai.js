import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
router.use(verifyToken);

// Inicializar Google Generative AI se a chave estiver presente
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn("⚠️ AVISO: GEMINI_API_KEY não configurada nas variáveis de ambiente. O chatbot usará o motor de regras locais como fallback.");
}

// AI Assistant Chatbot Copilot
router.post('/chat', async (req, res) => {
  const { message, context = {} } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  // 1. Tentar executar com a inteligência real do Gemini RAG
  if (genAI) {
    try {
      // Buscar chamados relevantes para contextualização (segurança de escopo incluída)
      const allTickets = await dbService.getCollection('tickets');
      let userTickets = [];
      if (req.user) {
        const isStaff = ['super_admin', 'admin', 'gestor', 'coordenador', 'operador'].includes(req.user.role);
        if (isStaff) {
          userTickets = allTickets;
        } else {
          userTickets = allTickets.filter(t => t.companyId === req.user.companyId || t.createdBy === req.user.id);
        }
      }

      // Buscar artigos de conhecimento relevantes
      const allArticles = await dbService.getCollection('knowledge');
      let userArticles = allArticles;
      if (req.user && req.user.role !== 'super_admin') {
        userArticles = allArticles.filter(art => art.companyId === req.user.companyId || !art.companyId);
      }

      // Formatar contexto estruturado
      const userProfileText = `Nome: ${req.user.name} ${req.user.lastName || ''}\nE-mail: ${req.user.email}\nCargo: ${req.user.role}\nEmpresa ID: ${req.user.companyId}`;
      const ticketsText = userTickets.slice(0, 10).map(t => 
        `- Chamado #${t.id}: "${t.subject}" | Status: ${t.status} | Prioridade: ${t.priority} | Operador: ${t.operatorName || 'Não atribuído'} | Descrição: "${t.description}"`
      ).join('\n');
      const articlesText = userArticles.map(a => 
        `- Categoria: ${a.category} | Título: "${a.title}"\nProcedimento:\n${a.content}`
      ).join('\n\n');

      const systemInstruction = `Você é o "ProMais AI", o copiloto e assistente inteligente oficial de suporte técnico da Lojas Moda Verão.
Sua missão é ajudar os funcionários a:
1. Consultar o status dos chamados de suporte abertos.
2. Responder a dúvidas de procedimentos de TI e processos internos com base nos manuais de ajuda fornecidos abaixo.
3. Propor a abertura de chamados automaticamente caso o usuário esteja relatando um problema que não pôde ser resolvido ou se ele solicitar explicitamente a abertura de um chamado.

Instruções sobre o banco de dados e ações:
- Se você determinar que um novo chamado deve ser aberto (por exemplo, o usuário diz "abra um chamado para mim" ou tem um problema técnico sem solução nos manuais), você deve gerar uma ação do tipo "create_ticket" na lista de ações ("actions").
- O objeto de ação no JSON deve ser: { "type": "create_ticket", "payload": { "subject": "Assunto curto e descritivo", "description": "Descrição detalhada do problema baseada na mensagem do usuário", "category": "TI e Infraestrutura" | "Sistemas e Bugs" | "Recursos Humanos" | "Financeiro", "priority": "baixa" | "media" | "alta" | "critica" } }. Escolha a categoria e prioridade mais adequadas para o caso.
- Não crie chamados se a dúvida for informativa e o manual resolver o problema.

Dados do Usuário Atual com quem você está conversando:
${userProfileText}

Lista de Chamados Recentes deste Usuário/Empresa:
${ticketsText || "Nenhum chamado encontrado."}

Manuais de Suporte Disponíveis (Base de Conhecimento):
${articlesText || "Nenhum manual de ajuda encontrado."}

Você DEVE responder rigorosamente em formato JSON com o seguinte formato de dados (Response Schema):
{
  "reply": "Sua resposta amigável e profissional explicando o passo a passo ou informando sobre os chamados. Formate o texto em markdown, use emojis de forma elegante.",
  "actions": [
    // Array de ações. Opcional. Se for abrir um chamado, inclua o objeto create_ticket mencionado acima.
  ]
}
Sua resposta final deve ser um JSON válido contendo os campos "reply" e "actions". Não inclua blocos de código markdown (\`\`\`json ...) na resposta, apenas o texto JSON puro.`;

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const prompt = `${systemInstruction}\n\nMensagem do Usuário: "${message}"`;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      return res.json({
        reply: parsed.reply || "Formulei uma resposta, mas não encontrei conteúdo válido.",
        actions: parsed.actions || []
      });
    } catch (geminiError) {
      console.error("Erro na API do Gemini. Usando fallback de regras locais.", geminiError);
    }
  }

  // 2. Fallback de regras locais (Heurísticas locais sem chave de API)
  const cleanMsg = message.toLowerCase();
  let reply = '';
  let actions = [];

  try {
    // 1. Ask for ticket summaries
    if (cleanMsg.includes('resumir chamado') || cleanMsg.includes('resumo do chamado') || cleanMsg.includes('resuma')) {
      const tickets = await dbService.getCollection('tickets');
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
        let riskScore = 15;
        
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
      
      const workloads = staff.map(member => {
        const count = tickets.filter(t => t.operatorId === member.id && !['resolvido', 'fechado'].includes(t.status)).length;
        return { member, count };
      }).sort((a, b) => a.count - b.count);
 
      if (workloads.length > 0) {
        const best = workloads[0];
        reply = `**Recomendação de Responsável da IA (Modo Fallback):**\n\n` +
          `Recomendo atribuir esta atividade ao técnico/operador **${best.member.name} ${best.member.lastName}**.\n` +
          `• **Carga atual:** ${best.count} chamados abertos.\n` +
          `• **Disponibilidade:** Alta (menor fila de atendimento no momento).\n` +
          `• **Especialidade detectada:** TI & Infraestrutura corporativa.`;
      } else {
        reply = "Não encontrei técnicos disponíveis para recomendação no momento.";
      }
    }
    // 5. Search Help/Knowledge articles
    else if (cleanMsg.includes('ajuda') || cleanMsg.includes('documento') || cleanMsg.includes('como') || cleanMsg.includes('conhecimento') || cleanMsg.includes('vpn') || cleanMsg.includes('impressora') || cleanMsg.includes('zebra') || cleanMsg.includes('senha') || cleanMsg.includes('pdv')) {
      const articles = await dbService.getCollection('knowledge');
      const keywords = cleanMsg.split(' ').filter(w => w.length > 3);
      const matches = articles.filter(art => 
        keywords.some(kw => art.title.toLowerCase().includes(kw) || art.content.toLowerCase().includes(kw))
      );
 
      if (matches.length > 0) {
        reply = `**Artigos Relacionados na Base de Conhecimento (Modo Fallback):**\n\n` +
          matches.slice(0, 2).map(art => `• **${art.title}** (${art.category}): "${art.content.slice(0, 150)}..."`).join('\n\n') +
          `\n\n*Caso o procedimento acima não resolva o problema, solicite o registro de um chamado digitando 'abrir chamado' no chat.*`;
      } else {
        reply = `**Resposta ProMais AI (Modo Fallback):**\n\n` +
          `Olá! Eu sou o assistente inteligente da plataforma Mais Tecnologia. Posso ajudá-lo a gerenciar as operações do dia a dia da Lojas Moda Verão.\n\n` +
          `Experimente me perguntar:\n` +
          `• *"Resumir chamado tkt-1"*\n` +
          `• *"Prever SLA do chamado tkt-1"*\n` +
          `• *"Sugerir técnico para o chamado"*\n` +
          `• *"Como configuro a VPN?"*`;
      }
    }
    // 6. Action-based ticket creation fallback
    else if (cleanMsg.includes('abrir chamado') || cleanMsg.includes('criar chamado') || cleanMsg.includes('novo chamado') || cleanMsg.includes('registre um chamado')) {
      reply = `**Abertura de Chamado Solicitada (Modo Fallback):**\n\n` +
        `Estou acionando a automação de abertura de chamados. Um novo chamado de suporte técnico sobre problemas relatados será criado imediatamente.`;
      
      // We trigger a fallback auto-creation of a ticket
      actions = [{
        type: 'create_ticket',
        payload: {
          subject: 'Chamado Aberto via Copiloto IA (Fallback)',
          description: `O colaborador solicitou a abertura de um chamado de suporte via chat. Mensagem original: "${message}"`,
          category: 'TI e Infraestrutura',
          priority: 'media'
        }
      }];
    }
    // 7. Generic greeting / helper instructions
    else {
      reply = `**Olá, ${req.user.name || 'Usuário'}! Eu sou o ProMais AI.**\n\n` +
        `Como copiloto oficial do sistema de gestão, posso executar análises em tempo real para otimizar seus projetos, chamados e processos da Lojas Moda Verão.\n\n` +
        `**O que você gostaria de fazer agora?**\n` +
        `• 🔎 Buscar manuais de ajuda (ex: *"Como configurar VPN"*)\n` +
        `• 📊 Prever riscos de SLA (ex: *"Prever SLA do chamado tkt-1"*)\n` +
        `• 📝 Resumir atendimentos (ex: *"Resumir chamado tkt-1"*)\n` +
        `• 👥 Otimizar técnicos (ex: *"Quem está livre para chamado?"*)\n` +
        `• ⚙️ Criar chamados (ex: *"abrir chamado para impressora"*);`;
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
