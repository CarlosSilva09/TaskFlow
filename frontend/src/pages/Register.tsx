import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import SocialLoginGroup from '../components/SocialLoginGroup';
import { socialAuthService } from '../services/socialAuth';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptUpdates, setAcceptUpdates] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setError('');
    setIsLoading(true);

    try {
      // For demo purposes, we'll use mock login
      const result = await socialAuthService.mockSocialLogin(provider);
      console.log('Social login result:', result);
      
      // In a real implementation, you would send this to your backend
      // to create/find the user and get a JWT token
      setError(`Cadastro com ${provider} não implementado ainda. Use o cadastro manual.`);
    } catch (err: any) {
      setError(err.message || `Erro ao se cadastrar com ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #7F5AF0 0%, #2CB67D 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            background: 'rgba(229, 229, 229, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(127, 90, 240, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(127, 90, 240, 0.3)',
            color: '#333',
          }}
        >
          {/* Logo/Brand */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                background: 'linear-gradient(45deg, #7F5AF0, #2CB67D)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontSize: '24px',
              }}
            >
              Todo App
            </Typography>
          </Box>

          {/* Title */}
          <Typography
            component="h1"
            variant="h4"
            sx={{
              textAlign: 'center',
              mb: 1,
              fontWeight: 700,
              color: '#333',
            }}
          >
            Sign up
          </Typography>

          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              mb: 4,
              color: '#666',
            }}
          >
            Create your account to get started
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Social Login Buttons */}
          <SocialLoginGroup
            onGoogleLogin={() => handleSocialLogin('Google')}
            onMicrosoftLogin={() => handleSocialLogin('Microsoft')}
            onAppleLogin={() => handleSocialLogin('Apple')}
            disabled={isLoading}
          />

          {/* Register Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full name"
              name="name"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="Jon Snow"
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="your@email.com"
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptUpdates}
                  onChange={(e) => setAcceptUpdates(e.target.checked)}
                  disabled={isLoading}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color="#666">
                  I want to receive updates via email.
                </Typography>
              }
              sx={{ mb: 3 }}
            />

            <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{
             py: 1.5,
             mb: 3,
              fontSize: '16px',
              fontWeight: 600,
              background: 'linear-gradient(45deg, #7F5AF0, #2CB67D)',
              '&:hover': {
              background: 'linear-gradient(45deg, #6B47D8, #239B68)',
              },
              '&:disabled': {
              background: 'rgba(127, 90, 240, 0.3)',
              },
              }}
             >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign up'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  style={{ 
                    color: '#7F5AF0', 
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;
