import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography } from '@mui/material';
import theme from './theme';

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import { NotificationProvider } from './context/NotificationContext';

// Layout & Guards
import Layout from './components/layout/Layout';
import { PrivateRoute } from './components/auth/RouteGuards';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import KnowledgePage from './pages/KnowledgePage';
import ReportsPage from './pages/ReportsPage';
import ObservabilityPage from './pages/ObservabilityPage';

// Hooks
import useWebSocket from './hooks/useWebSocket';


function AppContent() {
  return (
    <Routes>
      {/* Route Publique */}
      <Route path="/login" element={<LoginPage />} />

      {/* Routes Protégées */}
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/incidents" 
        element={
          <PrivateRoute>
            <Layout>
              <IncidentsPage />
            </Layout>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/knowledge" 
        element={
          <PrivateRoute>
            <Layout>
              <KnowledgePage />
            </Layout>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <PrivateRoute>
            <Layout>
              <ReportsPage />
            </Layout>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/observability" 
        element={
          <PrivateRoute>
            <Layout>
              <ObservabilityPage />
            </Layout>
          </PrivateRoute>
        } 
      />

      {/* Redirection par defaut */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;