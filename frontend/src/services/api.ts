/**
 * Serviço de API - Centraliza todas as chamadas HTTP da aplicação
 * Usa Axios para gerenciar requisições e interceptadores
 */
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../types';

/**
 * Classe que encapsula todas as operações de API
 * Implementa padrão Singleton para instância única
 */
class ApiService {
  private api: AxiosInstance; // Instância do Axios configurada

  /**
   * Construtor - configura a instância do Axios com interceptadores
   */
  constructor() {
    // Cria instância do Axios com configurações base
    this.api = axios.create({
      // URL base da API (usa variável de ambiente ou localhost como fallback)
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3003/api',
      timeout: 10000, // Timeout de 10 segundos para requisições
      headers: {
        'Content-Type': 'application/json', // Todas as requisições são JSON
      },
    });

    // Interceptador de requisição - adiciona token de autorização automaticamente
    this.api.interceptors.request.use(
      (config) => {
        // Busca o token do localStorage
        const token = localStorage.getItem('token');
        if (token) {
          // Adiciona o token no cabeçalho Authorization
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        // Em caso de erro na requisição
        return Promise.reject(error);
      }
    );

    // Interceptador de resposta - trata erros globalmente
    this.api.interceptors.response.use(
      (response) => response, // Se sucesso, retorna a resposta normal
      (error: AxiosError) => {
        // Se erro 401 (não autorizado), faz logout automático
        if (error.response?.status === 401) {
          // Remove dados de autenticação
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Redireciona para login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * MÉTODOS DE AUTENTICAÇÃO
   */

  /**
   * Realiza login do usuário
   * @param credentials - Email e senha do usuário
   * @returns Promise com dados do usuário e token
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/auth/login', credentials);
    return response.data.data; // Acessa a propriedade 'data' da resposta padronizada
  }

  /**
   * Registra novo usuário
   * @param credentials - Nome, email e senha do usuário
   * @returns Promise com dados do usuário e token
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/auth/register', credentials);
    return response.data.data; // Acessa a propriedade 'data' da resposta padronizada
  }

  /**
   * Busca perfil do usuário autenticado
   * @returns Promise com dados do perfil
   */
  async getProfile() {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  /**
   * MÉTODOS DE TODOS (TAREFAS)
   */

  /**
   * Busca todas as tarefas do usuário
   * @returns Promise com lista de tarefas
   */
  async getTodos() {
    const response = await this.api.get('/todos');
    // Trata tanto formato novo quanto antigo da resposta
    return response.data.data || response.data;
  }

  /**
   * Cria nova tarefa
   * @param todo - Dados da tarefa (título, descrição, data de vencimento)
   * @returns Promise com dados da tarefa criada
   */
  async createTodo(todo: { title: string; description?: string; due_date?: string }) {
    const response = await this.api.post('/todos', todo);
    return response.data.data || response.data;
  }

  /**
   * Atualiza dados de uma tarefa
   * @param id - ID da tarefa
   * @param todo - Dados a serem atualizados
   * @returns Promise com dados da tarefa atualizada
   */
  async updateTodo(id: number, todo: { title?: string; description?: string; completed?: boolean; due_date?: string }) {
    const response = await this.api.put(`/todos/${id}`, todo);
    return response.data.data || response.data;
  }

  /**
   * Alterna status de conclusão de uma tarefa
   * @param id - ID da tarefa
   * @returns Promise com dados da tarefa atualizada
   */
  async toggleTodo(id: number) {
    const response = await this.api.patch(`/todos/${id}/toggle`);
    return response.data.data || response.data;
  }

  /**
   * Remove uma tarefa
   * @param id - ID da tarefa a ser removida
   */
  async deleteTodo(id: number) {
    await this.api.delete(`/todos/${id}`);
  }
}

// Exporta instância única do serviço (padrão Singleton)
export const apiService = new ApiService();
export default apiService;
