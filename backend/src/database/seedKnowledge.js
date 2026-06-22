/**
 * SEED DE BASE DE CONHECIMENTO COMPLETA DE TI
 * Execute: node src/database/seedKnowledge.js
 * Popula o banco com artigos completos de suporte técnico de TI.
 */
import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

const COMPANY_ID = 'comp-1';
const CREATED_BY = 'usr-1';
const CREATED_BY_NAME = 'João Paulo TI';
const now = new Date().toISOString();

const articles = [

  // ════════════════════════════════════════════════════════════
  // IMPRESSORAS — ZEBRA (ETIQUETAS TÉRMICAS)
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-zebra-001',
    title: 'Zebra — Led Vermelho Piscando / Sem Impressão',
    category: 'Impressoras',
    tags: ['zebra', 'led vermelho', 'etiqueta', 'nao imprime'],
    content: `SINTOMA: Impressora Zebra (GC420, ZD220, ZD410) com led vermelho piscando e não imprimindo etiquetas.

CAUSAS MAIS COMUNS:
- Falta de papel/etiqueta na bandeja
- Tampa superior aberta ou não travada corretamente
- Sensor de papel sujo ou descalibrado
- Driver corrompido no Windows

PROCEDIMENTO DE SOLUÇÃO:
1. Abra a tampa superior pressionando os botões laterais e verifique se a bobina de etiquetas está corretamente posicionada (face impressa para baixo, guias ajustadas).
2. Feche a tampa com firmeza até ouvir o "clique" de travamento.
3. Se o led continuar piscando, realize a CALIBRAÇÃO DO SENSOR:
   a. Desligue a impressora pelo botão traseiro (aguarde 5 segundos).
   b. Pressione e segure o botão FEED na frente da impressora.
   c. Ligue a impressora sem soltar o botão FEED.
   d. Mantenha pressionado até o led piscar 2 vezes (aprox. 5 segundos) e solte.
   e. A impressora vai avançar algumas etiquetas automaticamente — isso é normal.
4. Se após a calibração o problema persistir, reinstale o driver Zebra ZDesigner no Windows.
5. Caso nada resolva → Abrir chamado para suporte técnico presencial.

PREVENÇÃO: Utilize sempre bobinas de etiquetas homologadas pela Zebra. Bobinas genéricas podem causar falhas no sensor.`
  },

  {
    id: 'kb-zebra-002',
    title: 'Zebra — Impressão Borrada, Fraca ou Desalinhada',
    category: 'Impressoras',
    tags: ['zebra', 'impressao borrada', 'desalinhada', 'qualidade'],
    content: `SINTOMA: Zebra imprime mas as etiquetas saem com texto ilegível, borrado, muito claro ou com desalinhamento.

CAUSAS:
- Cabeçote de impressão sujo (acúmulo de resíduo de etiqueta)
- Densidade de impressão (escuridão) configurada incorretamente
- Velocidade de impressão muito alta para o tipo de etiqueta
- Cabeçote desgastado

PROCEDIMENTO:
1. LIMPEZA DO CABEÇOTE:
   a. Desligue a impressora e abra a tampa.
   b. Com um cotonete umedecido em álcool isopropílico 70%, limpe suavemente a linha verde/marrom do cabeçote (a barra que toca a etiqueta).
   c. Aguarde 2 minutos para secar completamente antes de ligar.
2. AJUSTE DE DENSIDADE: No ZDesigner ou no Painel de Controle da Zebra, aumente o valor de "Density/Darkness" em 2 pontos por vez até a impressão ficar nítida.
3. REDUÇÃO DE VELOCIDADE: Diminua a velocidade de impressão de 6 ips para 4 ips.
4. TESTE DE IMPRESSÃO: Segure o botão FEED por 5 segundos — a impressora emite um relatório de configuração. Verifique se está legível.

ATENÇÃO: Nunca use palito, esponja abrasiva ou solvente no cabeçote — pode danificá-lo permanentemente.`
  },

  {
    id: 'kb-zebra-003',
    title: 'Zebra — Não É Reconhecida pelo Windows (Offline)',
    category: 'Impressoras',
    tags: ['zebra', 'offline', 'driver', 'nao reconhece', 'usb'],
    content: `SINTOMA: A impressora Zebra aparece como "Offline" no Windows ou não é listada nos dispositivos.

CAUSAS:
- Cabo USB danificado ou mal encaixado
- Driver ZDesigner não instalado ou corrompido
- Conflito de porta COM ou USB
- Spooler de impressão travado

PROCEDIMENTO:
1. Verifique o cabo USB (troque por outro cabo se possível).
2. REINICIAR O SPOOLER DE IMPRESSÃO:
   a. Pressione Win+R, digite "services.msc" e pressione Enter.
   b. Localize "Spooler de Impressão", clique com botão direito → Reiniciar.
3. Se aparecer como Offline: No Painel de Controle → Dispositivos e Impressoras → Clique direito na Zebra → Ver o que está sendo impresso → Impressora → Desmarcar "Usar impressora offline".
4. REINSTALAR DRIVER:
   a. Baixe o ZDesigner em: zebra.com/us/en/support-downloads.html
   b. Remova a impressora do Windows completamente.
   c. Instale o driver novo → conecte o USB quando solicitado.
5. Teste imprimindo uma etiqueta de teste pelo ZDesigner.`
  },

  // ════════════════════════════════════════════════════════════
  // IMPRESSORAS — EPSON (JATO DE TINTA)
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-epson-001',
    title: 'Epson — Papel Enroscado / Atolamento',
    category: 'Impressoras',
    tags: ['epson', 'papel enroscado', 'atolamento', 'jam'],
    content: `SINTOMA: Impressora Epson (L355, L3150, L3250, L4160, L6190) com papel preso, alarme sonoro ou luz piscando.

PROCEDIMENTO DE REMOÇÃO SEGURA:
1. NÃO puxe o papel com força — pode rasgar e deixar pedaços dentro.
2. Desligue a impressora da tomada imediatamente.
3. Remova toda a pilha de folhas da bandeja de entrada.
4. Abra a tampa traseira de acesso (se disponível no modelo) e puxe o papel de trás para frente com as duas mãos, devagar.
5. Se não houver tampa traseira, abra a tampa frontal/superior e empurre o papel gentilmente para trás (direção de onde ele veio).
6. Use uma lanterna para verificar se ficou algum pedaço de papel rasgado dentro — pedaços esquecidos causam novos atolamentos.
7. Feche tudo e ligue a impressora → ela vai fazer um ciclo de reinicialização automática.
8. Coloque poucas folhas (máx. 10) e teste uma impressão antes de recarregar a bandeja completa.

CAUSAS FREQUENTES:
- Papel úmido ou ondulado (guarde o papel em local seco)
- Papel fora das especificações (use 75g/m² para uso geral)
- Bandeja sobrecarregada (limite máximo de 100 folhas)
- Fragmentos de papel de atolamentos anteriores

SE O PAPEL RASGOU DENTRO → Abrir chamado para limpeza interna técnica.`
  },

  {
    id: 'kb-epson-002',
    title: 'Epson — Impressão com Listras, Manchas ou Cores Erradas',
    category: 'Impressoras',
    tags: ['epson', 'listras', 'manchas', 'cabeçote', 'tinta'],
    content: `SINTOMA: Impressora Epson imprimindo com linhas horizontais, manchas, cores faltando ou impressão muito clara.

DIAGNÓSTICO POR TIPO DE PROBLEMA:
• LINHAS HORIZONTAIS → Cabeçote de impressão entupido (mais comum)
• COR ESPECÍFICA FALTANDO → Cartucho/tanque daquela cor vazio ou entupido
• MANCHAS DE TINTA → Rolo de impressão sujo ou cabeçote vazando
• IMPRESSÃO CLARA EM TUDO → Nível de tinta baixo em todos os tanques

PROCEDIMENTO — LIMPEZA DE CABEÇOTE:
1. No Windows: Painel de Controle → Dispositivos e Impressoras → clique direito na Epson → Preferências de impressão → aba Utilitários → Limpeza das cabeças de impressão.
2. Execute a limpeza (leva 3-4 minutos). A impressora vai usar um pouco de tinta.
3. Ao finalizar, clique em "Verificar bicos" → imprima o padrão de verificação.
4. Se ainda houver listras, execute mais 1 limpeza. Não faça mais de 3 limpezas seguidas (gasta muita tinta).
5. Se após 3 limpezas ainda houver problema → execute "Limpeza Poderosa" (nas impressoras L3150/L3250).

VERIFICAR NÍVEL DE TINTA:
- Nas impressoras L (tanque de tinta), verifique visualmente o nível nos reservatórios laterais.
- Se algum tanque estiver vazio ou abaixo da linha MIN → reabastecer com tinta original Epson.

ATENÇÃO: Use apenas tinta original Epson. Tintas genéricas podem entupir o cabeçote permanentemente.`
  },

  {
    id: 'kb-epson-003',
    title: 'Epson — Não Liga / Sem Energia',
    category: 'Impressoras',
    tags: ['epson', 'nao liga', 'sem energia', 'apagada'],
    content: `SINTOMA: Impressora Epson completamente apagada, sem nenhuma luz ao pressionar o botão Power.

VERIFICAÇÕES BÁSICAS:
1. Confirme que o cabo de força está bem encaixado na impressora (conector quadrado na parte traseira) e na tomada.
2. Teste a tomada com outro equipamento (carregador de celular, etc.) para garantir que tem energia.
3. Se estiver em régua de tomadas ou estabilizador, verifique se o dispositivo está ligado e o disjuntor não disparou.
4. Pressione o botão Power por 3 segundos (não apenas um toque rápido).
5. Verifique se há alguma trava de transporte (parafuso laranja) que esqueceram de remover em impressoras novas.

SE NÃO LIGAR MESMO ASSIM:
→ Provável falha na placa fonte ou fusível interno queimado. Necessita assistência técnica especializada.
→ Abrir chamado para suporte presencial.

NOTA: Impressoras Epson da linha L (L355, L3150) costumam travar em modo de proteção se a almofada de absorção de tinta estiver cheia. Nesse caso aparece uma luz âmbar piscando em código — abrir chamado para reset do contador.`
  },

  // ════════════════════════════════════════════════════════════
  // IMPRESSORAS — HP LASERJET
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-hp-001',
    title: 'HP LaserJet — Papel Enroscado (Erro 13)',
    category: 'Impressoras',
    tags: ['hp', 'laserjet', 'papel enroscado', 'erro 13'],
    content: `SINTOMA: HP LaserJet com display mostrando "Paper Jam", "Atolamento de papel" ou código de erro 13.xx.

PROCEDIMENTO:
1. Abra TODAS as tampas da impressora — parte frontal, traseira e bandejas.
2. NUNCA puxe o papel em sentido contrário ao da impressão — sempre puxe para frente (na direção em que o papel sairia normalmente).
3. Na HP LaserJet Pro, verifique especialmente:
   - Bandeja 1 (manual): puxe o papel pela frente.
   - Bandeja 2 (principal): remova a bandeja completamente, retire o papel preso.
   - Tampa traseira: abra e verifique a unidade de fusão (área quente — cuidado!).
4. Confirme que NENHUM pedaço de papel ficou para trás (use lanterna).
5. Feche todas as tampas e bandejas — a ordem não importa, mas tudo deve estar fechado.
6. Ligue e aguarde a auto-inicialização (pode levar 60 segundos).

ATENÇÃO: A área da UNIDADE DE FUSÃO fica extremamente quente durante a operação. Aguarde 10 minutos após desligar antes de tocar nessa área.`
  },

  {
    id: 'kb-hp-002',
    title: 'HP LaserJet — Impressão com Manchas de Toner ou Listras Verticais',
    category: 'Impressoras',
    tags: ['hp', 'laserjet', 'manchas', 'toner', 'listras', 'qualidade'],
    content: `SINTOMA: HP LaserJet imprimindo com manchas de pó de toner, listras verticais pretas/cinzas ou área escura ao longo da página.

DIAGNÓSTICO:
• LISTRAS VERTICAIS PRETAS → Cartucho de toner com risco no cilindro fotocondutora ou com toner espalhado internamente.
• MANCHA HORIZONTAL REPETITIVA → Rolo de transferência sujo. A distância entre repetições pode indicar qual componente tem o defeito.
• PÁGINA TODA ESCURA → Laser do sistema de imageamento com falha ou cartucho defeituoso.
• TONER NÃO FIXA (esfrega e sai) → Unidade de fusão desgastada ou temperatura incorreta.

PROCEDIMENTO:
1. Remova o cartucho de toner e sacuda-o suavemente de lado a lado (5-6 vezes) para redistribuir o pó. Reinstale.
2. Imprima uma página de limpeza: Em muitos modelos LaserJet, vá em Configurações da impressora → Ferramentas → Imprimir página de limpeza.
3. Se houver marcas físicas visíveis no cilindro (risco, arranhão) → O cartucho precisa ser substituído.
4. Verifique o nível de toner: Se abaixo de 10%, as manchas podem ser consequência do toner fraco.

TROCA DO CARTUCHO:
- Cartuchos originais HP garantem a qualidade. Cartuchos remanufaturados podem causar manchas.
- Ao instalar cartucho novo, retire a fita protetora laranja/amarela antes de inserir.`
  },

  // ════════════════════════════════════════════════════════════
  // COMPUTADORES — HARDWARE
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-pc-001',
    title: 'Computador — Não Liga / Sem Energia',
    category: 'Computadores',
    tags: ['computador', 'nao liga', 'sem energia', 'fonte', 'gabinete'],
    content: `SINTOMA: Computador (desktop) não dá nenhum sinal de vida ao apertar o botão Power.

VERIFICAÇÕES EM ORDEM:
1. TOMADA E CABO:
   - Cabo de força bem encaixado na parte traseira do gabinete (conector grande, 3 pinos).
   - Chave seletora de voltagem na fonte: confirme que está em 127V (Brasil São Paulo) ou 220V conforme a rede local.
   - Teste a tomada com outro aparelho.

2. ESTABILIZADOR/NOBREAK:
   - Verifique se o estabilizador está ligado (botão on/off e disjuntor).
   - Conecte o computador diretamente na tomada para descartar problema no estabilizador.

3. FONTE DE ALIMENTAÇÃO:
   - Se o gabinete tem chave de energia na parte traseira, verifique se está na posição "I" (ligado).
   - Fontes queimadas às vezes causam um "estalo" ao ligar. Se ouviu estalo → Fonte queimada → Abrir chamado.

4. BOTÃO DO GABINETE:
   - Raramente, o botão de ligar do gabinete pode travar. Tente pressionar com mais força.

5. LEDS E VENTILADORES:
   - Se algum led acender mas não iniciar → Problema de POST (ver artigo sobre tela preta).
   - Se nenhum led acender com tudo correto → Fonte queimada.

SOLUÇÃO TEMPORÁRIA: Se for nobreak, verifique a bateria — nobreaks com bateria morta podem não energizar o computador.`
  },

  {
    id: 'kb-pc-002',
    title: 'Computador — Liga mas Tela Fica Preta (Sem Imagem)',
    category: 'Computadores',
    tags: ['computador', 'tela preta', 'sem imagem', 'monitor', 'hdmi', 'vga'],
    content: `SINTOMA: Computador liga (fans giram, leds acendem) mas o monitor fica preto, sem sinal ou com mensagem "No Signal".

VERIFICAÇÕES EM ORDEM:
1. CABO DE VÍDEO (HDMI/VGA/DisplayPort):
   - Desconecte e reconecte firmemente nas duas extremidades (monitor e computador).
   - Troque o cabo se possível — cabos HDMI mal encaixados causam "No Signal" frequentemente.
   - Confirme que está conectado na SAÍDA CORRETA: placas de vídeo dedicadas têm saída própria (parte de baixo do gabinete), não use a saída integrada da placa-mãe se houver placa dedicada.

2. MONITOR:
   - Botão de energia do monitor está ligado? Led de energia está aceso?
   - Selecione a entrada correta no monitor (Menu → Input → HDMI 1 / HDMI 2 / VGA).
   - Teste o monitor em outro computador para descartar defeito no display.

3. MEMÓRIA RAM (BIPS NA INICIALIZAÇÃO):
   - Ouviu bips ao ligar? 1 bip longo repetido = problema de RAM.
   - SOLUÇÃO: Desligue, abra o gabinete, remova os pentes de RAM e os reinsira com firmeza (até ouvir o clique das travas laterais).

4. PLACA DE VÍDEO SOLTA:
   - Se houver placa de vídeo dedicada, ela pode estar solta do slot PCIe.
   - Desligue, abra o gabinete, remova e reinstale a placa de vídeo com firmeza.

5. POST TRAVADO:
   - Desconecte todos os periféricos USB (pen drives, HD externo, etc.) e tente religar.
   - Às vezes o BIOS fica tentando dar boot por um dispositivo USB.`
  },

  {
    id: 'kb-pc-003',
    title: 'Computador — Lento / Travando / Alta Utilização de CPU',
    category: 'Computadores',
    tags: ['computador', 'lento', 'travando', 'cpu', 'ram', 'desempenho'],
    content: `SINTOMA: Computador extremamente lento, travando ao abrir programas, mouse lento ou sistema irresponsivo.

DIAGNÓSTICO RÁPIDO:
1. Pressione Ctrl+Shift+Esc para abrir o Gerenciador de Tarefas.
2. Na aba "Desempenho" verifique:
   - CPU acima de 85%: algum processo está consumindo demais.
   - RAM acima de 90%: memória insuficiente.
   - Disco a 100%: HD mecânico sobrecarregado ou com problema.
3. Na aba "Processos", ordene por CPU ou Memória para identificar o culpado.

SOLUÇÕES POR CAUSA:
• PROCESSO SUSPEITO CONSUMINDO CPU → clique direito → Finalizar tarefa. Se for "antivirus", "windows update" ou "searchindexer" → espere concluir, é temporário.
• MUITOS PROGRAMAS NA INICIALIZAÇÃO → Ctrl+Shift+Esc → aba Inicialização → Desabilitar programas desnecessários.
• DISCO A 100% → Pode ser HD mecânico com setores defeituosos. Abrir chamado para verificação.
• MEMÓRIA RAM INSUFICIENTE → Feche navegadores e programas não usados. Se persistir, o computador precisa de mais RAM.

PROCEDIMENTO BÁSICO DE LIMPEZA:
1. Reinicie o computador (não apenas "desligar e ligar" — use Iniciar → Reiniciar).
2. Verifique e apague arquivos temporários: Win+R → %temp% → selecionar tudo → Deletar.
3. Esvazie a Lixeira.
4. Execute o Windows Defender (verificação rápida de vírus).`
  },

  {
    id: 'kb-pc-004',
    title: 'Computador — Tela Azul da Morte (BSOD)',
    category: 'Computadores',
    tags: ['computador', 'tela azul', 'bsod', 'crash', 'stop code'],
    content: `SINTOMA: Windows mostra uma tela azul com mensagem de erro (STOP CODE) e o computador reinicia.

CÓDIGOS COMUNS E CAUSAS:
• MEMORY_MANAGEMENT → Problema na memória RAM (pente com defeito ou mal encaixado).
• PAGE_FAULT_IN_NONPAGED_AREA → Driver corrompido, RAM ou HD com problema.
• IRQL_NOT_LESS_OR_EQUAL → Driver de dispositivo incompatível ou RAM.
• CRITICAL_PROCESS_DIED → Arquivo de sistema do Windows corrompido.
• DRIVER_POWER_STATE_FAILURE → Driver com problema ao sair do modo hibernação.
• NTFS_FILE_SYSTEM → Erro no sistema de arquivos (HD com problema).
• SYSTEM_SERVICE_EXCEPTION → Driver de software de terceiros com falha.

PROCEDIMENTO DE PRIMEIRO ATENDIMENTO:
1. Anote o STOP CODE exibido na tela azul.
2. Reinicie o computador — se for BSOD esporádico (1ª ocorrência), pode ser temporário.
3. Se o BSOD acontecer repetidamente:
   a. Inicialize em Modo Seguro (pressione F8 durante o boot ou Shift+Reiniciar no Windows 10/11).
   b. No Modo Seguro, abra o Visualizador de Eventos (eventvwr.msc) para ver o log completo do erro.
4. Execute o SFC: abra o CMD como Administrador → sfc /scannow → aguarde verificação dos arquivos de sistema.
5. Se suspeitar de RAM: execute o "Diagnóstico de Memória do Windows" (Win+R → mdsched.exe).

→ BSOD frequente = Abrir chamado imediatamente. Risco de perda de dados.`
  },

  {
    id: 'kb-pc-005',
    title: 'Computador — Superaquecimento / Fan Barulhento',
    category: 'Computadores',
    tags: ['computador', 'superaquecimento', 'fan', 'ventilador', 'barulho', 'temperatura'],
    content: `SINTOMA: Computador desliga sozinho, fica quente ao toque, ventilador fazendo barulho excessivo ou em alta velocidade constante.

CAUSAS FREQUENTES:
- Acúmulo de poeira nas entradas de ar e cooler da CPU
- Pasta térmica ressecada entre CPU e cooler (equipamentos com mais de 3 anos)
- Cooler defeituoso ou parado
- Bloqueio nas saídas de ar do gabinete
- Ambiente com temperatura muito alta (acima de 35°C)

VERIFICAÇÕES IMEDIATAS:
1. Verifique a temperatura da CPU: download do HWMonitor ou use o Gerenciador de Tarefas → Desempenho → CPU → temperatura (se disponível).
   - Temperatura NORMAL em idle: 30-50°C
   - Temperatura NORMAL sob carga: 60-80°C
   - PREOCUPANTE: acima de 90°C → pode causar desligamento automático.
2. Verifique se há obstrução nas saídas de ar do gabinete (laterais, traseira).

PROCEDIMENTO:
1. Desligue o computador completamente e desconecte da tomada.
2. LIMPEZA DE POEIRA: Com ar comprimido (em lata ou compressor), sopre os coolers, entradas e saídas de ar. Faça isso do lado de fora, não dentro do gabinete.
3. Verifique se o cooler da CPU está girando (após ligar, observe pela grade do gabinete).
4. Se o cooler estiver parado → Abrir chamado para substituição urgente.
5. Se a temperatura continuar alta após a limpeza → Abrir chamado para troca de pasta térmica.`
  },

  {
    id: 'kb-pc-006',
    title: 'Notebook — Bateria Não Carrega ou Dura Pouco',
    category: 'Computadores',
    tags: ['notebook', 'bateria', 'carregador', 'nao carrega', 'dura pouco'],
    content: `SINTOMA: Notebook não carrega, carrega muito lento, indica "Conectado, não carregando" ou a bateria dura muito menos que antes.

VERIFICAÇÕES:
1. CARREGADOR:
   - Verifique se o pino do conector está dobrado ou o fio está pelado.
   - Toque no carregador após 30 minutos: se não estiver morno (frio demais pode indicar que não está funcionando), há problema.
   - Teste com outro carregador de mesma voltagem/amperagem se possível.
2. PORTA DE CARREGAMENTO:
   - Verifique se há sujeira ou dano na porta.
   - Se for USB-C, tente outra porta USB-C do notebook.
3. WINDOWS — "CONECTADO, NÃO CARREGANDO":
   a. Clique direito no ícone da bateria na barra de tarefas → Configurações de energia.
   b. Alguns notebooks têm uma configuração de "limite de carga" (como Dell, Lenovo) — verifique no software do fabricante se o limite está em 80%.

BATERIA QUE DURA POUCO:
- Baterias de Li-Ion duram em média 2-4 anos com uso normal.
- Verifique a saúde da bateria: abra CMD como Admin → powercfg /batteryreport → o relatório será salvo em C:\\Windows\\System32.
- Se a capacidade de carga estiver abaixo de 50% da original → Abrir chamado para substituição de bateria.

ATENÇÃO: Nunca use o notebook com bateria inchada (estufada) — risco de incêndio. Abrir chamado urgente.`
  },

  // ════════════════════════════════════════════════════════════
  // REDE E CONECTIVIDADE
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-rede-001',
    title: 'Rede — Computador Sem Internet / Sem Rede',
    category: 'Rede e Conectividade',
    tags: ['rede', 'internet', 'sem conexao', 'cabo de rede', 'wifi'],
    content: `SINTOMA: Computador sem acesso à internet ou à rede interna da empresa. Ícone de rede com "X" vermelho ou triângulo amarelo.

DIAGNÓSTICO — CABLADO (RJ45):
1. Verifique o led do conector RJ45 na traseira do computador: deve estar piscando verde ou âmbar.
   - APAGADO: cabo desconectado ou switch sem energia.
   - VERDE FIXO: conectado mas sem atividade → problema de configuração.
2. Troque o cabo de rede por outro para descartar cabo defeituoso.
3. Verifique se o switch/hub ao qual está conectado está ligado (leds ativos).
4. Abra o CMD: ping 8.8.8.8 → se responder, a rede está OK mas pode ser problema de DNS.

DIAGNÓSTICO — WI-FI:
1. Verifique se o Wi-Fi está ativado (tecla Fn + F5 em muitos notebooks, ou ícone na bandeja do sistema).
2. Esqueça a rede e conecte novamente:
   - Clique no ícone de rede → clique na rede → Desconectar → clicar novamente → inserir senha.
3. Reinicie o roteador Wi-Fi (desliga da tomada, aguarda 30s, liga).

PROCEDIMENTO GERAL:
1. CMD como Admin → netsh winsock reset → Reiniciar o computador.
2. CMD como Admin → ipconfig /flushdns
3. CMD como Admin → ipconfig /release → ipconfig /renew

→ Se nada funcionar, abrir chamado para a equipe de redes verificar o switch/roteador.`
  },

  {
    id: 'kb-rede-002',
    title: 'VPN — Erro de Conexão FortiClient',
    category: 'Rede e Conectividade',
    tags: ['vpn', 'forticlient', 'fortinet', 'acesso remoto', 'timeout', '98%'],
    content: `SINTOMA: FortiClient VPN não conecta, trava em porcentagem (geralmente 40% ou 98%) ou dá erro de credenciais.

ERROS E SOLUÇÕES:

ERRO "Credential or ssl vpn configuration is wrong":
→ Usuário ou senha incorretos. Verifique se a senha do Active Directory não está expirada. Tente acessar o Outlook Web ou Teams para confirmar. Se não acessar → Senha expirada → Abrir chamado para reset.

ERRO "Unable to establish the VPN connection" ou TRAVA EM 40%:
1. Reinicie o roteador de internet (aguarde 2 minutos).
2. Desative temporariamente o antivírus (Windows Defender ou outro) e tente conectar.
3. Feche o FortiClient completamente (Ctrl+Shift+Esc → finalizar processo FortiClient) e abra novamente.
4. Tente conectar em outra rede (dados móveis do celular) para saber se é problema na rede local.

TRAVA EM 98% (mais comum):
1. Causa: conflito de driver de VPN com outros softwares de rede (Cisco Webex, antivírus, etc.).
2. No Gerenciador de Dispositivos → Adaptadores de Rede → Remova o adaptador "Fortinet SSL VPN Virtual Ethernet Adapter".
3. Reinicie o computador. O FortiClient reinstalará o adaptador automaticamente.
4. Tente conectar.

GERAL:
- Versão do FortiClient desatualizada pode causar problemas. Verificar a versão atual instalada.
- Porta 443 bloqueada no roteador pode impedir a conexão (menos comum em redes domésticas).`
  },

  {
    id: 'kb-rede-003',
    title: 'Wi-Fi — Conexão Instável ou Velocidade Baixa',
    category: 'Rede e Conectividade',
    tags: ['wifi', 'instavel', 'lento', 'sinal fraco', 'conexao cai'],
    content: `SINTOMA: Wi-Fi conecta mas a conexão fica caindo, velocidade baixa ou sinal fraco.

CAUSAS COMUNS:
- Distância do roteador muito grande
- Muitos dispositivos conectados na mesma rede
- Interferência de outros aparelhos (microondas, telefone sem fio)
- Canal Wi-Fi congestionado
- Driver da placa Wi-Fi desatualizado

SOLUÇÕES:
1. POSICIONAMENTO: Aproxime-se do roteador. Paredes grossas e metalon reduzem drasticamente o sinal.
2. REINICIAR O ROTEADOR: Desconecte da tomada, aguarde 30 segundos, reconecte. Aguarde 2 minutos para estabilizar.
3. FORÇAR BANDA 5GHz (se disponível): Redes 5GHz são mais rápidas e menos congestionadas. Procure o SSID com "_5G" no nome.
4. ATUALIZAR DRIVER Wi-Fi:
   - Gerenciador de Dispositivos → Adaptadores de Rede → Clique direito na placa Wi-Fi → Atualizar driver.
5. MUDAR CANAL DO ROTEADOR: Acesse o painel do roteador (192.168.0.1 ou 192.168.1.1) e mude o canal Wi-Fi de "Auto" para o canal 6 ou 11 (2.4GHz) ou canal 36 (5GHz).
6. DNS RÁPIDO: CMD como Admin → netsh interface ip set dns "Wi-Fi" static 1.1.1.1

→ Se o problema for de roteador/switch da empresa → Abrir chamado para a equipe de redes.`
  },

  // ════════════════════════════════════════════════════════════
  // SISTEMA OPERACIONAL — WINDOWS
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-win-001',
    title: 'Windows — Computador Lento na Inicialização',
    category: 'Sistema Operacional',
    tags: ['windows', 'lento', 'inicializacao', 'boot', 'startup'],
    content: `SINTOMA: Windows demora muito para inicializar (mais de 3 minutos da tela de login até o desktop funcional).

CAUSAS:
- Muitos programas configurados para iniciar com o Windows
- HD mecânico (HDD) lento ou com setores defeituosos
- Vírus/malware interferindo
- Windows Update pendente rodando em segundo plano

SOLUÇÕES:
1. DESATIVAR INICIALIZAÇÃO AUTOMÁTICA DE PROGRAMAS:
   - Ctrl+Shift+Esc → aba Inicialização → Clique direito nos programas → Desabilitar (mantenha apenas Antivírus e drivers essenciais).
2. ATIVAR INICIALIZAÇÃO RÁPIDA:
   - Painel de Controle → Opções de Energia → Escolher a função dos botões → Ativar inicialização rápida.
3. DESFRAGMENTAR O DISCO (apenas para HDD):
   - Abrir "Desfragmentar e otimizar unidades" no menu Iniciar → Otimizar.
   - SSD NÃO precisa de desfragmentação.
4. VERIFICAR VÍRUS: Execute o Windows Defender (verificação completa).
5. SFC E DISM:
   - CMD Admin → sfc /scannow
   - CMD Admin → DISM /Online /Cleanup-Image /RestoreHealth

RECOMENDAÇÃO: Computadores com HDD e mais de 5 anos de uso que continuam lentos se beneficiam muito de uma troca por SSD. Abrir chamado para avaliação de upgrade.`
  },

  {
    id: 'kb-win-002',
    title: 'Windows — Disco a 100% no Gerenciador de Tarefas',
    category: 'Sistema Operacional',
    tags: ['windows', 'disco 100%', 'hd lento', 'travando', 'desempenho'],
    content: `SINTOMA: Gerenciador de Tarefas mostra "Disco" a 100% constantemente, computador extremamente lento.

CAUSAS FREQUENTES:
- Windows Update rodando em background
- Windows Search (indexação) consumindo o HD
- Serviço Superfetch/SysMain sobrecarregado
- HD mecânico com setores defeituosos
- Vírus/malware

SOLUÇÕES EM ORDEM:
1. AGUARDAR: Se o Windows acabou de iniciar ou está com atualização pendente, aguarde 15-20 minutos — a indexação/atualização terminará sozinha.
2. DESATIVAR SUPERFETCH:
   - Win+R → services.msc → Localize "SysMain" → Clique direito → Propriedades → Tipo de inicialização: Desativado → Parar → OK.
3. DESATIVAR WINDOWS SEARCH (INDEXAÇÃO):
   - services.msc → "Windows Search" → Desativado → Parar.
4. VERIFICAR SAÚDE DO HD:
   - CMD Admin → wmic diskdrive get status → se retornar "Pred Fail" → HD com defeito → Abrir chamado urgente (risco de perda de dados).
5. CONFIGURAR MEMÓRIA VIRTUAL:
   - Painel de Controle → Sistema → Configurações avançadas → Desempenho → Configurações → Avançado → Alterar.
   - Desmarque "Gerenciar tamanho automaticamente".
   - Tamanho inicial: 1.5x a RAM disponível. Tamanho máximo: 3x a RAM.

→ HD com mais de 5 anos ou SSD com mais de 7 anos: recomendar substituição preventiva.`
  },

  {
    id: 'kb-win-003',
    title: 'Windows — Erro ao Abrir Programas / DLL Faltando',
    category: 'Sistema Operacional',
    tags: ['windows', 'dll', 'erro', 'programa nao abre', 'runtime'],
    content: `SINTOMA: Programas não abrem, mensagem de erro "DLL não encontrada" ou "MSVCR140.dll está faltando".

ERROS COMUNS E SOLUÇÕES:
• "VCRUNTIME140.dll" ou "MSVCP140.dll":
  → Instalar Microsoft Visual C++ Redistributable (2015-2022) no site oficial da Microsoft.

• "MSVCR110.dll" ou "MSVCR120.dll":
  → Instalar Visual C++ Redistributable correspondente à versão.

• ".NET Framework não encontrado":
  → Painel de Controle → Programas e Recursos → Ativar ou desativar recursos do Windows → ativar o .NET Framework necessário.
  → Ou baixar no site oficial da Microsoft.

• "DirectX Error":
  → Executar dxdiag no Win+R para ver a versão atual.
  → Reinstalar DirectX via Windows Update ou baixar DirectX End-User Runtime.

PROCEDIMENTO GERAL PARA PROGRAMA QUE NÃO ABRE:
1. Clique direito no ícone do programa → Executar como Administrador.
2. Desinstale e reinstale o programa.
3. Verifique se o programa é compatível com a versão do Windows instalada.
4. CMD Admin → sfc /scannow (pode reparar DLLs corrompidas do sistema).

→ Se o problema persistir em múltiplos programas → Pode ser necessário reparo ou reinstalação do Windows → Abrir chamado.`
  },

  {
    id: 'kb-win-004',
    title: 'Windows Update — Falha ou Travado',
    category: 'Sistema Operacional',
    tags: ['windows update', 'atualizacao', 'travado', 'falha', 'erro'],
    content: `SINTOMA: Windows Update travado em alguma porcentagem, falha ao baixar/instalar atualizações, ou mensagem de erro.

CÓDIGOS COMUNS:
• 0x80070002 / 0x80070003: Arquivos de atualização corrompidos.
• 0x8024402F: Problema de conexão com os servidores Microsoft.
• 0x80073712: Arquivo de atualização corrompido.

PROCEDIMENTO DE CORREÇÃO:
1. WINDOWS UPDATE TROUBLESHOOTER:
   - Configurações → Atualização e Segurança → Solucionar problemas → Windows Update → Executar.
2. LIMPAR CACHE DO WINDOWS UPDATE:
   - CMD Admin → net stop wuauserv
   - CMD Admin → net stop bits
   - Abra o Explorador: C:\\Windows\\SoftwareDistribution\\Download → selecione tudo → Delete.
   - CMD Admin → net start wuauserv
   - CMD Admin → net start bits
   - Tente atualizar novamente.
3. DISM E SFC:
   - CMD Admin → DISM /Online /Cleanup-Image /RestoreHealth (pode demorar 15-30 min)
   - CMD Admin → sfc /scannow
4. REINICIAR E TENTAR NOVAMENTE.

NOTA: Nunca interrompa o Windows durante a instalação de atualizações (quando aparece "Não desligue o computador"). Interrupções nessa fase podem corromper o sistema.`
  },

  // ════════════════════════════════════════════════════════════
  // MICROSOFT OFFICE E PRODUTIVIDADE
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-office-001',
    title: 'Microsoft Office — Trava ao Abrir / Erro de Ativação',
    category: 'Aplicativos',
    tags: ['office', 'word', 'excel', 'powerpoint', 'ativacao', 'nao abre'],
    content: `SINTOMA: Word, Excel ou PowerPoint travam ao abrir, demoram muito ou mostram mensagem de ativação/licença.

SOLUÇÃO POR TIPO DE ERRO:
TRAVA AO INICIAR:
1. Abra o Word/Excel em Modo de Segurança: Segure a tecla CTRL ao clicar no ícone do programa.
2. Se abrir no modo de segurança → Um suplemento (add-in) está causando o problema.
   - Arquivo → Opções → Suplementos → Gerenciar: Suplementos COM → Desmarque todos → Reinicie.
3. Repare o Office: Painel de Controle → Programas → Microsoft Office → Alterar → Reparo Rápido.

ERRO DE ATIVAÇÃO / PRODUTO NÃO ATIVADO:
1. Verifique se o usuário está logado com a conta corporativa (ex: joao@modaverao.com.br).
2. Abra qualquer aplicativo Office → Arquivo → Conta → Verificar a conta conectada.
3. Sair e entrar novamente com a conta corporativa.
4. Se aparecer "Sua assinatura expirou" → Abrir chamado para a TI verificar a licença Microsoft 365.

ARQUIVO CORROMPIDO:
- Word/Excel não abre um arquivo específico → Tente abrir pelo menu Arquivo → Abrir → navegar → clique na seta ao lado de "Abrir" → Abrir e Reparar.`
  },

  {
    id: 'kb-office-002',
    title: 'Microsoft Teams — Problemas de Áudio, Vídeo ou Conexão',
    category: 'Aplicativos',
    tags: ['teams', 'audio', 'video', 'microfone', 'camera', 'reuniao'],
    content: `SINTOMA: Microsoft Teams com problemas de microfone, câmera, sem áudio nas reuniões ou mensagens não chegando.

MICROFONE NÃO FUNCIONA:
1. Verifique permissões de microfone: Configurações do Windows → Privacidade → Microfone → Permitir que aplicativos de desktop acessem o microfone → Ativado.
2. No Teams: Perfil (foto) → Configurações → Dispositivos → selecione o microfone correto.
3. Teste o microfone: Configurações do Teams → Dispositivos → Fazer chamada de teste.

CÂMERA NÃO APARECE:
1. Configurações do Windows → Privacidade → Câmera → Permitir que aplicativos acessem a câmera → Ativado.
2. Gerenciador de Tarefas: verifique se outro aplicativo está usando a câmera ao mesmo tempo (Zoom, WebEx, etc.).
3. No Teams → Configurações → Dispositivos → selecione a câmera correta.

SEM ÁUDIO (ALTO-FALANTE):
1. Teams → Configurações → Dispositivos → Selecione o alto-falante correto.
2. Verifique se o áudio não está em mudo na reunião (ícone de auto-falante no painel da call).
3. Volume do Windows → barra de tarefas → verifique se o Teams não está com volume zero no mixer de volume.

TEAMS LENTO OU NÃO CARREGA:
1. Feche e reabra o Teams (clique direito no ícone na bandeja → Fechar/Quit).
2. Limpe o cache: feche o Teams → pasta %appdata%\\Microsoft\\Teams → apague o conteúdo das subpastas: Cache, blob_storage, databases, GPUCache, Local Storage.
3. Reinstale o Teams se o problema persistir.`
  },

  // ════════════════════════════════════════════════════════════
  // PERIFÉRICOS
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-perifericos-001',
    title: 'Mouse ou Teclado — Não Funciona / Intermitente',
    category: 'Periféricos',
    tags: ['mouse', 'teclado', 'nao funciona', 'usb', 'sem fio'],
    content: `SINTOMA: Mouse ou teclado não responde, funciona de forma intermitente ou não é reconhecido pelo Windows.

MOUSE/TECLADO COM FIO (USB):
1. Tente outra porta USB (as traseiras do gabinete são mais confiáveis que as frontais).
2. Desconecte e reconecte o dispositivo.
3. Teste em outro computador para saber se é o dispositivo ou o computador que tem problema.
4. Gerenciador de Dispositivos: verifique se há ícone de erro (!) em "Dispositivos de Interface Humana" ou "Mouses e outros dispositivos apontadores".
5. Desinstale o dispositivo no Gerenciador e reconecte — o Windows vai reinstalar o driver.

MOUSE/TECLADO SEM FIO (BLUETOOTH):
1. Verifique a carga das pilhas/bateria → substitua se necessário.
2. Remova o receptor USB (dongle), aguarde 10 segundos e reinsira.
3. Bluetooth: Configurações → Bluetooth → Remova o dispositivo e emparelhe novamente.
4. Verifique se o modo de economia de energia está desligando o receptor: Gerenciador de Dispositivos → Controladores USB → clique direito → Propriedades → Gerenciamento de Energia → desmarque "Permitir que o computador desligue este dispositivo para economizar energia".

TECLADO COM TECLAS TRAVADAS:
- Se estiver digitando só maiúsculas → Caps Lock ativado. Pressione Caps Lock.
- Se teclado numérico não funciona → Num Lock desativado. Pressione Num Lock.
- Se as teclas produzem caracteres errados → Layout de teclado errado (ex: EN em vez de PT-BR). Barra de tarefas → idioma → PT-BR.`
  },

  {
    id: 'kb-perifericos-002',
    title: 'Monitor — Sem Sinal, Cores Erradas ou Riscos na Tela',
    category: 'Periféricos',
    tags: ['monitor', 'sem sinal', 'cores', 'riscos', 'tela', 'display'],
    content: `SINTOMA: Monitor exibindo mensagem "No Signal", cores distorcidas, riscos na tela ou piscando.

SEM SINAL:
1. Verifique se o computador está ligado e passando do POST (ouvir o fan girando, leds acendem).
2. Confirme a entrada selecionada no monitor (botão MENU do monitor → Input → HDMI/VGA/DP).
3. Reconecte o cabo de vídeo firmemente nas duas pontas.
4. Troque o cabo por outro modelo se disponível (especialmente cabos HDMI antigos com 1 lado dobrado).
5. Teste o monitor em outro computador ou TV.
6. Teste com outro monitor no computador.

CORES ERRADAS OU DISTORCIDAS:
1. Pode ser problema no cabo HDMI/VGA (cabo com fio interno rompido).
2. Clique direito na área de trabalho → Configurações de vídeo → confirme que a resolução está correta para o monitor.
3. Calibrar cores: Painel de Controle → Gerenciamento de Cores → Calibrar cores da tela.

TELA PISCANDO:
1. Atualizar drivers de vídeo: Gerenciador de Dispositivos → Adaptadores de vídeo → Atualizar driver.
2. Verifique a taxa de atualização (refresh rate): Configurações → Tela → Configurações avançadas de vídeo → Taxa de atualização → selecione 60Hz (ou a taxa máxima do monitor).
3. Se picar em frequência específica → Placa de vídeo com defeito ou superaquecimento → Abrir chamado.

RISCOS OU MANCHAS FÍSICAS NA TELA:
→ Dano físico no painel LCD. Abrir chamado para avaliação/substituição do monitor.`
  },

  {
    id: 'kb-perifericos-003',
    title: 'Pendrive / HD Externo — Não Reconhecido pelo Windows',
    category: 'Periféricos',
    tags: ['pendrive', 'hd externo', 'usb', 'nao reconhece', 'formatar'],
    content: `SINTOMA: Pendrive ou HD externo inserido na USB mas não aparece no Windows Explorer.

PROCEDIMENTO:
1. VERIFICAR NO GERENCIAMENTO DE DISCO:
   - Win+R → diskmgmt.msc → verifique se o dispositivo aparece na lista (pode estar sem letra de unidade ou sem partição).
   - Se aparecer sem letra: clique direito → Alterar letra de unidade → atribua uma letra (ex: E:).
   - Se aparecer como "Não alocado": pode ser necessário formatar (ATENÇÃO: formatar apaga todos os dados).
2. TROCAR PORTA USB: Use uma porta USB diferente (traseira do gabinete).
3. TESTAR EM OUTRO COMPUTADOR: Para saber se o problema é no dispositivo ou no computador.
4. ATUALIZAR DRIVERS USB:
   - Gerenciador de Dispositivos → Controladores de barramento USB → clique direito → Verificar se há atualizações.
5. DISK PART (avançado):
   - CMD Admin → diskpart → list disk → select disk X (número do pendrive) → list partition.
6. VERIFICAÇÃO DE ERROS:
   - Quando o drive aparecer → clique direito → Propriedades → Ferramentas → Verificar.

ATENÇÃO: Se o pendrive/HD aparecer como "RAW" no Gerenciamento de Disco e contém dados importantes → NÃO formate → Abrir chamado para recuperação de dados antes de qualquer ação.`
  },

  // ════════════════════════════════════════════════════════════
  // SEGURANÇA DE TI
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-seguranca-001',
    title: 'Vírus / Malware — Computador Infectado',
    category: 'Segurança',
    tags: ['virus', 'malware', 'ransomware', 'infectado', 'segurança'],
    content: `SINTOMA: Computador com pop-ups excessivos, programas abrindo sozinhos, antivírus alertando, ou arquivos com extensão estranha.

SINAIS DE INFECÇÃO:
- Arquivos com extensão desconhecida (.locky, .encrypted, .zepto)
- Pop-ups pedindo pagamento em Bitcoin → RANSOMWARE
- Browser redirecionando para sites estranhos → Adware/Hijacker
- Computador muito lento com CPU/Rede a 100% sem motivo → Cryptominer
- Mensagem pedindo dados bancários ou senha → Phishing

PROCEDIMENTO DE EMERGÊNCIA:
1. DESCONECTE DA REDE IMEDIATAMENTE (tire o cabo de rede ou desabilite o Wi-Fi). Isso impede a propagação para outros computadores da rede.
2. NÃO DESLIGUE o computador se suspeitar de ransomware — arquivos em memória RAM podem ser úteis para análise forense.
3. NOTIFIQUE A TI IMEDIATAMENTE — chame o técnico ou abra chamado urgente.
4. NÃO PAGUE RESGATES → não há garantia de recuperação e financia criminosos.

LIMPEZA (após notificar TI):
1. Execute verificação completa com Windows Defender.
2. Execute Malwarebytes (gratuito): baixe, instale e faça varredura completa.
3. Para browser infectado: Configurações do Chrome/Edge → Redefinir configurações → Restaurar configurações padrão.

PREVENÇÃO:
- Nunca abra anexos de e-mails desconhecidos.
- Nunca instale programas de fontes não confiáveis.
- Mantenha o Windows e antivírus sempre atualizados.`
  },

  {
    id: 'kb-seguranca-002',
    title: 'Senhas — Como Gerenciar e Redefinir Senhas Corporativas',
    category: 'Segurança',
    tags: ['senha', 'password', 'active directory', 'microsoft', 'redefinir', 'expirada'],
    content: `PROCEDIMENTOS DE GERENCIAMENTO DE SENHAS CORPORATIVAS

SENHA WINDOWS/ACTIVE DIRECTORY EXPIRADA:
- Se ainda conseguir fazer login → pressione Ctrl+Alt+Del → "Alterar senha".
- Se não conseguir → precisa de reset pelo TI → Abrir chamado.
- Portal de reset: passwordreset.microsoftonline.com (requer método de verificação cadastrado).

SENHA MICROSOFT 365 (E-MAIL, TEAMS, SHAREPOINT):
- Geralmente é a mesma senha do Windows/AD corporativo.
- Para redefinir: portal.microsoftonline.com → Problemas para entrar?

REQUISITOS DE SENHA CORPORATIVA:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial (!, @, #, $)
- Não pode repetir as últimas 5 senhas
- Expiração: a cada 90 dias (configuração padrão)

BOAS PRÁTICAS:
- NUNCA compartilhe sua senha com colegas, nem com a TI (técnicos legítimos NUNCA pedem sua senha).
- Use senhas diferentes para cada sistema.
- Ative o MFA (Autenticação de Dois Fatores) quando disponível.
- Não anote senhas em papéis colados no monitor.

CONTA BLOQUEADA (muitas tentativas erradas):
→ Aguarde 30 minutos (bloqueio automático temporário) ou Abrir chamado para TI desbloquear no Active Directory.`
  },

  // ════════════════════════════════════════════════════════════
  // PDV E SISTEMAS INTERNOS
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-pdv-002',
    title: 'PDV / Caixa — Terminal de Pagamento (POS/Pinpad) com Erro',
    category: 'Sistemas',
    tags: ['pdv', 'pos', 'pinpad', 'caixa', 'pagamento', 'maquininha'],
    content: `SINTOMA: Terminal de pagamento (Pinpad/POS) não processa transações, dá erro de comunicação ou tela preta.

VERIFICAÇÕES:
1. COMUNICAÇÃO:
   - Terminal conectado via USB? Verifique se o cabo está bem encaixado nos dois lados.
   - Terminal conectado via rede (IP)? Verifique o cabo de rede e se a rede está ativa.
   - Terminal com Wi-Fi? Verifique se está conectado na rede da loja.
2. ENERGIA:
   - POS com bateria: verifique se a bateria não descarregou.
   - Terminal de mesa: verifique o adaptador de energia.

REINICIALIZAÇÃO (solução para 80% dos casos):
1. Desligue o terminal de pagamento completamente (botão de energia por 5 segundos).
2. Aguarde 30 segundos.
3. Ligue novamente e aguarde o boot completo (pode levar 2-3 minutos).
4. Teste uma transação de pequeno valor.

ERROS COMUNS:
• "Comunicação não estabelecida" → Problema no cabo USB ou porta do computador. Troque a porta USB.
• "TPN Inativo" → Sistema de pagamento do banco está fora. Aguardar normalização.
• "Cartão não suportado" → Cartão com chip danificado ou tarja magnética desgastada — pedir ao cliente outro meio de pagamento.
• "Timeout" → Lentidão na rede da loja → Verificar conexão de internet.

ROLETA DE PAPEL PINPAD:
- Abre a tampa do compartimento de papel (geralmente na lateral).
- Insira o papel com o lado liso para dentro e a borda exposta.

→ Transação financeira com erro sem solução → Abrir chamado urgente.`
  },

  {
    id: 'kb-pdv-003',
    title: 'Leitor de Código de Barras — Não Lê ou Não é Reconhecido',
    category: 'Periféricos',
    tags: ['leitor', 'codigo de barras', 'scanner', 'nao le', 'beep'],
    content: `SINTOMA: Leitor de código de barras não emite beep, não lê os códigos ou não aparece no sistema.

VERIFICAÇÕES:
1. CABO E PORTA:
   - Reconecte o cabo USB.
   - Teste em outra porta USB.
   - Se for leitor PS/2 (conector roxo) → conector específico, não funciona em USB sem adaptador.
2. LEITOR DE GATILHO:
   - O leitor precisa do gatilho pressionado para leitura? Ou é omnidirecional?
   - Omnidireccional: deve acender o laser assim que ligado — se não acender → problema de energia.
3. CÓDIGO NÃO LIDO:
   - Código de barras amassado, rasgado ou coberto por plástico muito reflexivo.
   - Distância incorreta — a maioria dos leitores tem um range ótimo de 5-30cm.
   - Tipo de código não suportado: verifique se o leitor suporta o formato do código (EAN-13, Code 128, QR Code, etc.).
4. CONFIGURAÇÃO NO SISTEMA:
   - O cursor precisa estar na caixa de texto do sistema antes de ler o código.
   - O leitor é um "teclado HID" — ele "digita" os números. Se o cursor não estiver no campo certo, o código vai para o lugar errado.

PROGRAMAÇÃO DO LEITOR:
- Muitos leitores têm códigos de configuração impressos no manual (ex: para mudar de COM para USB, ou configurar o sufixo Enter).
- Se o sistema não reconhece o Enter após a leitura → configurar o leitor para adicionar sufixo CR+LF.`
  },

  // ════════════════════════════════════════════════════════════
  // E-MAIL E COMUNICAÇÃO
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-email-001',
    title: 'Outlook — Não Abre, Lento ou Não Sincroniza E-mails',
    category: 'Aplicativos',
    tags: ['outlook', 'email', 'nao abre', 'lento', 'sincronizar', 'offline'],
    content: `SINTOMA: Outlook não inicia, fica em modo offline, não sincroniza e-mails ou trava.

OUTLOOK EM MODO OFFLINE:
1. Clique na aba "Enviar/Receber" → desmarque "Trabalhar Offline".
2. Verifique a conectividade de rede (internet funcionando?).
3. Reinicie o Outlook.

OUTLOOK LENTO OU TRAVANDO:
1. LIMPAR CACHE DO OST:
   - Feche o Outlook completamente.
   - Painel de Controle → Contas de Email → selecione sua conta → Alterar → Configurações adicionais → aba Avançado → diminua o "Email para manter offline" para 3 ou 6 meses.
2. REPARAR PERFIL DO OUTLOOK:
   - Painel de Controle → Contas de Email → Reparar.
3. MODO SEGURO:
   - Win+R → outlook /safe → se abrir no seguro, há um suplemento causando problema.

OUTLOOK NÃO ABRE (ERRO DE INICIALIZAÇÃO):
1. Verificar se há atualizações do Office pendentes.
2. Painel de Controle → Microsoft Office → Alterar → Reparo Rápido.
3. Se o arquivo de dados (.ost ou .pst) estiver corrompido:
   - Executar o ScanPST: procure "scanpst.exe" no diretório do Office (geralmente C:\\Program Files\\Microsoft Office\\root\\Office16).
   - Selecione o arquivo de dados e clique em Iniciar.

E-MAILS NÃO CHEGANDO:
1. Verifique a pasta LIXO ELETRÔNICO (spam).
2. Verifique se há regras automáticas movendo mensagens: Arquivo → Gerenciar regras e alertas.
3. Cota da caixa de entrada cheia → Excluir e-mails antigos ou abrir chamado para aumento de cota.`
  },

  // ════════════════════════════════════════════════════════════
  // BACKUP E RECUPERAÇÃO
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-backup-001',
    title: 'Backup — Procedimentos de Backup de Dados Importantes',
    category: 'Segurança',
    tags: ['backup', 'dados', 'recuperação', 'onedrive', 'copia de segurança'],
    content: `POLÍTICA DE BACKUP DE DADOS — LOJAS MODA VERÃO

DADOS QUE DEVEM SER COPIADOS REGULARMENTE:
- Documentos de trabalho (planilhas, relatórios, contratos)
- Configurações de sistemas
- Banco de dados de clientes
- Arquivos de fotos/catálogos de produtos

MÉTODO 1 — ONEDRIVE (Microsoft 365):
1. Arquivos salvos em C:\\Users\\SeuNome\\OneDrive são sincronizados automaticamente com a nuvem.
2. Certifique-se de que o ícone do OneDrive na bandeja está com check verde (sincronizado).
3. Para verificar: clique no ícone do OneDrive → Configurações → Conta → confirme que a conta corporativa está logada.
4. NUNCA salve documentos importantes apenas no Desktop ou em "Documentos" sem configurar o backup dessas pastas no OneDrive.

MÉTODO 2 — HD EXTERNO (backup local):
1. Conecte o HD externo ao computador.
2. Use o programa de Backup do Windows: Configurações → Atualização e Segurança → Backup → Adicionar uma unidade.
3. Configure para backup automático diário (fora do horário de trabalho).
4. Após o backup, o HD externo DEVE ser guardado em local diferente do computador (de preferência outra sala ou armário com chave).

RECUPERAÇÃO DE ARQUIVO DELETADO:
1. Verifique a Lixeira do Windows primeiro.
2. Se deletou do OneDrive: acesse onedrive.live.com → Lixeira → Restaurar.
3. Versões anteriores: clique direito na pasta → Restaurar versões anteriores.
4. Se não houver backup → Abrir chamado para tentativa de recuperação forense.

REGRA 3-2-1 DE BACKUP:
• 3 cópias dos dados
• Em 2 tipos diferentes de mídia (ex: nuvem + HD externo)
• 1 cópia em local fisicamente diferente`
  },

  // ════════════════════════════════════════════════════════════
  // EQUIPAMENTOS ESPECÍFICOS DA LOJA
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-loja-001',
    title: 'Câmera de Segurança (CFTV) — Sem Imagem ou Offline',
    category: 'Infraestrutura',
    tags: ['camera', 'cftv', 'segurança', 'nvr', 'dvr', 'sem imagem'],
    content: `SINTOMA: Câmera de segurança sem imagem, offline no sistema ou imagem travada.

VERIFICAÇÕES:
1. CÂMERA ANALÓGICA (COAXIAL):
   - Verifique a alimentação da câmera (fonte 12V conectada?).
   - Inspecione o cabo coaxial por dobramentos ou danos físicos.
   - Teste a câmera em outro canal do DVR.
2. CÂMERA IP (REDE):
   - Verifique se o cabo de rede está conectado ao switch PoE (Power over Ethernet).
   - Led da câmera: azul fixo = OK; piscando = sem rede; apagado = sem energia.
   - Tente fazer ping no IP da câmera: CMD → ping [IP da câmera].
3. NVR/DVR SEM IMAGEM:
   - Verifique se o monitor do NVR/DVR está ligado e na entrada correta.
   - O NVR/DVR pode ter reiniciado → aguarde o boot completo (2-3 minutos).
   - Verifique o HD interno do DVR/NVR: muitos modelos desativam a gravação se o HD estiver cheio ou com defeito.

IMAGEM TRAVADA (CONGELADA):
→ Câmera IP travada: desligue a alimentação por 30 segundos e religue (power cycle).
→ Câmera analógica com imagem travada: problema no DVR → reiniciar o DVR.

NÃO CONSEGUIR ACESSAR AS CÂMERAS REMOTAMENTE:
→ Verificar se o roteador tem o redirecionamento de porta configurado.
→ Verificar se o IP externo mudou (provedores de internet com IP dinâmico).
→ Abrir chamado para a equipe de TI verificar as configurações de rede.`
  },

  {
    id: 'kb-loja-002',
    title: 'Roteador / Switch — Rede Caiu na Loja Inteira',
    category: 'Rede e Conectividade',
    tags: ['roteador', 'switch', 'rede caiu', 'loja', 'internet', 'infraestrutura'],
    content: `SINTOMA: Rede da loja completamente sem internet ou sem comunicação interna entre os dispositivos.

DIAGNÓSTICO RÁPIDO:
1. Verifique se é problema de INTERNET ou REDE INTERNA:
   - Se NENHUM dispositivo tem internet mas conseguem se comunicar entre si → problema no link de internet (provedor ou roteador).
   - Se NENHUM dispositivo consegue nem acessar outros na rede → problema no switch ou roteador interno.
2. Verifique os LEDs do roteador/switch:
   - POWER (verde fixo): OK
   - WAN/INTERNET (verde): OK se fixo, problema se piscando vermelho ou apagado
   - LAN ports: devem piscar conforme o tráfego

PROCEDIMENTO DE REINICIALIZAÇÃO:
1. Anote os equipamentos (roteador, switch, servidores) — não desligue servidores sem autorização.
2. ORDEM DE DESLIGAMENTO: Primeiro computadores → depois switch → por último roteador.
3. AGUARDE: 60 segundos com tudo desligado.
4. ORDEM DE LIGAMENTO: Primeiro roteador → aguarde 2 minutos → switch → aguarde 1 minuto → computadores.

LINK DE INTERNET CAIU (PROVEDOR):
→ Contate o provedor de internet da loja para verificar interrupção na região.
→ Abrir chamado para a TI registrar o incidente e acionar o provedor.

SWITCH COM PORTA RUIM:
→ Se apenas alguns computadores ficaram sem rede → Teste mudando os cabos de porta no switch.
→ Porta com led apagado = porta com defeito → mover o cabo para outra porta.`
  },

  // ════════════════════════════════════════════════════════════
  // AUDIO E VIDEO
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-audio-001',
    title: 'Sem Áudio no Computador / Caixas de Som Sem Som',
    category: 'Periféricos',
    tags: ['audio', 'som', 'caixa de som', 'headphone', 'sem audio', 'driver'],
    content: `SINTOMA: Computador sem som, áudio muito baixo ou distorcido.

VERIFICAÇÕES BÁSICAS:
1. Volume não está no mudo: Barra de tarefas → ícone de alto-falante → arraste para cima.
2. Mixer de volume: clique com botão direito no alto-falante → Abrir mixer de volume → verifique se algum aplicativo está com som em zero.
3. DISPOSITIVO DE SAÍDA CORRETO:
   - Clique direito no ícone de som → Sons → aba Reprodução.
   - Selecione o dispositivo correto (caixas de som, headphone, HDMI) como padrão.
   - Se o dispositivo não aparece → clique direito em área vazia → Mostrar dispositivos desativados → ativar.

CAIXA DE SOM / HEADPHONE:
1. Cabo conectado na saída CORRETA: saída de fone (verde) na parte traseira — não confundir com entrada de microfone (rosa).
2. Caixa de som tem seu próprio botão de volume e liga/desliga? Verifique.
3. Teste o fone em outro dispositivo (celular) para descartar defeito no fone.

DRIVER DE ÁUDIO:
1. Gerenciador de Dispositivos → Entradas e saídas de áudio.
2. Verifique se há ícone "!" de erro.
3. Clique direito → Atualizar driver → Pesquisar drivers automaticamente.
4. Se não resolver → baixe o driver do fabricante da placa-mãe (Realtek HD Audio é o mais comum).

HDMI SEM ÁUDIO:
→ Monitor ou TV conectado via HDMI pode precisar ser selecionado como dispositivo de saída de áudio.
→ Configurações → Som → selecione o monitor/TV HDMI como saída padrão.`
  },

  // ════════════════════════════════════════════════════════════
  // ENERGIA E HARDWARE GERAL
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-energia-001',
    title: 'Nobreak (UPS) — Alarmando / Bateria Fraca',
    category: 'Infraestrutura',
    tags: ['nobreak', 'ups', 'bateria', 'energia', 'alarme', 'beep'],
    content: `SINTOMA: Nobreak bippando constantemente, indicando bateria fraca, ou computador desligando durante quedas de energia.

TIPOS DE BIPE:
• BIPE RÁPIDO CONTÍNUO → Energia da tomada caiu (está em bateria). Normal durante falta de energia.
• BIPE LENTO INTERVALADO → Bateria com carga baixa. Salve tudo e desligue o computador.
• BIPE ÚNICO A CADA MINUTO → Bateria com defeito ou vida útil esgotada (troca necessária).
• BIPE CONSTANTE COM LUZ VERMELHA → Sobrecarga no nobreak (muitos equipamentos conectados).

VIDA ÚTIL DA BATERIA:
- Baterias de nobreak duram em média 2-4 anos.
- Sinal de bateria ruim: nobreak dura muito menos que antes na falta de energia, ou desliga imediatamente.

PROCEDIMENTO:
1. Para de bipe temporário: verifique o manual (geralmente pressionar o botão de silêncio/mute).
2. Se for bateria fraca/deficiente → Abrir chamado para substituição de bateria do nobreak.
3. Se for sobrecarga → identifique o que está conectado ao nobreak:
   - Nobreak é para proteger APENAS o computador e monitor essenciais.
   - NUNCA conecte impressoras, caixas de som ou cafeteiras no nobreak.

ATENÇÃO: Um nobreak com bateria morta oferece ZERO proteção contra quedas de energia — pode resultar em perda de dados e dano ao HD. Priorize a substituição de bateria.`
  },

  // ════════════════════════════════════════════════════════════
  // MOBILE E DISPOSITIVOS MÓVEIS
  // ════════════════════════════════════════════════════════════
  {
    id: 'kb-mobile-001',
    title: 'Smartphone Corporativo — Configurar E-mail e Teams',
    category: 'Mobile',
    tags: ['celular', 'smartphone', 'email', 'teams', 'corporativo', 'android', 'ios'],
    content: `PROCEDIMENTO DE CONFIGURAÇÃO DE CONTA CORPORATIVA NO CELULAR

MICROSOFT OUTLOOK (E-MAIL):
Android/iOS:
1. Baixe "Microsoft Outlook" na loja de aplicativos.
2. Abra e toque em "Adicionar conta".
3. Digite seu e-mail corporativo (@modaverao.com.br).
4. Clique em "Continuar" — se for Microsoft 365, ele detectará automaticamente.
5. Insira sua senha do Active Directory.
6. Se solicitado MFA → aprove no Microsoft Authenticator.
7. Aguarde a sincronização (pode levar 5-10 minutos para caixas grandes).

MICROSOFT TEAMS:
1. Baixe "Microsoft Teams" na loja de aplicativos.
2. Abra e toque em "Entrar".
3. Digite seu e-mail corporativo.
4. Insira a senha.
5. Aprovação de MFA se solicitado.

AUTENTICADOR MFA:
1. Baixe "Microsoft Authenticator" na loja de aplicativos.
2. Faça login com a conta corporativa.
3. Quando surgir a solicitação de aprovação de acesso → toque em "Aprovar" no aplicativo.

PROBLEMAS DE SINCRONIZAÇÃO:
- Sem dados móveis/Wi-Fi: o e-mail não sincroniza. Verifique a conexão.
- Senha expirada: aparecerá um aviso pedindo para redefinir a senha.
- Conta bloqueada: abrir chamado para a TI desbloquear no Azure Active Directory.

VPN NO CELULAR (se necessário):
1. Baixe "FortiClient VPN" na loja de aplicativos.
2. Configure os dados da VPN conforme fornecido pela TI.`
  },

  {
    id: 'kb-procedimentos-001',
    title: 'Procedimento — Como Abrir um Chamado de Suporte',
    category: 'Processos Internos',
    tags: ['chamado', 'suporte', 'ticket', 'procedimento', 'como abrir'],
    content: `GUIA PARA ABERTURA DE CHAMADOS DE SUPORTE TI

QUANDO ABRIR UM CHAMADO:
- Qualquer problema de TI que não foi resolvido seguindo os procedimentos básicos.
- Equipamento com defeito físico (tela quebrada, teclado danificado, etc.).
- Solicitações de instalação de software.
- Criação de novos usuários ou resetar senhas.
- Problemas de rede ou internet.
- Problemas com sistema de vendas (PDV).
- Qualquer dúvida técnica sem solução nos manuais.

COMO ABRIR:
1. VIA COPILOTO (ProMais AI): Fale diretamente comigo descrevendo o problema. Vou fazer as perguntas necessárias e abrir o chamado automaticamente com as informações corretas.
2. VIA SISTEMA: Acesse o módulo "Chamados" no menu lateral → clique em "Novo Chamado" → preencha o formulário.

INFORMAÇÕES NECESSÁRIAS PARA O CHAMADO:
- Descrição clara do problema (o que acontece, quando começou)
- Equipamento afetado (computador, impressora, etc. + localização/setor)
- Criticidade (urgente? o trabalho parou completamente?)
- Já tentou alguma solução? Qual foi o resultado?

PRIORIDADES:
• CRÍTICA: Sistema de vendas parado, problema afetando toda a loja
• ALTA: Computador principal do operador não funciona
• MÉDIA: Impressora com problema, lentidão no sistema
• BAIXA: Dúvidas, solicitações, configurações não urgentes

ACOMPANHAMENTO:
- Após abrir o chamado, você receberá o número (ex: #tkt-1234).
- Pode verificar o status diretamente no sistema ou perguntando ao ProMais AI.`
  }

];

async function seed() {
  console.log(`\n🚀 Iniciando seed de base de conhecimento completa...`);
  console.log(`📚 Total de artigos a inserir: ${articles.length}\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const article of articles) {
    try {
      const record = {
        ...article,
        status: 'published',
        companyId: COMPANY_ID,
        createdBy: CREATED_BY,
        createdByName: CREATED_BY_NAME,
        createdAt: now
      };

      const exists = await pool.query(
        `SELECT 1 FROM data_store WHERE collection_name = $1 AND id = $2`,
        ['knowledge', article.id]
      );

      if (exists.rows.length > 0) {
        await pool.query(
          `UPDATE data_store SET data = $1 WHERE collection_name = $2 AND id = $3`,
          [JSON.stringify(record), 'knowledge', article.id]
        );
        console.log(`  ✏️  Atualizado: [${article.id}] ${article.title}`);
        updated++;
      } else {
        await pool.query(
          `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
          ['knowledge', article.id, JSON.stringify(record)]
        );
        console.log(`  ✅ Inserido:  [${article.id}] ${article.title}`);
        inserted++;
      }
    } catch (err) {
      console.error(`  ❌ Erro em [${article.id}]: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`📊 Resultado:`);
  console.log(`   ✅ Novos artigos inseridos: ${inserted}`);
  console.log(`   ✏️  Artigos atualizados:    ${updated}`);
  console.log(`   ❌ Erros:                  ${errors}`);
  console.log(`════════════════════════════════════\n`);

  await pool.end();
}

seed().catch(err => {
  console.error('Erro fatal no seed:', err);
  process.exit(1);
});
