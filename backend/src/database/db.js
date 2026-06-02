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

    // Verifica se já existe o usuário do João Paulo da Lojas Moda Verão
    const { rows } = await pool.query(`SELECT 1 FROM data_store WHERE collection_name = 'users' AND data->>'email' = 'joaopaulo@modaverao.com.br' LIMIT 1`);
    
    if (rows.length === 0) {
      console.log("Banco de dados sem usuários de Lojas Moda Verão. Limpando e semeando dados específicos...");
      
      // Limpa os dados de teste antigos para evitar conflito de chaves e dados irrelevantes
      await pool.query(`DELETE FROM data_store`);
      
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
        await pool.query(
          `INSERT INTO data_store (collection_name, id, data) VALUES ($1, $2, $3)`,
          [item.collection, item.data.id, JSON.stringify(item.data)]
        );
      }
      console.log("Dados de Lojas Moda Verão inseridos com sucesso.");
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
