/**
 * Contexto de Autenticação da Aplicação
 * Gerencia estado global de login, logout e dados do usuário
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { apiService } from '../services/api';

/**
 * Interface que define o tipo do contexto de autenticação
 * Especifica todas as propriedades e métodos disponíveis
 */
interface AuthContextType {
  user: User | null; // Dados do usuário logado ou null se não autenticado
  token: string | null; // Token JWT de autenticação
  isLoading: boolean; // Estado de carregamento da autenticação
  login: (email: string, password: string) => Promise<void>; // Função para fazer login
  register: (name: string, email: string, password: string) => Promise<void>; // Função para registro
  logout: () => void; // Função para fazer logout
  isAuthenticated: boolean; // Status de autenticação do usuário
}

/**
 * Criação do contexto React para autenticação
 * Inicializado como undefined para forçar uso dentro do Provider
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook personalizado para usar o contexto de autenticação
 * Garante que seja usado apenas dentro do AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Props do componente AuthProvider
 */
interface AuthProviderProps {
  children: ReactNode; // Componentes filhos que terão acesso ao contexto
}

/**
 * Provedor do contexto de autenticação
 * Gerencia todo o estado relacionado à autenticação do usuário
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Estado do usuário logado
  const [user, setUser] = useState<User | null>(null);
  
  // Estado do token de autenticação (busca inicial do localStorage)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  // Estado de carregamento durante inicialização
  const [isLoading, setIsLoading] = useState(true);

  // Computed property para verificar se o usuário está autenticado
  const isAuthenticated = !!token && !!user;

  /**
   * Effect para inicializar a autenticação quando a aplicação carrega
   * Verifica se existe token válido no localStorage
   */
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      // Se existem dados salvos no localStorage
      if (storedToken && storedUser) {
        try {
          // Restaura o estado da autenticação
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verifica se o token ainda é válido fazendo uma requisição
          await apiService.getProfile();
        } catch (error) {
          console.error('Token validation failed:', error);
          // Se o token é inválido, faz logout
          logout();
        }
      }
      // Finaliza o carregamento inicial
      setIsLoading(false);
    };

    initAuth();
  }, []); // Array vazio = executa apenas uma vez na montagem

  /**
   * Função para realizar login do usuário
   * @param email - Email do usuário
   * @param password - Senha do usuário
   */
  const login = async (email: string, password: string) => {
    try {
      console.log('🔑 Iniciando login...');
      
      // Chama a API de login
      const response = await apiService.login({ email, password });
      console.log('✅ Resposta do login:', response);
      
      const { token: newToken, user: newUser } = response;

      console.log('💾 Salvando token e usuário...');
      
      // Atualiza o estado da aplicação
      setToken(newToken);
      setUser(newUser);
      
      // Persiste os dados no localStorage para manter login entre sessões
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      console.log('✅ Login concluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error; // Repassa o erro para o componente que chamou
    }
  };

  /**
   * Função para registrar novo usuário
   * @param name - Nome do usuário
   * @param email - Email do usuário
   * @param password - Senha do usuário
   */
  const register = async (name: string, email: string, password: string) => {
    try {
      // Chama a API de registro
      const response = await apiService.register({ name, email, password });
      const { token: newToken, user: newUser } = response;

      // Atualiza estado e localStorage (mesmo processo do login)
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      throw error; // Repassa o erro para o componente que chamou
    }
  };

  /**
   * Função para fazer logout do usuário
   * Limpa todos os dados de autenticação
   */
  const logout = () => {
    // Limpa o estado da aplicação
    setToken(null);
    setUser(null);
    
    // Remove dados do localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /**
   * Objeto com todos os valores do contexto
   * Será disponibilizado para todos os componentes filhos
   */
  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  // Renderiza o Provider com o valor do contexto
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
