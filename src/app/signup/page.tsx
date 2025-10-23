"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Container, Paper, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import axios from 'axios';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [phase, setPhase] = React.useState<'signup' | 'verify'>('signup');
  const [error, setError] = React.useState<string | null>(null);

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/index.py/auth/signup', { email, password });
      if (res.status === 200) setPhase('verify');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Signup failed');
    }
  }
  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/index.py/auth/verify', { email, otp });
      const token = res.data?.token;
      if (token) localStorage.setItem('token', token);
      if (res.status === 200) router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Verification failed');
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Sign Up</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {phase === 'signup' ? (
          <form onSubmit={onSignup}>
            <Stack spacing={2}>
              <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required />
              <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth required />
              <Button variant="contained" type="submit">Create Account</Button>
            </Stack>
          </form>
        ) : (
          <form onSubmit={onVerify}>
            <Stack spacing={2}>
              <TextField label="OTP" value={otp} onChange={e => setOtp(e.target.value)} fullWidth required />
              <Button variant="contained" type="submit">Verify</Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
