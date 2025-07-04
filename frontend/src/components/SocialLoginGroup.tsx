import React from 'react';
import { Button, Box } from '@mui/material';
import { Google, Microsoft, Apple } from '@mui/icons-material';

interface SocialLoginButtonProps {
  provider: 'google' | 'microsoft' | 'apple';
  onClick: () => void;
  disabled?: boolean;
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({ provider, onClick, disabled }) => {
  const getProviderConfig = () => {
    switch (provider) {
      case 'google':
        return {
          icon: <Google />,
          text: 'Continue with Google',
          bgColor: '#ffffff',
          textColor: '#000000',
          borderColor: '#dadce0',
        };
      case 'microsoft':
        return {
          icon: <Microsoft />,
          text: 'Continue with Microsoft',
          bgColor: '#0078d4',
          textColor: '#ffffff',
          borderColor: '#0078d4',
        };
      case 'apple':
        return {
          icon: <Apple />,
          text: 'Continue with Apple',
          bgColor: '#000000',
          textColor: '#ffffff',
          borderColor: '#000000',
        };
      default:
        return {
          icon: null,
          text: '',
          bgColor: '',
          textColor: '',
          borderColor: '',
        };
    }
  };

  const config = getProviderConfig();

  return (
    <Button
      fullWidth
      variant="outlined"
      onClick={onClick}
      disabled={disabled}
      startIcon={config.icon}
      sx={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        borderColor: config.borderColor,
        textTransform: 'none',
        py: 1.5,
        fontSize: '14px',
        fontWeight: 500,
        '&:hover': {
          backgroundColor: provider === 'google' ? '#f8f9fa' : 
                         provider === 'microsoft' ? '#106ebe' : '#333333',
          borderColor: config.borderColor,
        },
        '&:disabled': {
          opacity: 0.6,
        },
      }}
    >
      {config.text}
    </Button>
  );
};

interface SocialLoginGroupProps {
  onGoogleLogin: () => void;
  onMicrosoftLogin: () => void;
  onAppleLogin: () => void;
  disabled?: boolean;
}

const SocialLoginGroup: React.FC<SocialLoginGroupProps> = ({
  onGoogleLogin,
  onMicrosoftLogin,
  onAppleLogin,
  disabled = false,
}) => {
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
        <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(127, 90, 240, 0.3)' }} />
        <Box sx={{ px: 2, color: '#666', fontSize: '14px' }}>ou</Box>
        <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(127, 90, 240, 0.3)' }} />
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SocialLoginButton
          provider="google"
          onClick={onGoogleLogin}
          disabled={disabled}
        />
        <SocialLoginButton
          provider="microsoft"
          onClick={onMicrosoftLogin}
          disabled={disabled}
        />
        <SocialLoginButton
          provider="apple"
          onClick={onAppleLogin}
          disabled={disabled}
        />
      </Box>
    </Box>
  );
};

export default SocialLoginGroup;
