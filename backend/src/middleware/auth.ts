import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { AuthToken, UserResponse, ApiResponse } from '../types';

/**
 * Interface para Request autenticada
 */
export interface AuthenticatedRequest extends Request {
  user?: UserResponse;
}

/**
 *     if (is    if (isTokenExpiringSoon(token, 30)) {
      const newToken = generateToken({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      });

      // Adicionar novo token no header de resposta
      res.setHeader('X-New-Token', newToken);
      
      console.log('🔄 Token renovado para usuário:', req.user.name);ngSoon(token, 30)) {
      const newToken = generateToken({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      });

      // Adicionar novo token no header de resposta
      res.setHeader('X-New-Token', newToken);
      
      console.log('🔄 Token renovado para usuário:', req.user.name);de autenticação JWT
 * Verifica se o token JWT é válido e adiciona o usuário ao request
 * 
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ Token não fornecido');
      res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      } as ApiResponse);
      return;
    }

    // Verificar se JWT_SECRET está configurado
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET não configurado');
      res.status(500).json({
        success: false,
        message: 'Configuração do servidor inválida'
      } as ApiResponse);
      return;
    }

    try {
      // Verificar e decodificar o token
      const decoded = jwt.verify(token, jwtSecret) as AuthToken;
      console.log('🔐 Token decodificado para usuário:', decoded.userId);

      // Verificar se o usuário ainda existe no banco
      const user = await UserModel.findById(decoded.userId);

      if (!user) {
        console.log('❌ Usuário não encontrado no banco:', decoded.userId);
        res.status(401).json({
          success: false,
          message: 'Usuário não encontrado'
        } as ApiResponse);
        return;
      }

      // Adicionar usuário ao request
      req.user = user;
      console.log('✅ Usuário autenticado:', user.name);

      next();
    } catch (jwtError: any) {
      console.log('❌ Erro na verificação do token:', jwtError.message);

      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: 'Token expirado. Faça login novamente.'
        } as ApiResponse);
        return;
      }

      if (jwtError.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          message: 'Token inválido'
        } as ApiResponse);
        return;
      }

      if (jwtError.name === 'NotBeforeError') {
        res.status(401).json({
          success: false,
          message: 'Token ainda não é válido'
        } as ApiResponse);
        return;
      }

      // Erro genérico de token
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      } as ApiResponse);
      return;
    }
  } catch (error: any) {
    console.error('❌ Erro interno no middleware de autenticação:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as ApiResponse);
  }
};

/**
 * Middleware opcional de autenticação
 * Adiciona o usuário ao request se o token for válido, mas não falha se não houver token
 * 
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // Sem token, mas continua
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // Configuração inválida, mas continua sem autenticação
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthToken;
      const user = await UserModel.findById(decoded.userId);

      if (user) {
        req.user = user;
        console.log('✅ Usuário autenticado opcionalmente:', user.name);
      }
    } catch (jwtError) {
      // Token inválido, mas continua sem autenticação
      console.log('⚠️ Token inválido na autenticação opcional');
    }

    next();
  } catch (error: any) {
    console.error('❌ Erro no middleware de autenticação opcional:', error.message);
    // Em caso de erro, continua sem autenticação
    next();
  }
};

/**
 * Middleware para verificar se o usuário é admin
 * Deve ser usado após o authenticateToken
 * 
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    } as ApiResponse);
    return;
  }

  // Verificar se o usuário tem privilégios de admin
  // Por enquanto, vamos considerar que o usuário com ID 1 é admin
  // Em uma implementação real, haveria um campo 'role' na tabela users
  if (req.user.id !== 1) {
    res.status(403).json({
      success: false,
      message: 'Acesso negado. Privilégios de administrador necessários.'
    } as ApiResponse);
    return;
  }

  console.log('✅ Admin autenticado:', req.user.name);
  next();
};

/**
 * Middleware para verificar se o usuário é o dono do recurso
 * Verifica se o userId dos parâmetros corresponde ao usuário autenticado
 * 
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export const requireOwnership = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    } as ApiResponse);
    return;
  }

  const resourceUserId = parseInt(req.params.userId);
  
  if (isNaN(resourceUserId)) {
    res.status(400).json({
      success: false,
      message: 'ID de usuário inválido'
    } as ApiResponse);
    return;
  }

  if (req.user.id !== resourceUserId) {
    res.status(403).json({
      success: false,
      message: 'Acesso negado. Você só pode acessar seus próprios recursos.'
    } as ApiResponse);
    return;
  }

  console.log('✅ Propriedade do recurso verificada para usuário:', req.user.name);
  next();
};

/**
 * Middleware para extrair informações do token sem validação completa
 * Útil para logs e analytics
 * 
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export const extractTokenInfo = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.decode(token) as AuthToken | null;
        if (decoded && decoded.userId) {
          // Adicionar informações do token ao request para logs
          (req as any).tokenInfo = {
            userId: decoded.userId,
            name: decoded.name,
            email: decoded.email,
            exp: decoded.exp,
            iat: decoded.iat
          };
        }
      } catch (error) {
        // Falha silenciosa na extração
      }
    }

    next();
  } catch (error: any) {
    console.error('❌ Erro ao extrair informações do token:', error.message);
    next();
  }
};

/**
 * Helper para gerar tokens JWT
 * 
 * @param payload - Dados a serem incluídos no token
 * @param expiresIn - Tempo de expiração
 * @returns string - Token JWT gerado
 */
export const generateToken = (
  payload: { userId: number; name: string; email: string },
  expiresIn: string = '7d'
): string => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: expiresIn as any });
};

/**
 * Helper para verificar se um token está próximo do vencimento
 * 
 * @param token - Token JWT
 * @param thresholdMinutes - Minutos antes do vencimento para considerar "próximo"
 * @returns boolean - True se está próximo do vencimento
 */
export const isTokenExpiringSoon = (token: string, thresholdMinutes: number = 30): boolean => {
  try {
    const decoded = jwt.decode(token) as AuthToken | null;
    
    if (!decoded || !decoded.exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const threshold = thresholdMinutes * 60; // converter para segundos
    
    return (decoded.exp - now) <= threshold;
  } catch (error) {
    return false;
  }
};

/**
 * Helper para renovar token se necessário
 * 
 * @param req - Request object
 * @param res - Response object
 * @returns string | null - Novo token se foi renovado
 */
export const refreshTokenIfNeeded = (
  req: AuthenticatedRequest,
  res: Response
): string | null => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token || !req.user) {
      return null;
    }

    if (isTokenExpiringSoon(token, 30)) {
      const newToken = generateToken({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      });

      // Adicionar novo token no header de resposta
      res.setHeader('X-New-Token', newToken);
      
      console.log('🔄 Token renovado para usuário:', req.user.name);
      return newToken;
    }

    return null;
  } catch (error: any) {
    console.error('❌ Erro ao renovar token:', error.message);
    return null;
  }
};
