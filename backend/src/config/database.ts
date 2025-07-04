import sqlite3 from 'sqlite3';
import path from 'path';
import { DatabaseResult, DatabaseConfig } from '../types';

/**
 * Classe para gerenciar conexões e operações do banco SQLite
 * Implementa padrão Singleton para garantir uma única instância
 */
export class Database {
  private static instance: Database;
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Obtém a instância única do banco de dados
   */
  public static getInstance(config?: DatabaseConfig): Database {
    if (!Database.instance) {
      if (!config) {
        throw new Error('Configuração do banco de dados é necessária na primeira inicialização');
      }
      Database.instance = new Database(config);
    }
    return Database.instance;
  }

  /**
   * Conecta ao banco de dados SQLite
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = path.resolve(this.config.path);
      
      this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar com o banco de dados:', err.message);
          reject(err);
        } else {
          console.log('✅ Conectado ao banco SQLite:', dbPath);
          
          // Configurar timeout se especificado
          if (this.config.timeout) {
            this.db?.configure('busyTimeout', this.config.timeout);
          }
          
          // Habilitar foreign keys
          this.db?.run('PRAGMA foreign_keys = ON');
          
          resolve();
        }
      });
    });
  }

  /**
   * Fecha a conexão com o banco de dados
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Erro ao fechar conexão:', err.message);
            reject(err);
          } else {
            console.log('🔌 Conexão com o banco fechada');
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Executa uma query que modifica dados (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não conectado'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Erro na query RUN:', err.message);
          console.error('SQL:', sql);
          console.error('Params:', params);
          reject(err);
        } else {
          resolve({ 
            id: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  /**
   * Executa uma query que retorna uma única linha
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não conectado'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Erro na query GET:', err.message);
          console.error('SQL:', sql);
          console.error('Params:', params);
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  /**
   * Executa uma query que retorna múltiplas linhas
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não conectado'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Erro na query ALL:', err.message);
          console.error('SQL:', sql);
          console.error('Params:', params);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Executa múltiplas queries em uma transação
   */
  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<DatabaseResult[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Banco de dados não conectado'));
        return;
      }

      this.db.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');
        
        const results: DatabaseResult[] = [];
        let completed = 0;
        let failed = false;

        const complete = () => {
          completed++;
          if (completed === queries.length && !failed) {
            this.db!.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
          }
        };

        const fail = (error: Error) => {
          if (!failed) {
            failed = true;
            this.db!.run('ROLLBACK', () => {
              reject(error);
            });
          }
        };

        queries.forEach((query, index) => {
          this.db!.run(query.sql, query.params || [], function(err) {
            if (err) {
              fail(err);
            } else {
              results[index] = { id: this.lastID, changes: this.changes };
              complete();
            }
          });
        });
      });
    });
  }

  /**
   * Verifica se o banco está conectado
   */
  isConnected(): boolean {
    return this.db !== null;
  }

  /**
   * Obtém informações sobre o banco de dados
   */
  async getInfo(): Promise<{ version: string; size: number; tables: string[] }> {
    const version = await this.get<{ 'sqlite_version()': string }>('SELECT sqlite_version()');
    const tables = await this.all<{ name: string }>(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    return {
      version: version?.['sqlite_version()'] || 'unknown',
      size: 0, // SQLite não tem um método direto para tamanho
      tables: tables.map(t => t.name)
    };
  }
}

/**
 * Instância global do banco de dados
 */
let database: Database;

/**
 * Inicializa o banco de dados e cria as tabelas
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Configuração do banco
    const config: DatabaseConfig = {
      path: process.env.DATABASE_PATH || './database.sqlite',
      timeout: 10000,
      busyTimeout: 30000
    };

    // Criar instância e conectar
    database = Database.getInstance(config);
    await database.connect();

    // Criar tabelas
    await createTables();
    
    console.log('📊 Banco de dados inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

/**
 * Cria as tabelas do banco de dados
 */
async function createTables(): Promise<void> {
  try {
    // Criar tabela de usuários
    await database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de tarefas
    await database.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT 0,
        priority VARCHAR(10) DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
        due_date DATETIME,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Verificar se a coluna due_date existe e adicioná-la se necessário
    await migrateDueDateColumn();

    // Criar índices para melhor performance
    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority)
    `);

    // Criar índice para due_date se a coluna existir
    try {
      await database.run(`
        CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)
      `);
    } catch (error: any) {
      if (error.message.includes('no such column: due_date')) {
        console.log('⚠️ Índice due_date não criado - coluna ainda não existe');
      } else {
        throw error;
      }
    }

    // Trigger para atualizar updated_at automaticamente
    await database.run(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    await database.run(`
      CREATE TRIGGER IF NOT EXISTS update_todos_timestamp 
      AFTER UPDATE ON todos
      BEGIN
        UPDATE todos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    console.log('📋 Tabelas e índices criados/verificados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  }
}

/**
 * Migra a coluna due_date se ela não existir na tabela todos
 */
async function migrateDueDateColumn(): Promise<void> {
  try {
    // Verificar se a coluna due_date já existe
    const tableInfo = await database.all<{ name: string; type: string }>(`
      PRAGMA table_info(todos)
    `);
    
    const dueDateExists = tableInfo.some(column => column.name === 'due_date');
    
    if (!dueDateExists) {
      console.log('📅 Adicionando coluna due_date à tabela todos...');
      await database.run(`
        ALTER TABLE todos ADD COLUMN due_date DATETIME
      `);
      console.log('✅ Coluna due_date adicionada com sucesso');
    } else {
      console.log('✅ Coluna due_date já existe na tabela todos');
    }
  } catch (error) {
    console.error('❌ Erro ao migrar coluna due_date:', error);
    throw error;
  }
}

/**
 * Obtém a instância do banco de dados
 */
export function getDatabase(): Database {
  if (!database) {
    throw new Error('Banco de dados não foi inicializado. Chame initializeDatabase() primeiro.');
  }
  return database;
}

/**
 * Fecha a conexão com o banco (útil para testes e shutdown)
 */
export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.close();
  }
}

/**
 * Limpa todas as tabelas (útil para testes)
 */
export async function clearDatabase(): Promise<void> {
  if (!database) {
    throw new Error('Banco de dados não foi inicializado');
  }

  await database.run('DELETE FROM todos');
  await database.run('DELETE FROM users');
  await database.run('DELETE FROM sqlite_sequence WHERE name IN ("users", "todos")');
  
  console.log('🧹 Banco de dados limpo');
}

// Exportar instância para uso direto
export { database };
