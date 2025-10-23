"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Container, Paper, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/index.py/auth/login', { email, password });
      const token = res.data?.token;
      if (token) localStorage.setItem('token', token);
      if (res.status === 200) router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Login</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required />
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth required />
            <Button variant="contained" type="submit">Login</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
