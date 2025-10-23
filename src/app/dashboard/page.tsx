"use client";
import * as React from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { Container, Grid, Paper, Typography, Stack, Button, TextField } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fetcher = (url: string) => axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }).then(r => r.data);

export default function DashboardPage() {
  const { data: portfolio } = useSWR('/api/index.py/portfolio', fetcher);
  const { data: market } = useSWR('/api/index.py/market/tickers', fetcher);

  const [symbol, setSymbol] = React.useState('AAPL');
  const [shares, setShares] = React.useState(1);
  const [chartData, setChartData] = React.useState<any[]>([]);

  async function loadPrediction(sym: string) {
    const res = await axios.get(`/api/index.py/predict?symbol=${encodeURIComponent(sym)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
    setChartData(res.data?.series || []);
  }
  React.useEffect(() => { loadPrediction(symbol); }, []);

  async function trade(side: 'buy' | 'sell') {
    await axios.post('/api/index.py/portfolio/trade', { symbol, shares, side }, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
  }

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h5">Dashboard</Typography>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField label="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} size="small" />
              <Button variant="outlined" onClick={() => loadPrediction(symbol)}>Load</Button>
              <TextField label="Shares" type="number" value={shares} onChange={(e) => setShares(Number(e.target.value))} size="small" />
              <Button variant="contained" onClick={() => trade('buy')}>Buy</Button>
              <Button variant="contained" color="secondary" onClick={() => trade('sell')}>Sell</Button>
            </Stack>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="close" stroke="#1976d2" dot={false} name="Close" />
                <Line type="monotone" dataKey="predicted" stroke="#9c27b0" dot={false} name="Predicted" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Portfolio</Typography>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(portfolio || {}, null, 2)}</pre>
          </Paper>
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6">Market Tickers</Typography>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(market || {}, null, 2)}</pre>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
