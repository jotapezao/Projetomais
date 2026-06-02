import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// Helper to ensure database file exists
function initializeDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('123456', salt);

    const initialData = {
      companies: [
        {
          id: 'comp-1',
          legalName: 'Mais Tecnologia Interna Ltda',
          tradingName: 'Mais Tecnologia',
          cnpj: '12.345.678/0001-90',
          stateRegistration: '123.456.789.110',
          address: 'Av. Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          phone: '(11) 3200-1000',
          email: 'contato@maistecnologia.com',
          website: 'www.maistecnologia.com',
          primaryContact: 'João Paulo',
          status: 'active',
          type: 'internal',
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp-2',
          legalName: 'Indústrias Alpha S.A.',
          tradingName: 'Alpha Corp',
          cnpj: '98.765.432/0001-21',
          stateRegistration: '987.654.321.110',
          address: 'Rua das Indústrias, 45',
          city: 'Campinas',
          state: 'SP',
          zipCode: '13080-000',
          phone: '(19) 3700-2000',
          email: 'suporte@alphacorp.com',
          website: 'www.alphacorp.com',
          primaryContact: 'Carlos Silva',
          status: 'active',
          type: 'client',
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp-3',
          legalName: 'Logística Expressa Ltda',
          tradingName: 'Beta Logística',
          cnpj: '45.678.123/0001-44',
          stateRegistration: '456.789.123.110',
          address: 'Av. das Nações, 200',
          city: 'Curitiba',
          state: 'PR',
          zipCode: '80010-010',
          phone: '(41) 3300-3000',
          email: 'comercial@betalog.com',
          website: 'www.betalog.com',
          primaryContact: 'Mariana Costa',
          status: 'active',
          type: 'provider',
          createdAt: new Date().toISOString()
        }
      ],
      users: [
        {
          id: 'usr-1',
          name: 'João Paulo',
          lastName: 'Administrador',
          email: 'admin@maistecnologia.com',
          phone: '(11) 98888-7777',
          role: 'super_admin',
          position: 'CEO / Diretor de TI',
          department: 'Diretoria',
          companyId: 'comp-1',
          teamId: 'team-1',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          password: passwordHash,
          status: 'active',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          signature: 'Atenciosamente,\nJoão Paulo - Diretor de TI',
          emailPreferences: {
            newTicket: true,
            newTask: true,
            statusChange: true,
            slaWarning: true
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'usr-2',
          name: 'Ana',
          lastName: 'Mendonça',
          email: 'gestor@maistecnologia.com',
          phone: '(11) 97777-6666',
          role: 'gestor',
          position: 'Gerente de Projetos',
          department: 'Projetos',
          companyId: 'comp-1',
          teamId: 'team-1',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          password: passwordHash,
          status: 'active',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          signature: 'Ana Mendonça - Gerente de Projetos',
          emailPreferences: {
            newTicket: true,
            newTask: true,
            statusChange: true,
            slaWarning: true
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'usr-3',
          name: 'Roberto',
          lastName: 'Coordenador',
          email: 'coordenador@maistecnologia.com',
          phone: '(11) 96666-5555',
          role: 'coordenador',
          position: 'Coordenador de Suporte',
          department: 'Suporte',
          companyId: 'comp-1',
          teamId: 'team-2',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
          password: passwordHash,
          status: 'active',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          signature: 'Roberto - Coordenação de Operações',
          emailPreferences: {
            newTicket: true,
            newTask: true,
            statusChange: true,
            slaWarning: true
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'usr-4',
          name: 'Lucas',
          lastName: 'Operador',
          email: 'operador@maistecnologia.com',
          phone: '(11) 95555-4444',
          role: 'operador',
          position: 'Analista de Infraestrutura',
          department: 'Suporte',
          companyId: 'comp-1',
          teamId: 'team-2',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          password: passwordHash,
          status: 'active',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          signature: 'Lucas - Suporte Técnico',
          emailPreferences: {
            newTicket: false,
            newTask: true,
            statusChange: true,
            slaWarning: false
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'usr-5',
          name: 'Carlos',
          lastName: 'Silva',
          email: 'cliente@alphacorp.com',
          phone: '(19) 94444-3333',
          role: 'cliente',
          position: 'Gestor de Contratos',
          department: 'Operações',
          companyId: 'comp-2',
          teamId: '',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
          password: passwordHash,
          status: 'active',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          signature: 'Carlos Silva - Alpha Corp',
          emailPreferences: {
            newTicket: true,
            newTask: false,
            statusChange: true,
            slaWarning: false
          },
          createdAt: new Date().toISOString()
        }
      ],
      teams: [
        {
          id: 'team-1',
          name: 'Equipe de Desenvolvimento',
          description: 'Responsável pela manutenção e criação de softwares internos e clientes.',
          companyId: 'comp-1',
          leaders: ['usr-2'],
          members: ['usr-1', 'usr-4'],
          isTemporary: false,
          projectId: '',
          createdAt: new Date().toISOString()
        },
        {
          id: 'team-2',
          name: 'Equipe de Suporte e Infraestrutura',
          description: 'Responsável pelos chamados e servidores.',
          companyId: 'comp-1',
          leaders: ['usr-3'],
          members: ['usr-4'],
          isTemporary: false,
          projectId: '',
          createdAt: new Date().toISOString()
        }
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'Migração de Servidores Cloud',
          code: 'MSC-001',
          description: 'Migração de toda infraestrutura local para AWS.',
          companyId: 'comp-1',
          managerId: 'usr-2',
          startDate: '2026-06-01',
          endDate: '2026-08-30',
          priority: 'alta',
          status: 'em_andamento',
          phases: ['Planejamento', 'Execução AWS', 'Migração de Dados', 'Homologação'],
          categories: ['Infraestrutura', 'Cloud'],
          lists: ['Backlog', 'Planejada', 'Em andamento', 'Em revisão', 'Aguardando aprovação', 'Concluída'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'proj-2',
          name: 'Novo Portal do Cliente',
          code: 'NPC-002',
          description: 'Desenvolvimento do portal interativo da Alpha Corp.',
          companyId: 'comp-2',
          managerId: 'usr-2',
          startDate: '2026-05-15',
          endDate: '2026-07-15',
          priority: 'media',
          status: 'em_andamento',
          phases: ['Requisitos', 'UI/UX', 'Backend', 'Frontend Integration', 'Testes'],
          categories: ['Desenvolvimento', 'Web'],
          lists: ['Backlog', 'Planejada', 'Em andamento', 'Em revisão', 'Concluída'],
          createdAt: new Date().toISOString()
        }
      ],
      tasks: [
        {
          id: 'tsk-1',
          title: 'Configurar VPC e Subnets na AWS',
          description: 'Desenhar e aplicar redes públicas e privadas na região us-east-1.',
          category: 'Infraestrutura',
          list: 'Em andamento',
          projectId: 'proj-1',
          companyId: 'comp-1',
          assigneeId: 'usr-4',
          teamId: 'team-2',
          priority: 'alta',
          deadline: '2026-06-15',
          estimatedTime: 12,
          realTime: 4,
          status: 'em_andamento',
          progress: 30,
          checklist: [
            { id: 'sub-1', title: 'Criar VPC', completed: true },
            { id: 'sub-2', title: 'Configurar Internet Gateway', completed: true },
            { id: 'sub-3', title: 'Configurar Nat Gateway', completed: false },
            { id: 'sub-4', title: 'Definir Tabela de Rotas', completed: false }
          ],
          dependencies: [],
          approvals: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'tsk-2',
          title: 'Migração do Banco de Dados SQL',
          description: 'Exportar base local e importar no Amazon RDS.',
          category: 'Infraestrutura',
          list: 'Planejada',
          projectId: 'proj-1',
          companyId: 'comp-1',
          assigneeId: 'usr-4',
          teamId: 'team-2',
          priority: 'critica',
          deadline: '2026-06-25',
          estimatedTime: 24,
          realTime: 0,
          status: 'planejada',
          progress: 0,
          checklist: [
            { id: 'sub-5', title: 'Backup completo local', completed: false },
            { id: 'sub-6', title: 'Restaurar no RDS', completed: false },
            { id: 'sub-7', title: 'Validar integridade de chaves', completed: false }
          ],
          dependencies: [
            { targetTaskId: 'tsk-1', type: 'fim-para-inicio' }
          ],
          approvals: [
            { id: 'appr-1', type: 'tecnica', status: 'pendente', requestedById: 'usr-4', approvedById: 'usr-3', comment: 'Aguardando validação da rede VPC.' }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'tsk-3',
          title: 'Desenho de Wireframes',
          description: 'Criação dos mockups de alta fidelidade para as telas de chamados no portal.',
          category: 'UI/UX',
          list: 'Concluída',
          projectId: 'proj-2',
          companyId: 'comp-2',
          assigneeId: 'usr-2',
          teamId: 'team-1',
          priority: 'media',
          deadline: '2026-05-30',
          estimatedTime: 16,
          realTime: 18,
          status: 'concluida',
          progress: 100,
          checklist: [
            { id: 'sub-8', title: 'Desenhar tela de login', completed: true },
            { id: 'sub-9', title: 'Desenhar dashboard', completed: true },
            { id: 'sub-10', title: 'Aprovação do cliente Alpha Corp', completed: true }
          ],
          dependencies: [],
          approvals: [
            { id: 'appr-2', type: 'gerencial', status: 'aprovado', requestedById: 'usr-2', approvedById: 'usr-1', comment: 'Wireframes muito limpos e profissionais.', approvedAt: new Date().toISOString() }
          ],
          createdAt: new Date().toISOString()
        }
      ],
      tickets: [
        {
          id: 'tkt-1',
          subject: 'Instabilidade no Servidor de E-mails',
          category: 'TI',
          subcategory: 'E-mail',
          companyId: 'comp-2',
          requesterId: 'usr-5',
          assigneeId: 'usr-4',
          priority: 'critica',
          status: 'em_atendimento',
          description: 'A empresa Alpha Corp está com lentidão extrema para enviar anexos por e-mail.',
          slaResponseMinutes: 30,
          slaResolutionMinutes: 240,
          slaEscalationTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), // 1h atrás
          resolvedAt: null,
          closedAt: null,
          SLAStatus: 'on_time',
          history: [
            { status: 'novo', updatedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), userId: 'usr-5', comment: 'Chamado aberto pelo cliente.' },
            { status: 'triagem', updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), userId: 'usr-3', comment: 'Direcionado para infraestrutura.' },
            { status: 'em_atendimento', updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), userId: 'usr-4', comment: 'Iniciado monitoramento dos logs do servidor.' }
          ],
          comments: [
            { id: 'tkt-c1', userId: 'usr-4', userName: 'Lucas Operador', content: 'Identificamos picos de I/O em disco no servidor IMAP.', createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() }
          ]
        },
        {
          id: 'tkt-2',
          subject: 'Solicitação de Acesso ao VPN corporativa',
          category: 'TI',
          subcategory: 'Redes',
          companyId: 'comp-3',
          requesterId: 'usr-3',
          assigneeId: 'usr-3',
          priority: 'media',
          status: 'resolvido',
          description: 'Necessário liberar acesso VPN para os prestadores da Beta Logística.',
          slaResponseMinutes: 60,
          slaResolutionMinutes: 480,
          slaEscalationTime: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          closedAt: null,
          SLAStatus: 'on_time',
          history: [
            { status: 'novo', updatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), userId: 'usr-3', comment: 'Solicitação inicial.' },
            { status: 'resolvido', updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), userId: 'usr-3', comment: 'VPN criada e dados de acesso enviados.' }
          ],
          comments: []
        }
      ],
      knowledgeBase: [
        {
          id: 'kb-1',
          title: 'Como configurar o e-mail no Outlook / Smartphones',
          content: '### Configurações de E-mail Corporativo\n\nPara acessar seu e-mail corporativo em dispositivos externos, utilize os seguintes dados:\n\n* **Servidor de Entrada (IMAP):** imap.maistecnologia.com | Porta: 993 (SSL)\n* **Servidor de Saída (SMTP):** smtp.maistecnologia.com | Porta: 465 (SSL/TLS)\n* **Autenticação:** Requerida com endereço completo e senha.',
          category: 'TI',
          authorId: 'usr-1',
          views: 42,
          tags: ['email', 'outlook', 'configuracao'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'kb-2',
          title: 'Manual de Acesso à VPN Corporativa',
          content: '### Acesso Remoto Seguro\n\n1. Faça o download do cliente OpenVPN.\n2. Importe o arquivo de perfil enviado pelo TI (.ovpn).\n3. Autentique-se com sua senha do Active Directory.',
          category: 'TI',
          authorId: 'usr-3',
          views: 18,
          tags: ['vpn', 'acesso', 'seguranca'],
          createdAt: new Date().toISOString()
        }
      ],
      chatRooms: [
        {
          id: 'room-global',
          name: 'Geral Mais Tecnologia',
          type: 'company',
          entityId: 'comp-1',
          members: ['usr-1', 'usr-2', 'usr-3', 'usr-4']
        },
        {
          id: 'room-team-1',
          name: 'Grupo: Desenvolvimento',
          type: 'team',
          entityId: 'team-1',
          members: ['usr-1', 'usr-2', 'usr-4']
        }
      ],
      chatMessages: [
        {
          id: 'msg-1',
          senderId: 'usr-1',
          receiverId: null,
          roomId: 'room-global',
          content: 'Bem-vindos ao chat corporativo do novo sistema!',
          type: 'text',
          attachments: [],
          timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
        },
        {
          id: 'msg-2',
          senderId: 'usr-2',
          receiverId: null,
          roomId: 'room-global',
          content: 'Excelente, facilitará muito o alinhamento das equipes.',
          type: 'text',
          attachments: [],
          timestamp: new Date(Date.now() - 3600 * 1000 * 1.8).toISOString()
        }
      ],
      notifications: [
        {
          id: 'notif-1',
          userId: 'usr-4',
          type: 'task',
          title: 'Nova tarefa atribuída',
          content: 'Você foi atribuído à tarefa "Configurar VPC e Subnets na AWS" no projeto Migração Cloud.',
          read: false,
          createdAt: new Date().toISOString()
        }
      ],
      emailSettings: [
        {
          id: 'email-cfg-1',
          companyId: 'comp-1',
          smtpHost: 'smtp.maistecnologia.com',
          smtpPort: 465,
          smtpUser: 'sistema@maistecnologia.com',
          smtpPassword: '••••••••',
          smtpSecure: true,
          popHost: 'pop.maistecnologia.com',
          popPort: 995,
          popUser: 'sistema@maistecnologia.com',
          popPassword: '••••••••',
          popSecure: true,
          imapHost: 'imap.maistecnologia.com',
          imapPort: 993,
          imapUser: 'sistema@maistecnologia.com',
          imapPassword: '••••••••',
          imapSecure: true,
          active: true
        }
      ],
      automations: [
        {
          id: 'aut-1',
          triggerEvent: 'task_overdue',
          conditionField: 'priority',
          conditionValue: 'alta',
          actionType: 'notify_manager',
          actionValue: 'Notificar gestor imediato por e-mail e alerta',
          active: true
        },
        {
          id: 'aut-2',
          triggerEvent: 'ticket_opened',
          conditionField: 'priority',
          conditionValue: 'critica',
          actionType: 'escalate_ticket',
          actionValue: 'Reduzir SLA de resposta pela metade e alertar equipe de Coordenação',
          active: true
        }
      ],
      auditLogs: [
        {
          id: 'log-1',
          userId: 'usr-1',
          userName: 'João Paulo Administrador',
          action: 'create',
          entity: 'user',
          entityId: 'usr-1',
          ip: '127.0.0.1',
          details: 'Inicialização do banco de dados e criação do Super Administrador.',
          timestamp: new Date().toISOString()
        }
      ],
      simulatedEmails: [
        {
          id: 'sim-1',
          direction: 'outbox',
          from: 'sistema@maistecnologia.com',
          to: 'cliente@alphacorp.com',
          subject: 'Bem-vindo ao Sistema de Gestão Mais Tecnologia!',
          body: 'Olá Carlos Silva,\n\nSua conta foi criada no sistema. Acesse utilizando o e-mail cliente@alphacorp.com e a senha padrão 123456.',
          status: 'enviado',
          timestamp: new Date().toISOString()
        }
      ]
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Load DB helper
function loadDB() {
  initializeDB();
  const data = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save DB helper
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Log audit helper
export function logAudit(userId, userName, action, entity, entityId, details, ip = '127.0.0.1') {
  const db = loadDB();
  const log = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    userName,
    action,
    entity,
    entityId,
    ip,
    details,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs.pop(); // Keep database file size clean
  }
  saveDB(db);
  return log;
}

// General Database Operations Wrapper
export const dbService = {
  getCollection(collectionName) {
    const db = loadDB();
    return db[collectionName] || [];
  },

  getById(collectionName, id) {
    const list = this.getCollection(collectionName);
    return list.find(item => item.id === id);
  },

  create(collectionName, data, executorId = 'system', executorName = 'System') {
    const db = loadDB();
    if (!db[collectionName]) db[collectionName] = [];
    
    const newRecord = {
      id: `${collectionName.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    
    db[collectionName].push(newRecord);
    saveDB(db);

    // Logging action
    logAudit(executorId, executorName, 'create', collectionName, newRecord.id, `Criado registro em ${collectionName}: ${newRecord.name || newRecord.title || newRecord.subject || newRecord.id}`);

    return newRecord;
  },

  update(collectionName, id, data, executorId = 'system', executorName = 'System') {
    const db = loadDB();
    if (!db[collectionName]) return null;

    const index = db[collectionName].findIndex(item => item.id === id);
    if (index === -1) return null;

    const oldRecord = db[collectionName][index];
    const updatedRecord = {
      ...oldRecord,
      ...data,
      updatedAt: new Date().toISOString()
    };

    db[collectionName][index] = updatedRecord;
    saveDB(db);

    // Logging action
    logAudit(executorId, executorName, 'update', collectionName, id, `Atualizado registro em ${collectionName}: ${updatedRecord.name || updatedRecord.title || updatedRecord.subject || id}`);

    return updatedRecord;
  },

  delete(collectionName, id, executorId = 'system', executorName = 'System') {
    const db = loadDB();
    if (!db[collectionName]) return false;

    const index = db[collectionName].findIndex(item => item.id === id);
    if (index === -1) return false;

    const record = db[collectionName][index];
    db[collectionName].splice(index, 1);
    saveDB(db);

    // Logging action
    logAudit(executorId, executorName, 'delete', collectionName, id, `Excluído registro em ${collectionName}: ${record.name || record.title || record.subject || id}`);

    return true;
  },

  // Custom helper for direct saves (e.g. bulk operations or complex mappings)
  saveRaw(collectionName, fullCollection) {
    const db = loadDB();
    db[collectionName] = fullCollection;
    saveDB(db);
  }
};
