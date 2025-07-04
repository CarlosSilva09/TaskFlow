import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Checkbox,
  Box,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { Todo } from '../types';

interface TodoCardProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
}

const TodoCard: React.FC<TodoCardProps> = ({ todo, onToggle, onEdit, onDelete }) => {
  const formatDueDate = (dateString: string) => {
    if (!dateString) return 'Data inválida';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Data inválida';
    }
  };

  const isOverdue = () => {
    if (!todo.due_date || todo.completed) return false;
    
    try {
      const dueDate = new Date(todo.due_date);
      if (isNaN(dueDate.getTime())) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    } catch {
      return false;
    }
  };

  const overdue = isOverdue();

  return (
    <Card 
      sx={{ 
        background: overdue && !todo.completed 
          ? 'rgba(244, 67, 54, 0.2)' 
          : 'rgba(229, 229, 229, 0.9)',
        backdropFilter: 'blur(20px)',
        border: overdue && !todo.completed 
          ? '2px solid #f44336' 
          : '1px solid rgba(127, 90, 240, 0.2)',
        borderRadius: 3,
        color: '#333',
        transition: 'all 0.3s ease',
        opacity: todo.completed ? 0.7 : 1,
        transform: todo.completed ? 'scale(0.98)' : 'scale(1)',
        '&:hover': {
          transform: todo.completed ? 'scale(0.99)' : 'scale(1.02)',
          background: overdue && !todo.completed 
            ? 'rgba(244, 67, 54, 0.3)' 
            : 'rgba(229, 229, 229, 0.95)',
          boxShadow: '0 12px 40px rgba(127, 90, 240, 0.3)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Checkbox
            checked={todo.completed}
            onChange={() => onToggle(todo.id)}
            disabled={overdue && !todo.completed}
            sx={{ 
              color: overdue && !todo.completed ? '#f44336' : 'rgba(127, 90, 240, 0.7)',
              '&.Mui-checked': {
                color: '#2CB67D',
              },
              '&:hover': {
                background: 'rgba(127, 90, 240, 0.1)',
              },
              '&.Mui-disabled': {
                color: 'rgba(244, 67, 54, 0.5)',
              }
            }}
          />
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 1,
                textDecoration: todo.completed ? 'line-through' : 'none',
                color: overdue && !todo.completed 
                  ? '#f44336' 
                  : todo.completed 
                    ? 'rgba(51, 51, 51, 0.6)' 
                    : '#333',
                wordBreak: 'break-word',
              }}
            >
              {todo.title}
            </Typography>
            
            {todo.description && (
              <Typography
                variant="body2"
                sx={{
                  color: overdue && !todo.completed 
                    ? 'rgba(244, 67, 54, 0.8)' 
                    : todo.completed 
                      ? 'rgba(51, 51, 51, 0.5)' 
                      : 'rgba(51, 51, 51, 0.8)',
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  mb: 2,
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}
              >
                {todo.description}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip
                label={todo.completed ? 'Concluída' : overdue ? 'Vencida' : 'Pendente'}
                size="small"
                sx={{
                  background: todo.completed 
                    ? 'rgba(44, 182, 125, 0.3)'
                    : overdue 
                      ? 'rgba(244, 67, 54, 0.3)'
                      : 'rgba(127, 90, 240, 0.3)',
                  color: todo.completed ? '#2CB67D' : overdue ? '#f44336' : '#7F5AF0',
                  border: `1px solid ${todo.completed ? '#2CB67D' : overdue ? '#f44336' : '#7F5AF0'}`,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
              
              <Typography 
                variant="caption" 
                sx={{ 
                  color: overdue && !todo.completed 
                    ? '#f44336' 
                    : todo.completed 
                      ? 'rgba(51, 51, 51, 0.6)' 
                      : '#2CB67D',
                  fontSize: '0.7rem',
                  fontWeight: overdue && !todo.completed ? 600 : 500,
                }}
              >
                {todo.due_date
                  ? `${overdue && !todo.completed ? '⚠️ Venceu em:' : '📅 Vence em:'} ${formatDueDate(todo.due_date)}`
                  : 'Sem data de vencimento'}
              </Typography>
            </Box>

            {todo.due_date && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {overdue && !todo.completed && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#f44336',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      fontStyle: 'italic',
                    }}
                  >
                    Não pode ser concluída
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => onEdit(todo)}
              sx={{
                color: 'rgba(51, 51, 51, 0.7)',
                '&:hover': {
                  color: '#7F5AF0',
                  background: 'rgba(127, 90, 240, 0.1)',
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDelete(todo.id)}
              sx={{
                color: 'rgba(51, 51, 51, 0.7)',
                '&:hover': {
                  color: '#f44336',
                  background: 'rgba(244, 67, 54, 0.1)',
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TodoCard;