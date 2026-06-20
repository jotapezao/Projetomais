/**
 * ==========================================
 * CAMADA DE PERSISTÊNCIA DE DADOS (DATABASE)
 * ==========================================
 * Este módulo gerencia a comunicação com o PostgreSQL usando a biblioteca `pg`.
 * 
 * ARQUITETURA DO BANCO DE DADOS (Padrão NoSQL sobre SQL):
 * Para manter a flexibilidade de dados (ex: arrays de checklists, histórico de chamados aninhados)
 * sem precisar criar dezenas de tabelas relacionais e migrations complexas nesta fase, 
 * adotamos o padrão de Tabela Única usando JSONB nativo do Postgres.
 * 
 * TABELA MESTRA: `data_store`
 * - `collection_name` (Ex: 'users', 'tasks', 'tickets')
 * - `id` (Chave primária exclusiva)
 * - `data` (Coluna JSONB contendo todos os dados do registro)
 * 
 * GUIA PARA A IA E DESENVOLVEDORES:
 * - Para buscar dados: Use consultas SQL apontando para a coluna `data` ou use o wrapper `dbService`.
 * - Se no futuro o sistema crescer muito e exigir relacionamentos estritos, você pode extrair
 *   uma 'collection' específica (ex: 'users') para uma tabela SQL real, alterando apenas os 
 *   métodos correspondentes dentro de `dbService`, sem quebrar os controladores (routes).
 * - O AuditLog também usa esta mesma tabela para salvar rastros.
 */
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

let pool;

function getSecretKey() {
  const seed = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'supersecret_gestao_2026';
  return crypto.createHash('sha256').update(seed).digest();
}

function encryptSecret(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value) {
  if (!value || typeof value !== 'string' || !value.startsWith('enc:')) return value || '';
  const [, ivB64, tagB64, encryptedB64] = value.split(':');
  const key = getSecretKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

export { encryptSecret, decryptSecret };

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
  });
} else {
  console.warn("⚠️ AVISO: DATABASE_URL não configurado. As requisições ao banco falharão.");
}

export async function initializeDB() {
  if (!pool) return;
  
  try {
    // Cria a tabela de repositório genérico usando JSONB
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_store (
        collection_name VARCHAR(50) NOT NULL,
        id VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collection_name, id)
      );
    `);

    // Seed mínimo apenas quando a base estiver vazia para não destruir dados em produção.
    const { rows: companyRows } = await pool.query(
      `SELECT 1 FROM data_store WHERE collection_name = 'companies' LIMIT 1`
    );

    if (companyRows.length === 0) {
      console.log("Banco vazio. Inserindo dados iniciais da demonstração...");

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('123456', salt);
      const now = new Date().toISOString();

      const initialData = [
        {
          collection: 'companies',
          data: { id: 'comp-1', legalName: 'Lojas Moda Verão Ltda', tradingName: 'Lojas Moda Verão', cnpj: '12.345.678/0001-90', type: 'internal', status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-1', name: 'João Paulo', lastName: 'TI (System Admin)', email: 'joaopaulo@modaverao.com.br', role: 'system_admin', companyId: 'comp-1', password: passwordHash, status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-2', name: 'Ana', lastName: 'Gerente (Team Admin)', email: 'gerente@modaverao.com.br', role: 'team_admin', companyId: 'comp-1', password: passwordHash, status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-3', name: 'Carlos', lastName: 'Responsável (Channel Admin)', email: 'responsavel@modaverao.com.br', role: 'channel_admin', companyId: 'comp-1', password: passwordHash, status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-4', name: 'Lucas', lastName: 'Vendedor (Membro)', email: 'membro@modaverao.com.br', role: 'member', companyId: 'comp-1', password: passwordHash, status: 'active' }
        },
        {
          collection: 'projects',
          data: { id: 'proj-1', name: 'Implantação Processo de Defeitos', code: 'IPD-001', companyId: 'comp-1', managerId: 'usr-2', status: 'em_andamento', description: 'Piloto do processo de defeitos na Loja 01 e expansão.', lists: ['Backlog', 'Planejada', 'Em andamento', 'Concluída'] }
        },
        {
          collection: 'tasks',
          data: { id: 'tsk-1', title: 'Criar documento oficial do processo de defeitos', list: 'Em andamento', projectId: 'proj-1', companyId: 'comp-1', assigneeId: 'usr-4', priority: 'alta', status: 'em_andamento', startDate: now.split('T')[0], deadline: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0], checklist: [{ id: 'c1', text: 'Desenhar fluxograma', completed: false }, { id: 'c2', text: 'Obter aprovação do gerente', completed: false }] }
        },
        {
          collection: 'tickets',
          data: { id: 'tkt-1', subject: 'Problema no POS da Loja 01', category: 'TI e Infraestrutura', status: 'em_atendimento', priority: 'critica', createdBy: 'usr-4', createdByName: 'Lucas', companyId: 'comp-1', description: 'Terminal de pagamentos da loja 01 está reiniciando sozinho ao processar débito.', slaEscalationTime: new Date(Date.now() + 4*60*60*1000).toISOString(), history: [{ status: 'novo', updatedAt: now, userId: 'usr-4', userName: 'Lucas Vendedor', comment: 'Abertura do chamado pelo POS' }], comments: [] }
        }
      ];

      for (const item of initialData) {
        const exists = await pool.query(
          `SELECT 1 FROM data_store WHERE collection_name = $1 AND id = $2 LIMIT 1`,
          [item.collection, item.data.id]
        );

        if (exists.rows.length > 0) {
          continue;
        }

        await pool.query(
          `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
          [item.collection, item.data.id, JSON.stringify(item.data)]
        );
      }
      console.log("Dados iniciais inseridos com sucesso.");
    }

    // Seed secundário para a base de conhecimento (knowledge) caso esteja vazia
    const { rows: kbRows } = await pool.query(
      `SELECT 1 FROM data_store WHERE collection_name = 'knowledge' LIMIT 1`
    );

    if (kbRows.length === 0) {
      console.log("Base de conhecimento vazia. Inserindo artigos corporativos padrão...");
      const initialArticles = [
        {
          id: 'kb-vpn-001',
          title: 'Como Configurar e Acessar a VPN Corporativa',
          category: 'TI',
          content: 'Procedimento de acesso remoto seguro para colaboradores:\n1. Baixe e instale o FortiClient VPN oficial.\n2. Abra o cliente e selecione \'Configurar VPN\'.\n3. Nome da conexão: VPN Moda Verão.\n4. Endereço do Servidor: vpn.modaverao.com.br, Porta: 443.\n5. Insira suas credenciais do Active Directory (@modaverao.com.br).\n6. Clique em conectar. Caso ocorra erro de MFA, verifique se o aplicativo Microsoft Authenticator está aberto no seu celular corporativo.',
          status: 'published',
          companyId: 'comp-1',
          createdBy: 'usr-1',
          createdByName: 'João Paulo',
          createdAt: new Date().toISOString()
        },
        {
          id: 'kb-print-001',
          title: 'Impressora de Etiquetas Zebra Travada ou Piscando',
          category: 'TI',
          content: 'Solução rápida para travas em impressoras térmicas de etiquetas:\n1. Desligue a impressora Zebra no botão físico traseiro.\n2. No computador, abra o Painel de Controle > Dispositivos e Impressoras.\n3. Dê duplo clique na impressora Zebra, clique em \'Impressora\' no menu superior e selecione \'Cancelar Todos os Documentos\'.\n4. Abra o menu Iniciar do Windows, digite \'Serviços\' e abra o gerenciador.\n5. Localize o serviço \'Spooler de Impressão\', clique com o botão direito e selecione \'Reiniciar\'.\n6. Ligue a impressora física Zebra novamente. Ela fará o alinhamento automático da fita e voltará a imprimir.',
          status: 'published',
          companyId: 'comp-1',
          createdBy: 'usr-1',
          createdByName: 'João Paulo',
          createdAt: new Date().toISOString()
        },
        {
          id: 'kb-pass-001',
          title: 'Redefinir Senha do E-mail e Teams',
          category: 'TI',
          content: 'Como recuperar acesso à sua conta corporativa:\n1. Acesse o site oficial: https://passwordreset.microsoftonline.com/\n2. Insira seu e-mail corporativo institucional (@modaverao.com.br).\n3. Digite os caracteres de validação de segurança.\n4. Escolha receber o código via SMS no seu telefone cadastrado ou via notificação do Authenticator.\n5. Digite o código recebido e escolha sua nova senha (mínimo de 8 caracteres, contendo números, letras maiúsculas e caracteres especiais).\n*Nota: Se você perdeu o acesso ao seu número de telefone de recuperação, fale com a IA ou abra um chamado para que a TI redefina manualmente.*',
          status: 'published',
          companyId: 'comp-1',
          createdBy: 'usr-1',
          createdByName: 'João Paulo',
          createdAt: new Date().toISOString()
        },
        {
          id: 'kb-pdv-001',
          title: 'Sistema de Vendas (PDV) Desconectado ou Lento',
          category: 'Processos Internos',
          content: 'Procedimento para solucionar quedas ou lentidão no Caixa:\n1. Verifique se o cabo de rede azul RJ45 está bem conectado na traseira do computador do caixa.\n2. Se a rede estiver conectada e o sistema travado, pressione \'F5\' no teclado para recarregar a interface da aplicação.\n3. Se o erro persistir, reinicie o terminal de pagamentos (Pinpad/POS físico) desconectando-o da tomada de energia, aguardando 10 segundos e conectando novamente.\n4. Caso o sistema continue offline, abra um chamado com a TI para verificação de cabo de fibra ótica ou roteador da loja.',
          status: 'published',
          companyId: 'comp-1',
          createdBy: 'usr-1',
          createdByName: 'João Paulo',
          createdAt: new Date().toISOString()
        }
      ];

      for (const art of initialArticles) {
        await pool.query(
          `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
          ['knowledge', art.id, JSON.stringify(art)]
        );
      }
      console.log("Artigos da base de conhecimento semeados com sucesso.");
    }
  } catch (err) {
    console.error("Erro ao inicializar o banco de dados:", err);
  }
}

export async function logAudit(userId, userName, action, entity, entityId, details, ip = '127.0.0.1', companyId = null) {
  const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const logData = { id: logId, userId, userName, action, entity, entityId, ip, details, companyId, timestamp: new Date().toISOString() };
  
  if (pool) {
    await pool.query(
      `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
      ['auditLogs', logId, JSON.stringify(logData)]
    );
  }
  return logData;
}

// Wrapper Assíncrono (Promises) - Note que as rotas agora precisarão usar await onde for chamado.
// Como o Express atual pode estar chamando sem await (pois era síncrono), isso foi ajustado para manter a interface o mais próxima possível.
export const dbService = {
  async getCollection(collectionName) {
    if (!pool) return [];
    const { rows } = await pool.query(`SELECT data FROM data_store WHERE collection_name = $1 ORDER BY created_at DESC`, [collectionName]);
    return rows.map(r => r.data);
  },

  async getById(collectionName, id) {
    if (!pool) return null;
    const { rows } = await pool.query(`SELECT data FROM data_store WHERE collection_name = $1 AND id = $2`, [collectionName, id]);
    return rows.length > 0 ? rows[0].data : null;
  },

  async create(collectionName, data, executorId = 'system', executorName = 'System') {
    if (!pool) return null;
    const newId = data.id || `${collectionName.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord = { ...data, id: newId, createdAt: new Date().toISOString() };
    
    await pool.query(
      `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
      [collectionName, newId, JSON.stringify(newRecord)]
    );
    const executor = executorId === 'system' ? null : await this.getById('users', executorId);
    await logAudit(executorId, executorName, 'create', collectionName, newId, `Criado registro em ${collectionName}`, '127.0.0.1', executor?.companyId || data.companyId || null);
    return newRecord;
  },

  async update(collectionName, id, data, executorId = 'system', executorName = 'System') {
    if (!pool) return null;
    const oldRecord = await this.getById(collectionName, id);
    if (!oldRecord) return null;

    const updatedRecord = { ...oldRecord, ...data, updatedAt: new Date().toISOString() };
    await pool.query(
      `UPDATE data_store SET data = $1 WHERE collection_name = $2 AND id = $3`,
      [JSON.stringify(updatedRecord), collectionName, id]
    );
    const executor = executorId === 'system' ? null : await this.getById('users', executorId);
    await logAudit(executorId, executorName, 'update', collectionName, id, `Atualizado registro em ${collectionName}`, '127.0.0.1', executor?.companyId || updatedRecord.companyId || null);
    return updatedRecord;
  },

  async delete(collectionName, id, executorId = 'system', executorName = 'System') {
    if (!pool) return false;
    const res = await pool.query(`DELETE FROM data_store WHERE collection_name = $1 AND id = $2`, [collectionName, id]);
    if (res.rowCount > 0) {
      const executor = executorId === 'system' ? null : await this.getById('users', executorId);
      await logAudit(executorId, executorName, 'delete', collectionName, id, `Excluído registro em ${collectionName}`, '127.0.0.1', executor?.companyId || null);
      return true;
    }
    return false;
  }
};

export function normalizeEmailSettings(record = {}) {
  return {
    ...record,
    smtpPassword: decryptSecret(record.smtpPassword),
    imapPassword: decryptSecret(record.imapPassword)
  };
}

export function secureEmailSettings(data = {}) {
  return {
    ...data,
    smtpPassword: encryptSecret(data.smtpPassword),
    imapPassword: encryptSecret(data.imapPassword)
  };
}
