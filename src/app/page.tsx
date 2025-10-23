"use client";
import * as React from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Container, Button, Box, Grid, Paper } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const sampleData = [
  { time: '09:30', price: 100, predicted: 101 },
  { time: '10:00', price: 102, predicted: 103 },
  { time: '10:30', price: 101, predicted: 102 },
  { time: '11:00', price: 103, predicted: 104 }
];

export default function HomePage() {
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Agentic Stocks</Typography>
          <Button color="inherit" component={Link} href="/login">Login</Button>
          <Button color="inherit" component={Link} href="/signup">Sign Up</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 6 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Demo Chart</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#1976d2" dot={false} />
                  <Line type="monotone" dataKey="predicted" stroke="#9c27b0" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Get Started</Typography>
              <Typography variant="body2" gutterBottom>
                Create an account, verify with OTP, explore predictions, and place demo trades.
              </Typography>
              <Button variant="contained" fullWidth sx={{ mt: 2 }} component={Link} href="/dashboard">Go to Dashboard</Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
