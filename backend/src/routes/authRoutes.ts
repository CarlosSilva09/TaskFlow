import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

/**
 * Rotas de autenticação
 * Gerencia todas as rotas relacionadas ao usuário e autenticação
 */
const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registra um novo usuário
 * @access  Public
 * @body    { username: string, email: string, password: string }
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Autentica um usuário e retorna token JWT
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/login', AuthController.login);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtém o perfil do usuário autenticado
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Atualiza o perfil do usuário autenticado
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @body    { username?: string, email?: string }
 */
router.put('/profile', authenticateToken, AuthController.updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Altera a senha do usuário
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 * @body    { currentPassword: string, newPassword: string }
 */
router.put('/change-password', authenticateToken, AuthController.changePassword);

/**
 * @route   POST /api/auth/validate-token
 * @desc    Valida se o token JWT ainda é válido
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 */
router.post('/validate-token', authenticateToken, AuthController.validateToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Realiza logout do usuário (invalidação no cliente)
 * @access  Private (requer token JWT)
 * @headers Authorization: Bearer <token>
 */
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
