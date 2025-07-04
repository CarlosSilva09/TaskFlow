import { Response } from 'express';
import { TodoModel } from '../models/Todo';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  CreateTodoData, 
  UpdateTodoData, 
  TodoFilters,
  ApiResponse, 
  TodoResponse,
  TodoStats,
  PaginatedResponse,
  HttpStatusCode 
} from '../types';

/**
 * Controlador de tarefas (todos)
 * Gerencia todas as operações CRUD de tarefas
 */
export class TodoController {
  /**
   * Cria uma nova tarefa
   * @param req - Request autenticada com dados da tarefa
   * @param res - Response
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { title, description, priority, due_date }: CreateTodoData = req.body;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      console.log('📝 Criando nova tarefa para usuário:', user.id, { title, description, priority, due_date });

      // Validações
      if (!title || title.trim().length === 0) {
        console.log('❌ Título da tarefa não fornecido');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Título da tarefa é obrigatório',
          errors: ['Título não pode estar vazio']
        } as ApiResponse);
        return;
      }

      if (title.length > 200) {
        console.log('❌ Título muito longo');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Título não pode ter mais de 200 caracteres',
          errors: ['Título muito longo']
        } as ApiResponse);
        return;
      }

      if (description && description.length > 1000) {
        console.log('❌ Descrição muito longa');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Descrição não pode ter mais de 1000 caracteres',
          errors: ['Descrição muito longa']
        } as ApiResponse);
        return;
      }

      if (priority && !['baixa', 'media', 'alta'].includes(priority)) {
        console.log('❌ Prioridade inválida:', priority);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Prioridade deve ser: baixa, media ou alta',
          errors: ['Prioridade inválida']
        } as ApiResponse);
        return;
      }

      // Validar data de vencimento se fornecida
      if (due_date) {
        const dueDate = new Date(due_date);
        if (isNaN(dueDate.getTime())) {
          console.log('❌ Data de vencimento inválida:', due_date);
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Data de vencimento inválida',
            errors: ['Formato de data inválido']
          } as ApiResponse);
          return;
        }
      }

      // Criar tarefa
      const todoId = await TodoModel.create(user.id, {
        title: title.trim(),
        description: description?.trim() || undefined,
        priority: priority || 'media',
        due_date: due_date || undefined
      });

      // Buscar tarefa criada
      const createdTodo = await TodoModel.findById(todoId, user.id);

      console.log('✅ Tarefa criada com ID:', todoId);

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        message: 'Tarefa criada com sucesso',
        data: {
          todo: createdTodo
        }
      } as ApiResponse<{ todo: TodoResponse | undefined }>);
    } catch (error: any) {
      console.error('❌ Erro ao criar tarefa:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao criar tarefa']
      } as ApiResponse);
    }
  }

  /**
   * Lista todas as tarefas do usuário com filtros e paginação
   * @param req - Request autenticada com query parameters
   * @param res - Response
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      console.log('📋 Listando tarefas para usuário:', user.id);

      // Extrair filtros da query
      const filters: TodoFilters = {
        completed: req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined,
        priority: req.query.priority as 'baixa' | 'media' | 'alta' | undefined,
        search: req.query.search as string | undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      // Validar filtros
      if (filters.page && filters.page < 1) filters.page = 1;
      if (filters.limit && (filters.limit < 1 || filters.limit > 100)) filters.limit = 10;
      if (!filters.page) filters.page = 1;
      if (!filters.limit) filters.limit = 10;

      if (filters.priority && !['baixa', 'media', 'alta'].includes(filters.priority)) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Prioridade deve ser: baixa, media ou alta',
          errors: ['Filtro de prioridade inválido']
        } as ApiResponse);
        return;
      }

      // Buscar tarefas
      const result = await TodoModel.findByUser(user.id, filters);

      console.log(`✅ ${result.data.length} tarefas encontradas para usuário:`, user.id);

      res.status(HttpStatusCode.OK).json(result);
    } catch (error: any) {
      console.error('❌ Erro ao listar tarefas:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao buscar tarefas']
      } as ApiResponse);
    }
  }

  /**
   * Obtém uma tarefa específica por ID
   * @param req - Request autenticada com ID da tarefa
   * @param res - Response
   */
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const todoId = parseInt(req.params.id);

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      if (isNaN(todoId)) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'ID da tarefa inválido',
          errors: ['ID deve ser um número']
        } as ApiResponse);
        return;
      }

      console.log('🔍 Buscando tarefa ID:', todoId, 'para usuário:', user.id);

      // Buscar tarefa
      const todo = await TodoModel.findById(todoId, user.id);

      if (!todo) {
        console.log('❌ Tarefa não encontrada:', todoId);
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Tarefa não encontrada',
          errors: ['Tarefa não existe ou não pertence ao usuário']
        } as ApiResponse);
        return;
      }

      console.log('✅ Tarefa encontrada:', todoId);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Tarefa encontrada',
        data: {
          todo
        }
      } as ApiResponse<{ todo: TodoResponse }>);
    } catch (error: any) {
      console.error('❌ Erro ao buscar tarefa:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao buscar tarefa']
      } as ApiResponse);
    }
  }

  /**
   * Atualiza uma tarefa
   * @param req - Request autenticada com ID e dados da tarefa
   * @param res - Response
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const todoId = parseInt(req.params.id);
      const { title, description, completed, priority, due_date }: UpdateTodoData = req.body;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      if (isNaN(todoId)) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'ID da tarefa inválido',
          errors: ['ID deve ser um número']
        } as ApiResponse);
        return;
      }

      console.log('📝 Atualizando tarefa ID:', todoId, 'para usuário:', user.id);

      // Validações
      const updateData: UpdateTodoData = {};

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Título não pode estar vazio',
            errors: ['Título inválido']
          } as ApiResponse);
          return;
        }

        if (title.length > 200) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Título não pode ter mais de 200 caracteres',
            errors: ['Título muito longo']
          } as ApiResponse);
          return;
        }

        updateData.title = title.trim();
      }

      if (description !== undefined) {
        if (description && description.length > 1000) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Descrição não pode ter mais de 1000 caracteres',
            errors: ['Descrição muito longa']
          } as ApiResponse);
          return;
        }

        updateData.description = description?.trim() || undefined;
      }

      if (completed !== undefined) {
        if (typeof completed !== 'boolean') {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Campo completed deve ser boolean',
            errors: ['Valor de completed inválido']
          } as ApiResponse);
          return;
        }

        updateData.completed = completed;
      }

      if (priority !== undefined) {
        if (!['baixa', 'media', 'alta'].includes(priority)) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Prioridade deve ser: baixa, media ou alta',
            errors: ['Prioridade inválida']
          } as ApiResponse);
          return;
        }

        updateData.priority = priority;
      }

      if (due_date !== undefined) {
        if (due_date && due_date.trim() !== '') {
          const dueDate = new Date(due_date);
          if (isNaN(dueDate.getTime())) {
            res.status(HttpStatusCode.BAD_REQUEST).json({
              success: false,
              message: 'Data de vencimento inválida',
              errors: ['Formato de data inválido']
            } as ApiResponse);
            return;
          }
          updateData.due_date = due_date;
        } else {
          updateData.due_date = undefined; // Remove a data se string vazia
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Nenhum campo válido para atualizar',
          errors: ['Forneça pelo menos um campo para atualizar']
        } as ApiResponse);
        return;
      }

      // Atualizar tarefa
      const success = await TodoModel.update(todoId, user.id, updateData);

      if (!success) {
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Tarefa não encontrada',
          errors: ['Tarefa não existe ou não pertence ao usuário']
        } as ApiResponse);
        return;
      }

      // Buscar tarefa atualizada
      const updatedTodo = await TodoModel.findById(todoId, user.id);

      console.log('✅ Tarefa atualizada:', todoId);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Tarefa atualizada com sucesso',
        data: {
          todo: updatedTodo
        }
      } as ApiResponse<{ todo: TodoResponse | undefined }>);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar tarefa:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao atualizar tarefa']
      } as ApiResponse);
    }
  }

  /**
   * Remove uma tarefa
   * @param req - Request autenticada com ID da tarefa
   * @param res - Response
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const todoId = parseInt(req.params.id);

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      if (isNaN(todoId)) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'ID da tarefa inválido',
          errors: ['ID deve ser um número']
        } as ApiResponse);
        return;
      }

      console.log('🗑️ Removendo tarefa ID:', todoId, 'para usuário:', user.id);

      // Remover tarefa
      const success = await TodoModel.delete(todoId, user.id);

      if (!success) {
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Tarefa não encontrada',
          errors: ['Tarefa não existe ou não pertence ao usuário']
        } as ApiResponse);
        return;
      }

      console.log('✅ Tarefa removida:', todoId);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Tarefa removida com sucesso',
        data: {}
      } as ApiResponse);
    } catch (error: any) {
      console.error('❌ Erro ao remover tarefa:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao remover tarefa']
      } as ApiResponse);
    }
  }

  /**
   * Alterna o status de uma tarefa (concluída/pendente)
   * @param req - Request autenticada com ID da tarefa
   * @param res - Response
   */
  static async toggleCompleted(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const todoId = parseInt(req.params.id);

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      if (isNaN(todoId)) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'ID da tarefa inválido',
          errors: ['ID deve ser um número']
        } as ApiResponse);
        return;
      }

      console.log('🔄 Alternando status da tarefa ID:', todoId, 'para usuário:', user.id);

      // Buscar tarefa atual
      const currentTodo = await TodoModel.findById(todoId, user.id);

      if (!currentTodo) {
        console.log('❌ Tarefa não encontrada:', todoId);
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Tarefa não encontrada',
          errors: ['Tarefa não existe ou não pertence ao usuário']
        } as ApiResponse);
        return;
      }

      console.log('📝 Tarefa atual:', currentTodo);

      // Alternar status
      const newStatus = !currentTodo.completed;
      console.log('🔄 Novo status será:', newStatus);

      const success = await TodoModel.update(todoId, user.id, { completed: newStatus });

      if (!success) {
        console.log('❌ Falha ao atualizar tarefa:', todoId);
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao alterar status da tarefa',
          errors: ['Falha interna ao alterar status']
        } as ApiResponse);
        return;
      }

      // Buscar tarefa atualizada para confirmar
      const updatedTodo = await TodoModel.findById(todoId, user.id);
      console.log('✅ Tarefa atualizada:', updatedTodo);

      if (!updatedTodo) {
        console.log('❌ Erro: tarefa sumiu após atualização');
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro inesperado após atualização',
          errors: ['Tarefa não encontrada após atualização']
        } as ApiResponse);
        return;
      }

      console.log('✅ Status da tarefa alterado com sucesso:', todoId, 'para:', updatedTodo.completed);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: `Tarefa marcada como ${updatedTodo.completed ? 'concluída' : 'pendente'}`,
        data: {
          todo: updatedTodo
        }
      } as ApiResponse<{ todo: TodoResponse }>);
    } catch (error: any) {
      console.error('❌ Erro ao alterar status da tarefa:', error.message);
      console.error('Stack trace:', error.stack);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao alterar status da tarefa']
      } as ApiResponse);
    }
  }

  /**
   * Obtém estatísticas das tarefas do usuário
   * @param req - Request autenticada
   * @param res - Response
   */
  static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      console.log('📊 Obtendo estatísticas para usuário:', user.id);

      // Buscar estatísticas
      const stats = await TodoModel.getStats(user.id);

      console.log('✅ Estatísticas calculadas para usuário:', user.id);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: {
          stats
        }
      } as ApiResponse<{ stats: TodoStats }>);
    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao calcular estatísticas']
      } as ApiResponse);
    }
  }

  /**
   * Remove todas as tarefas concluídas do usuário
   * @param req - Request autenticada
   * @param res - Response
   */
  static async deleteCompleted(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      console.log('🧹 Removendo tarefas concluídas para usuário:', user.id);

      // Remover tarefas concluídas
      const deletedCount = await TodoModel.deleteCompleted(user.id);

      console.log('✅ Tarefas concluídas removidas:', deletedCount);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: `${deletedCount} tarefa(s) concluída(s) removida(s) com sucesso`,
        data: {
          deletedCount
        }
      } as ApiResponse<{ deletedCount: number }>);
    } catch (error: any) {
      console.error('❌ Erro ao remover tarefas concluídas:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao remover tarefas concluídas']
      } as ApiResponse);
    }
  }

  /**
   * Marca todas as tarefas do usuário como concluídas
   * @param req - Request autenticada
   * @param res - Response
   */
  static async markAllCompleted(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      console.log('✅ Marcando todas as tarefas como concluídas para usuário:', user.id);

      // Marcar todas como concluídas
      const updatedCount = await TodoModel.markAllCompleted(user.id);

      console.log('✅ Tarefas marcadas como concluídas:', updatedCount);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: `${updatedCount} tarefa(s) marcada(s) como concluída(s)`,
        data: {
          updatedCount
        }
      } as ApiResponse<{ updatedCount: number }>);
    } catch (error: any) {
      console.error('❌ Erro ao marcar tarefas como concluídas:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao marcar tarefas como concluídas']
      } as ApiResponse);
    }
  }
}
