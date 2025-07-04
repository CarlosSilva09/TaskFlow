import { Request } from 'express';
// ==============================
// INTERFACES DE DADOS
// ==============================

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// ==============================
// INTERFACES DE TAREFAS
// ==============================

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'baixa' | 'media' | 'alta';
  due_date: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface TodoResponse {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'baixa' | 'media' | 'alta';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoData {
  title: string;
  description?: string;
  priority?: 'baixa' | 'media' | 'alta';
  due_date?: string;
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'baixa' | 'media' | 'alta';
  due_date?: string;
}

export interface TodoFilters {
  completed?: boolean;
  priority?: 'baixa' | 'media' | 'alta';
  search?: string;
  page?: number;
  limit?: number;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  byPriority: {
    baixa: number;
    media: number;
    alta: number;
  };
}

// ==============================
// INTERFACES DE API
// ==============================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthToken {
  userId: number;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

// ==============================
// INTERFACES DE BANCO DE DADOS
// ==============================

export interface DatabaseResult {
  id: number;
  changes: number;
}

export interface DatabaseConfig {
  path: string;
  timeout?: number;
  busyTimeout?: number;
}

// ==============================
// INTERFACES DE REQUEST CUSTOMIZADAS
// ==============================

export interface AuthenticatedRequest extends Request {
  user?: UserResponse;
}

// ==============================
// INTERFACES DE VALIDAÇÃO
// ==============================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface LoginValidation {
  email: string;
  password: string;
}

export interface RegisterValidation {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface TodoValidation {
  title: string;
  description?: string;
  priority?: 'baixa' | 'media' | 'alta';
}

// ==============================
// INTERFACES DE CONFIGURAÇÃO
// ==============================

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  databasePath: string;
  logLevel: string;
}

export interface CorsConfig {
  origin: string | string[];
  credentials: boolean;
  methods?: string[];
  allowedHeaders?: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: ApiResponse;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

// ==============================
// TYPES AUXILIARES
// ==============================

export type Environment = 'development' | 'production' | 'test';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type TodoPriority = 'baixa' | 'media' | 'alta';

export type SortOrder = 'asc' | 'desc';

export type TodoSortBy = 'created_at' | 'updated_at' | 'title' | 'priority';

// ==============================
// INTERFACES DE MIDDLEWARE
// ==============================

export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export interface RequestLog {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  userId?: number;
}

// ==============================
// INTERFACES DE SERVIÇOS
// ==============================

export interface EmailService {
  sendWelcomeEmail(user: UserResponse): Promise<boolean>;
  sendPasswordResetEmail(user: UserResponse, resetToken: string): Promise<boolean>;
}

export interface NotificationService {
  sendPushNotification(userId: number, message: string): Promise<boolean>;
}

// ==============================
// ENUMS
// ==============================

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

export enum TodoStatus {
  PENDING = 'pending',
  COMPLETED = 'completed'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// ==============================
// TYPES CONDICIONAIS
// ==============================

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
