import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AppContext';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import Purchase from './components/Purchase/Purchase';
import Sale from './components/Sale/Sale';
import Stock from './components/Stock/Stock';
import DetailList from './components/Parties/DetailList';
import Payments from './components/Parties/Payments';
import Report from './components/Reports/Report';
import PurchaseReport from './components/Reports/PurchaseReport';
import Expenses from './components/Expenses/Expenses';
import UserManagement from './components/Users/UserManagement';
import Settings from './components/Settings/Settings';
import './App.css';

const ProtectedRoute = ({ children, requiredPermission = null }) => {
  const { user, checkPermission } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission) {
    const [module, action] = requiredPermission.split('.');
    if (!checkPermission(module, action)) {
      return <Navigate to="/dashboard" />;
    }
  }

  return children;
};

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/purchase" element={
        <ProtectedRoute requiredPermission="purchases.view">
          <Purchase />
        </ProtectedRoute>
      } />
      <Route path="/sale" element={
        <ProtectedRoute requiredPermission="sales.view">
          <Sale />
        </ProtectedRoute>
      } />
      <Route path="/stock" element={
        <ProtectedRoute requiredPermission="stock.view">
          <Stock />
        </ProtectedRoute>
      } />
      <Route path="/parties" element={
        <ProtectedRoute requiredPermission="parties.view">
          <DetailList />
        </ProtectedRoute>
      } />
      <Route path="/payments" element={
        <ProtectedRoute requiredPermission="payments.view">
          <Payments />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute requiredPermission="reports.view">
          <Report />
        </ProtectedRoute>
      } />
      <Route path="/purchase-report" element={
        <ProtectedRoute requiredPermission="reports.view">
          <PurchaseReport />
        </ProtectedRoute>
      } />
      <Route path="/expenses" element={
        <ProtectedRoute requiredPermission="expenses.view">
          <Expenses />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute requiredPermission="users.view">
          <UserManagement />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute requiredPermission="settings.view">
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;