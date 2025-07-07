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
 * Controlador de Tarefas (TodoController)
 * 
 * Este controlador gerencia todas as operações CRUD (Create, Read, Update, Delete) 
 * relacionadas às tarefas dos usuários no sistema.
 * 
 * Funcionalidades principais:
 * - Criação de novas tarefas
 * - Listagem com filtros, busca e paginação
 * - Visualização de tarefa específica
 * - Atualização de tarefas existentes
 * - Remoção de tarefas
 * - Alternância de status (concluída/pendente)
 * - Estatísticas e operações em lote
 * 
 * Segurança:
 * - Todas as operações requerem autenticação JWT
 * - Usuários só podem acessar suas próprias tarefas
 * - Validação rigorosa de entrada de dados
 * - Tratamento completo de erros
 */
export class TodoController {
  /**
   * CRIAR NOVA TAREFA
   * 
   * Esta função permite que um usuário autenticado crie uma nova tarefa
   * no sistema. Realiza validações completas dos dados de entrada.
   * 
   * Fluxo de execução:
   * 1. Verificar autenticação do usuário
   * 2. Extrair dados da requisição
   * 3. Validar campos obrigatórios e opcionais
   * 4. Criar tarefa no banco de dados
   * 5. Buscar tarefa criada para confirmação
   * 6. Retornar resposta de sucesso com dados da tarefa
   * 
   * @param req - Request autenticada contendo dados da tarefa no body
   * @param res - Response para retornar resultado da operação
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // EXTRAIR DADOS DO USUÁRIO AUTENTICADO
      // O middleware authenticateToken já validou o token e adicionou user ao request
      // req.user contém: { id, name, email, created_at, updated_at }
      const user = req.user;
      
      // EXTRAIR DADOS DA TAREFA DO BODY DA REQUISIÇÃO
      // Desestruturação dos campos esperados no corpo da requisição
      // title: obrigatório - título da tarefa
      // description: opcional - descrição detalhada
      // priority: opcional - prioridade (baixa, media, alta)
      // due_date: opcional - data de vencimento
      const { title, description, priority, due_date }: CreateTodoData = req.body;

      // VERIFICAÇÃO DE SEGURANÇA - USUÁRIO AUTENTICADO
      // Esta verificação é redundante (o middleware já fez), mas garante segurança extra
      // Se por algum motivo o middleware falhou, esta verificação captura o erro
      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido ou expirado']
        } as ApiResponse);
        return; // Interrompe execução da função
      }

      // LOG DA OPERAÇÃO PARA AUDITORIA E DEBUG
      // Registra tentativa de criação com dados (esconde informações sensíveis)
      console.log('📝 Tentativa de criação de tarefa:', {
        userId: user.id,
        userEmail: user.email,
        title: title || 'NÃO_INFORMADO',
        hasDescription: !!description,
        priority: priority || 'PADRÃO',
        hasDueDate: !!due_date
      });

      // ============================================
      // VALIDAÇÕES DE ENTRADA DE DADOS
      // ============================================

      // VALIDAÇÃO 1: TÍTULO OBRIGATÓRIO E NÃO VAZIO
      // Verifica se título foi fornecido e não é string vazia após trim()
      // trim() remove espaços no início e fim da string
      // !title verifica se é null, undefined ou string vazia
      if (!title || title.trim().length === 0) {
        console.log('❌ Validação falhou: título vazio ou não fornecido');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'O título da tarefa é obrigatório',
          errors: ['Campo título não pode estar vazio']
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO 2: COMPRIMENTO MÁXIMO DO TÍTULO
      // Evita títulos excessivamente longos que podem causar problemas:
      // - Interface do usuário quebrada
      // - Problemas de performance no banco
      // - Limitações de armazenamento
      if (title.length > 200) {
        console.log('❌ Validação falhou: título muito longo:', title.length, 'caracteres');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Título não pode ter mais de 200 caracteres',
          errors: [`Título tem ${title.length} caracteres. Máximo permitido: 200`]
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO 3: COMPRIMENTO MÁXIMO DA DESCRIÇÃO (SE FORNECIDA)
      // Descrição é opcional, mas se fornecida deve ter limite razoável
      // && operator: só executa a segunda parte se description existe (não null/undefined)
      if (description && description.length > 1000) {
        console.log('❌ Validação falhou: descrição muito longa:', description.length, 'caracteres');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Descrição não pode ter mais de 1000 caracteres',
          errors: [`Descrição tem ${description.length} caracteres. Máximo permitido: 1000`]
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO 4: PRIORIDADE VÁLIDA (SE FORNECIDA)
      // Verifica se a prioridade está dentro dos valores aceitos
      // includes() verifica se o valor existe no array
      if (priority && !['baixa', 'media', 'alta'].includes(priority)) {
        console.log('❌ Validação falhou: prioridade inválida:', priority);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Prioridade deve ser: baixa, media ou alta',
          errors: [`Prioridade "${priority}" não é válida. Use: baixa, media ou alta`]
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO 5: DATA DE VENCIMENTO VÁLIDA (SE FORNECIDA)
      // Verifica se a string de data pode ser convertida para Date válida
      if (due_date) {
        const dueDate = new Date(due_date);
        // isNaN(date.getTime()) é a forma mais confiável de verificar data inválida
        // getTime() retorna NaN para datas inválidas
        if (isNaN(dueDate.getTime())) {
          console.log('❌ Validação falhou: data de vencimento inválida:', due_date);
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Data de vencimento tem formato inválido',
            errors: ['Use formato ISO 8601: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss']
          } as ApiResponse);
          return;
        }

        // VALIDAÇÃO OPCIONAL: DATA NÃO PODE SER NO PASSADO
        // Comentado porque pode ser útil criar tarefas com data passada em alguns casos
        /*
        const now = new Date();
        if (dueDate < now) {
          console.log('❌ Validação falhou: data de vencimento no passado');
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Data de vencimento não pode ser no passado',
            errors: ['Escolha uma data futura']
          } as ApiResponse);
          return;
        }
        */
      }

      // ============================================
      // CRIAÇÃO DA TAREFA NO BANCO DE DADOS
      // ============================================

      // PREPARAR DADOS PARA INSERÇÃO
      // Limpa e padroniza os dados antes de enviar para o banco
      const todoData: CreateTodoData = {
        title: title.trim(),                                    // Remove espaços extras
        description: description?.trim() || undefined,          // undefined se vazio
        priority: priority || 'media',                          // Padrão: média
        due_date: due_date || undefined                         // undefined se não fornecida
      };

      // CHAMAR MODELO PARA INSERIR NO BANCO
      // TodoModel.create() executa INSERT na tabela todos
      // Retorna o ID da tarefa criada
      // user.id garante que a tarefa pertence ao usuário autenticado
      console.log('💾 Inserindo tarefa no banco de dados...');
      const todoId = await TodoModel.create(user.id, todoData);
      console.log('✅ Tarefa inserida com ID:', todoId);

      // BUSCAR TAREFA CRIADA PARA CONFIRMAÇÃO
      // Importante buscar os dados do banco para garantir que:
      // 1. A tarefa foi realmente criada
      // 2. Os campos automáticos foram preenchidos (created_at, updated_at)
      // 3. Retornar dados exatos como estão no banco
      const createdTodo = await TodoModel.findById(todoId, user.id);
      
      if (!createdTodo) {
        // Situação rara: tarefa foi criada mas não conseguiu buscar
        console.error('❌ Erro: tarefa criada mas não encontrada na busca');
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao confirmar criação da tarefa',
          errors: ['Tarefa criada mas não confirmada']
        } as ApiResponse);
        return;
      }

      // LOG DE SUCESSO PARA AUDITORIA
      console.log('✅ Tarefa criada com sucesso:', {
        id: createdTodo.id,
        title: createdTodo.title,
        userId: user.id,
        priority: createdTodo.priority
      });

      // RESPOSTA DE SUCESSO PARA O CLIENTE
      // Status 201 (Created) indica que um novo recurso foi criado
      // Retorna dados completos da tarefa criada
      res.status(HttpStatusCode.CREATED).json({
        success: true,
        message: 'Tarefa criada com sucesso',
        data: {
          todo: createdTodo // Dados completos da tarefa do banco
        }
      } as ApiResponse<{ todo: TodoResponse | undefined }>);

    } catch (error: any) {
      // TRATAMENTO DE ERROS NÃO PREVISTOS
      // Captura qualquer erro que não foi tratado nas validações
      // Exemplos: erro de conexão com banco, erro de código, etc.
      console.error('❌ Erro inesperado ao criar tarefa:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      // Resposta genérica de erro interno para não expor detalhes
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor ao criar tarefa',
        errors: ['Falha temporária. Tente novamente em alguns instantes.']
      } as ApiResponse);
    }
  }

  /**
   * LISTAR TODAS AS TAREFAS DO USUÁRIO
   * 
   * Esta função retorna uma lista paginada das tarefas do usuário autenticado
   * com suporte a múltiplos filtros e busca por texto.
   * 
   * Funcionalidades:
   * - Paginação (page, limit)
   * - Filtro por status (completed: true/false)
   * - Filtro por prioridade (baixa, media, alta)
   * - Busca por texto no título e descrição
   * - Ordenação inteligente (prioridade + data)
   * 
   * Query Parameters aceitos:
   * - ?completed=true|false - filtra por status de conclusão
   * - ?priority=baixa|media|alta - filtra por prioridade
   * - ?search=texto - busca texto no título/descrição
   * - ?page=1 - número da página (padrão: 1)
   * - ?limit=10 - itens por página (padrão: 10, máximo: 100)
   * 
   * Exemplo de uso:
   * GET /api/todos?completed=false&priority=alta&search=projeto&page=1&limit=20
   * 
   * @param req - Request autenticada com query parameters opcionais
   * @param res - Response com lista paginada de tarefas
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // VERIFICAR AUTENTICAÇÃO DO USUÁRIO
      const user = req.user;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido ou expirado']
        } as ApiResponse);
        return;
      }

      // LOG DA OPERAÇÃO
      console.log('📋 Solicitação de listagem de tarefas:', {
        userId: user.id,
        userEmail: user.email,
        queryParams: req.query
      });

      // ============================================
      // EXTRAIR E PROCESSAR FILTROS DA QUERY STRING
      // ============================================

      // CONSTRUIR OBJETO DE FILTROS
      // Converte query parameters (sempre strings) para tipos apropriados
      const filters: TodoFilters = {
        // FILTRO DE STATUS COMPLETED
        // req.query.completed pode ser: 'true', 'false', undefined
        // Conversão: 'true' -> true, 'false' -> false, outros -> undefined
        completed: req.query.completed === 'true' ? true : 
                  req.query.completed === 'false' ? false : 
                  undefined,
        
        // FILTRO DE PRIORIDADE
        // Type assertion para garantir que é um dos valores válidos
        priority: req.query.priority as 'baixa' | 'media' | 'alta' | undefined,
        
        // FILTRO DE BUSCA POR TEXTO
        // Busca no título e descrição da tarefa
        search: req.query.search as string | undefined,
        
        // PAGINAÇÃO - PÁGINA ATUAL
        // parseInt() converte string para número
        // || 1 define valor padrão se conversão falhar ou não fornecido
        page: parseInt(req.query.page as string) || 1,
        
        // PAGINAÇÃO - ITENS POR PÁGINA
        // Padrão: 10 itens por página
        limit: parseInt(req.query.limit as string) || 10
      };

      // ============================================
      // VALIDAÇÃO E SANITIZAÇÃO DOS FILTROS
      // ============================================

      // VALIDAR PÁGINA MÍNIMA
      // Página deve ser pelo menos 1
      if (filters.page && filters.page < 1) {
        console.log('⚠️ Página inválida fornecida:', filters.page, 'corrigindo para 1');
        filters.page = 1;
      }

      // VALIDAR LIMITE DE ITENS POR PÁGINA
      // Previne sobrecarga do servidor limitando itens por página
      // Mínimo: 1, Máximo: 100 itens
      if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
        console.log('⚠️ Limite inválido fornecido:', filters.limit, 'corrigindo para 10');
        filters.limit = 10;
      }

      // GARANTIR VALORES PADRÃO PARA PAGINAÇÃO
      // Importante para evitar undefined que pode quebrar consultas SQL
      if (!filters.page) filters.page = 1;
      if (!filters.limit) filters.limit = 10;

      // VALIDAR PRIORIDADE SE FORNECIDA
      // Verifica se a prioridade está dentro dos valores aceitos
      if (filters.priority && !['baixa', 'media', 'alta'].includes(filters.priority)) {
        console.log('❌ Prioridade inválida no filtro:', filters.priority);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Prioridade deve ser: baixa, media ou alta',
          errors: [`Filtro de prioridade "${filters.priority}" não é válido`]
        } as ApiResponse);
        return;
      }

      // SANITIZAR BUSCA POR TEXTO (SE FORNECIDA)
      // Remove espaços extras e previne buscas muito pequenas
      if (filters.search) {
        filters.search = filters.search.trim();
        // Opcional: ignorar buscas muito curtas para performance
        if (filters.search.length < 2) {
          console.log('⚠️ Termo de busca muito curto, ignorando:', filters.search);
          filters.search = undefined;
        }
      }

      // LOG DOS FILTROS PROCESSADOS
      console.log('🔍 Filtros aplicados:', {
        completed: filters.completed,
        priority: filters.priority,
        search: filters.search ? `"${filters.search}"` : 'nenhuma',
        page: filters.page,
        limit: filters.limit
      });

      // ============================================
      // BUSCAR TAREFAS NO BANCO DE DADOS
      // ============================================

      // EXECUTAR CONSULTA COM FILTROS
      // TodoModel.findByUser() executa SELECT com WHERE dinâmico
      // Inclui paginação, ordenação e contagem total
      console.log('💾 Executando consulta no banco de dados...');
      const result = await TodoModel.findByUser(user.id, filters);

      // LOG DOS RESULTADOS
      const resultLog = {
        totalFound: result.data.length,
        totalInDatabase: result.pagination?.total || 0,
        currentPage: result.pagination?.page || filters.page,
        totalPages: result.pagination?.totalPages || 1,
        hasMore: result.pagination?.hasNext || false
      };
      console.log('✅ Consulta executada com sucesso:', resultLog);

      // VERIFICAR SE ENCONTROU RESULTADOS
      if (result.data.length === 0) {
        const message = filters.search || filters.completed !== undefined || filters.priority 
          ? 'Nenhuma tarefa encontrada com os filtros aplicados'
          : 'Você ainda não criou nenhuma tarefa';
        
        console.log('📭 Nenhuma tarefa encontrada para os filtros aplicados');
      }

      // ============================================
      // RESPOSTA PARA O CLIENTE
      // ============================================

      // RETORNAR RESPOSTA PAGINADA
      // O result já contém a estrutura PaginatedResponse completa
      // Inclui: data[], pagination{}, success, message
      res.status(HttpStatusCode.OK).json(result);

    } catch (error: any) {
      // TRATAMENTO DE ERROS NÃO PREVISTOS
      console.error('❌ Erro inesperado ao listar tarefas:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.id,
        filters: req.query
      });
      
      // Resposta genérica de erro interno
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor ao buscar tarefas',
        errors: ['Falha temporária. Tente recarregar a página.']
      } as ApiResponse);
    }
  }

  /**
   * OBTER TAREFA ESPECÍFICA POR ID
   * 
   * Esta função busca e retorna uma tarefa específica baseada no ID fornecido.
   * Inclui verificação de propriedade - usuários só podem acessar suas próprias tarefas.
   * 
   * Funcionalidades:
   * - Busca tarefa por ID único
   * - Verifica se tarefa pertence ao usuário autenticado
   * - Retorna dados completos da tarefa
   * - Tratamento robusto de erros (ID inválido, não encontrada, etc.)
   * 
   * Casos de uso:
   * - Visualizar detalhes de uma tarefa específica
   * - Editar tarefa (buscar dados atuais)
   * - Validar existência antes de outras operações
   * 
   * URL: GET /api/todos/:id
   * Exemplo: GET /api/todos/123
   * 
   * @param req - Request autenticada com ID da tarefa nos parâmetros da URL
   * @param res - Response com dados da tarefa ou erro
   */
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // EXTRAIR DADOS DO USUÁRIO AUTENTICADO
      const user = req.user;
      
      // EXTRAIR ID DA TAREFA DOS PARÂMETROS DA URL
      // req.params.id vem da rota definida como /api/todos/:id
      // Como URL params são sempre strings, precisa converter para número
      // parseInt() converte string para integer
      // Exemplo: "/api/todos/123" -> req.params.id = "123" -> todoId = 123
      const todoId = parseInt(req.params.id);

      // VERIFICAÇÃO DE SEGURANÇA - USUÁRIO AUTENTICADO
      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido ou expirado']
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO DO ID DA TAREFA
      // isNaN() verifica se a conversão parseInt() falhou
      // Falha acontece quando ID não é um número válido
      // Exemplos que falham: "abc", "12.5", "", null, undefined
      if (isNaN(todoId)) {
        console.log('❌ ID de tarefa inválido fornecido:', req.params.id);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'ID da tarefa deve ser um número válido',
          errors: [`ID "${req.params.id}" não é um número válido`]
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO ADICIONAL: ID POSITIVO
      // IDs de banco de dados são sempre números positivos
      // Previne tentativas de acesso com IDs negativos ou zero
      if (todoId <= 0) {
        console.log('❌ ID de tarefa deve ser positivo:', todoId);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'ID da tarefa deve ser um número positivo',
          errors: [`ID ${todoId} não é válido`]
        } as ApiResponse);
        return;
      }

      // LOG DA OPERAÇÃO PARA AUDITORIA
      console.log('🔍 Solicitação de busca de tarefa específica:', {
        todoId: todoId,
        userId: user.id,
        userEmail: user.email
      });

      // ============================================
      // BUSCAR TAREFA NO BANCO DE DADOS
      // ============================================

      // EXECUTAR CONSULTA NO BANCO
      // TodoModel.findById() executa SELECT WHERE id = ? AND user_id = ?
      // A verificação user_id garante que:
      // 1. Usuário só acessa suas próprias tarefas
      // 2. Não há vazamento de dados entre usuários
      // 3. Segurança de propriedade dos dados
      console.log('💾 Buscando tarefa no banco de dados...');
      const todo = await TodoModel.findById(todoId, user.id);

      // VERIFICAR SE TAREFA FOI ENCONTRADA
      // todo será undefined se:
      // 1. ID não existe na tabela
      // 2. Tarefa existe mas pertence a outro usuário
      // 3. Tarefa foi deletada
      if (!todo) {
        console.log('❌ Tarefa não encontrada ou não pertence ao usuário:', {
          todoId: todoId,
          userId: user.id
        });
        
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Tarefa não encontrada',
          errors: [
            'A tarefa solicitada não existe ou você não tem permissão para acessá-la'
          ]
        } as ApiResponse);
        return;
      }

      // LOG DE SUCESSO
      console.log('✅ Tarefa encontrada com sucesso:', {
        todoId: todo.id,
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
        userId: user.id
      });

      // ============================================
      // RESPOSTA DE SUCESSO
      // ============================================

      // RETORNAR DADOS COMPLETOS DA TAREFA
      // Status 200 (OK) indica que a operação foi bem-sucedida
      // Retorna todos os campos da tarefa:
      // - id, title, description, completed
      // - priority, due_date, created_at, updated_at
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Tarefa encontrada com sucesso',
        data: {
          todo: todo // Dados completos da tarefa
        }
      } as ApiResponse<{ todo: TodoResponse }>);

    } catch (error: any) {
      // TRATAMENTO DE ERROS NÃO PREVISTOS
      // Captura erros de:
      // - Conexão com banco de dados
      // - Erros de SQL
      // - Problemas de infraestrutura
      // - Bugs no código
      console.error('❌ Erro inesperado ao buscar tarefa específica:', {
        message: error.message,
        stack: error.stack,
        todoId: req.params.id,
        userId: req.user?.id
      });
      
      // Resposta genérica de erro interno
      // Não expor detalhes internos para o cliente
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor ao buscar tarefa',
        errors: ['Falha temporária. Tente novamente em alguns instantes.']
      } as ApiResponse);
    }
  }

  /**
   * ATUALIZAR TAREFA EXISTENTE
   * 
   * Esta função permite atualizar campos específicos de uma tarefa existente.
   * Suporta atualização parcial - apenas os campos fornecidos são atualizados.
   * 
   * Funcionalidades:
   * - Atualização parcial de campos
   * - Validação individual de cada campo
   * - Verificação de propriedade da tarefa
   * - Preservação de campos não alterados
   * - Retorno da tarefa atualizada
   * 
   * Campos atualizáveis:
   * - title: string (obrigatório se fornecido)
   * - description: string opcional (pode ser removida)
   * - completed: boolean (status de conclusão)
   * - priority: 'baixa' | 'media' | 'alta'
   * - due_date: string ISO date (pode ser removida)
   * 
   * URL: PUT /api/todos/:id
   * Exemplo: PUT /api/todos/123
   * 
   * @param req - Request autenticada com ID nos params e dados no body
   * @param res - Response com tarefa atualizada ou erro
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // EXTRAIR DADOS BÁSICOS
      const user = req.user;
      const todoId = parseInt(req.params.id);
      
      // EXTRAIR CAMPOS PARA ATUALIZAÇÃO DO BODY
      // Desestruturação permite capturar apenas campos específicos
      // Todos os campos são opcionais em uma atualização
      const { 
        title,       // Novo título (opcional)
        description, // Nova descrição (opcional)
        completed,   // Novo status de conclusão (opcional)
        priority,    // Nova prioridade (opcional)
        due_date     // Nova data de vencimento (opcional)
      }: UpdateTodoData = req.body;

      // VERIFICAÇÃO DE SEGURANÇA - USUÁRIO AUTENTICADO
      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido ou expirado']
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO DO ID DA TAREFA
      if (isNaN(todoId) || todoId <= 0) {
        console.log('❌ ID de tarefa inválido para atualização:', req.params.id);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'ID da tarefa deve ser um número positivo válido',
          errors: [`ID "${req.params.id}" não é válido`]
        } as ApiResponse);
        return;
      }

      // LOG DA OPERAÇÃO
      console.log('📝 Solicitação de atualização de tarefa:', {
        todoId: todoId,
        userId: user.id,
        fieldsToUpdate: {
          title: title !== undefined,
          description: description !== undefined,
          completed: completed !== undefined,
          priority: priority !== undefined,
          due_date: due_date !== undefined
        }
      });

      // ============================================
      // VALIDAÇÃO E PREPARAÇÃO DOS DADOS DE ATUALIZAÇÃO
      // ============================================

      // OBJETO PARA ACUMULAR CAMPOS VÁLIDOS
      // Só incluímos campos que passaram na validação
      // Isso permite atualização parcial segura
      const updateData: UpdateTodoData = {};

      // VALIDAÇÃO E PREPARAÇÃO DO TÍTULO
      if (title !== undefined) {
        // Verificar se é string válida
        if (typeof title !== 'string' || title.trim().length === 0) {
          console.log('❌ Título inválido fornecido:', typeof title, title);
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Título deve ser uma string não vazia',
            errors: ['Título não pode estar vazio']
          } as ApiResponse);
          return;
        }

        // Verificar comprimento máximo
        if (title.length > 200) {
          console.log('❌ Título muito longo:', title.length, 'caracteres');
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Título não pode ter mais de 200 caracteres',
            errors: [`Título tem ${title.length} caracteres. Máximo: 200`]
          } as ApiResponse);
          return;
        }

        // Adicionar título validado aos dados de atualização
        updateData.title = title.trim();
      }

      // VALIDAÇÃO E PREPARAÇÃO DA DESCRIÇÃO
      if (description !== undefined) {
        // Descrição pode ser string vazia (para remover descrição existente)
        if (description && description.length > 1000) {
          console.log('❌ Descrição muito longa:', description.length, 'caracteres');
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Descrição não pode ter mais de 1000 caracteres',
            errors: [`Descrição tem ${description.length} caracteres. Máximo: 1000`]
          } as ApiResponse);
          return;
        }

        // Se descrição é string vazia, converter para null (remove descrição)
        // Se tem conteúdo, fazer trim para remover espaços extras
        updateData.description = description?.trim() || undefined;
      }

      // VALIDAÇÃO E PREPARAÇÃO DO STATUS COMPLETED
      if (completed !== undefined) {
        // Verificar se é boolean válido
        if (typeof completed !== 'boolean') {
          console.log('❌ Campo completed inválido:', typeof completed, completed);
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Campo completed deve ser boolean (true ou false)',
            errors: ['Valor de completed deve ser true ou false']
          } as ApiResponse);
          return;
        }

        updateData.completed = completed;
      }

      // VALIDAÇÃO E PREPARAÇÃO DA PRIORIDADE
      if (priority !== undefined) {
        // Verificar se é uma das prioridades válidas
        if (!['baixa', 'media', 'alta'].includes(priority)) {
          console.log('❌ Prioridade inválida:', priority);
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Prioridade deve ser: baixa, media ou alta',
            errors: [`Prioridade "${priority}" não é válida`]
          } as ApiResponse);
          return;
        }

        updateData.priority = priority;
      }

      // VALIDAÇÃO E PREPARAÇÃO DA DATA DE VENCIMENTO
      if (due_date !== undefined) {
        // Se due_date é string vazia ou null, remove a data
        if (due_date && due_date.trim() !== '') {
          // Tentar converter para Date para validar formato
          const dueDate = new Date(due_date);
          if (isNaN(dueDate.getTime())) {
            console.log('❌ Data de vencimento inválida:', due_date);
            res.status(HttpStatusCode.BAD_REQUEST).json({
              success: false,
              message: 'Data de vencimento tem formato inválido',
              errors: ['Use formato ISO 8601: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss']
            } as ApiResponse);
            return;
          }
          updateData.due_date = due_date;
        } else {
          // String vazia ou null -> remove a data de vencimento
          updateData.due_date = undefined;
        }
      }

      // VERIFICAR SE PELO MENOS UM CAMPO FOI FORNECIDO
      // Atualização sem campos é inválida
      if (Object.keys(updateData).length === 0) {
        console.log('❌ Nenhum campo válido fornecido para atualização');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Nenhum campo válido fornecido para atualização',
          errors: [
            'Forneça pelo menos um campo válido: title, description, completed, priority, due_date'
          ]
        } as ApiResponse);
        return;
      }

      // LOG DOS DADOS VALIDADOS
      console.log('✅ Dados validados para atualização:', {
        todoId: todoId,
        fieldsCount: Object.keys(updateData).length,
        fields: Object.keys(updateData)
      });

      // ============================================
      // EXECUTAR ATUALIZAÇÃO NO BANCO DE DADOS
      // ============================================

      // CHAMAR MODELO PARA EXECUTAR UPDATE
      // TodoModel.update() executa UPDATE WHERE id = ? AND user_id = ?
      // A verificação user_id garante que só o dono pode atualizar
      console.log('💾 Executando atualização no banco de dados...');
      const success = await TodoModel.update(todoId, user.id, updateData);

      // VERIFICAR SE ATUALIZAÇÃO FOI BEM-SUCEDIDA
      // success = false pode significar:
      // 1. Tarefa não existe
      // 2. Tarefa não pertence ao usuário
      // 3. Erro na query SQL
      if (!success) {
        console.log('❌ Falha na atualização - tarefa não encontrada ou sem permissão:', {
          todoId: todoId,
          userId: user.id
        });
        
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Tarefa não encontrada ou sem permissão para atualizar',
          errors: [
            'A tarefa não existe ou você não tem permissão para modificá-la'
          ]
        } as ApiResponse);
        return;
      }

      // BUSCAR DADOS ATUALIZADOS DA TAREFA
      // Importante buscar do banco para garantir dados frescos
      // Inclui campos calculated, triggers, etc. que podem ter mudado
      const updatedTodo = await TodoModel.findById(todoId, user.id);

      if (!updatedTodo) {
        // Situação rara: UPDATE passou mas SELECT falhou
        console.error('❌ Erro: tarefa atualizada mas não encontrada na busca');
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao confirmar atualização da tarefa',
          errors: ['Tarefa atualizada mas não confirmada']
        } as ApiResponse);
        return;
      }

      // LOG DE SUCESSO
      console.log('✅ Tarefa atualizada com sucesso:', {
        todoId: updatedTodo.id,
        title: updatedTodo.title,
        completed: updatedTodo.completed,
        priority: updatedTodo.priority,
        fieldsUpdated: Object.keys(updateData)
      });

      // ============================================
      // RESPOSTA DE SUCESSO
      // ============================================

      // RETORNAR TAREFA ATUALIZADA
      // Status 200 (OK) indica sucesso na atualização
      // Dados retornados são frescos do banco de dados
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Tarefa atualizada com sucesso',
        data: {
          todo: updatedTodo, // Dados atualizados completos
          fieldsUpdated: Object.keys(updateData) // Campos que foram modificados
        }
      } as ApiResponse<{ 
        todo: TodoResponse | undefined; 
        fieldsUpdated: string[] 
      }>);

    } catch (error: any) {
      // TRATAMENTO DE ERROS NÃO PREVISTOS
      console.error('❌ Erro inesperado ao atualizar tarefa:', {
        message: error.message,
        stack: error.stack,
        todoId: req.params.id,
        userId: req.user?.id,
        updateData: req.body
      });
      
      // Resposta genérica de erro interno
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor ao atualizar tarefa',
        errors: ['Falha temporária. Tente novamente em alguns instantes.']
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
