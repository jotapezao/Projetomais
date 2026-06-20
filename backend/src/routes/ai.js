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
      reply = `Oi! Estou por aqui. Como posso te apoiar hoje? 😊 (Se precisar de a    // Obter última resposta do assistente para controle de estado
    const lastAIReply = [...history].reverse().find(h => h.role === 'assistant' || h.role === 'model' || h.sender === 'ai')?.content || '';
    const lastAIReplyLower = lastAIReply.toLowerCase();

    // Extrator de slots baseado em todo o histórico da conversa + mensagem atual
    let device = '';
    let brand = '';
    let symptom = '';

    const scanText = (text) => {
      const lower = text.toLowerCase();
      
      // Detecção de Dispositivo
      if (lower.includes('impressora') || lower.includes('imprimir') || lower.includes('impressão') || lower.includes('etiqueta') || lower.includes('toner') || lower.includes('cartucho')) device = 'impressora';
      else if (lower.includes('computador') || lower.includes('pc') || lower.includes('notebook') || lower.includes('máquina') || lower.includes('maquina') || lower.includes('desktop') || lower.includes('tela') || lower.includes('gabinete') || lower.includes('monitor')) device = 'computador';
      else if (lower.includes('vpn') || lower.includes('forticlient') || lower.includes('conexão') || lower.includes('conectar') || lower.includes('rede')) device = 'vpn';
      else if (lower.includes('senha') || lower.includes('login') || lower.includes('usuario') || lower.includes('usuário')) device = 'senha';
      else if (lower.includes('chamado') || lower.includes('suporte')) device = 'chamado';

      // Detecção de Marca
      if (lower.includes('zebra') || lower.includes('gc420') || lower.includes('zd220')) brand = 'zebra';
      else if (lower.includes('epson') || lower.includes('l3150') || lower.includes('l3250') || lower.includes('jato de tinta')) brand = 'epson';
      else if (lower.includes('hp') || lower.includes('laserjet')) brand = 'hp';
      else if (lower.includes('canon')) brand = 'canon';
      else if (lower.includes('fortinet') || lower.includes('forticlient')) brand = 'forticlient';

      // Detecção de Sintoma
      if (lower.includes('não liga') || lower.includes('desligada') || lower.includes('desligado') || lower.includes('apagada') || lower.includes('apagado') || lower.includes('morto') || lower.includes('morreu') || lower.includes('sem energia') || lower.includes('não acende') || lower.includes('ligar')) symptom = 'desligado';
      else if (lower.includes('papel') || lower.includes('engolindo') || lower.includes('atolado') || lower.includes('enroscado') || lower.includes('preso') || lower.includes('engoliu') || lower.includes('trancou') || lower.includes('puxando')) symptom = 'papel';
      else if (lower.includes('vermelho') || lower.includes('piscando') || lower.includes('pisca') || lower.includes('luz vermelha') || lower.includes('led vermelho')) symptom = 'led_vermelho';
      else if (lower.includes('senha') || lower.includes('credenciais') || lower.includes('expirada') || lower.includes('acesso') || lower.includes('erro de login')) symptom = 'credenciais';
      else if (lower.includes('98%') || lower.includes('tempo limite') || lower.includes('timeout') || lower.includes('trava') || lower.includes('lentidão') || lower.includes('lento') || lower.includes('caindo') || lower.includes('cai')) symptom = 'conexao_lenta';
    };

    // Scan history messages
    for (const msg of history) {
      const content = msg.content || msg.text || '';
      scanText(content);
    }
    // Scan current message
    scanText(message);

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

    // C. Roteiro Investigativo baseado em slots
    if (aiInvestigativeMode) {
      if (device === 'impressora') {
        if (!brand) {
          reply = `Entendi, você está com problemas em uma impressora. Qual é a marca e o modelo dela (ex: Zebra, Epson, HP) para eu te passar as orientações corretas? 🖨️`;
          return res.json({ reply, actions });
        }

        if (!symptom) {
          reply = `Anotei aqui que é uma impressora **${brand.toUpperCase()}**. E o que está acontecendo com ela? Ela não está ligando, está piscando luz vermelha ou engolindo papel?`;
          return res.json({ reply, actions });
        }

        // Se for Zebra
        if (brand === 'zebra') {
          if (symptom === 'desligado') {
            if (lastAIReplyLower.includes('botão de liga/desliga')) {
              if (cleanMsg.includes('não') || cleanMsg.includes('apagada') || cleanMsg.includes('nada')) {
                reply = `Puxa, nesse caso parece ser um problema físico ou de fonte de energia queimada. Vou precisar abrir um chamado para nossa equipe técnica ir até aí verificar pessoalmente, tudo bem? Posso prosseguir com a abertura? ⚙️`;
              } else {
                reply = `Que ótimo que ligou! E agora, ela está com o led verde fixo ou piscando em alguma cor?`;
              }
            } else {
              reply = `Entendi. Se a Zebra está completamente apagada, o cabo de força está bem encaixado atrás dela e na tomada? O botão de liga/desliga traseiro está na posição ligada? Dá uma olhada e me avisa se acendeu algo. 🔌`;
            }
            return res.json({ reply, actions });
          }

          if (symptom === 'led_vermelho') {
            if (lastAIReplyLower.includes('bobina está bem encaixada')) {
              reply = `Certo. Vamos tentar recalibrar o sensor de papel dela. É bem simples: desliga a impressora no botão traseiro. Segure o botão Feed da frente pressionado e, sem soltá-lo, ligue a impressora novamente. Mantenha pressionado até o led piscar duas vezes e solte. Ela deve soltar uma ou duas etiquetas e calibrar. Deu certo? 🏷️`;
            } else if (lastAIReplyLower.includes('recalibrar o sensor')) {
              if (cleanMsg.includes('não') || cleanMsg.includes('falhou') || cleanMsg.includes('erro') || cleanMsg.includes('continua')) {
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
            } else {
              reply = `Certo, led vermelho piscando na Zebra geralmente indica falta de papel ou tampa destravada. Você pode abrir a impressora, verificar se a bobina está bem encaixada, fechar a tampa com firmeza até fazer um 'clique' e tentar de novo? Me diz se mudou a cor do led. 🖨️`;
            }
            return res.json({ reply, actions });
          }

          if (symptom === 'papel') {
            reply = `Entendi. Na Zebra, se o papel estiver enroscado, abra a tampa superior pressionando as travas amarelas laterais, remova a bobina puxando com cuidado para não quebrar o sensor e retire o papel preso. Depois reinsira a bobina e feche. Funcionou?`;
            return res.json({ reply, actions });
          }
        }

        // Se for Epson
        if (brand === 'epson') {
          if (symptom === 'papel') {
            if (lastAIReplyLower.includes('conseguiu retirar tudo')) {
              if (cleanMsg.includes('não') || cleanMsg.includes('preso') || cleanMsg.includes('continua') || cleanMsg.includes('rasgou')) {
                reply = `Puxa, nesse caso o papel pode ter ficado preso em roletes internos de difícil acesso. Vou abrir um chamado para a nossa equipe técnica ir remover e fazer a limpeza interna para você, está bem? ⚙️`;
                actions = [{
                  type: 'create_ticket',
                  payload: {
                    subject: 'Impressora Epson - Papel Enroscado / Atolamento',
                    description: `Chamado aberto automaticamente via copiloto ProMais AI. Impressora Epson com papel enroscado/atolamento de papel que o usuário não conseguiu remover manualmente.`,
                    category: 'TI e Infraestrutura',
                    priority: 'media'
                  }
                }];
              } else {
                reply = `Ótimo! Agora ligue a impressora de volta e tente fazer uma impressão de teste. Me avisa se funcionou ou se deu erro novamente. 📄`;
              }
            } else {
              reply = `Papel enroscado na Epson é clássico. Vamos resolver passo a passo:\n1. Desligue a impressora da tomada para evitar puxar as engrenagens motorizadas com força.\n2. Abra a tampa de acesso e tente puxar o papel com as duas mãos, de forma lenta, na direção de saída natural. Nunca puxe rápido para não rasgar.\n3. Verifique se sobrou algum pedaço lá dentro.\n\nConseguiu retirar tudo ou o papel continua preso?`;
            }
            return res.json({ reply, actions });
          }

          if (symptom === 'desligado') {
            reply = `Para a Epson apagada, verifique se o cabo de força está bem conectado atrás dela e na tomada. Se ela estiver ligada em um estabilizador ou filtro de linha, confirme se ele está ligado. Se tudo estiver conectado e não acender nenhuma luz ao pressionar o botão Power, me avise para abrirmos um chamado.`;
            return res.json({ reply, actions });
          }
        }

        // Se for outra marca
        reply = `Dicas para impressora **${brand.toUpperCase()}** com problema de **${symptom}**:\n1. Desligue o aparelho e verifique os cabos.\n2. Abra as tampas para verificar se há obstruções ou papel preso.\n3. Se persistir, digite **'abrir chamado'** para acionar o suporte de TI. 🛠️`;
        return res.json({ reply, actions });
      }

      if (device === 'computador') {
        if (!symptom) {
          reply = `Entendi, o problema é no computador. O que está acontecendo com ele? Ele não liga, está travado na tela de login, ou está muito lento?`;
          return res.json({ reply, actions });
        }

        if (symptom === 'desligado') {
          if (lastAIReplyLower.includes('cooler/ventoinha')) {
            if (cleanMsg.includes('não') || cleanMsg.includes('nada') || cleanMsg.includes('morto') || cleanMsg.includes('apagado')) {
              reply = `Entendi. Dá uma olhada se o cabo de força atrás do gabinete (ou o carregador, se for notebook) está bem conectado na tomada e no aparelho. Se for filtro de linha/estabilizador, confirme se a chave dele está acesa. Tentou reconectar e testar?`;
            } else {
              reply = `Ah, se acendeu luzes ou fez barulho de cooler mas não dá imagem na tela, tente desligar o monitor e ligar de novo, ou verifique se o cabo de vídeo (HDMI/VGA) está firme. Deu sinal? 🖥️`;
            }
            return res.json({ reply, actions });
          }

          if (lastAIReplyLower.includes('chave dele está acesa')) {
            if (cleanMsg.includes('não') || cleanMsg.includes('continua') || cleanMsg.includes('nada') || cleanMsg.includes('mesmo')) {
              reply = `Certo. Como o computador continua completamente morto após checar a tomada e os cabos, pode ser uma falha de hardware na fonte ou placa-mãe. Vou abrir um chamado para a TI ir até sua mesa analisar, tudo bem? ⚙️`;
            } else {
              reply = `Que ótimo que funcionou! Se precisar de mais alguma coisa, me avise.`;
            }
            return res.json({ reply, actions });
          }

          if (lastAIReplyLower.includes('verificar pessoalmente, tudo bem?')) {
            if (cleanMsg.includes('sim') || cleanMsg.includes('pode') || cleanMsg.includes('prosseguir') || cleanMsg.includes('ok') || cleanMsg.includes('abrir')) {
              reply = `Combinado! Estou registrando o chamado de suporte agora mesmo para verificar a fonte/computador que não liga. ⚙️`;
              actions = [{
                type: 'create_ticket',
                payload: {
                  subject: 'Computador não liga / Completamente morto',
                  description: `Chamado registrado automaticamente via Copiloto ProMais AI. Usuário relatou que o computador não liga. Foi verificado que está sem energia (sem cooler/luzes) e os cabos de força foram testados pelo usuário.`,
                  category: 'TI e Infraestrutura',
                  priority: 'alta'
                }
              }];
            } else {
              reply = `Entendido. Cancelei a abertura do chamado. Se mudar de ideia, me fale.`;
            }
            return res.json({ reply, actions });
          }

          reply = `Vamos verificar. Quando você aperta o botão de ligar do computador, acende alguma luz ou faz algum barulho de cooler/ventoinha, ou ele está completamente apagado e silencioso?`;
          return res.json({ reply, actions });
        }

        if (symptom === 'conexao_lenta') {
          reply = `Computador lento geralmente é excesso de processos ou falta de memória. Experimente reiniciar o sistema e fechar abas desnecessárias no navegador. Se persistir, podemos abrir um chamado para avaliação de hardware. 💻`;
          return res.json({ reply, actions });
        }
      }

      if (device === 'vpn') {
        if (!symptom) {
          reply = `Entendi, você está com dificuldades para conectar na VPN. Você está tentando acessar de casa ou de uma rede externa, e qual erro aparece na tela (ex: erro de credenciais ou tempo limite de conexão)? 🌐`;
          return res.json({ reply, actions });
        }

        if (symptom === 'credenciais') {
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
          } else {
            reply = `Se for erro de credenciais ou senha expirada, o ideal é resetar a senha do domínio. Você lembra se trocou sua senha recentemente? Posso te guiar para alterar ou prefere que eu abra um chamado de reset de senha? 🔒`;
          }
          return res.json({ reply, actions });
        }

        if (symptom === 'conexao_lenta') {
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
          } else {
            reply = `Certo, quando dá tempo limite de conexão ou para em 98%, geralmente é oscilação da sua internet local ou o antivírus bloqueando. Você poderia tentar reiniciar seu roteador de internet e desativar o FortiClient e abrir de novo? Me diz se deu certo. 🌐`;
          }
          return res.json({ reply, actions });
        }
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
