import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
router.use(verifyToken);

// AI Assistant Chatbot Copilot
router.post('/chat', async (req, res) => {
  const { message, context = {} } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  // Carregar geminiApiKey dinamicamente do banco ou do ambiente
  let geminiKey = process.env.GEMINI_API_KEY;
  try {
    const config = await dbService.getById('settings', 'global-config');
    if (config && config.geminiApiKey) {
      geminiKey = config.geminiApiKey;
    }
  } catch (err) {
    console.error("Erro ao carregar geminiApiKey das configuracoes globais:", err);
  }

  let localGenAI = null;
  if (geminiKey) {
    localGenAI = new GoogleGenerativeAI(geminiKey);
  }

  // 1. Tentar executar com a inteligência real do Gemini RAG
  if (localGenAI) {
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

      const systemInstruction = `Você é um Atendente de Suporte Técnico Humano da Lojas Moda Verão, e seu nome de atendimento é "ProMais AI".
Sua forma de conversar deve ser natural, amigável, acolhedora e empática. Evite respostas excessivamente formais, engessadas, robóticas ou estruturadas em excesso, a menos que o usuário peça uma lista de passos. Converse como se estivesse em um chat de suporte corporativo em tempo real, prestando assistência direta.

Sua missão é ajudar os funcionários a:
1. Consultar o status dos chamados de suporte abertos.
2. Responder a dúvidas de procedimentos de TI e processos internos com base nos manuais de ajuda fornecidos abaixo.
3. Propor a abertura de chamados automaticamente caso o usuário esteja relatando um problema que não pôde ser resolvido ou se ele solicitar explicitamente a abertura de um chamado.

Regras de Conversação e Tom:
- Use pronomes em primeira pessoa do singular ("eu", "vou verificar para você", "posso abrir o chamado") para soar como uma pessoa real ajudando o colaborador.
- Seja simpático, utilize emojis moderadamente para aquecer o diálogo e demonstre real interesse em solucionar a dificuldade do usuário.
- Se o usuário apenas disser "olá" ou similar, cumprimente-o de forma muito calorosa, chame-o pelo nome e pergunte como pode ajudá-lo hoje, sugerindo de forma conversacional que pode ajudá-lo com chamados ou dúvidas, sem apresentar uma lista robótica e fria de comandos.

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
  "reply": "Sua resposta amigável e calorosa simulando um atendente humano. Formate o texto em markdown, use emojis de forma elegante e mantenha o tom de conversa natural.",
  "actions": [
    // Array de ações. Opcional. Se for abrir um chamado, inclua o objeto create_ticket mencionado acima.
  ]
}
Sua resposta final deve ser um JSON válido contendo os campos "reply" e "actions". Não inclua blocos de código markdown (\`\`\`json ...) na resposta, apenas o texto JSON puro.`;

      const model = localGenAI.getGenerativeModel({
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

  // 2. Fallback de regras locais (Heurísticas locais humanizadas sem chave de API)
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
        reply = `Com certeza, vou resumir o chamado **#${ticket.id} (${ticket.subject})** para você! 😊\n\n` +
          `Olha, ele está atualmente em status **${ticket.status?.toUpperCase().replace('_', ' ')}** com nível de criticidade **${ticket.priority?.toUpperCase()}**.\n` +
          `• **Descrição relatada:** "${ticket.description}"\n` +
          `• **Operador responsável:** ${ticket.operatorName || 'Ainda sem operador designado'}\n` +
          `• **Histórico:** Passou por ${ticket.history?.length || 1} movimentações. A última delas foi registrada por ${ticket.history?.[ticket.history.length - 1]?.userName || 'Lucas'}: *"${ticket.history?.[ticket.history.length - 1]?.comment || 'Abertura'}*" no dia ${new Date(ticket.history?.[ticket.history.length - 1]?.updatedAt).toLocaleString()}.\n\n` +
          `**Minha sugestão:** Como o SLA expira em ${new Date(ticket.slaEscalationTime).toLocaleString()}, seria ótimo dar o pontapé inicial no atendimento para evitar atrasos! ⏰`;
      } else {
        reply = "Puxa, procurei aqui mas não encontrei nenhum chamado com esse ID. Você poderia confirmar o código dele para mim? (ex: tkt-1) 🔍";
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
 
        reply = `Fiz um cálculo rápido do risco de atraso para o chamado **#${ticket.id}**:\n\n` +
          `• **Risco estimado de estourar o SLA:** ${riskScore}%\n` +
          `• **Prazo Limite:** ${new Date(ticket.slaEscalationTime).toLocaleString()}\n` +
          `• **Fatores em jogo:** Nível de prioridade "${ticket.priority}", status de técnico associado ("${ticket.operatorName || 'Nenhum técnico atribuído'}") e carga da fila.\n\n` +
          `${riskScore > 50 ? '⚠️ **Atenção:** O risco está consideravelmente alto! Sugiro muito escalar ou atribuir um técnico focado agora mesmo.' : '✓ **Tudo sob controle!** O risco está baixo e o atendimento deve ser concluído dentro do prazo estipulado.'} 📅`;
      } else {
        reply = "Para calcular a previsão de SLA, preciso saber qual chamado analisar. Você poderia me passar o ID dele? (ex: 'Prever SLA do chamado tkt-1') ⏰";
      }
    }
    // 3. Subtask creation suggestions
    else if (cleanMsg.includes('criar tarefas') || cleanMsg.includes('subtarefas') || cleanMsg.includes('checklist')) {
      reply = `Olha só, elaborei um roteiro de subtarefas prontas que podem agilizar o andamento do seu projeto/atividade. Veja se faz sentido:\n\n` +
        `• [ ] **Mapear requisitos** com os responsáveis de ponta (Loja 01).\n` +
        `• [ ] **Validar conexões de segurança** com as credenciais do banco PostgreSQL.\n` +
        `• [ ] **Executar testes em staging** (ambiente de homologação).\n` +
        `• [ ] **Registrar os aprendizados** nos manuais da Base de Conhecimento.\n\n` +
        `Se você quiser, eu posso registrar essa lista automaticamente no seu projeto ativo! O que acha? 📝`;
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
        reply = `Dei uma olhada na disponibilidade da equipe técnica corporativa e recomendo atribuir essa demanda para o(a) **${best.member.name} ${best.member.lastName}**.\n\n` +
          `• **Status da Fila:** Atualmente com apenas ${best.count} chamado(s) pendente(s) em aberto.\n` +
          `• **Disponibilidade:** Alta (é o operador com menor fila de atendimento agora).\n` +
          `• **Foco:** TI & Infraestrutura.\n\nSe preferir, posso encaminhar para ele(a) agora mesmo! 👥`;
      } else {
        reply = "Dei uma busca na lista de operadores mas infelizmente todos parecem indisponíveis no momento. 😔";
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
        reply = `Encontrei essas instruções detalhadas em nossos manuais de ajuda internos. Veja se as etapas abaixo te ajudam a resolver o problema:\n\n` +
          matches.slice(0, 2).map(art => `📖 **${art.title}** (${art.category}):\n${art.content.slice(0, 350)}...`).join('\n\n') +
          `\n\nCaso você siga os passos e a falha persista, ou se preferir que eu registre um chamado para a equipe de TI dar uma olhada de perto, basta digitar **'abrir chamado'** aqui no chat! 🛠️`;
      } else {
        reply = `Olá! Sou o ProMais AI, seu atendente virtual de suporte. Vi que perguntou sobre ajuda, mas não encontrei um manual específico.\n\n` +
          `Porém, você pode me pedir tarefas específicas como:\n` +
          `• *"Como configuro a VPN?"* (vou pesquisar nos manuais de ajuda)\n` +
          `• *"Resumir chamado tkt-1"* (resumo o andamento do ticket)\n` +
          `• *"Prever SLA do chamado tkt-1"* (calculo chances de atraso)\n` +
          `• *"Recomendar um técnico para o caso"* (indico quem está livre)`;
      }
    }
    // 6. Action-based ticket creation fallback
    else if (cleanMsg.includes('abrir chamado') || cleanMsg.includes('criar chamado') || cleanMsg.includes('novo chamado') || cleanMsg.includes('registre um chamado')) {
      reply = `Com certeza! Já entendi o problema e vou registrar um chamado de suporte técnico agora mesmo no sistema. ⚙️\n\n` +
        `Estou criando a solicitação para a nossa equipe de suporte e você receberá o número do chamado em alguns instantes. Só um momento...`;
      
      actions = [{
        type: 'create_ticket',
        payload: {
          subject: 'Incidente Registrado via Atendente Copiloto',
          description: `Chamado registrado de forma automatizada pelo colaborador no chat do Copiloto. Relato original: "${message}"`,
          category: 'TI e Infraestrutura',
          priority: 'media'
        }
      }];
    }
    // 7. Generic greeting / helper instructions
    else {
      reply = `Olá, **${req.user.name || 'colaborador'}**! Tudo bem com você? 😊 Eu sou o ProMais AI, seu assistente pessoal de suporte e operações aqui na Lojas Moda Verão.\n\n` +
        `Estou aqui para deixar sua rotina mais fácil! Você pode conversar comigo de forma natural, e posso te ajudar em coisas como:\n` +
        `• 🔎 **Buscar soluções nos manuais** (ex: *"Como configuro a VPN?"* ou *"Impressora Zebra piscando"*)\n` +
        `• 📊 **Acompanhar chamados** (ex: *"Resumir chamado tkt-1"* ou *"Qual o risco de atraso do chamado?"*)\n` +
        `• ⚙️ **Registrar novos problemas** (ex: *"Preciso abrir um chamado para conserto"*)\n` +
        `• 👥 **Otimizar processos** (ex: *"Quem está livre para assumir chamados?"*)\n\n` +
        `Como posso te ajudar hoje? Pode falar livremente comigo! 💬`;
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
