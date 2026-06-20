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

      const systemInstruction = `Você é o "ProMais AI", um analista de suporte técnico experiente da Lojas Moda Verão. Você conversa como um humano real — de forma natural, descontraída e objetiva, como um colega de trabalho experiente que resolve problemas pelo WhatsApp ou Teams.

════════════════════════════════════
REGRAS CRÍTICAS DE COMPORTAMENTO:
════════════════════════════════════

1. NUNCA se reapresente depois da primeira mensagem. Se já existe histórico de conversa, vá direto ao assunto.
2. NUNCA repita a pergunta anterior com as mesmas palavras. Varie sempre o vocabulário.
3. MANTENHA o contexto de toda a conversa. Se o usuário já informou marca, modelo ou sintoma, NÃO pergunte de novo.
4. DIAGNÓSTICO EM ETAPAS — antes de sugerir qualquer solução, colete as informações necessárias fazendo UMA pergunta de cada vez:
   - Primeiro: qual é o equipamento/problema?
   - Segundo: qual marca e modelo?
   - Terceiro: descreva o sintoma específico (o que acontece, o que aparece na tela, qual luz pisca)?
   - Só depois: ofereça o procedimento de solução passo a passo.
5. NUNCA assuma um sintoma específico com base em keywords vagas. Exemplo: se o usuário diz "imprimindo com falhas", NÃO assuma que é "papel enroscado" — pergunte qual tipo de falha (mancha, listras, cor errada, papel amassado).
6. Se o usuário pedir para ABRIR CHAMADO (qualquer forma de solicitação explícita: "abre chamado", "registra", "quero abrir", "preciso de suporte"), gere IMEDIATAMENTE o action create_ticket com os dados coletados até então.
7. Se depois de 3 tentativas de solução o problema persistir, sugira proativamente abrir um chamado.
8. Use linguagem simples, brasileira e coloquial. Evite termos técnicos desnecessários com usuários finais.
9. Varie as expressões: não use sempre "Entendi", "Certo", "Analisado". Use: "Ah, entendi!", "Boa pergunta!", "Vamos ver...", "Deixa eu te ajudar com isso...", "Que situação!", "Já vi esse problema antes..."
10. ${aiHumanMode ? 'Tom: humano, simpático, como conversa de WhatsApp. Emojis moderados. Primeira pessoa.' : 'Tom: profissional e direto.'}

════════════════════════════════════
FLUXO DE ATENDIMENTO OBRIGATÓRIO:
════════════════════════════════════

ETAPA 1 — IDENTIFICAÇÃO (se ainda não souber):
- Qual é o equipamento com problema? (impressora, computador, sistema, VPN, etc.)

ETAPA 2 — DETALHAMENTO (se ainda não souber):
- Qual marca e modelo? (ex: Epson L355, Zebra GC420, HP LaserJet)

ETAPA 3 — SINTOMA ESPECÍFICO (se ainda não souber):
- O que exatamente está acontecendo? Descreva o que aparece ou o que o equipamento faz.
  - Para impressora: está ligada? Qual luz aparece? O que acontece quando tenta imprimir? (mancha? não sai papel? papel amassa? cores erradas? linhas?)
  - Para computador: não liga completamente, ou liga mas não dá imagem? Dá mensagem de erro?
  - Para VPN: qual mensagem de erro aparece? Fica em qual porcentagem?

ETAPA 4 — SOLUÇÃO GUIADA:
- Forneça procedimento passo a passo baseado nos manuais.
- Pergunte se resolveu.

ETAPA 5 — ESCALADA:
- Se não resolveu, ofereça abrir chamado.

════════════════════════════════════
DIAGNÓSTICO DE IMPRESSORAS (USE A BASE DE CONHECIMENTO ABAIXO):
════════════════════════════════════

Problemas comuns e perguntas-chave:
- "não imprime nada" → Verifique: está ligada? Conexão USB/rede? Fila de impressão travada?
- "imprimindo com falhas / manchas / linhas" → Pergunte: são linhas horizontais ou verticais? A cor está toda errada ou só uma cor? Isso acontece em todas as impressões?
- "papel enroscado / atolamento" → Siga o procedimento de remoção segura de papel
- "led piscando vermelho" → Depende da marca: Zebra = calibração; Epson/HP = erro de papel ou tinta
- "não liga" → Verifique cabo, tomada, estabilizador

Marcas frequentes:
- Zebra GC420/ZD220: etiquetas, led vermelho = sem papel ou tampa aberta, calibração via botão Feed
- Epson (L355, L3150, L3250): jato de tinta, limpeza de cabeçote, recarga de tinta
- HP LaserJet: toner, erro de papel, aquecimento

════════════════════════════════════
DADOS DO SISTEMA:
════════════════════════════════════

Usuário atual: ${userProfileText}

Chamados recentes:
${ticketsText || "Nenhum chamado encontrado."}

Manuais de Suporte (Base de Conhecimento):
${articlesText || "Nenhum manual de ajuda encontrado."}

════════════════════════════════════
FORMATO DE RESPOSTA OBRIGATÓRIO:
════════════════════════════════════

Responda SEMPRE em JSON puro (sem blocos de código markdown). Formato:
{
  "reply": "Sua mensagem em markdown natural. Use emojis com moderação.",
  "actions": []
}

Para abrir chamado, inclua em "actions":
{
  "type": "create_ticket",
  "payload": {
    "subject": "Assunto breve e descritivo",
    "description": "Descrição detalhada do problema com base na conversa",
    "category": "TI e Infraestrutura",
    "priority": "media"
  }
}

Não crie chamados para dúvidas informativas resolvidas pela base de conhecimento.`;

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

      // Detecção de Marca (precedência sobre modelos específicos)
      if (lower.includes('zebra') || lower.includes('gc420') || lower.includes('zd220')) brand = 'zebra';
      else if (lower.includes('epson') || lower.includes('l355') || lower.includes('l3150') || lower.includes('l3250') || lower.includes('jato de tinta')) brand = 'epson';
      else if (lower.includes('hp') || lower.includes('laserjet')) brand = 'hp';
      else if (lower.includes('canon') || lower.includes('pixma')) brand = 'canon';
      else if (lower.includes('fortinet') || lower.includes('forticlient')) brand = 'forticlient';

      // Detecção de Sintoma — ORDEM IMPORTA: do mais específico para o mais genérico
      // Papel enroscado / atolamento — só marca quando é EXPLÍCITO
      if (lower.includes('papel') && (lower.includes('enroscado') || lower.includes('atolado') || lower.includes('preso') || lower.includes('engolindo') || lower.includes('engoliu') || lower.includes('trancou') || lower.includes('puxando'))) {
        symptom = 'papel';
      }
      // Não liga / sem energia
      else if (lower.includes('não liga') || lower.includes('não acende') || (lower.includes('sem') && lower.includes('energia')) || lower.includes('apagada') || lower.includes('apagado') || lower.includes('desligada') || lower.includes('desligado') || lower.includes('morreu')) {
        symptom = 'desligado';
      }
      // LED vermelho ou piscando
      else if (lower.includes('vermelho') || lower.includes('luz vermelha') || lower.includes('led vermelho') || (lower.includes('piscando') && !lower.includes('falha'))) {
        symptom = 'led_vermelho';
      }
      // Falha de impressão genérica (manchas, linhas, cores erradas) — NÃO confundir com papel
      else if ((lower.includes('falha') || lower.includes('falhando') || lower.includes('manchas') || lower.includes('mancha') || lower.includes('listras') || lower.includes('linhas') || lower.includes('riscos') || lower.includes('cor errada') || lower.includes('desbotado') || lower.includes('fraco') || lower.includes('péssimo') || lower.includes('ruim')) && 
               (lower.includes('imprim') || lower.includes('impressão') || lower.includes('impressora'))) {
        symptom = 'falha_impressao';
      }
      // Credenciais / senha
      else if (lower.includes('senha') || lower.includes('credenciais') || lower.includes('expirada') || lower.includes('acesso negado') || lower.includes('erro de login')) {
        symptom = 'credenciais';
      }
      // Lentidão / timeout / VPN
      else if (lower.includes('98%') || lower.includes('tempo limite') || lower.includes('timeout') || lower.includes('lentidão') || lower.includes('lento') || lower.includes('caindo') || lower.includes('cai')) {
        symptom = 'conexao_lenta';
      }
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

    // B2. Intenção explícita de abrir chamado — PRIORIDADE MÁXIMA antes dos fluxos investigativos
    const isOpenTicketIntent = (
      cleanMsg.includes('abre chamado') || cleanMsg.includes('abrir chamado') || cleanMsg.includes('abra chamado') ||
      cleanMsg.includes('criar chamado') || cleanMsg.includes('cria chamado') || cleanMsg.includes('novo chamado') ||
      cleanMsg.includes('registre um chamado') || cleanMsg.includes('registra chamado') || cleanMsg.includes('quero abrir') ||
      cleanMsg.includes('preciso de suporte') || cleanMsg.includes('chama suporte') || cleanMsg.includes('chamar suporte')
    );

    if (isOpenTicketIntent) {
      const subject = device
        ? `Problema em ${device}${brand ? ' ' + brand.charAt(0).toUpperCase() + brand.slice(1) : ''}${symptom ? ' - ' + symptom.replace('_', ' ') : ''}`
        : 'Incidente Registrado via Copiloto ProMais AI';
      const description = `Chamado registrado pelo colaborador via chat do Copiloto ProMais AI. Relato: "${message}". Histórico coletado: ${JSON.stringify(history.slice(-6).map(h => h.content || h.text))}`;
      reply = `Certo! Já entendi o que está acontecendo e estou registrando o chamado agora mesmo. ⚙️ Só um momento...`;
      actions = [{ type: 'create_ticket', payload: { subject, description, category: 'TI e Infraestrutura', priority: 'media' } }];
      return res.json({ reply, actions });
    }

    // C. Roteiro Investigativo baseado em slots
    if (aiInvestigativeMode) {
      if (device === 'impressora') {
        if (!brand) {
          reply = `Entendi, você está com problemas na impressora. Qual é a marca e o modelo dela? (ex: Zebra GC420, Epson L355, HP LaserJet) 🖨️`;
          return res.json({ reply, actions });
        }

        if (!symptom) {
          const brandDisplay = brand.charAt(0).toUpperCase() + brand.slice(1);
          reply = `Ok, impressora **${brandDisplay}**! O que está acontecendo com ela exatamente? Ela não liga, está piscando alguma luz, engolindo papel ou está imprimindo com manchas/falhas?`;
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
          if (symptom === 'falha_impressao') {
            if (lastAIReplyLower.includes('limpeza do cabeçote') || lastAIReplyLower.includes('listras')) {
              if (cleanMsg.includes('não') || cleanMsg.includes('continua') || cleanMsg.includes('ainda') || cleanMsg.includes('pior')) {
                reply = `Entendido. Quando a limpeza não resolve, pode ser que os cabeçotes estejam muito entupidos ou com tinta ressecada. Precisa de uma limpeza mais profunda feita presencialmente. Vou abrir um chamado para a equipe ir até você, ok? ⚙️`;
                actions = [{ type: 'create_ticket', payload: {
                  subject: 'Impressora Epson - Falha de Impressão / Cabeçote Entupido',
                  description: `Chamado aberto via copiloto ProMais AI. Impressora Epson com falha de impressão (manchas, listras ou cores incorretas). O usuário tentou limpeza de cabeçote pelo software mas o problema persiste.`,
                  category: 'TI e Infraestrutura', priority: 'media'
                }}];
              } else {
                reply = `Que ótimo que ajudou! Se as listras sumiram ou as cores melhoraram, a impressora está em ordem. Se notar que o problema volta, pode ser hora de fazer manutenção preventiva dos cabeçotes. Precisando, é só chamar! 😊`;
              }
            } else {
              reply = `Ah, falha de impressão pode ter várias causas. Me conta melhor: as impressões estão saindo com **listras/linhas** horizontais ou verticais, com **manchas** de tinta, com **cores erradas** ou a impressão está muito **clara/desbotada**? Isso me ajuda a identificar se é problema de cabeçote ou de tinta. 🖨️`;
            }
            return res.json({ reply, actions });
          }

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

        // Tratamento genérico para falha de impressão (qualquer marca que chegue aqui)
        if (symptom === 'falha_impressao') {
          const brandDisplay = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'sua impressora';
          reply = `Deixa eu entender melhor. Na **${brandDisplay}**, as impressões estão saindo com:\n\n• 🔴 **Listras ou linhas** horizontais/verticais?\n• 🎨 **Cores erradas** ou faltando alguma cor?\n• 💧 **Manchas** de tinta?\n• 📄 Impressa muito **clara ou quase apagada**?\n\nMe conta que acho a causa mais rápido! 😊`;
          return res.json({ reply, actions });
        }

        // Genérico para outras marcas com sintoma diferente
        reply = `Vou te ajudar com isso! Para impressora **${brand ? brand.toUpperCase() : 'desconhecida'}** com **${symptom.replace('_', ' ')}**, tenta verificar:\n1. Desligue o aparelho e confira os cabos de energia e USB.\n2. Abra as tampas e verifique se há papel ou obstruções.\n3. Reinicie o spooler de impressão (Serviços do Windows).\n\nSe persistir, é só me pedir para **abrir um chamado** e a equipe vai até você. 🛠️`;
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
