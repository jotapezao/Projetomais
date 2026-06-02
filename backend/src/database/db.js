import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

let pool;

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

    // Verifica se já existem usuários (se o banco está vazio)
    const { rows } = await pool.query(`SELECT 1 FROM data_store WHERE collection_name = 'users' LIMIT 1`);
    
    if (rows.length === 0) {
      console.log("Banco de dados vazio. Semeando dados iniciais...");
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('123456', salt);
      const now = new Date().toISOString();

      const initialData = [
        {
          collection: 'companies',
          data: { id: 'comp-1', legalName: 'Mais Tecnologia Interna Ltda', tradingName: 'Mais Tecnologia', cnpj: '12.345.678/0001-90', type: 'internal', status: 'active' }
        },
        {
          collection: 'companies',
          data: { id: 'comp-2', legalName: 'Indústrias Alpha S.A.', tradingName: 'Alpha Corp', cnpj: '98.765.432/0001-21', type: 'client', status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-1', name: 'João Paulo', lastName: 'Administrador', email: 'admin@maistecnologia.com', role: 'super_admin', companyId: 'comp-1', password: passwordHash, status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-2', name: 'Ana', lastName: 'Mendonça', email: 'gestor@maistecnologia.com', role: 'gestor', companyId: 'comp-1', password: passwordHash, status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-4', name: 'Lucas', lastName: 'Operador', email: 'operador@maistecnologia.com', role: 'operador', companyId: 'comp-1', password: passwordHash, status: 'active' }
        },
        {
          collection: 'users',
          data: { id: 'usr-5', name: 'Carlos', lastName: 'Silva', email: 'cliente@alphacorp.com', role: 'cliente', companyId: 'comp-2', password: passwordHash, status: 'active' }
        },
        {
          collection: 'projects',
          data: { id: 'proj-1', name: 'Migração de Servidores Cloud', code: 'MSC-001', companyId: 'comp-1', managerId: 'usr-2', status: 'em_andamento', lists: ['Backlog', 'Planejada', 'Em andamento', 'Concluída'] }
        },
        {
          collection: 'tasks',
          data: { id: 'tsk-1', title: 'Configurar VPC e Subnets na AWS', list: 'Em andamento', projectId: 'proj-1', companyId: 'comp-1', assigneeId: 'usr-4', priority: 'alta', status: 'em_andamento', checklist: [] }
        },
        {
          collection: 'tickets',
          data: { id: 'tkt-1', subject: 'Instabilidade no Servidor', category: 'TI', status: 'em_atendimento', priority: 'critica', slaEscalationTime: now, history: [], comments: [] }
        }
      ];

      for (const item of initialData) {
        await pool.query(
          `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
          [item.collection, item.data.id, JSON.stringify(item.data)]
        );
      }
      console.log("Dados iniciais inseridos com sucesso.");
    }
  } catch (err) {
    console.error("Erro ao inicializar o banco de dados:", err);
  }
}

export async function logAudit(userId, userName, action, entity, entityId, details, ip = '127.0.0.1') {
  const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const logData = { id: logId, userId, userName, action, entity, entityId, ip, details, timestamp: new Date().toISOString() };
  
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
    const newId = `${collectionName.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord = { id: newId, ...data, createdAt: new Date().toISOString() };
    
    await pool.query(
      `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
      [collectionName, newId, JSON.stringify(newRecord)]
    );
    await logAudit(executorId, executorName, 'create', collectionName, newId, `Criado registro em ${collectionName}`);
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
    await logAudit(executorId, executorName, 'update', collectionName, id, `Atualizado registro em ${collectionName}`);
    return updatedRecord;
  },

  async delete(collectionName, id, executorId = 'system', executorName = 'System') {
    if (!pool) return false;
    const res = await pool.query(`DELETE FROM data_store WHERE collection_name = $1 AND id = $2`, [collectionName, id]);
    if (res.rowCount > 0) {
      await logAudit(executorId, executorName, 'delete', collectionName, id, `Excluído registro em ${collectionName}`);
      return true;
    }
    return false;
  }
};
