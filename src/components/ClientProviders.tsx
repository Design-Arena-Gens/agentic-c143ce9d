"use client";
import * as React from 'react';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(() => createTheme({
    palette: {
      mode: prefersDark ? 'dark' : 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' }
    }
  }), [prefersDark]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
