import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

const Dashboard = () => {
  const { user, getDashboardStats, sales, getLowStockMedicines, getNegativeStockMedicines } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    cashInHand: 0,
    totalItems: 0,
    lowStock: 0,
    negativeStock: 0
  });

  useEffect(() => {
    // Update stats every 5 seconds
    const updateStats = () => {
      setStats(getDashboardStats());
    };

    updateStats();
    const timer = setInterval(updateStats, 5000);
    
    // Time update
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(timeTimer);
    };
  }, [getDashboardStats]);

  // Get recent sales (last 5)
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(sale => ({
      date: sale.date,
      billNo: sale.billNo,
      total: sale.grandTotal,
      customer: sale.customerId === 'cash' ? 'Cash' : `Customer #${sale.customerId}`
    }));

  // Get low stock items
  const lowStockItems = getLowStockMedicines(10).slice(0, 5).map(med => ({
    name: med.name,
    stock: med.stock,
    location: med.location || 'N/A'
  }));

  // Get negative stock items
  const negativeStockItems = getNegativeStockMedicines().slice(0, 5).map(med => ({
    name: med.name,
    stock: med.stock,
    location: med.location || 'N/A'
  }));

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0].replace(/-/g, '.');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header user={user} time={formatTime(currentTime)} />
        
        <div className="content">
          <div className="welcome-section">
            <h1>Welcome back, {user?.name}!</h1>
            <p>Today is {formatDate(new Date())}</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>Today's Sales</h3>
                <p className="stat-value">Rs. {stats.totalSales.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-info">
                <h3>Today's Profit</h3>
                <p className={`stat-value ${stats.totalProfit >= 0 ? 'profit' : 'negative'}`}>
                  Rs. {stats.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💵</div>
              <div className="stat-info">
                <h3>Cash in Hand</h3>
                <p className="stat-value">Rs. {stats.cashInHand.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h3>Total Items</h3>
                <p className="stat-value">{stats.totalItems}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <h2>Recent Sales</h2>
                <button className="view-all btn-primary" onClick={() => handleNavigation('/reports')}>View All</button>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill No</th>
                    <th>Customer</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length > 0 ? (
                    recentSales.map((sale, index) => (
                      <tr key={index}>
                        <td>{sale.date}</td>
                        <td>{sale.billNo}</td>
                        <td>{sale.customer}</td>
                        <td>Rs. {sale.total.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center">No sales yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Stock Alerts</h2>
                <button className="view-all btn-primary" onClick={() => handleNavigation('/stock')}>View Stock</button>
              </div>
              
              {lowStockItems.length > 0 && (
                <>
                  <h3 style={{margin: '10px 0', fontSize: '14px', color: '#f59e0b'}}>Low Stock ({'<'}10)</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Stock</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td className="low">{item.stock}</td>
                          <td>{item.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {negativeStockItems.length > 0 && (
                <>
                  <h3 style={{margin: '15px 0 10px', fontSize: '14px', color: '#dc2626'}}>Negative Stock</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Stock</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negativeStockItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td className="negative">{item.stock}</td>
                          <td>{item.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {lowStockItems.length === 0 && negativeStockItems.length === 0 && (
                <p className="text-center">All stock levels are normal</p>
              )}
            </div>
          </div>

          <div className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <button className="action-btn new-sale" onClick={() => handleNavigation('/sale')}>
                + New Sale
              </button>
              <button className="action-btn new-purchase" onClick={() => handleNavigation('/purchase')}>
                + New Purchase
              </button>
              <button className="action-btn add-expense" onClick={() => handleNavigation('/expenses')}>
                + Add Expense
              </button>
              <button className="action-btn view-reports" onClick={() => handleNavigation('/reports')}>
                View Reports
              </button>
              <button className="action-btn" style={{background: '#8b5cf6', color: 'white'}} 
                onClick={() => handleNavigation('/payments')}>
                Make Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;