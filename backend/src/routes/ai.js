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
        const isStaff = ['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'].includes(req.user.role);
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

ProbleMarcas frequentes:
- Zebra GC420/ZD220/ZD410: impressoras de etiquetas térmicas. Led vermelho = sem papel/tampa aberta/sensor sujo. Calibração = segure Feed + ligue até piscar 2x.
- Epson (L355, L3150, L3250, L4160, L6190): jato de tinta com tanque externo. Limpeza de cabeçote pelo software. Tinta original obrigatória.
- HP LaserJet (Pro, Enterprise, Color): laser, toner, papel, fusora.
- Canon (PIXMA, ImageClass): similar Epson/HP.

════════════════════════════════════
ENCICLOPÉDIA DE TI — USE SEMPRE ESTAS INFORMAÇÕES:
════════════════════════════════════

▶ IMPRESSORAS:
• LED VERMELHO PISCANDO (Zebra): Verificar bobina → fechar tampa → calibrar via Feed (segure Feed + ligue até piscar 2x → solte → ela imprime etiqueta de calibração).
• IMPRESSÃO BORRADA (Zebra): Limpar cabeçote com álcool isopropílico 70% + cotonete. Aumentar Density nas configurações. Reduzir velocidade para 4ips.
• OFFLINE/NÃO RECONHECIDA: Reiniciar Spooler (services.msc → Spooler → Reiniciar). Reconectar USB. Reinstalar driver.
• MANCHAS/LISTRAS HORIZONTAIS (Epson): Bicos entupidos → Painel de Controle → Impressora → Utilitários → Limpeza das cabeças (máx. 3x seguidas).
• CORES FALTANDO (Epson): Tanque vazio → reabastecer com tinta original Epson da cor específica.
• PAPEL ENROSCADO (qualquer): Desligar da tomada → abrir TODAS tampas → puxar papel DEVAGAR na direção de saída → verificar resíduos com lanterna → reiniciar.
• NÃO LIGA: Verificar cabo de força (conector quadrado na traseira), tomada, estabilizador.
• MANCHAS DE TONER (HP Laser): Sacudir cartucho. Riscos no cilindro = trocar cartucho.
• TONER NÃO FIXA (HP): Fusora desgastada → chamado.

▶ COMPUTADORES — HARDWARE:
• NÃO LIGA (nenhum sinal): Verificar chave 127V/220V na fonte, cabo de força, tomada, estabilizador. Testar botão de ligar por 5s.
• TELA PRETA (liga mas sem imagem): Reconectar HDMI/VGA nas duas pontas. Selecionar entrada correta no monitor (HDMI1/HDMI2/VGA). Remover/reinserir RAM. Verificar se placa de vídeo está bem encaixada. Desconectar pendrives.
• BIPS AO INICIAR: 1 bip longo repetido = RAM com defeito. Remover e reinserir pentes.
• SUPERAQUECIMENTO: Temperatura CPU >90°C → limpeza de poeira com ar comprimido + verificar cooler girando. Após 3+ anos = pasta térmica ressecada.
• TELA AZUL (BSOD): Anotar STOP CODE. sfc /scannow. BSOD frequente = hardware com defeito → chamado urgente.
• LENTO/TRAVANDO: Ctrl+Shift+Esc → verificar CPU/RAM/Disco. Reiniciar. Deletar %temp%. Desativar programas de startup.
• DISCO A 100%: Desativar SysMain em services.msc. Verificar saúde: wmic diskdrive get status. "Pred Fail" = HD com defeito → chamado urgente.
• BATERIA NOTEBOOK: powercfg /batteryreport. Abaixo de 50% de capacidade → substituir. Bateria estufada → chamado urgente (risco de incêndio).
• FAN BARULHENTO: Limpar poeira. Verificar se cooler da CPU gira. Cooler parado = chamado urgente.
• REINICIA SOZINHO: Superaquecimento, fonte instável ou RAM com defeito.

▶ REDE E CONECTIVIDADE:
• SEM INTERNET (cabo): LED do RJ45 apagado = sem físico. Trocar cabo. Testar porta no switch. CMD: ping 8.8.8.8.
• SEM INTERNET (Wi-Fi): Verificar se Wi-Fi está ativado. Esquecer rede e reconectar. Reiniciar roteador. CMD admin: netsh winsock reset → reiniciar PC.
• VPN FORTICLIENT — erro de credencial: Senha AD expirada → reset.
• VPN FORTICLIENT — trava em 40%: Problema na rede local ou antivírus bloqueando. Testar com dados do celular.
• VPN FORTICLIENT — trava em 98%: Gerenciador de Dispositivos → Adaptadores de Rede → remover "Fortinet SSL VPN Adapter" → reiniciar PC.
• REDE CAIU NA LOJA: Verificar LEDs roteador/switch. Reiniciar ordem: roteador → aguardar 2 min → switch → aguardar 1 min → computadores. Contatar provedor se WAN caiu.
• WI-FI INSTÁVEL: Aproximar do roteador. Usar cabo. Mudar para rede 5GHz. Mudar canal do roteador.

▶ WINDOWS:
• INICIALIZAÇÃO LENTA: Desabilitar startup (Ctrl+Shift+Esc → Inicialização). HDD lento = candidato a SSD.
• WINDOWS UPDATE TRAVADO: Solução de Problemas do Update → deletar C:\\Windows\\SoftwareDistribution\\Download → DISM /Online /Cleanup-Image /RestoreHealth.
• DLL FALTANDO: Instalar Visual C++ Redistributable ou .NET Framework correspondente. sfc /scannow.
• VÍRUS/MALWARE: DESCONECTAR DA REDE. Notificar TI. Windows Defender + Malwarebytes. NUNCA pagar resgate.
• ESPAÇO BAIXO: cleanmgr. Esvaziar lixeira. %temp% → deletar tudo. Mover arquivos para OneDrive.
• TELA TRAVOU: Ctrl+Alt+Del → Gerenciador de Tarefas → Finalizar processo. Se não funcionar: segurar Power 10s.

▶ OFFICE / TEAMS / OUTLOOK:
• OFFICE NÃO ABRE: Ctrl+clique (modo seguro). Reparar via Painel de Controle.
• OUTLOOK OFFLINE: Enviar/Receber → desmarcar "Trabalhar Offline".
• OUTLOOK LENTO: Reduzir cache de e-mails. Reparar perfil. ScanPST para .ost/.pst corrompido.
• TEAMS SEM ÁUDIO: Configurações → Dispositivos → selecionar microfone/speaker. Verificar Privacidade → Microfone no Windows.
• TEAMS LENTO: Limpar cache: %appdata%\\Microsoft\\Teams (subpastas Cache, blob_storage, databases, GPUCache, Local Storage).
• CONTA NÃO ATIVADA: Verificar login com conta corporativa (@modaverao.com.br). Sair e entrar novamente.

▶ PERIFÉRICOS:
• MOUSE/TECLADO: Testar outra porta USB traseira. Verificar pilhas (sem fio). Gerenciador de Dispositivos → desinstalar/reinstalar.
• PENDRIVE NÃO APARECE: diskmgmt.msc → atribuir letra. Testar em outro computador. NÃO formatar se tiver dados importantes.
• MONITOR SEM SINAL: Selecionar entrada correta no monitor. Trocar cabo. Testar em outro computador.
• SEM ÁUDIO: Volume no mudo? Dispositivo de saída correto? Cabo verde (saída) não rosa (microfone)? Driver de áudio atualizado?
• LEITOR CÓDIGO DE BARRAS: Cursor no campo certo do sistema? Código danificado? Distância 5-30cm? Tipo de código suportado?

▶ PDV E LOJA:
• PINPAD/POS COM ERRO: Desligar 5s → aguardar 30s → religar. "Comunicação não estabelecida" = trocar porta USB.
• CAIXA/PDV OFFLINE: Verificar cabo de rede. F5 para recarregar. Reiniciar terminal.
• CÂMERA CFTV: Verificar alimentação e cabo de rede. IP da câmera: ping no CMD. Reiniciar NVR/DVR.
• NOBREAK BEEPANDO: Bipe rápido = em bateria (normal). Bipe lento = bateria fraca → salvar e desligar. 3+ anos = trocar bateria.
• LEITOR DE BALANÇA: Verificar porta COM/USB. Configuração de baud rate.

▶ SEGURANÇA E SENHAS:
• SENHA EXPIRADA (Windows/AD): Ctrl+Alt+Del → Alterar senha. Ou: passwordreset.microsoftonline.com.
• CONTA BLOQUEADA: Aguardar 30 min (automático) ou abrir chamado para TI desbloquear no AD.
• SUSPEITA DE VÍRUS: Desconectar da rede → notificar TI → Windows Defender + Malwarebytes.
• MFA (Autenticação de 2 fatores): Microsoft Authenticator no celular → aprovar solicitação quando aparecer.

▶ BACKUP E DADOS:
• ARQUIVO DELETADO: Verificar Lixeira → OneDrive (lixeira online) → Versões anteriores (clique direito na pasta).
• ONEDRIVE: Ícone na bandeja com check verde = sincronizado. Ícone com X = erro de sincronização. Verificar espaço disponível.
• HD COM DEFEITO: wmic diskdrive get status = "Pred Fail" → URGENTE fazer backup imediato e chamado para troca.

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
    // A. Filtrar inputs muito curtos ou ruídos (ex: "d", "f", "x")
    if (cleanMsg.length <= 2) {
      reply = `Oi! Estou por aqui. 😊 Pode descrever o problema com mais detalhes?`;
      return res.json({ reply, actions });
    }

    // ──────────────────────────────────────────────
    // EXTRAÇÃO DE SLOTS — APENAS mensagens do USUÁRIO
    // ──────────────────────────────────────────────
    const userMessages = history.filter(h => h.role === 'user').map(h => h.content || h.text || '');
    userMessages.push(message); // inclui mensagem atual

    let device = '';
    let brand   = '';
    let symptom = '';

    const scanUserText = (text) => {
      const t = text.toLowerCase();

      // Dispositivo
      if (t.includes('impressora') || t.includes('imprimir') || t.includes('impressão') || t.includes('etiqueta') || t.includes('toner') || t.includes('cartucho')) device = 'impressora';
      else if (t.includes('computador') || t.includes(' pc ') || t.includes('notebook') || t.includes('maquina') || t.includes('máquina') || t.includes('desktop') || t.includes('monitor') || t.includes('gabinete')) device = 'computador';
      else if (t.includes('vpn') || t.includes('forticlient') || t.includes('acesso remoto') || t.includes('rede')) device = 'vpn';
      else if ((t.includes('senha') || t.includes('login')) && !device) device = 'senha';

      // Marca
      if (t.includes('zebra') || t.includes('gc420') || t.includes('zd220')) brand = 'zebra';
      else if (t.includes('epson') || t.includes('l355') || t.includes('l3150') || t.includes('l3250') || t.includes('jato de tinta')) brand = 'epson';
      else if (t.includes(' hp ') || t.includes('laserjet') || t.includes('deskjet')) brand = 'hp';
      else if (t.includes('canon') || t.includes('pixma')) brand = 'canon';

      // Sintoma — do mais específico para o mais genérico
      // 1. Papel enroscado — requer contexto explícito
      if (t.includes('papel') && (t.includes('enroscado') || t.includes('atolado') || t.includes('preso') || t.includes('engolindo') || t.includes('engoliu') || t.includes('trancou'))) {
        symptom = 'papel';
      }
      // 2. Não liga / sem energia
      else if (t.includes('não liga') || t.includes('nao liga') || t.includes('não acende') || t.includes('sem energia') || t.includes('apagada') || t.includes('apagado') || t.includes('desligada') || t.includes('desligado') || t.includes('morreu') || t.includes('morta')) {
        symptom = 'desligado';
      }
      // 3. LED / luz piscando
      else if (t.includes('led') || t.includes('luz vermelha') || t.includes('vermelho') || (t.includes('piscando') && !t.includes('falha'))) {
        if (!symptom) symptom = 'led_vermelho';
      }
      // 4. Falha de impressão — manchas, listras
      else if ((t.includes('falha') || t.includes('falhando') || t.includes('mancha') || t.includes('listras') || t.includes('riscos') || t.includes('cor errada') || t.includes('desbotado') || t.includes('fraco') || t.includes('ruim')) &&
               (t.includes('imprim') || t.includes('impress'))) {
        symptom = 'falha_impressao';
      }
      // 5. Lento / travando
      else if (t.includes('travando') || t.includes('travado') || t.includes('trava') || t.includes('lento') || t.includes('lentidão') || t.includes('devagar') || t.includes('pesado') || t.includes('demora') || t.includes('demorando')) {
        if (!symptom) symptom = 'lento';
      }
      // 6. Erro de conexão / VPN
      else if (t.includes('98%') || t.includes('tempo limite') || t.includes('timeout') || t.includes('caindo') || t.includes('cai')) {
        if (!symptom) symptom = 'conexao_lenta';
      }
      // 7. Credenciais
      else if (t.includes('senha') || t.includes('credenciais') || t.includes('expirada') || t.includes('acesso negado') || t.includes('erro de login')) {
        if (!symptom) symptom = 'credenciais';
      }
    };

    for (const txt of userMessages) scanUserText(txt);

    // Última resposta da IA
    const lastAIReply = [...history].reverse().find(h => h.role === 'assistant' || h.role === 'model' || h.sender === 'ai')?.content || '';
    const lastAILow   = lastAIReply.toLowerCase();

    // ──────────────────────────────────────────────
    // B. DETECÇÃO RÁPIDA — tratamentos prioritários
    // ──────────────────────────────────────────────

    // B1. Problema resolvido
    const isResolved = (
      cleanMsg === 'funcionou' || cleanMsg === 'resolveu' || cleanMsg === 'deu certo' || cleanMsg === 'deu bom' ||
      cleanMsg.includes('já está funcionando') || cleanMsg.includes('ja esta funcionando') ||
      cleanMsg.includes('já funciona') || cleanMsg.includes('tá funcionando') || cleanMsg.includes('ta funcionando') ||
      cleanMsg.includes('voltou a funcionar') || cleanMsg.includes('ficou bom') || cleanMsg.includes('resolvido') ||
      cleanMsg.includes('tá bom') || cleanMsg.includes('ta bom') || cleanMsg.includes('está funcionando') ||
      cleanMsg.includes('esta funcionando') || cleanMsg.includes('funcionou') || cleanMsg.includes('consegui resolver')
    );
    if (isResolved) {
      const respostas = [
        `Ótimo! Fico feliz que resolveu! 😊 Se surgir mais algum problema, pode contar comigo. Bom trabalho!`,
        `Que bom! Problema resolvido é o melhor resultado. 🎉 Qualquer outra coisa, é só chamar!`,
        `Maravilha! Boa notícia essa. Se precisar de mais alguma coisa, estou por aqui! 👍`,
        `Perfeito! Fico feliz em ajudar. Se tiver outra dúvida ou problema, pode me chamar. 😊`
      ];
      reply = respostas[Math.floor(Math.random() * respostas.length)];
      return res.json({ reply, actions });
    }

    // B2. Agradecimento
    if (cleanMsg.includes('obrigado') || cleanMsg.includes('obrigada') || cleanMsg.includes('valeu') || cleanMsg === 'perfeito' || cleanMsg === 'entendi') {
      reply = `Imagina! Estou aqui para isso. Se tiver mais alguma dúvida ou problema, pode chamar! 👍`;
      return res.json({ reply, actions });
    }

    // B3. Saudações
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|e aí|eai)$/.test(cleanMsg)) {
      if (history.length > 0) {
        reply = `Oi! Em que posso te ajudar agora? 😊`;
      } else {
        reply = `Olá, ${req.user.name || 'colaborador'}! 😊 Sou o ProMais AI, seu assistente de suporte. Me conta o que está acontecendo que eu te ajudo!`;
      }
      return res.json({ reply, actions });
    }

    // B4. Intenção EXPLÍCITA de abrir chamado — PRIORIDADE MÁXIMA
    const isOpenTicketIntent = (
      cleanMsg.includes('abre chamado') || cleanMsg.includes('abrir chamado') || cleanMsg.includes('abra chamado') ||
      cleanMsg.includes('criar chamado') || cleanMsg.includes('cria chamado') || cleanMsg.includes('novo chamado') ||
      cleanMsg.includes('registre um chamado') || cleanMsg.includes('registra chamado') || cleanMsg.includes('quero abrir') ||
      cleanMsg.includes('abrir um chamado') || cleanMsg.includes('registrar chamado') ||
      cleanMsg.includes('preciso abrir') || cleanMsg.includes('pode abrir') || cleanMsg.includes('pode registrar')
    );

    if (isOpenTicketIntent) {
      let subject = 'Incidente registrado via Copiloto ProMais AI';
      if (device && brand) subject = `Problema em ${brand.charAt(0).toUpperCase() + brand.slice(1)} (${device})${symptom ? ' - ' + symptom.replace(/_/g, ' ') : ''}`;
      else if (device) subject = `Problema em ${device}${symptom ? ' - ' + symptom.replace(/_/g, ' ') : ''}`;

      const userContext = userMessages.slice(-5).join(' | ');
      const description = `Chamado registrado via Copiloto ProMais AI.\n\nRelato do usuário: "${message}"\n\nContexto da conversa: ${userContext}`;

      reply = `Perfeito! Vou registrar o chamado agora. ⚙️ Um segundo...`;
      actions = [{ type: 'create_ticket', payload: { subject, description, category: 'TI e Infraestrutura', priority: 'media' } }];
      return res.json({ reply, actions });
    }

    // ──────────────────────────────────────────────
    // C. FLUXO INVESTIGATIVO POR DISPOSITIVO
    // ──────────────────────────────────────────────

    if (aiInvestigativeMode) {

      // ── IMPRESSORA ──
      if (device === 'impressora') {
        if (!brand) {
          reply = `Entendi, tem um problema na impressora. Qual é a marca e o modelo? (ex: Zebra GC420, Epson L355, HP LaserJet) 🖨️`;
          return res.json({ reply, actions });
        }

        if (!symptom) {
          const brandDisplay = brand.charAt(0).toUpperCase() + brand.slice(1);
          reply = `Ok, **${brandDisplay}**! O que está acontecendo com ela? Ela não liga, está com led piscando, engolindo papel ou imprimindo com falhas?`;
          return res.json({ reply, actions });
        }

        // Zebra
        if (brand === 'zebra') {
          if (symptom === 'desligado') {
            if (lastAILow.includes('cabo de força') || lastAILow.includes('botão')) {
              if (cleanMsg.includes('não') || cleanMsg.includes('nada') || cleanMsg.includes('apagada') || cleanMsg.includes('continua')) {
                reply = `Poxa, então pode ser problema de fonte ou hardware. Preciso abrir um chamado para um técnico ir verificar — posso prosseguir? ⚙️`;
              } else {
                reply = `Boa! Ligou! E o led dela está verde fixo ou piscando alguma cor?`;
              }
            } else {
              reply = `Entendi. Primeiro: o cabo de força atrás da Zebra está bem encaixado na tomada? O botão na parte traseira está ligado? Me avisa o que apareceu. 🔌`;
            }
            return res.json({ reply, actions });
          }

          if (symptom === 'led_vermelho') {
            if (lastAILow.includes('recalibr') || lastAILow.includes('feed')) {
              if (cleanMsg.includes('não') || cleanMsg.includes('falhou') || cleanMsg.includes('continua') || cleanMsg.includes('ainda')) {
                reply = `Tudo bem, a calibração não resolveu. Vou abrir um chamado para um técnico verificar presencialmente. ⚙️`;
                actions = [{ type: 'create_ticket', payload: { subject: 'Impressora Zebra - Led vermelho piscando / Sem impressão', description: `Impressora Zebra com led vermelho. Usuário verificou papel, tampa e tentou calibração via botão Feed sem sucesso.`, category: 'TI e Infraestrutura', priority: 'media' } }];
              } else {
                reply = `Funcionou! Se o led ficou verde, pode mandar uma impressão de teste. Precisando é só chamar! 😊`;
              }
            } else if (lastAILow.includes('bobina') || lastAILow.includes('tampa')) {
              reply = `Legal. Agora tenta recalibrar: desligue a Zebra, segure o botão **Feed** na frente, ligue de novo sem soltar até o led piscar 2x, aí solta. Ela deve imprimir uma etiqueta. Funcionou? 🏷️`;
            } else {
              reply = `Led vermelho piscando na Zebra geralmente é falta de papel ou tampa aberta. Abre a impressora, confere se a bobina de etiqueta está bem encaixada e fecha com firmeza. O led mudou? 🖨️`;
            }
            return res.json({ reply, actions });
          }

          if (symptom === 'papel') {
            if (lastAILow.includes('travas amarelas') || lastAILow.includes('bobina')) {
              if (cleanMsg.includes('não') || cleanMsg.includes('preso') || cleanMsg.includes('continua') || cleanMsg.includes('rasgou')) {
                reply = `Entendido. O papel ficou preso internamente. Vou abrir um chamado para a equipe retirar sem danificar. ⚙️`;
                actions = [{ type: 'create_ticket', payload: { subject: 'Impressora Zebra - Papel enroscado internamente', description: `Zebra com papel/etiqueta presa internamente. Usuário abriu tampa e removeu bobina mas papel continua preso.`, category: 'TI e Infraestrutura', priority: 'media' } }];
              } else {
                reply = `Ótimo! Reinsira a bobina, feche a tampa e tente imprimir. Funcionou?`;
              }
            } else {
              reply = `Para retirar papel preso na Zebra: pressione as travas amarelas nas laterais para abrir a tampa, retire a bobina com cuidado e puxe o papel devagar. Conseguiu remover? 🖨️`;
            }
            return res.json({ reply, actions });
          }
        }

        // Epson
        if (brand === 'epson') {
          if (symptom === 'falha_impressao') {
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
