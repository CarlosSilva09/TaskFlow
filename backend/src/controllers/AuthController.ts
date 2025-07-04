/**
 * Controlador de Autenticação
 * Gerencia todas as operações relacionadas à autenticação de usuários
 * 
 * Funcionalidades:
 * - Registro de novos usuários
 * - Login e geração de tokens JWT
 * - Visualização e atualização de perfil
 * - Alteração de senha
 * - Validações de segurança
 */
import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { generateToken } from '../middleware/auth';
import { 
  CreateUserData, 
  LoginCredentials, 
  ChangePasswordData,
  ApiResponse, 
  UserResponse,
  HttpStatusCode 
} from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Classe AuthController
 * Contém métodos estáticos para operações de autenticação
 * Utiliza padrão de controlador com métodos estáticos para simplicidade
 */
export class AuthController {
  /**
   * Registra um novo usuário no sistema
   * Valida dados, verifica se o email já existe e cria novo usuário
   * 
   * @param req - Request contendo dados do usuário (name, email, password)
   * @param res - Response para retornar resultado da operação
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Extrai dados do corpo da requisição
      const { name, email, password }: CreateUserData = req.body;
      
      console.log('📝 Tentativa de registro:', { 
        name, 
        email, 
        password: '***' // Esconde senha nos logs
      });

      // Validação: campos obrigatórios
      if (!name || !email || !password) {
        console.log('❌ Campos obrigatórios faltando');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios',
          errors: ['Campos obrigatórios: name, email, password']
        } as ApiResponse);
        return;
      }

      // Validação: formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Email inválido:', email);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Formato de email inválido',
          errors: ['Email deve ter um formato válido']
        } as ApiResponse);
        return;
      }

      // Validação de senha
      if (password.length < 6) {
        console.log('❌ Senha muito curta');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'A senha deve ter pelo menos 6 caracteres',
          errors: ['Senha deve ter no mínimo 6 caracteres']
        } as ApiResponse);
        return;
      }

      // Validação de nome
      if (name.length < 3) {
        console.log('❌ Nome muito curto');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'O nome deve ter pelo menos 3 caracteres',
          errors: ['Nome deve ter no mínimo 3 caracteres']
        } as ApiResponse);
        return;
      }

      // Verificar se o email já existe
      const existingUserByEmail = await UserModel.findByEmail(email);
      if (existingUserByEmail) {
        console.log('❌ Email já existe:', email);
        res.status(HttpStatusCode.CONFLICT).json({
          success: false,
          message: 'Este email já está cadastrado',
          errors: ['Email já em uso']
        } as ApiResponse);
        return;
      }

      // Criar usuário
      const newUser = await UserModel.create(name, email, password);
      console.log('✅ Usuário criado com ID:', newUser.id);

      // Gerar token
      const token = generateToken({
        userId: newUser.id,
        name,
        email
      });

      console.log('✅ Token gerado para usuário:', newUser.id);

      // Resposta de sucesso
      res.status(HttpStatusCode.CREATED).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          token,
          user: {
            id: newUser.id,
            name,
            email
          }
        }
      } as ApiResponse<{ token: string; user: Partial<UserResponse> }>);
    } catch (error: any) {
      console.error('❌ Erro no registro:', error.message);
      
      // Tratamento de erros específicos
      if (error.message.includes('já está cadastrado') || error.message.includes('já está em uso')) {
        res.status(HttpStatusCode.CONFLICT).json({
          success: false,
          message: error.message,
          errors: [error.message]
        } as ApiResponse);
        return;
      }

      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao criar usuário']
      } as ApiResponse);
    }
  }

  /**
   * Autentica um usuário (login)
   * @param req - Request com credenciais
   * @param res - Response
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginCredentials = req.body;
      
      console.log('🔑 Tentativa de login:', { 
        email, 
        password: '***' 
      });

      // Validações básicas
      if (!email || !password) {
        console.log('❌ Campos obrigatórios faltando no login');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Email e senha são obrigatórios',
          errors: ['Campos obrigatórios: email, password']
        } as ApiResponse);
        return;
      }

      // Buscar usuário
      const user = await UserModel.findByEmail(email);
      if (!user) {
        console.log('❌ Usuário não encontrado:', email);
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Email ou senha incorretos',
          errors: ['Credenciais inválidas']
        } as ApiResponse);
        return;
      }

      // Verificar senha
      const isValidPassword = await UserModel.verifyPassword(password, user.password);
      if (!isValidPassword) {
        console.log('❌ Senha inválida para:', email);
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Email ou senha incorretos',
          errors: ['Credenciais inválidas']
        } as ApiResponse);
        return;
      }

      // Gerar token
      const token = generateToken({
        userId: user.id,
        name: user.name,
        email: user.email
      });

      console.log('✅ Login realizado com sucesso:', user.id);

      // Resposta de sucesso
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
      } as ApiResponse<{ token: string; user: UserResponse }>);
    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao processar login']
      } as ApiResponse);
    }
  }

  /**
   * Obtém o perfil do usuário autenticado
   * @param req - Request autenticada
   * @param res - Response
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      console.log('👤 Perfil solicitado para usuário:', user.id);

      // Buscar dados atualizados do usuário
      const currentUser = await UserModel.findById(user.id);
      
      if (!currentUser) {
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Usuário não encontrado',
          errors: ['Usuário não existe']
        } as ApiResponse);
        return;
      }

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Perfil recuperado com sucesso',
        data: {
          user: currentUser
        }
      } as ApiResponse<{ user: UserResponse }>);
    } catch (error: any) {
      console.error('❌ Erro ao buscar perfil:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao buscar perfil']
      } as ApiResponse);
    }
  }

  /**
   * Altera a senha do usuário
   * @param req - Request autenticada com dados da nova senha
   * @param res - Response
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { currentPassword, newPassword }: ChangePasswordData = req.body;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      console.log('🔐 Alteração de senha solicitada para usuário:', user.id);

      // Validações
      if (!currentPassword || !newPassword) {
        console.log('❌ Senhas não fornecidas');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Senha atual e nova senha são obrigatórias',
          errors: ['Campos obrigatórios: currentPassword, newPassword']
        } as ApiResponse);
        return;
      }

      if (newPassword.length < 6) {
        console.log('❌ Nova senha muito curta');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'A nova senha deve ter pelo menos 6 caracteres',
          errors: ['Nova senha deve ter no mínimo 6 caracteres']
        } as ApiResponse);
        return;
      }

      if (currentPassword === newPassword) {
        console.log('❌ Nova senha igual à atual');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'A nova senha deve ser diferente da senha atual',
          errors: ['Nova senha deve ser diferente da atual']
        } as ApiResponse);
        return;
      }

      // Alterar senha
      const success = await UserModel.changePassword(user.id, {
        currentPassword,
        newPassword
      });

      if (success) {
        console.log('✅ Senha alterada com sucesso para usuário:', user.id);
        res.status(HttpStatusCode.OK).json({
          success: true,
          message: 'Senha alterada com sucesso',
          data: {}
        } as ApiResponse);
      } else {
        console.log('❌ Falha ao alterar senha para usuário:', user.id);
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao alterar senha',
          errors: ['Falha interna ao alterar senha']
        } as ApiResponse);
      }
    } catch (error: any) {
      console.error('❌ Erro ao alterar senha:', error.message);
      
      if (error.message === 'Senha atual incorreta') {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Senha atual incorreta',
          errors: ['Senha atual não confere']
        } as ApiResponse);
        return;
      }

      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao alterar senha']
      } as ApiResponse);
    }
  }

  /**
   * Atualiza o perfil do usuário
   * @param req - Request autenticada com dados a serem atualizados
   * @param res - Response
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { name, email } = req.body;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado',
          errors: ['Token inválido']
        } as ApiResponse);
        return;
      }

      console.log('📝 Atualização de perfil solicitada para usuário:', user.id);

      // Validações
      const updateData: Partial<{ name: string; email: string }> = {};

      if (name !== undefined) {
        if (name.length < 3) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'O nome deve ter pelo menos 3 caracteres',
            errors: ['Nome deve ter no mínimo 3 caracteres']
          } as ApiResponse);
          return;
        }
        updateData.name = name;
      }

      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Formato de email inválido',
            errors: ['Email deve ter um formato válido']
          } as ApiResponse);
          return;
        }
        updateData.email = email;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Nenhum campo válido para atualizar',
          errors: ['Forneça nome ou email para atualizar']
        } as ApiResponse);
        return;
      }

      // Atualizar perfil
      const success = await UserModel.update(user.id, updateData);

      if (success) {
        // Buscar dados atualizados
        const updatedUser = await UserModel.findById(user.id);
        
        console.log('✅ Perfil atualizado com sucesso para usuário:', user.id);
        res.status(HttpStatusCode.OK).json({
          success: true,
          message: 'Perfil atualizado com sucesso',
          data: {
            user: updatedUser
          }
        } as ApiResponse<{ user: UserResponse | undefined }>);
      } else {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao atualizar perfil',
          errors: ['Falha interna ao atualizar perfil']
        } as ApiResponse);
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar perfil:', error.message);
      
      if (error.message.includes('já está em uso')) {
        res.status(HttpStatusCode.CONFLICT).json({
          success: false,
          message: error.message,
          errors: [error.message]
        } as ApiResponse);
        return;
      }

      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao atualizar perfil']
      } as ApiResponse);
    }
  }

  /**
   * Valida o token atual do usuário
   * @param req - Request autenticada
   * @param res - Response
   */
  static async validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Token inválido',
          errors: ['Token não é válido']
        } as ApiResponse);
        return;
      }

      console.log('✅ Token validado para usuário:', user.id);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Token válido',
        data: {
          user: user,
          valid: true
        }
      } as ApiResponse<{ user: UserResponse; valid: boolean }>);
    } catch (error: any) {
      console.error('❌ Erro ao validar token:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao validar token']
      } as ApiResponse);
    }
  }

  /**
   * Logout (invalida o token no cliente)
   * @param req - Request autenticada
   * @param res - Response
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (user) {
        console.log('👋 Logout realizado para usuário:', user.id);
      }

      // Como estamos usando JWT stateless, o logout é feito no frontend
      // Aqui podemos log a ação ou implementar uma blacklist de tokens se necessário
      
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Logout realizado com sucesso',
        data: {}
      } as ApiResponse);
    } catch (error: any) {
      console.error('❌ Erro no logout:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Erro ao processar logout']
      } as ApiResponse);
    }
  }
}
