import express from 'express';
import { dbService } from '../database/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
router.use(verifyToken);

// AI Assistant Chatbot Copilot
router.post('/chat', async (req, res) => {
  const { message, history = [], context = {} } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  // Carregar configurações de IA dinamicamente
  let geminiKey = process.env.GEMINI_API_KEY;
  let aiHumanMode = true;
  let aiTypingDelay = 1500;
  let aiRepeatGreeting = false;
  let aiMaxQuestions = 3;
  let aiInvestigativeMode = true;
  let aiMaintainContext = true;

  try {
    const config = await dbService.getById('settings', 'global-config');
    if (config) {
      if (config.geminiApiKey) geminiKey = config.geminiApiKey;
      if (config.aiHumanMode !== undefined) aiHumanMode = config.aiHumanMode;
      if (config.aiTypingDelay !== undefined) aiTypingDelay = Number(config.aiTypingDelay);
      if (config.aiRepeatGreeting !== undefined) aiRepeatGreeting = config.aiRepeatGreeting;
      if (config.aiMaxQuestions !== undefined) aiMaxQuestions = Number(config.aiMaxQuestions);
      if (config.aiInvestigativeMode !== undefined) aiInvestigativeMode = config.aiInvestigativeMode;
      if (config.aiMaintainContext !== undefined) aiMaintainContext = config.aiMaintainContext;
    }
  } catch (err) {
    console.error("Erro ao carregar configuracoes de IA no backend:", err);
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
${aiHumanMode ? `- ATENÇÃO: Use pronomes em primeira pessoa do singular ("eu", "vou verificar para você", "posso abrir o chamado") para soar como uma pessoa real ajudando o colaborador. Seja simpático, utilize emojis moderadamente para aquecer o diálogo e demonstre real interesse em solucionar a dificuldade do usuário. Responda como se estivesse no WhatsApp ou Teams.` : `- Mantenha um tom profissional, direto e formal.`}
${!aiRepeatGreeting ? `- ATENÇÃO: NÃO repita a mensagem de apresentação (como "Olá! Sou o ProMais AI, copiloto...") se o usuário já estiver conversando com você no histórico. Vá direto ao assunto ou continue a investigação.` : ``}
${aiInvestigativeMode ? `- ATENÇÃO: MODO INVESTIGATIVO ATIVADO. Não dê a solução de uma vez só! Faça perguntas diagnósticas curtas (no máximo ${aiMaxQuestions} perguntas por vez) para entender os sintomas antes de sugerir a solução final. Investigue cabos, conexões, LEDs e mensagens de erro.` : `- Diga as soluções diretamente com base nos manuais.`}

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
  "reply": "Sua resposta. Formate o texto em markdown, use emojis de forma elegante e mantenha o tom de conversa natural.",
  "actions": [
    // Array de ações. Opcional. Se for abrir um chamado, inclua o objeto create_ticket mencionado acima.
  ]
}
Sua resposta final deve ser um JSON válido contendo os campos "reply" e "actions". Não inclua blocos de código markdown (\`\`\`json ...) na resposta, apenas o texto JSON puro.`;

      const model = localGenAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      let historyText = "";
      if (aiMaintainContext && history && history.length > 0) {
        historyText = "\n\nHistórico recente da conversa:\n" + history.map(h => `${h.role === 'user' ? 'Usuário' : 'Atendente'}: ${h.content || h.text}`).join('\n');
      }

      const prompt = `${systemInstruction}${historyText}\n\nMensagem Atual do Usuário: "${message}"`;
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
  const cleanMsg = message.toLowerCase().trim();
  let reply = '';
  let actions = [];

  try {
    // A. Filtrar inputs muito curtos ou ruídos (ex: "d", "f", "x", "ok")
    if (cleanMsg.length <= 2) {
      reply = `Oi! Estou por aqui. Como posso te apoiar hoje? 😊 (Se precisar de ajuda com algo específico, pode escrever detalhadamente!)`;
      return res.json({ reply, actions });
    }

    // Obter última resposta do assistente para controle de estado
    const lastAIReply = [...history].reverse().find(h => h.role === 'assistant' || h.role === 'model' || h.sender === 'ai')?.content || '';
    const lastAIReplyLower = lastAIReply.toLowerCase();

    // B. Chitchat / Pequenas interações sociais humanas
    if (cleanMsg === 'oi' || cleanMsg === 'ola' || cleanMsg === 'olá' || cleanMsg === 'bom dia' || cleanMsg === 'boa tarde' || cleanMsg === 'boa noite') {
      if (!aiRepeatGreeting && history.length > 0) {
        reply = `Oi de novo, ${req.user.name || 'colaborador'}! Tudo bem? Em que posso te ajudar agora? 😊`;
      } else {
        reply = `Olá, ${req.user.name || 'colaborador'}! Tudo bem com você? 😊 Eu sou o ProMais AI, seu assistente pessoal de suporte.\n\nComo posso te ajudar hoje? Posso te ajudar a consultar seus chamados, tirar dúvidas sobre nossos manuais de TI ou até abrir um chamado novo se for preciso!`;
      }
      return res.json({ reply, actions });
    }
    
    if (cleanMsg.includes('como voce esta') || cleanMsg.includes('como vai') || cleanMsg.includes('tudo bem') || cleanMsg.includes('tudo certo')) {
      reply = `Estou ótimo, muito obrigado por perguntar! 😊 Super animado para te ajudar por aqui hoje. E você, como está? O que podemos resolver juntos hoje?`;
      return res.json({ reply, actions });
    }

    if (cleanMsg.includes('quem e voce') || cleanMsg.includes('o que e voce') || cleanMsg.includes('quem voce e') || cleanMsg.includes('o que voce e') || cleanMsg.includes('o que é voce')) {
      reply = `Eu sou o **ProMais AI**, seu atendente e copiloto de suporte técnico oficial aqui na Lojas Moda Verão! 🤖\n\nFui desenvolvido para te ajudar a encontrar soluções nos nossos manuais de TI, ver o andamento de chamados antigos ou registrar novas solicitações no sistema de forma muito rápida.`;
      return res.json({ reply, actions });
    }

    if (cleanMsg.includes('obrigado') || cleanMsg.includes('obrigada') || cleanMsg.includes('valeu') || cleanMsg.includes('perfeito') || cleanMsg.includes('entendido') || cleanMsg.includes('entendi')) {
      reply = `Imagina! Fico feliz em poder ajudar. Se surgir qualquer outra dúvida ou problema, pode me chamar aqui de novo. Tenha um ótimo trabalho! 👍`;
      return res.json({ reply, actions });
    }

    // C. Verificações de sessões investigativas locais baseadas em histórico
    const isZebraSession = cleanMsg.includes('zebra') || cleanMsg.includes('impressora') || 
                           lastAIReplyLower.includes('piscando em vermelho') || 
                           lastAIReplyLower.includes('cabo de força') || 
                           lastAIReplyLower.includes('bobina está bem encaixada') ||
                           lastAIReplyLower.includes('recalibrar o sensor') ||
                           lastAIReplyLower.includes('verificar pessoalmente, tudo bem?');

    if (isZebraSession) {
      if (aiInvestigativeMode) {
        if (lastAIReplyLower.includes('piscando em vermelho')) {
          if (cleanMsg.includes('não liga') || cleanMsg.includes('desligada') || cleanMsg.includes('apagada') || cleanMsg.includes('morreu') || cleanMsg.includes('desligou')) {
            reply = `Entendi. Se ela está completamente apagada, vamos verificar a energia. O cabo de força está bem encaixado atrás dela e na tomada? O botão de liga/desliga traseiro está na posição ligada? Dá uma olhada e me avisa se acendeu algo. 🔌`;
          } else if (cleanMsg.includes('vermelho') || cleanMsg.includes('piscando') || cleanMsg.includes('pisca')) {
            reply = `Certo, led vermelho piscando geralmente indica falta de papel ou tampa destravada. Você pode abrir a impressora, verificar se a bobina está bem encaixada, fechar a tampa com firmeza até fazer um 'clique' e tentar de novo? Me diz se mudou a cor do led. 🖨️`;
          } else {
            reply = `Entendi. Para eu te dar a instrução correta: ela está com o led vermelho piscando ou está totalmente desligada e sem luz?`;
          }
          return res.json({ reply, actions });
        }
        
        if (lastAIReplyLower.includes('cabo de força')) {
          if (cleanMsg.includes('não') || cleanMsg.includes('desligada') || cleanMsg.includes('apagada') || cleanMsg.includes('continua') || cleanMsg.includes('nada') || cleanMsg.includes('mesmo')) {
            reply = `Puxa, nesse caso parece ser um problema físico ou de fonte de energia queimada. Vou precisar abrir um chamado para nossa equipe técnica ir até aí verificar pessoalmente, tudo bem? Posso prosseguir com a abertura? ⚙️`;
          } else {
            reply = `Que ótimo que ligou! E agora, ela está com o led verde fixo ou piscando em alguma cor?`;
          }
          return res.json({ reply, actions });
        }

        if (lastAIReplyLower.includes('bobina está bem encaixada')) {
          if (cleanMsg.includes('não') || cleanMsg.includes('piscando') || cleanMsg.includes('vermelho') || cleanMsg.includes('continua') || cleanMsg.includes('tem bobina') || cleanMsg.includes('mesma')) {
            reply = `Certo. Vamos tentar recalibrar o sensor de papel dela. É bem simples: desliga a impressora no botão traseiro. Segure o botão Feed da frente pressionado e, sem soltá-lo, ligue a impressora novamente. Mantenha pressionado até o led piscar duas vezes e solte. Ela deve soltar uma ou duas etiquetas e calibrar. Deu certo? 🏷️`;
          } else {
            reply = `Perfeito! O led ficou verde e voltou a imprimir normalmente? Me avisa se precisar de mais algo.`;
          }
          return res.json({ reply, actions });
        }

        if (lastAIReplyLower.includes('recalibrar o sensor')) {
          if (cleanMsg.includes('não') || cleanMsg.includes('falhou') || cleanMsg.includes('erro') || cleanMsg.includes('piscando') || cleanMsg.includes('continua') || cleanMsg.includes('mesmo')) {
            reply = `Entendi. Como a calibração não resolveu, vou abrir um chamado para um técnico ir dar uma olhada e resolver isso para você, ok? Só um minutinho que já vou registrar... ⚙️`;
            actions = [{
              type: 'create_ticket',
              payload: {
                subject: 'Problema Impressora Zebra - Não imprime / Vermelho piscando',
                description: `Chamado aberto via copiloto ProMais AI. Usuário relatou problema com impressora Zebra. Passou pelas etapas de verificação de energia, bobina de papel e calibração Feed, mas o led continua piscando vermelho.`,
                category: 'TI e Infraestrutura',
                priority: 'media'
              }
            }];
          } else {
            reply = `Maravilha! Fico feliz que a calibração tenha funcionado e esteja tudo funcionando. Se precisar de mais alguma ajuda, é só me chamar. Bom trabalho! 😊`;
          }
          return res.json({ reply, actions });
        }

        if (lastAIReplyLower.includes('verificar pessoalmente, tudo bem?')) {
          if (cleanMsg.includes('sim') || cleanMsg.includes('pode') || cleanMsg.includes('claro') || cleanMsg.includes('ok') || cleanMsg.includes('prosseguir') || cleanMsg.includes('abrir')) {
            reply = `Combinado! Estou abrindo o chamado de suporte técnico agora mesmo. Só um minutinho... ⚙️`;
            actions = [{
              type: 'create_ticket',
              payload: {
                subject: 'Problema Impressora Zebra - Apagada / Sem energia',
                description: `Chamado aberto via copiloto ProMais AI. Usuário relatou que a impressora Zebra está apagada e não liga. Cabos de força e tomadas foram verificados pelo usuário no local.`,
                category: 'TI e Infraestrutura',
                priority: 'alta'
              }
            }];
          } else {
            reply = `Entendido. Cancelei a abertura do chamado. Se mudar de ideia ou quiser tentar outra coisa, estou por aqui!`;
          }
          return res.json({ reply, actions });
        }

        // Caso inicial
        reply = `Oi! Vi que você está com problemas na impressora Zebra. Para eu te ajudar a resolver rápido, me conta: ela está ligada e com o led verde aceso, ou está piscando em vermelho? 🖨️`;
        return res.json({ reply, actions });
      } else {
        // Se o modo investigativo estiver desativado, dá a solução direta baseada no manual
        reply = `Para resolver problemas na impressora Zebra:\n\n1. **Led Vermelho Piscando:** Geralmente indica falta de papel ou tampa destravada. Verifique se a bobina está bem posicionada e feche a tampa firmemente.\n2. **Calibração:** Se continuar piscando, desligue a impressora, segure o botão Feed da frente e ligue-a no botão traseiro mantendo o Feed pressionado até piscar duas vezes.\n3. **Sem Energia:** Verifique as conexões do cabo de força na impressora e na tomada.\n\nSe nada funcionar, digite **'abrir chamado'** para acionar a equipe de TI! 🛠️`;
        return res.json({ reply, actions });
      }
    }

    const isVPNSession = cleanMsg.includes('vpn') || cleanMsg.includes('forticlient') || cleanMsg.includes('conexão') ||
                         lastAIReplyLower.includes('dificuldades para conectar na vpn') ||
                         lastAIReplyLower.includes('reiniciar seu roteador') ||
                         lastAIReplyLower.includes('senha do domínio');

    if (isVPNSession) {
      if (aiInvestigativeMode) {
        if (lastAIReplyLower.includes('dificuldades para conectar na vpn')) {
          if (cleanMsg.includes('senha') || cleanMsg.includes('credenciais') || cleanMsg.includes('login') || cleanMsg.includes('erro de login') || cleanMsg.includes('usuario')) {
            reply = `Se for erro de credenciais ou senha expirada, o ideal é resetar a senha do domínio. Você lembra se trocou sua senha recentemente? Posso te guiar para alterar ou prefere que eu abra um chamado de reset de senha? 🔒`;
          } else if (cleanMsg.includes('tempo limite') || cleanMsg.includes('98') || cleanMsg.includes('carrega') || cleanMsg.includes('trava') || cleanMsg.includes('internet') || cleanMsg.includes('casa')) {
            reply = `Certo, quando dá tempo limite de conexão ou para em 98%, geralmente é oscilação da sua internet local ou o antivírus bloqueando. Você poderia tentar reiniciar seu roteador de internet e desativar o FortiClient e abrir de novo? Me diz se deu certo. 🌐`;
          } else {
            reply = `Entendi. Para eu te direcionar melhor, qual erro ou mensagem aparece na tela do FortiClient ao tentar conectar?`;
          }
          return res.json({ reply, actions });
        }

        if (lastAIReplyLower.includes('reiniciar seu roteador')) {
          if (cleanMsg.includes('não') || cleanMsg.includes('continua') || cleanMsg.includes('erro') || cleanMsg.includes('mesmo erro') || cleanMsg.includes('falhou')) {
            reply = `Entendi. Nesse caso, pode ser necessário reinstalar o cliente da VPN ou reconfigurar seu usuário na rede. Vou abrir um chamado para nossa equipe de redes analisar e te ligar para resolver, tudo bem? ⚙️`;
            actions = [{
              type: 'create_ticket',
              payload: {
                subject: 'Problema Conexão VPN - Tempo Limite / 98% erro',
                description: `Chamado aberto via copiloto ProMais AI. Usuário relatou falha na VPN. Tentou reiniciar roteador de internet, mas o erro de conexão/tempo limite persiste no FortiClient.`,
                category: 'TI e Infraestrutura',
                priority: 'media'
              }
            }];
          } else {
            reply = `Maravilha! VPN conectada com sucesso. Se precisar de mais alguma ajuda, é só gritar por aqui. Tenha um ótimo dia de trabalho! 💻`;
          }
          return res.json({ reply, actions });
        }

        if (lastAIReplyLower.includes('senha do domínio')) {
          if (cleanMsg.includes('chamado') || cleanMsg.includes('abre') || cleanMsg.includes('sim') || cleanMsg.includes('quero') || cleanMsg.includes('pode')) {
            reply = `Perfeito, estou abrindo um chamado para reset de senha do domínio no Active Directory (AD) para você. A equipe de suporte entrará em contato em breve. ⚙️`;
            actions = [{
              type: 'create_ticket',
              payload: {
                subject: 'Reset de Senha AD / VPN',
                description: `Chamado aberto via copiloto ProMais AI. Solicitação de reset de senha do usuário para acesso VPN / domínio.`,
                category: 'TI e Infraestrutura',
                priority: 'media'
              }
            }];
          } else {
            reply = `Para alterar sua senha manualmente, você pode pressionar Ctrl+Alt+Del no computador da rede interna ou acessar o portal de self-service da empresa. Se preferir o chamado, é só me pedir.`;
          }
          return res.json({ reply, actions });
        }

        // Caso inicial
        reply = `Entendi, você está com dificuldades para conectar na VPN. Você está tentando acessar de casa ou de uma rede externa, e qual erro aparece na tela (ex: erro de credenciais ou tempo limite de conexão)? 🌐`;
        return res.json({ reply, actions });
      } else {
        reply = `Para solucionar problemas na VPN FortiClient:\n\n1. **Erro de Credenciais:** Certifique-se de que sua senha não expirou. Caso precise de reset, digite **'abrir chamado'**.\n2. **Erro 98% / Tempo Limite:** Geralmente é instabilidade na sua internet residencial ou bloqueio do antivírus local. Reinicie seu roteador e tente novamente.\n3. **Configuração de Gateway:** Verifique se o endereço do gateway no FortiClient está correto.\n\nSe precisar que nossa equipe atue, peça para **'abrir chamado'**! 🌐`;
        return res.json({ reply, actions });
      }
    }

    // D. Dúvidas gerais de ajuda (sem termo específico)
    if (cleanMsg === 'ajuda' || cleanMsg === 'quero ajuda' || cleanMsg === 'me ajuda' || cleanMsg === 'help' || cleanMsg === 'preciso de ajuda') {
      reply = `Com certeza! Estou aqui para te ajudar. 😊\n\nO que está acontecendo? Me conta um pouco do problema ou escolha uma das opções abaixo:\n` +
        `• Se for uma dúvida de TI, me diga o assunto (ex: *"como configurar VPN"*, *"impressora travou"*).\n` +
        `• Se quiser saber de um chamado, digite: *"resumir chamado tkt-1"*.\n` +
        `• Se precisar que eu registre uma solicitação, escreva: *"abrir chamado"*.`;
      return res.json({ reply, actions });
    }

    // E. Chamados (Resumos)
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
    // 5. Action-based ticket creation fallback
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
    // 6. Generic greeting / helper instructions
    else {
      if (!aiRepeatGreeting && history.length > 0) {
        reply = `Entendi. Para que eu possa te ajudar melhor, você poderia detalhar mais o problema ou me dizer se é sobre VPN, impressoras, chamados ou se gostaria de abrir um novo chamado? 😊`;
      } else {
        reply = `Olá, **${req.user.name || 'colaborador'}**! Tudo bem com você? 😊 Eu sou o ProMais AI, seu assistente pessoal de suporte e operações aqui na Lojas Moda Verão.\n\n` +
          `Como posso te ajudar hoje? Pode falar livremente comigo! Estou pronto para buscar soluções em nossos manuais, acompanhar chamados ou abrir uma nova solicitação caso precise. 💬`;
      }
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
