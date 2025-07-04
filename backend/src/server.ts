/**
 * Servidor Express TypeScript para Sistema de Lista de Tarefas
 * Implementa autenticação JWT, CRUD de tarefas e middleware de segurança
 * 
 * Funcionalidades principais:
 * - Autenticação com JWT
 * - CRUD completo de tarefas (todos)
 * - Rate limiting para segurança
 * - Middleware de logging e segurança
 * - Banco de dados SQLite
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Importação das rotas da aplicação
import authRoutes from './routes/authRoutes';
import todoRoutes from './routes/todoRoutes';

// Configuração e tipos do banco de dados
import { initializeDatabase, closeDatabase } from './config/database';
import { ApiResponse, RateLimitConfig, CorsConfig } from './types';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Classe principal do servidor Express
 * Gerencia inicialização, middlewares, rotas e tratamento de erros
 */
class Server {
  private app: express.Application; // Instância do Express
  private port: number; // Porta do servidor

  /**
   * Construtor da classe Server
   * Inicializa todos os componentes necessários
   */
  constructor() {
    this.app = express();
    // Pega a porta das variáveis de ambiente ou usa 3003 como padrão
    this.port = parseInt(process.env.PORT || '3003');
    
    // Inicializa componentes na ordem correta
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Configura todos os middlewares necessários para segurança e funcionalidade
   * Ordem dos middlewares é importante!
   */
  private initializeMiddlewares(): void {
    // CORS - Configuração permissiva para desenvolvimento
    // Em produção, deveria ser mais restritiva
    this.app.use(cors({
      origin: true, // Aceita qualquer origem em desenvolvimento
      credentials: true, // Permite cookies e headers de autenticação
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos HTTP permitidos
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Headers permitidos
    }));
    
    // Helmet - Middleware de segurança que define vários headers HTTP
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false, // Desabilita COEP para compatibilidade
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"], // Permite recursos apenas do mesmo domínio
          styleSrc: ["'self'", "'unsafe-inline'"], // Permite CSS inline
          scriptSrc: ["'self'"], // JavaScript apenas do mesmo domínio
          imgSrc: ["'self'", "data:", "https:"], // Imagens do domínio, data URLs e HTTPS
        },
      },
    }));

    // Rate limiting global - Previne ataques de força bruta e DoS
    const rateLimitConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // Janela de 15 minutos
      max: 1000, // Máximo 1000 requisições por IP por janela (valor alto para desenvolvimento)
      message: {
        success: false,
        message: 'Muitas tentativas. Tente novamente em 15 minutos.',
        errors: ['Rate limit excedido']
      } as ApiResponse,
      standardHeaders: true, // Inclui headers padrão de rate limit
      legacyHeaders: false, // Não inclui headers legados
    };

    const limiter = rateLimit(rateLimitConfig);
    this.app.use(limiter);

    // Rate limiting específico para login - Mais restritivo para prevenir ataques
    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // Janela de 15 minutos
      max: 1000, // Máximo 1000 tentativas de login por IP (valor alto para desenvolvimento)
      message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        errors: ['Limite de tentativas de login excedido']
      } as ApiResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Aplica rate limit específico apenas na rota de login
    this.app.use('/api/auth/login', loginLimiter);

    // Body parser - Configura parsing de JSON e URL encoded
    this.app.use(express.json({ 
      limit: '10mb', // Limite de 10MB para requests JSON
      strict: true, // Aceita apenas arrays e objetos válidos
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, // Permite parsing de objetos aninhados
      limit: '10mb' // Limite de 10MB para form data
    }));

    // Logging com Morgan - ferramenta de logging para Express
    const logFormat = process.env.NODE_ENV === 'production' 
      ? 'combined' // Formato detalhado para produção
      : 'dev'; // Formato colorido e simples para desenvolvimento
    
    this.app.use(morgan(logFormat));

    // Middleware de log personalizado para debug detalhado
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      const method = req.method;
      const url = req.originalUrl;
      const ip = req.ip || req.connection.remoteAddress;
      
      console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
      
      // Log do body apenas em desenvolvimento (sem expor senhas)
      if (process.env.NODE_ENV === 'development' && req.body) {
        const bodyToLog = { ...req.body };
        // Remove senhas dos logs por segurança
        if (bodyToLog.password) bodyToLog.password = '***';
        if (bodyToLog.currentPassword) bodyToLog.currentPassword = '***';
        if (bodyToLog.newPassword) bodyToLog.newPassword = '***';
        
        console.log(`[${timestamp}] Body:`, bodyToLog);
      }
      
      next(); // Passa para o próximo middleware
    });
  }

  /**
   * Configura todas as rotas da aplicação
   * Define endpoints para autenticação, todos e informações da API
   */
  private initializeRoutes(): void {
    // Rotas principais da aplicação
    this.app.use('/api/auth', authRoutes); // Rotas de autenticação
    this.app.use('/api/todos', todoRoutes); // Rotas de tarefas

    // Rota de health check - verifica se o servidor está funcionando
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Servidor funcionando!',
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(), // Horário atual
          environment: process.env.NODE_ENV || 'development', // Ambiente da aplicação
          version: '1.0.0', // Versão da API
          uptime: process.uptime(), // Tempo que o servidor está rodando
          memory: process.memoryUsage(), // Uso de memória
        }
      } as ApiResponse);
    });

    // Rota de informações da API - documentação básica
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'API de Lista de Tarefas - Desafio Belmosoft',
        data: {
          name: 'Todo List API TypeScript',
          version: '1.0.0',
          description: 'Backend TypeScript para aplicação de lista de tarefas',
          author: 'Dev Jr Backend',
          endpoints: {
            auth: '/api/auth',
            todos: '/api/todos',
            health: '/health'
          },
          // Documentação básica dos endpoints
          documentation: {
            auth: {
              register: 'POST /api/auth/register',
              login: 'POST /api/auth/login',
              profile: 'GET /api/auth/profile',
              updateProfile: 'PUT /api/auth/profile',
              changePassword: 'PUT /api/auth/change-password'
            },
            todos: {
              create: 'POST /api/todos',
              getAll: 'GET /api/todos',
              getById: 'GET /api/todos/:id',
              update: 'PUT /api/todos/:id',
              delete: 'DELETE /api/todos/:id',
              toggle: 'PATCH /api/todos/:id/toggle',
              stats: 'GET /api/todos/stats'
            }
          }
        }
      } as ApiResponse);
    });

    // 404 Handler - deve ser o último middleware de rota
    // Captura todas as rotas que não foram encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Rota não encontrada',
        errors: [`Endpoint ${req.method} ${req.originalUrl} não existe`]
      } as ApiResponse);
    });
  }

  /**
   * Configura tratamento de erros global da aplicação
   * Captura todos os erros não tratados e responde adequadamente
   */
  private initializeErrorHandling(): void {
    // Middleware de tratamento de erros global
    // Este middleware tem 4 parâmetros (err, req, res, next) - isso é como o Express identifica um error handler
    this.app.use((
      err: any, 
      req: express.Request, 
      res: express.Response, 
      next: express.NextFunction
    ) => {
      console.error('❌ Erro não tratado:', err);

      // Log detalhado do erro para debug
      console.error('Stack:', err.stack);
      console.error('Request URL:', req.originalUrl);
      console.error('Request Method:', req.method);
      console.error('Request Headers:', req.headers);

      // Determinar status code apropriado
      let statusCode = 500; // Padrão: erro interno do servidor
      if (err.status) statusCode = err.status;
      if (err.statusCode) statusCode = err.statusCode;

      // Determinar mensagem de erro
      let message = 'Erro interno do servidor';
      let errors = ['Erro interno não identificado'];

      // Em desenvolvimento, mostrar detalhes do erro
      if (process.env.NODE_ENV === 'development') {
        message = err.message || message;
        errors = [err.message || 'Erro interno'];
      }

      // Tratar tipos específicos de erro
      if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Dados inválidos';
        errors = Object.values(err.errors).map((e: any) => e.message);
      }

      if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Formato de dados inválido';
        errors = ['ID inválido'];
      }

      if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Serviço indisponível';
        errors = ['Erro de conexão com banco de dados'];
      }

      // Enviar resposta de erro padronizada
      res.status(statusCode).json({
        success: false,
        message,
        errors
      } as ApiResponse);
    });

    // Capturar exceções não tratadas em todo o processo Node.js
    process.on('uncaughtException', (err) => {
      console.error('❌ Exceção não capturada:', err);
      console.error('Stack:', err.stack);
      
      // Encerrar processo de forma graceful
      this.gracefulShutdown('Exceção não capturada');
    });

    // Capturar promises rejeitadas que não foram tratadas
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      console.error('Promise:', promise);
      
      // Encerrar processo de forma graceful
      this.gracefulShutdown('Promise rejeitada não tratada');
    });
  }

  /**
   * Inicia o servidor Express e conecta ao banco de dados
   * Método público para inicializar toda a aplicação
   */
  public async start(): Promise<void> {
    try {
      // Inicializar banco de dados SQLite
      await initializeDatabase();
      console.log('✅ Banco de dados inicializado com sucesso');

      // Iniciar servidor HTTP
      const server = this.app.listen(this.port, () => {
        console.log('🚀 Servidor TypeScript iniciado com sucesso!');
        console.log(`📍 Porta: ${this.port}`);
        console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📋 Health check: http://localhost:${this.port}/health`);
        console.log(`📚 API info: http://localhost:${this.port}/api`);
        console.log(`🔐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        console.log('⚡ Pronto para receber requisições!');
      });

      // Configurar timeout para requisições longas
      server.timeout = 30000; // 30 segundos

      // Tratamento de erro de porta em uso
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`❌ Porta ${this.port} já está em uso.`);
          console.log(`🔄 Tentando porta ${this.port + 1}...`);
          
          // Tenta usar próxima porta disponível
          const altPort = this.port + 1;
          const altServer = this.app.listen(altPort, () => {
            console.log(`🚀 Servidor rodando na porta alternativa: ${altPort}`);
            console.log(`📍 Health check: http://localhost:${altPort}/health`);
          });

          altServer.timeout = 30000;
        } else {
          console.error('❌ Erro ao inicializar servidor:', err);
          this.gracefulShutdown('Erro de inicialização');
        }
      });

      // Configurar graceful shutdown para encerramento limpo
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Erro fatal ao inicializar aplicação:', error);
      process.exit(1); // Encerra processo com código de erro
    }
  }

  /**
   * Configura encerramento graceful do servidor
   * Permite que o servidor finalize operações antes de encerrar
   */
  private setupGracefulShutdown(): void {
    // Sinais de encerramento do sistema operacional
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const;
    
    signals.forEach((signal) => {
      process.on(signal, () => {
        console.log(`\n🛑 Sinal ${signal} recebido`);
        this.gracefulShutdown(`Sinal ${signal}`);
      });
    });
  }

  /**
   * Encerra o servidor de forma graceful
   * Fecha conexões e limpa recursos antes de encerrar
   * @param reason - Motivo do encerramento
   */
  private async gracefulShutdown(reason: string): Promise<void> {
    console.log(`🔄 Iniciando encerramento graceful: ${reason}`);
    
    try {
      // Fechar conexão com banco de dados
      await closeDatabase();
      console.log('✅ Conexão com banco de dados fechada');
      
      console.log('👋 Servidor encerrado com sucesso');
      process.exit(0); // Encerra processo com sucesso
    } catch (error) {
      console.error('❌ Erro durante encerramento:', error);
      process.exit(1); // Encerra processo com erro
    }
  }

  /**
   * Obtém a instância do Express app
   * Útil para testes ou configurações externas
   * @returns Instância do Express
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Inicializar e startar servidor se este arquivo for executado diretamente
// Isso permite que o arquivo seja importado como módulo ou executado como script
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  });
}

export default Server;
