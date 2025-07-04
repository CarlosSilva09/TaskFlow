import { Router } from 'express';
import { TodoController } from '../controllers/TodoController';
import { authenticateToken } from '../middleware/auth';

/**
 * Rotas de tarefas (todos)
 * Todas as rotas requerem autenticação JWT
 */
const router = Router();

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

/**
 * @route   POST /api/todos
 * @desc    Cria uma nova tarefa
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @body    { title: string, description?: string, priority?: 'baixa'|'media'|'alta' }
 */
router.post('/', TodoController.create);

/**
 * @route   GET /api/todos
 * @desc    Lista todas as tarefas do usuário com filtros e paginação
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @query   ?completed=true|false&priority=baixa|media|alta&search=texto&page=1&limit=10
 */
router.get('/', TodoController.getAll);

/**
 * @route   GET /api/todos/stats
 * @desc    Obtém estatísticas das tarefas do usuário
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 */
router.get('/stats', TodoController.getStats);

/**
 * @route   DELETE /api/todos/completed
 * @desc    Remove todas as tarefas concluídas do usuário
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 */
router.delete('/completed', TodoController.deleteCompleted);

/**
 * @route   PUT /api/todos/mark-all-completed
 * @desc    Marca todas as tarefas do usuário como concluídas
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 */
router.put('/mark-all-completed', TodoController.markAllCompleted);

/**
 * @route   GET /api/todos/:id
 * @desc    Obtém uma tarefa específica por ID
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @params  id: number
 */
router.get('/:id', TodoController.getById);

/**
 * @route   PUT /api/todos/:id
 * @desc    Atualiza uma tarefa específica
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @params  id: number
 * @body    { title?: string, description?: string, completed?: boolean, priority?: 'baixa'|'media'|'alta' }
 */
router.put('/:id', TodoController.update);

/**
 * @route   DELETE /api/todos/:id
 * @desc    Remove uma tarefa específica
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @params  id: number
 */
router.delete('/:id', TodoController.delete);

/**
 * @route   PATCH /api/todos/:id/toggle
 * @desc    Alterna o status de conclusão de uma tarefa
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @params  id: number
 */
router.patch('/:id/toggle', TodoController.toggleCompleted);

export default router;
