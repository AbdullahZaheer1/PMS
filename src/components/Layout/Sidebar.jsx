import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AppContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, checkPermission } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard', module: 'dashboard' },
    { path: '/sale', icon: '💰', label: 'Sale', module: 'sales' },
    { path: '/expenses', icon: '💸', label: 'Expenses', module: 'expenses' },
    { path: '/purchase', icon: '📥', label: 'Purchase', module: 'purchases' },
    { path: '/stock', icon: '📦', label: 'Stock', module: 'stock' },
    { path: '/parties', icon: '👥', label: 'Parties', module: 'parties' },
    { path: '/payments', icon: '💳', label: 'Payments', module: 'payments' },
    { path: '/reports', icon: '📈', label: 'Reports', module: 'reports' },
    { path: '/purchase-report', icon: '📋', label: 'Purchase Report', module: 'reports' },
  ];

  // Only show if user has permission
  if (checkPermission('users', 'view')) {
    menuItems.push({ path: '/users', icon: '👤', label: 'Users', module: 'users' });
  }
  
  if (checkPermission('settings', 'view')) {
    menuItems.push({ path: '/settings', icon: '⚙️', label: 'Settings', module: 'settings' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Pharmacy</h2>
        <p>Management System</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;