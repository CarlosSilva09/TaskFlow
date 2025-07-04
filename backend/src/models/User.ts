import bcrypt from 'bcryptjs';
import { Database } from '../config/database';
import { User } from '../types';

const databaseConfig = {
  path: 'database.sqlite',
  enableForeignKeys: true,
  enableWAL: true,
  timeout: 5000
};

const db = Database.getInstance(databaseConfig);

export class UserModel {
  static async create(name: string, email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const result = await db.run(`
        INSERT INTO users (name, email, password) 
        VALUES (?, ?, ?)
      `, [name, email, hashedPassword]);
      
      const newUser: User = {
        id: result.id,
        name,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return newUser;
    } catch (error) {
      throw new Error(`Erro ao criar usuário: ${error}`);
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const row = await db.get(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (!row) {
        return null;
      }
      
      const user: User = {
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      return user;
    } catch (error) {
      throw new Error(`Erro ao buscar usuário por email: ${error}`);
    }
  }

  static async findById(id: number): Promise<User | null> {
    try {
      const row = await db.get(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (!row) {
        return null;
      }
      
      const user: User = {
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      return user;
    } catch (error) {
      throw new Error(`Erro ao buscar usuário por ID: ${error}`);
    }
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    try {
      const result = await db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, id]
      );
      
      return result.changes! > 0;
    } catch (error) {
      throw new Error(`Erro ao atualizar senha: ${error}`);
    }
  }

  static async delete(id: number): Promise<boolean> {
    try {
      const result = await db.run(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      return result.changes! > 0;
    } catch (error) {
      throw new Error(`Erro ao deletar usuário: ${error}`);
    }
  }

  static async changePassword(userId: number, data: { currentPassword: string; newPassword: string }): Promise<boolean> {
    try {
      // Buscar usuário atual
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await this.verifyPassword(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Senha atual incorreta');
      }

      // Atualizar senha
      return await this.updatePassword(userId, data.newPassword);
    } catch (error) {
      throw error;
    }
  }

  static async update(userId: number, data: Partial<{ name: string; email: string }>): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) {
        updateFields.push('name = ?');
        values.push(data.name);
      }

      if (data.email !== undefined) {
        // Verificar se email já existe para outro usuário
        const existingUser = await this.findByEmail(data.email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Este email já está em uso');
        }
        updateFields.push('email = ?');
        values.push(data.email);
      }

      if (updateFields.length === 0) {
        return false;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      const result = await db.run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      return result.changes! > 0;
    } catch (error) {
      throw error;
    }
  }
}
