// Types for the frontend application

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority?: 'baixa' | 'media' | 'alta';
  due_date?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
