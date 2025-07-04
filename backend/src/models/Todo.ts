import { getDatabase } from '../config/database';
import { 
  Todo, 
  TodoResponse, 
  CreateTodoData, 
  UpdateTodoData, 
  TodoFilters,
  TodoStats,
  TodoPriority,
  DatabaseResult,
  PaginatedResponse
} from '../types';

/**
 * Modelo para gerenciar operações de tarefas (todos)
 * Implementa todas as operações CRUD para a entidade Todo
 */
export class TodoModel {
  /**
   * Cria uma nova tarefa
   * @param userId - ID do usuário dono da tarefa
   * @param todoData - Dados da tarefa
   * @returns Promise<number> - ID da tarefa criada
   */
  static async create(userId: number, todoData: CreateTodoData): Promise<number> {
    try {
      console.log('📝 Criando nova tarefa para usuário:', userId, todoData);

      const database = getDatabase();
      const result: DatabaseResult = await database.run(
        `INSERT INTO todos (title, description, priority, due_date, user_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          todoData.title,
          todoData.description || null,
          todoData.priority || 'media',
          todoData.due_date || null,
          userId
        ]
      );

      console.log('✅ Tarefa criada com ID:', result.id);
      return result.id;
    } catch (error: any) {
      console.error('❌ Erro ao criar tarefa:', error.message);
      throw error;
    }
  }

  /**
   * Busca uma tarefa por ID e usuário
   * @param id - ID da tarefa
   * @param userId - ID do usuário
   * @returns Promise<TodoResponse | undefined> - Tarefa encontrada ou undefined
   */
  static async findById(id: number, userId: number): Promise<TodoResponse | undefined> {
    try {
      const database = getDatabase();
      const todo = await database.get<TodoResponse>(
        `SELECT id, title, description, completed, priority, due_date, created_at, updated_at
         FROM todos 
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      return todo;
    } catch (error: any) {
      console.error('❌ Erro ao buscar tarefa por ID:', error.message);
      throw error;
    }
  }

  /**
   * Lista todas as tarefas de um usuário com filtros e paginação
   * @param userId - ID do usuário
   * @param filters - Filtros a serem aplicados
   * @returns Promise<PaginatedResponse<TodoResponse>> - Lista paginada de tarefas
   */
  static async findByUser(userId: number, filters: TodoFilters = {}): Promise<PaginatedResponse<TodoResponse>> {
    try {
      console.log('📋 Buscando tarefas para usuário:', userId, filters);

      const { 
        completed, 
        priority, 
        search, 
        page = 1, 
        limit = 10 
      } = filters;

      const offset = (page - 1) * limit;
      const database = getDatabase();

      // Construir WHERE clause dinamicamente
      const whereConditions: string[] = ['user_id = ?'];
      const params: any[] = [userId];

      if (completed !== undefined) {
        whereConditions.push('completed = ?');
        params.push(completed ? 1 : 0);
      }

      if (priority) {
        whereConditions.push('priority = ?');
        params.push(priority);
      }

      if (search) {
        whereConditions.push('(title LIKE ? OR description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      const whereClause = whereConditions.join(' AND ');

      // Buscar tarefas
      const todos = await database.all<TodoResponse>(
        `SELECT id, title, description, completed, priority, due_date, created_at, updated_at
         FROM todos 
         WHERE ${whereClause}
         ORDER BY 
           CASE priority 
             WHEN 'alta' THEN 1 
             WHEN 'media' THEN 2 
             WHEN 'baixa' THEN 3 
           END,
           created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Contar total
      const totalResult = await database.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM todos WHERE ${whereClause}`,
        params
      );

      const total = totalResult?.count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Tarefas recuperadas com sucesso',
        data: todos,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar tarefas do usuário:', error.message);
      throw error;
    }
  }

  /**
   * Atualiza uma tarefa
   * @param id - ID da tarefa
   * @param userId - ID do usuário
   * @param updateData - Dados a serem atualizados
   * @returns Promise<boolean> - True se foi atualizada
   */
  static async update(id: number, userId: number, updateData: UpdateTodoData): Promise<boolean> {
    try {
      console.log('📝 Atualizando tarefa:', id, updateData);

      const database = getDatabase();
      const fields: string[] = [];
      const values: any[] = [];

      // Construir query dinamicamente baseado nos campos fornecidos
      if (updateData.title !== undefined) {
        fields.push('title = ?');
        values.push(updateData.title);
      }

      if (updateData.description !== undefined) {
        fields.push('description = ?');
        values.push(updateData.description);
      }

      if (updateData.completed !== undefined) {
        fields.push('completed = ?');
        values.push(updateData.completed ? 1 : 0);
      }

      if (updateData.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updateData.priority);
      }

      if (fields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }

      values.push(id, userId); // Para o WHERE

      const result = await database.run(
        `UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );

      const success = result.changes > 0;
      
      if (success) {
        console.log('✅ Tarefa atualizada com sucesso:', id);
      } else {
        console.log('⚠️ Tarefa não encontrada ou não pertence ao usuário:', id);
      }

      return success;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar tarefa:', error.message);
      throw error;
    }
  }

  /**
   * Remove uma tarefa
   * @param id - ID da tarefa
   * @param userId - ID do usuário
   * @returns Promise<boolean> - True se foi removida
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    try {
      console.log('🗑️ Removendo tarefa:', id);

      const database = getDatabase();
      const result = await database.run(
        'DELETE FROM todos WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      const success = result.changes > 0;
      
      if (success) {
        console.log('✅ Tarefa removida com sucesso:', id);
      } else {
        console.log('⚠️ Tarefa não encontrada ou não pertence ao usuário:', id);
      }

      return success;
    } catch (error: any) {
      console.error('❌ Erro ao remover tarefa:', error.message);
      throw error;
    }
  }

  /**
   * Marca uma tarefa como concluída ou não concluída
   * @param id - ID da tarefa
   * @param userId - ID do usuário
   * @param completed - Status de conclusão
   * @returns Promise<boolean> - True se foi atualizada
   */
  static async toggleCompleted(id: number, userId: number, completed: boolean): Promise<boolean> {
    try {
      // Se está tentando marcar como concluída, verificar se não está vencida
      if (completed) {
        const todo = await this.findById(id, userId);
        if (todo && todo.due_date) {
          const dueDate = new Date(todo.due_date);
          const now = new Date();
          
          if (now > dueDate) {
            throw new Error('Não é possível concluir uma tarefa vencida. Prazo expirado.');
          }
        }
      }
      
      return this.update(id, userId, { completed });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém estatísticas das tarefas de um usuário
   * @param userId - ID do usuário
   * @returns Promise<TodoStats> - Estatísticas das tarefas
   */
  static async getStats(userId: number): Promise<TodoStats> {
    try {
      console.log('📊 Obtendo estatísticas para usuário:', userId);

      const database = getDatabase();

      // Estatísticas gerais
      const generalStats = await database.get<{
        total: number;
        completed: number;
      }>(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
         FROM todos 
         WHERE user_id = ?`,
        [userId]
      );

      // Estatísticas por prioridade
      const priorityStats = await database.all<{
        priority: TodoPriority;
        count: number;
      }>(
        `SELECT priority, COUNT(*) as count 
         FROM todos 
         WHERE user_id = ? 
         GROUP BY priority`,
        [userId]
      );

      const byPriority = {
        baixa: 0,
        media: 0,
        alta: 0
      };

      priorityStats.forEach(stat => {
        byPriority[stat.priority] = stat.count;
      });

      const stats: TodoStats = {
        total: generalStats?.total || 0,
        completed: generalStats?.completed || 0,
        pending: (generalStats?.total || 0) - (generalStats?.completed || 0),
        byPriority
      };

      console.log('✅ Estatísticas calculadas:', stats);
      return stats;
    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      throw error;
    }
  }

  /**
   * Remove todas as tarefas concluídas de um usuário
   * @param userId - ID do usuário
   * @returns Promise<number> - Número de tarefas removidas
   */
  static async deleteCompleted(userId: number): Promise<number> {
    try {
      console.log('🧹 Removendo tarefas concluídas do usuário:', userId);

      const database = getDatabase();
      const result = await database.run(
        'DELETE FROM todos WHERE user_id = ? AND completed = 1',
        [userId]
      );

      console.log('✅ Tarefas concluídas removidas:', result.changes);
      return result.changes;
    } catch (error: any) {
      console.error('❌ Erro ao remover tarefas concluídas:', error.message);
      throw error;
    }
  }

  /**
   * Marca todas as tarefas de um usuário como concluídas
   * @param userId - ID do usuário
   * @returns Promise<number> - Número de tarefas atualizadas
   */
  static async markAllCompleted(userId: number): Promise<number> {
    try {
      console.log('✅ Marcando todas as tarefas como concluídas para usuário:', userId);

      const database = getDatabase();
      const result = await database.run(
        'UPDATE todos SET completed = 1 WHERE user_id = ? AND completed = 0',
        [userId]
      );

      console.log('✅ Tarefas marcadas como concluídas:', result.changes);
      return result.changes;
    } catch (error: any) {
      console.error('❌ Erro ao marcar todas as tarefas como concluídas:', error.message);
      throw error;
    }
  }

  /**
   * Busca tarefas por prioridade
   * @param userId - ID do usuário
   * @param priority - Prioridade a ser buscada
   * @returns Promise<TodoResponse[]> - Lista de tarefas
   */
  static async findByPriority(userId: number, priority: TodoPriority): Promise<TodoResponse[]> {
    try {
      const database = getDatabase();
      const todos = await database.all<TodoResponse>(
        `SELECT id, title, description, completed, priority, due_date, created_at, updated_at
         FROM todos 
         WHERE user_id = ? AND priority = ?
         ORDER BY created_at DESC`,
        [userId, priority]
      );

      return todos;
    } catch (error: any) {
      console.error('❌ Erro ao buscar tarefas por prioridade:', error.message);
      throw error;
    }
  }

  /**
   * Busca tarefas pendentes (não concluídas)
   * @param userId - ID do usuário
   * @param limit - Limite de resultados
   * @returns Promise<TodoResponse[]> - Lista de tarefas pendentes
   */
  static async findPending(userId: number, limit: number = 10): Promise<TodoResponse[]> {
    try {
      const database = getDatabase();
      const todos = await database.all<TodoResponse>(
        `SELECT id, title, description, completed, priority, due_date, created_at, updated_at
         FROM todos 
         WHERE user_id = ? AND completed = 0
         ORDER BY 
           CASE priority 
             WHEN 'alta' THEN 1 
             WHEN 'media' THEN 2 
             WHEN 'baixa' THEN 3 
           END,
           created_at DESC
         LIMIT ?`,
        [userId, limit]
      );

      return todos;
    } catch (error: any) {
      console.error('❌ Erro ao buscar tarefas pendentes:', error.message);
      throw error;
    }
  }

  /**
   * Busca tarefas concluídas recentemente
   * @param userId - ID do usuário
   * @param limit - Limite de resultados
   * @returns Promise<TodoResponse[]> - Lista de tarefas concluídas
   */
  static async findRecentCompleted(userId: number, limit: number = 10): Promise<TodoResponse[]> {
    try {
      const database = getDatabase();
      const todos = await database.all<TodoResponse>(
        `SELECT id, title, description, completed, priority, due_date, created_at, updated_at
         FROM todos 
         WHERE user_id = ? AND completed = 1
         ORDER BY updated_at DESC
         LIMIT ?`,
        [userId, limit]
      );

      return todos;
    } catch (error: any) {
      console.error('❌ Erro ao buscar tarefas concluídas recentemente:', error.message);
      throw error;
    }
  }

  /**
   * Conta tarefas por status
   * @param userId - ID do usuário
   * @returns Promise<{pending: number, completed: number}> - Contadores
   */
  static async countByStatus(userId: number): Promise<{pending: number, completed: number}> {
    try {
      const database = getDatabase();
      const result = await database.get<{
        pending: number;
        completed: number;
      }>(
        `SELECT 
           SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
         FROM todos 
         WHERE user_id = ?`,
        [userId]
      );

      return {
        pending: result?.pending || 0,
        completed: result?.completed || 0
      };
    } catch (error: any) {
      console.error('❌ Erro ao contar tarefas por status:', error.message);
      throw error;
    }
  }
}
