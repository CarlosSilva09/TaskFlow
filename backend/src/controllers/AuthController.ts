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

      // VALIDAÇÃO: CAMPOS OBRIGATÓRIOS
      // Verificar se todos os campos necessários foram enviados pelo cliente
      // Em JavaScript, valores considerados "falsy" (que falham no if):
      // - undefined (campo não enviado)
      // - null (valor nulo)
      // - "" (string vazia)
      // - 0 (número zero)
      // - false (booleano falso)
      // - NaN (Not a Number)
      // O operador ! converte para booleano e inverte (falsy vira true)
      // Usar || (OR) significa que se qualquer campo estiver faltando, a condição é verdadeira
      if (!name || !email || !password) {
        console.log('❌ Validação falhou - campos obrigatórios faltando:', {
          name: !name ? 'FALTANDO' : 'OK',
          email: !email ? 'FALTANDO' : 'OK', 
          password: !password ? 'FALTANDO' : 'OK'
        });
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios',
          errors: ['Todos os campos são obrigatórios: name, email, password']
        } as ApiResponse);
        return; // Interrompe execução da função
      }

      // VALIDAÇÃO DE FORMATO DE EMAIL
      // Usar regex (expressão regular) para verificar se o email tem formato válido
      // Regex explicada parte por parte:
      // ^          : início da string (âncora)
      // [^\s@]+    : um ou mais caracteres que NÃO sejam espaços (\s) ou @ 
      // @          : exatamente um caractere @
      // [^\s@]+    : um ou mais caracteres que NÃO sejam espaços ou @
      // \.         : exatamente um ponto (. é escapado com \ porque . tem significado especial)
      // [^\s@]+    : um ou mais caracteres que NÃO sejam espaços ou @
      // $          : fim da string (âncora)
      // Exemplos válidos: usuario@exemplo.com, test@site.org, email@test.com.br
      // Exemplos inválidos: @exemplo.com, usuario@, usuario.exemplo.com, usuario @exemplo.com
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Email com formato inválido:', email);
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Formato de email inválido',
          errors: ['Email deve ter um formato válido como: usuario@exemplo.com']
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO DE COMPRIMENTO DA SENHA
      // Verificar se a senha atende aos critérios mínimos de segurança
      // .length retorna o número de caracteres da string
      // 6 caracteres é o mínimo básico, mas em produção considerar:
      // - Pelo menos 8 caracteres
      // - Mistura de maiúsculas e minúsculas  
      // - Pelo menos um número
      // - Pelo menos um caractere especial (!@#$%^&*)
      // - Verificação contra senhas comuns (123456, password, etc.)
      if (password.length < 6) {
        console.log('❌ Senha muito curta - comprimento:', password.length, 'caracteres');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'A senha deve ter pelo menos 6 caracteres',
          errors: ['Senha deve ter no mínimo 6 caracteres para segurança básica']
        } as ApiResponse);
        return;
      }

      // VALIDAÇÃO DE COMPRIMENTO DO NOME
      // Verificar se o nome tem comprimento razoável
      // 3 caracteres é mínimo para evitar nomes muito curtos (ex: "AB")
      // Em sistemas mais rigorosos, pode-se validar:
      // - Não permitir números no nome
      // - Não permitir caracteres especiais
      // - Validar se contém pelo menos nome e sobrenome
      // - Verificar contra lista de palavras ofensivas
      if (name.length < 3) {
        console.log('❌ Nome muito curto - comprimento:', name.length, 'caracteres');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'O nome deve ter pelo menos 3 caracteres',
          errors: ['Nome deve ter no mínimo 3 caracteres']
        } as ApiResponse);
        return;
      }

      // VERIFICAR SE O EMAIL JÁ ESTÁ CADASTRADO
      // Buscar na base de dados se já existe um usuário com este email
      // Emails devem ser únicos no sistema para evitar conflitos de login
      // Esta verificação é importante porque:
      // 1. Email é usado como identificador único para login
      // 2. Evita múltiplas contas com mesmo email  
      // 3. Previne confusão na recuperação de senha
      // 4. Melhora a integridade dos dados
      const existingUserByEmail = await UserModel.findByEmail(email);
      if (existingUserByEmail) {
        console.log('❌ Tentativa de registro com email já existente:', email);
        console.log('   Usuário existente ID:', existingUserByEmail.id, 'Nome:', existingUserByEmail.name);
        res.status(HttpStatusCode.CONFLICT).json({
          success: false,
          message: 'Este email já está cadastrado no sistema',
          errors: ['Email já está em uso. Use outro email ou faça login.']
        } as ApiResponse);
        return;
      }

      // CRIAR NOVO USUÁRIO NO BANCO DE DADOS
      // Chama o modelo User para inserir um novo registro na tabela users
      // O método create() automaticamente faz hash da senha usando bcrypt
      const newUser = await UserModel.create(name, email, password);
      console.log('✅ Usuário criado com ID:', newUser.id);

      // GERAR TOKEN JWT DE AUTENTICAÇÃO
      // Cria um token JWT contendo informações do usuário (payload)
      // Este token será usado para autenticar requisições futuras
      // O token expira em 24 horas (configurado no middleware de auth)
      const token = generateToken({
        userId: newUser.id, // ID único do usuário
        name,               // Nome do usuário
        email               // Email do usuário
      });

      console.log('✅ Token gerado para usuário:', newUser.id);

      // RESPOSTA DE SUCESSO PARA O CLIENTE
      // Retorna status 201 (Created) com o token e dados do usuário
      // O frontend salvará o token no localStorage para próximas requisições
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

      // BUSCAR USUÁRIO NO BANCO DE DADOS PELO EMAIL
      // Procura na tabela users se existe um usuário com o email fornecido
      // O email é único na base de dados (constraint UNIQUE)
      const user = await UserModel.findByEmail(email);
      if (!user) {
        // USUÁRIO NÃO ENCONTRADO
        // Por segurança, não especificamos se é email ou senha incorreta
        // Isso evita ataques de enumeração de usuários
        console.log('❌ Usuário não encontrado:', email);
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Email ou senha incorretos',
          errors: ['Credenciais inválidas']
        } as ApiResponse);
        return;
      }

      // VERIFICAR SE A SENHA ESTÁ CORRETA
      // Compara a senha em texto plano com o hash armazenado no banco
      // Usa bcrypt.compare() que é seguro contra timing attacks
      const isValidPassword = await UserModel.verifyPassword(password, user.password);
      if (!isValidPassword) {
        // SENHA INCORRETA
        // Mesma mensagem genérica por motivos de segurança
        console.log('❌ Senha inválida para:', email);
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Email ou senha incorretos',
          errors: ['Credenciais inválidas']
        } as ApiResponse);
        return;
      }

      // GERAR TOKEN JWT PARA SESSÃO AUTENTICADA
      // Cria um novo token JWT com os dados do usuário autenticado
      // Este token será enviado em todas as próximas requisições no header Authorization
      const token = generateToken({
        userId: user.id,    // ID único do usuário (chave primária)
        name: user.name,    // Nome completo do usuário
        email: user.email   // Email do usuário (já validado)
      });

      console.log('✅ Login realizado com sucesso:', user.id);

      // RESPOSTA DE SUCESSO COM TOKEN E DADOS DO USUÁRIO
      // Retorna status 200 (OK) com:
      // - Token JWT para autenticação
      // - Dados completos do usuário (sem a senha)
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

      // BUSCAR DADOS ATUALIZADOS DO USUÁRIO NO BANCO
      // Busca os dados mais recentes do usuário na base de dados
      // Isso garante que retornamos informações atualizadas (caso tenha sido alterado)
      // O token pode ter dados antigos se o perfil foi atualizado após o login
      const currentUser = await UserModel.findById(user.id);
      
      if (!currentUser) {
        // USUÁRIO NÃO ENCONTRADO (foi deletado após criar o token)
        // Situação rara: usuário fez login mas foi removido da base de dados
        res.status(HttpStatusCode.NOT_FOUND).json({
          success: false,
          message: 'Usuário não encontrado',
          errors: ['Usuário não existe']
        } as ApiResponse);
        return;
      }

      // RETORNAR DADOS COMPLETOS DO PERFIL
      // Inclui: id, name, email, created_at, updated_at
      // Exclui: password (por segurança)
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

      // VALIDAR COMPRIMENTO DA NOVA SENHA
      // Mesma regra do registro: mínimo 6 caracteres
      // Em produção, considerar regras mais rigorosas (números, símbolos, etc.)
      if (newPassword.length < 6) {
        console.log('❌ Nova senha muito curta');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'A nova senha deve ter pelo menos 6 caracteres',
          errors: ['Nova senha deve ter no mínimo 6 caracteres']
        } as ApiResponse);
        return;
      }

      // VERIFICAR SE A NOVA SENHA É DIFERENTE DA ATUAL
      // Força o usuário a escolher uma senha realmente nova
      // Comparação em texto plano (antes do hash)
      if (currentPassword === newPassword) {
        console.log('❌ Nova senha igual à atual');
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'A nova senha deve ser diferente da senha atual',
          errors: ['Nova senha deve ser diferente da atual']
        } as ApiResponse);
        return;
      }

      // ALTERAR SENHA NO BANCO DE DADOS
      // Chama o modelo User para:
      // 1. Verificar se a senha atual está correta (bcrypt.compare)
      // 2. Gerar hash da nova senha (bcrypt.hash)
      // 3. Atualizar o registro no banco com o novo hash
      const success = await UserModel.changePassword(user.id, {
        currentPassword, // Senha atual em texto plano (para verificação)
        newPassword      // Nova senha em texto plano (será hasheada)
      });

      if (success) {
        // SENHA ALTERADA COM SUCESSO
        // O usuário precisará fazer login novamente com a nova senha
        // O token atual continua válido até expirar
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

      // PREPARAR DADOS PARA ATUALIZAÇÃO
      // Objeto que conterá apenas os campos que serão atualizados
      // Permite atualização parcial (só nome, só email, ou ambos)
      const updateData: Partial<{ name: string; email: string }> = {};

      // VALIDAR E ADICIONAR NOME SE FORNECIDO
      if (name !== undefined) {
        // Validar comprimento mínimo do nome
        if (name.length < 3) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'O nome deve ter pelo menos 3 caracteres',
            errors: ['Nome deve ter no mínimo 3 caracteres']
          } as ApiResponse);
          return;
        }
        updateData.name = name; // Adiciona nome aos dados de atualização
      }

      // VALIDAR E ADICIONAR EMAIL SE FORNECIDO
      if (email !== undefined) {
        // VALIDAÇÃO DE FORMATO DE EMAIL COM REGEX
        // Regex explicada:
        // ^[^\s@]+   : início, um ou mais caracteres que não sejam espaço ou @
        // @          : exatamente um @
        // [^\s@]+    : um ou mais caracteres que não sejam espaço ou @
        // \.         : exatamente um ponto (escapado)
        // [^\s@]+$   : um ou mais caracteres que não sejam espaço ou @, fim
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: 'Formato de email inválido',
            errors: ['Email deve ter um formato válido como: usuario@exemplo.com']
          } as ApiResponse);
          return;
        }
        updateData.email = email; // Adiciona email aos dados de atualização
      }

      // VERIFICAR SE PELO MENOS UM CAMPO FOI FORNECIDO
      // Se nenhum campo válido foi enviado, retorna erro
      if (Object.keys(updateData).length === 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: 'Nenhum campo válido para atualizar',
          errors: ['Forneça nome ou email para atualizar']
        } as ApiResponse);
        return;
      }

      // ATUALIZAR PERFIL NO BANCO DE DADOS
      // Chama o modelo User para atualizar apenas os campos modificados
      // Se email for alterado, verifica se já não existe outro usuário com o mesmo email
      const success = await UserModel.update(user.id, updateData);

      if (success) {
        // BUSCAR DADOS ATUALIZADOS DO BANCO
        // Importante buscar dados frescos para confirmar a atualização
        const updatedUser = await UserModel.findById(user.id);
        
        console.log('✅ Perfil atualizado com sucesso para usuário:', user.id);
        res.status(HttpStatusCode.OK).json({
          success: true,
          message: 'Perfil atualizado com sucesso',
          data: {
            user: updatedUser // Retorna dados atualizados
          }
        } as ApiResponse<{ user: UserResponse | undefined }>);
      } else {
        // FALHA NA ATUALIZAÇÃO
        // Pode ser erro de banco ou violação de constraint (email duplicado)
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
   * Valida o token JWT atual do usuário
   * 
   * Esta função verifica se o token JWT enviado pelo cliente é válido e não expirou.
   * É usada pelo frontend para confirmar se o usuário ainda está autenticado
   * antes de realizar operações que requerem autenticação.
   * 
   * Fluxo da validação:
   * 1. O middleware de autenticação já verificou a assinatura e expiração do token
   * 2. Se chegou até aqui, o token é tecnicamente válido
   * 3. Verifica se os dados do usuário estão presentes no request
   * 4. Retorna confirmação de que o token é válido
   * 
   * @param req - Request autenticada contendo dados do usuário extraídos do token
   * @param res - Response com confirmação de validade
   */
  static async validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // EXTRAIR DADOS DO USUÁRIO DO TOKEN
      // Se o request chegou até aqui, significa que:
      // - O token foi enviado no header Authorization: Bearer <token>
      // - O middleware de auth verificou a assinatura JWT
      // - O token não está expirado
      // - Os dados do usuário foram extraídos e colocados em req.user
      const user = req.user;

      // VERIFICAR SE OS DADOS DO USUÁRIO ESTÃO PRESENTES
      // Situação teoricamente impossível se o middleware funcionou corretamente
      // Mas é uma verificação de segurança adicional
      if (!user) {
        console.log('❌ Token sem dados de usuário válidos');
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          message: 'Token inválido',
          errors: ['Token não contém dados válidos do usuário']
        } as ApiResponse);
        return;
      }

      // LOG DE VALIDAÇÃO BEM-SUCEDIDA
      // Registra que o token foi validado com sucesso
      // Útil para auditoria e debugging
      console.log('✅ Token validado com sucesso para usuário:', user.id);

      // RESPOSTA DE CONFIRMAÇÃO DE VALIDADE
      // Retorna status 200 (OK) confirmando que:
      // - O token é válido e não expirou
      // - O usuário está autenticado
      // - Os dados do usuário estão íntegros
      // O frontend pode usar essa resposta para manter o usuário logado
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Token válido e usuário autenticado',
        data: {
          user: user,     // Dados completos do usuário (do token)
          valid: true     // Flag explícita de validade
        }
      } as ApiResponse<{ user: UserResponse; valid: boolean }>);
    } catch (error: any) {
      // TRATAMENTO DE ERROS INESPERADOS
      // Erros que podem ocorrer durante a validação
      // Geralmente relacionados a problemas de infraestrutura
      console.error('❌ Erro inesperado ao validar token:', error.message);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        errors: ['Falha na validação do token']
      } as ApiResponse);
    }
  }

  /**
   * Realiza logout do usuário (invalidação no lado cliente)
   * 
   * Como estamos usando JWT stateless (sem estado no servidor), o logout é 
   * diferente de sistemas tradicionais com sessões. O token JWT não pode ser
   * "invalidado" no servidor de forma simples - ele continuará válido até expirar.
   * 
   * O logout efetivo acontece no frontend quando:
   * 1. O token é removido do localStorage/sessionStorage
   * 2. O estado de autenticação é limpo
   * 3. O usuário é redirecionado para a página de login
   * 
   * Esta função serve apenas para:
   * - Registrar o evento de logout nos logs
   * - Confirmar ao frontend que o logout foi "processado"
   * - Manter consistência na API REST
   * 
   * Para sistemas que precisam de logout imediato do servidor, seria necessário:
   * - Implementar uma blacklist de tokens
   * - Usar refresh tokens
   * - Reduzir o tempo de expiração dos tokens
   * 
   * @param req - Request autenticada (pode ou não ter dados do usuário)
   * @param res - Response confirmando o logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // EXTRAIR DADOS DO USUÁRIO SE DISPONÍVEIS
      // O usuário pode estar ou não autenticado no momento do logout
      // Se o token expirou, req.user será undefined, mas ainda processamos o logout
      const user = req.user;

      // REGISTRAR EVENTO DE LOGOUT NOS LOGS
      // Importante para auditoria e monitoramento de segurança
      // Permite rastrear quando e quem fez logout
      if (user) {
        console.log('👋 Logout realizado para usuário autenticado:', user.id, '-', user.email);
      } else {
        console.log('👋 Logout realizado (usuário não identificado ou token expirado)');
      }

      // INSTRUÇÕES PARA O FRONTEND
      // Como estamos usando JWT stateless, o logout efetivo deve ser feito no frontend:
      // 1. Remover token do armazenamento local (localStorage.removeItem('token'))
      // 2. Limpar estado de autenticação no contexto da aplicação
      // 3. Redirecionar para página de login
      // 4. Invalidar dados em cache relacionados ao usuário
      
      // Em um sistema com blacklist de tokens, aqui adicionaríamos o token à blacklist:
      // await TokenBlacklist.add(req.headers.authorization?.replace('Bearer ', ''));

      // RESPOSTA DE CONFIRMAÇÃO DE LOGOUT
      // Confirma ao frontend que o logout foi processado com sucesso
      // Status 200 (OK) indica que a operação foi bem-sucedida
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Logout realizado com sucesso. Token deve ser removido do cliente.',
        data: {
          loggedOut: true,                    // Flag confirmando logout
          timestamp: new Date().toISOString() // Momento do logout
        }
      } as ApiResponse<{ loggedOut: boolean; timestamp: string }>);
    } catch (error: any) {
      // TRATAMENTO DE ERROS NO LOGOUT
      // Erros são raros no logout, mas podem ocorrer por:
      // - Problemas de infraestrutura
      // - Falhas na gravação de logs
      // - Problemas com blacklist (se implementada)
      console.error('❌ Erro inesperado durante logout:', error.message);
      console.error('Stack trace:', error.stack);
      
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor durante logout',
        errors: ['Falha ao processar logout']
      } as ApiResponse);
    }
  }
}
