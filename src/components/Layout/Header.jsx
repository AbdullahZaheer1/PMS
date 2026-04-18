import React from 'react';
import { useAuth } from '../../context/AppContext';

const Header = ({ user, time }) => {
  const { companySettings } = useAuth();
  
  // Get company name from settings, fallback to default
  const companyName = companySettings?.name || 'Logixify Labs';
  
  return (
    <header className="header">
      <div className="header-left">
        <h1>{companyName}</h1>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className="user-role">Admin</span>
        </div>
        <div className="time-info">
          <span className="time">{time}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;