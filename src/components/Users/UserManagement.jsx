import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// import './App.css';

const UserManagement = () => {
  const { 
    user, 
    users, 
    addUser, 
    updateUser, 
    deleteUser,
    checkPermission,
    companySettings
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Default permissions structure
  const defaultPermissions = {
    dashboard: { view: true },
    purchases: { view: false, add: false, edit: false, delete: false },
    sales: { view: false, add: false, edit: false, delete: false },
    stock: { view: false, add: false, edit: false, delete: false },
    parties: { view: false, add: false, edit: false, delete: false },
    payments: { view: false, add: false, edit: false, delete: false },
    reports: { view: false, export: false, print: false },
    expenses: { view: false, add: false, edit: false, delete: false },
    users: { view: false, add: false, edit: false, delete: false, permissions: false },
    settings: { view: false, edit: false }
  };

  // User form state
  const [userData, setUserData] = useState({
    id: null,
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'cashier',
    active: true,
    permissions: { ...defaultPermissions }
  });

  // Roles with predefined permissions
  const roles = [
    { id: 'admin', name: 'Admin', description: 'Full access to all features' },
    { id: 'manager', name: 'Manager', description: 'Can manage operations but not users' },
    { id: 'cashier', name: 'Cashier', description: 'Can only handle sales and basic views' },
    { id: 'viewer', name: 'Viewer', description: 'Read-only access' },
    { id: 'custom', name: 'Custom', description: 'Custom permissions - configure each module' }
  ];

  // Modules for permissions
  const modules = [
    { id: 'dashboard', name: 'Dashboard', actions: ['view'] },
    { id: 'purchases', name: 'Purchases', actions: ['view', 'add', 'edit', 'delete'] },
    { id: 'sales', name: 'Sales', actions: ['view', 'add', 'edit', 'delete'] },
    { id: 'stock', name: 'Stock', actions: ['view', 'add', 'edit', 'delete'] },
    { id: 'parties', name: 'Parties', actions: ['view', 'add', 'edit', 'delete'] },
    { id: 'payments', name: 'Payments', actions: ['view', 'add', 'edit', 'delete'] },
    { id: 'reports', name: 'Reports', actions: ['view', 'export', 'print'] },
    { id: 'expenses', name: 'Expenses', actions: ['view', 'add', 'edit', 'delete'] },
    { id: 'users', name: 'Users', actions: ['view', 'add', 'edit', 'delete', 'permissions'] },
    { id: 'settings', name: 'Settings', actions: ['view', 'edit'] }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Filter users
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;
  const inactiveUsers = users.filter(u => !u.active).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const managerUsers = users.filter(u => u.role === 'manager').length;
  const cashierUsers = users.filter(u => u.role === 'cashier').length;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserData({
      ...userData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRoleChange = (role) => {
    let permissions = { ...defaultPermissions };

    if (role === 'admin') {
      modules.forEach(module => {
        if (!permissions[module.id]) permissions[module.id] = {};
        module.actions.forEach(action => {
          permissions[module.id][action] = true;
        });
      });
    } else if (role === 'manager') {
      permissions = {
        dashboard: { view: true },
        purchases: { view: true, add: true, edit: true, delete: false },
        sales: { view: true, add: true, edit: true, delete: false },
        stock: { view: true, add: true, edit: false, delete: false },
        parties: { view: true, add: true, edit: true, delete: false },
        payments: { view: true, add: true, edit: false, delete: false },
        reports: { view: true, export: true, print: true },
        expenses: { view: true, add: true, edit: true, delete: false },
        users: { view: false, add: false, edit: false, delete: false, permissions: false },
        settings: { view: true, edit: false }
      };
    } else if (role === 'cashier') {
      permissions = {
        dashboard: { view: true },
        purchases: { view: false, add: false, edit: false, delete: false },
        sales: { view: true, add: true, edit: false, delete: false },
        stock: { view: true, add: false, edit: false, delete: false },
        parties: { view: true, add: false, edit: false, delete: false },
        payments: { view: true, add: false, edit: false, delete: false },
        reports: { view: false, export: false, print: false },
        expenses: { view: false, add: false, edit: false, delete: false },
        users: { view: false, add: false, edit: false, delete: false, permissions: false },
        settings: { view: true, edit: false }
      };
    } else if (role === 'viewer') {
      permissions = {
        dashboard: { view: true },
        purchases: { view: true, add: false, edit: false, delete: false },
        sales: { view: true, add: false, edit: false, delete: false },
        stock: { view: true, add: false, edit: false, delete: false },
        parties: { view: true, add: false, edit: false, delete: false },
        payments: { view: true, add: false, edit: false, delete: false },
        reports: { view: true, export: false, print: false },
        expenses: { view: true, add: false, edit: false, delete: false },
        users: { view: false, add: false, edit: false, delete: false, permissions: false },
        settings: { view: true, edit: false }
      };
    } else if (role === 'custom') {
      // Keep existing permissions
    }

    setUserData({
      ...userData,
      role,
      permissions: permissions
    });
  };

  const handlePermissionChange = (module, action, value) => {
    const newRole = userData.role !== 'custom' ? 'custom' : userData.role;
    
    setUserData({
      ...userData,
      role: newRole,
      permissions: {
        ...userData.permissions,
        [module]: {
          ...userData.permissions[module],
          [action]: value
        }
      }
    });
  };

  const handleAddNew = () => {
    setUserData({
      id: null,
      username: '',
      password: '',
      name: '',
      email: '',
      phone: '',
      role: 'cashier',
      active: true,
      permissions: { ...defaultPermissions }
    });
    setActiveTab('add');
  };

  const handleEdit = (user) => {
    setUserData({
      ...user,
      password: '' // Don't show password in edit mode
    });
    setActiveTab('edit');
  };

  const handlePermissions = (user) => {
    setSelectedUser(user);
    setUserData(user);
    setActiveTab('permissions');
  };

  // ===== FIXED: Save function with proper validation =====
  const handleSave = () => {
    // Validation
    if (!userData.username) {
      showNotification('Username is required', 'error');
      return;
    }

    if (!userData.name) {
      showNotification('Full name is required', 'error');
      return;
    }

    // ===== FIX 1: Password validation =====
    if (!userData.id) {
      // New user - password required
      if (!userData.password) {
        showNotification('Password is required for new users', 'error');
        return;
      }
      
      if (userData.password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
      }
    } else {
      // Edit mode - password is optional
      if (userData.password && userData.password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
      }
    }

    // ===== FIX 2: Username exists check (ONLY for new users) =====
    if (!userData.id) {
      // Check if username exists for new users
      const existing = users.find(u => u.username === userData.username);
      if (existing) {
        showNotification('Username already exists', 'error');
        return;
      }
    } else {
      // For edit mode, check if username exists AND it's not the same user
      const existing = users.find(u => u.username === userData.username && u.id !== userData.id);
      if (existing) {
        showNotification('Username already exists', 'error');
        return;
      }
    }

    if (!checkPermission('users', userData.id ? 'edit' : 'add')) {
      showNotification(`You do not have permission to ${userData.id ? 'edit' : 'add'} users`, 'error');
      return;
    }

    // Prepare data for save
    const userToSave = { ...userData };
    
    // If password is empty in edit mode, remove it (keep existing)
    if (userData.id && !userData.password) {
      delete userToSave.password;
    }

    // ===== FIX 3: Log for debugging =====
    console.log('Saving user:', userToSave);

    if (userData.id) {
      // Update existing user
      updateUser(userData.id, userToSave);
      showNotification('User updated successfully', 'success');
    } else {
      // Add new user
      addUser(userToSave);
      showNotification('User added successfully', 'success');
    }

    setActiveTab('list');
  };

  const handleSavePermissions = () => {
    if (!checkPermission('users', 'permissions')) {
      showNotification('You do not have permission to change user permissions', 'error');
      return;
    }

    const updatedUser = {
      ...userData,
      role: 'custom'
    };

    updateUser(selectedUser.id, updatedUser);
    showNotification('Permissions updated successfully', 'success');
    setActiveTab('list');
    setSelectedUser(null);
  };

  const handleDelete = () => {
    if (!checkPermission('users', 'delete')) {
      showNotification('You do not have permission to delete users', 'error');
      return;
    }

    if (selectedUser.id === 1) {
      showNotification('Cannot delete admin user', 'error');
      setShowDeleteConfirm(false);
      return;
    }

    deleteUser(selectedUser.id);
    setShowDeleteConfirm(false);
    setSelectedUser(null);
    showNotification('User deleted successfully', 'success');
  };

  const handleToggleStatus = (user) => {
    if (user.id === 1) {
      showNotification('Cannot deactivate admin user', 'error');
      return;
    }

    updateUser(user.id, { ...user, active: !user.active });
    showNotification(`User ${user.active ? 'deactivated' : 'activated'} successfully`, 'success');
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredUsers.map(u => ({
        'Username': u.username,
        'Name': u.name,
        'Email': u.email || '-',
        'Phone': u.phone || '-',
        'Role': u.role,
        'Status': u.active ? 'Active' : 'Inactive'
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    XLSX.writeFile(workbook, `users_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel file downloaded successfully', 'success');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Users Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Total Users: ${totalUsers}`, 14, 42);
    
    const tableColumn = ['Username', 'Name', 'Role', 'Status'];
    const tableRows = [];
    
    filteredUsers.slice(0, 50).forEach(u => {
      const row = [
        u.username,
        u.name,
        u.role,
        u.active ? 'Active' : 'Inactive'
      ];
      tableRows.push(row);
    });
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save(`users_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF file downloaded successfully', 'success');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('users', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view users.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header user={user} time={formatTime(currentTime)} />
        
        <div className="content">
          {notification.show && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
            </div>
          )}

          <div className="page-header">
            <h1>User Management</h1>
            <div className="header-actions">
              {checkPermission('users', 'add') && (
                <button className="btn-primary" onClick={handleAddNew}>
                  + Add User
                </button>
              )}
              <button className="btn-secondary" onClick={handleExportExcel}>
                📊 Export Excel
              </button>
              <button className="btn-secondary" onClick={handleExportPDF}>
                📄 Export PDF
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>Total Users</h3>
                <p className="stat-value">{totalUsers}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>Active</h3>
                <p className="stat-value success">{activeUsers}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-info">
                <h3>Inactive</h3>
                <p className="stat-value danger">{inactiveUsers}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👑</div>
              <div className="stat-info">
                <h3>Admins</h3>
                <p className="stat-value">{adminUsers}</p>
              </div>
            </div>
          </div>

          <div className="users-tabs">
            <button 
              className={`tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Users List
            </button>
            {(activeTab === 'add' || activeTab === 'edit') && (
              <button className="tab active">
                {activeTab === 'add' ? 'Add User' : 'Edit User'}
              </button>
            )}
            {activeTab === 'permissions' && (
              <button className="tab active">
                Permissions - {selectedUser?.name}
              </button>
            )}
          </div>

          {activeTab === 'list' && (
            <div className="card">
              <div className="card-header">
                <h2>Users List</h2>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.name}</td>
                      <td>{u.email || '-'}</td>
                      <td>{u.phone || '-'}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${u.active ? 'active' : 'inactive'}`}>
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {checkPermission('users', 'edit') && u.id !== 1 && (
                          <button 
                            className="btn-icon" 
                            onClick={() => handleToggleStatus(u)}
                            title={u.active ? 'Deactivate' : 'Activate'}
                          >
                            {u.active ? '🔴' : '🟢'}
                          </button>
                        )}
                        {checkPermission('users', 'edit') && (
                          <button 
                            className="btn-icon" 
                            onClick={() => handleEdit(u)}
                            title="Edit"
                          >✏️</button>
                        )}
                        {checkPermission('users', 'permissions') && (
                          <button 
                            className="btn-icon" 
                            onClick={() => handlePermissions(u)}
                            title="Permissions"
                          >🔑</button>
                        )}
                        {checkPermission('users', 'delete') && u.id !== 1 && (
                          <button 
                            className="btn-icon" 
                            onClick={() => {
                              setSelectedUser(u);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete"
                          >🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(activeTab === 'add' || activeTab === 'edit') && (
            <div className="card">
              <div className="card-header">
                <h2>{activeTab === 'add' ? 'Add New User' : 'Edit User'}</h2>
              </div>

              <div className="form-container">
                <div className="form-section">
                  <h3>User Information</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Username *</label>
                      <input
                        type="text"
                        name="username"
                        value={userData.username}
                        onChange={handleInputChange}
                        placeholder="Enter username"
                        className="form-input"
                        disabled={activeTab === 'edit' && userData.id === 1}
                      />
                      {activeTab === 'edit' && (
                        <small className="help-text">Change username if needed</small>
                      )}
                    </div>

                    <div className="form-group">
                      <label>
                        {activeTab === 'add' ? 'Password *' : 'New Password'}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={userData.password}
                        onChange={handleInputChange}
                        placeholder={activeTab === 'add' ? 'Enter password' : 'Enter new password (optional)'}
                        className="form-input"
                      />
                      {activeTab === 'edit' && (
                        <small className="help-text">Leave blank to keep current password</small>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={userData.name}
                        onChange={handleInputChange}
                        placeholder="Enter full name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleInputChange}
                        placeholder="Enter email"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={userData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter phone number"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Role</label>
                      <select
                        name="role"
                        value={userData.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="form-select"
                        disabled={userData.id === 1}
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {userData.id !== 1 && (
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="active"
                          checked={userData.active}
                          onChange={handleInputChange}
                        />
                        Active Account
                      </label>
                    </div>
                  )}
                </div>

                {userData.role === 'custom' && (
                  <div className="form-section">
                    <h3>Custom Permissions</h3>
                    <p>After creating the user, you can configure detailed permissions in the Permissions tab.</p>
                    <p className="help-text">Click the 🔑 icon next to the user to set custom permissions.</p>
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setActiveTab('list')}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleSave}
                  >
                    {activeTab === 'add' ? 'Create User' : 'Update User'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && selectedUser && (
            <div className="card">
              <div className="card-header">
                <h2>Permissions - {selectedUser.name}</h2>
                <button 
                  className="btn-secondary"
                  onClick={() => setActiveTab('list')}
                >
                  ← Back
                </button>
              </div>

              <div className="permissions-container">
                <div className="role-info">
                  <p><strong>Current Role:</strong> {selectedUser.role}</p>
                  <p><strong>Username:</strong> {selectedUser.username}</p>
                  <p className="help-text">Changing any permission below will automatically set role to "Custom"</p>
                </div>

                <div className="permissions-table-wrapper">
                  <table className="permissions-table">
                    <thead>
                      <tr>
                        <th>Module</th>
                        <th>View</th>
                        <th>Add</th>
                        <th>Edit</th>
                        <th>Delete</th>
                        <th>Other</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(module => (
                        <tr key={module.id}>
                          <td><strong>{module.name}</strong></td>
                          {module.actions.map(action => (
                            <td key={action}>
                              {action !== 'permissions' && action !== 'export' && action !== 'print' ? (
                                <input
                                  type="checkbox"
                                  checked={userData.permissions[module.id]?.[action] || false}
                                  onChange={(e) => handlePermissionChange(module.id, action, e.target.checked)}
                                  disabled={!checkPermission('users', 'permissions') || selectedUser.id === 1}
                                />
                              ) : action === 'export' && module.id === 'reports' ? (
                                <>
                                  <input
                                    type="checkbox"
                                    checked={userData.permissions[module.id]?.export || false}
                                    onChange={(e) => handlePermissionChange(module.id, 'export', e.target.checked)}
                                    disabled={!checkPermission('users', 'permissions') || selectedUser.id === 1}
                                  /> Export
                                </>
                              ) : action === 'print' && module.id === 'reports' ? (
                                <>
                                  <input
                                    type="checkbox"
                                    checked={userData.permissions[module.id]?.print || false}
                                    onChange={(e) => handlePermissionChange(module.id, 'print', e.target.checked)}
                                    disabled={!checkPermission('users', 'permissions') || selectedUser.id === 1}
                                  /> Print
                                </>
                              ) : action === 'permissions' && module.id === 'users' ? (
                                <>
                                  <input
                                    type="checkbox"
                                    checked={userData.permissions[module.id]?.permissions || false}
                                    onChange={(e) => handlePermissionChange(module.id, 'permissions', e.target.checked)}
                                    disabled={!checkPermission('users', 'permissions') || selectedUser.id === 1}
                                  /> Manage Permissions
                                </>
                              ) : null}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-primary"
                    onClick={handleSavePermissions}
                    disabled={!checkPermission('users', 'permissions') || selectedUser.id === 1}
                  >
                    Save Permissions (Role will be set to Custom)
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="modal">
              <div className="modal-content small">
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete user <strong>{selectedUser?.name}</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
                <div className="modal-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;