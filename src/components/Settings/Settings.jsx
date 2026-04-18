import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
// import './App.css';

const Settings = () => {
  const { 
    user, 
    updateUser,
    checkPermission,
    companySettings,
    updateCompanySettings,
    users,
    medicines,
    suppliers,
    customers,
    purchases,
    sales,
    expenses,
    payments
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('company');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // ===== Backup Selection State =====
  const [backupSelection, setBackupSelection] = useState({
    users: true,
    medicines: true,
    suppliers: true,
    customers: true,
    purchases: true,
    sales: true,
    expenses: true,
    payments: true,
    companySettings: true
  });

  // ===== Restore Selection State =====
  const [restoreSelection, setRestoreSelection] = useState({
    users: true,
    medicines: true,
    suppliers: true,
    customers: true,
    purchases: true,
    sales: true,
    expenses: true,
    payments: true,
    companySettings: true
  });

  // ===== Delete Selection State =====
  const [deleteSelection, setDeleteSelection] = useState({
    users: false,
    medicines: false,
    suppliers: false,
    customers: false,
    purchases: false,
    sales: false,
    expenses: false,
    payments: false,
    companySettings: false
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  
  // Company settings form
  const [companyData, setCompanyData] = useState({
    name: companySettings?.name || 'Logixify Labs',
    address: companySettings?.address || 'Nishtar Medical University, Nishtar Rd, Gillani Colony, Multan, 66000, Pakistan',
    phone: companySettings?.phone || '0303 8275195',
    mobile: companySettings?.mobile || '0313 5151043',
    email: companySettings?.email || 'info@logixify.com',
    website: companySettings?.website || 'www.logixify.com',
    gstNo: companySettings?.gstNo || '',
    panNo: companySettings?.panNo || '',
    currency: companySettings?.currency || 'Rs.',
    currencySymbol: companySettings?.currencySymbol || '₨',
    dateFormat: companySettings?.dateFormat || 'YYYY.MM.DD',
    timeFormat: companySettings?.timeFormat || '12h',
    taxRate: companySettings?.taxRate || 17,
    taxName: companySettings?.taxName || 'GST',
    lowStockAlert: companySettings?.lowStockAlert || 10,
    enableExpiryAlert: companySettings?.enableExpiryAlert || true,
    enableNegativeStock: companySettings?.enableNegativeStock || true,
    enableBackup: companySettings?.enableBackup || true,
    backupFrequency: companySettings?.backupFrequency || 'daily',
    invoicePrefix: companySettings?.invoicePrefix || 'INV',
    invoiceStartingNumber: companySettings?.invoiceStartingNumber || 1001,
    receiptPrefix: companySettings?.receiptPrefix || 'RCP',
    receiptStartingNumber: companySettings?.receiptStartingNumber || 1001,
    defaultPaymentTerms: companySettings?.defaultPaymentTerms || 30,
    defaultDiscount: companySettings?.defaultDiscount || 0,
    footerText: companySettings?.footerText || 'Thank you for your business!',
    termsAndConditions: companySettings?.termsAndConditions || 'Items sold are not returnable.',
    logo: companySettings?.logo || null
  });

  // Profile settings form
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Backup state
  const [backupData, setBackupData] = useState({
    lastBackup: localStorage.getItem('lastBackup') || 'Never',
    backupSize: '0 MB',
    autoBackup: companySettings?.enableBackup || true,
    backupFrequency: companySettings?.backupFrequency || 'daily'
  });

  // System stats
  const [systemStats, setSystemStats] = useState({
    totalUsers: users.length,
    totalMedicines: medicines.length,
    totalSuppliers: suppliers.length,
    totalCustomers: customers.filter(c => c.id !== 1).length,
    totalPurchases: purchases.length,
    totalSales: sales.length,
    totalExpenses: expenses.length,
    totalPayments: payments.length,
    databaseSize: '2.3 MB',
    lastUpdated: new Date().toLocaleDateString(),
    version: '2.0.0'
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Update system stats when data changes
    setSystemStats({
      totalUsers: users.length,
      totalMedicines: medicines.length,
      totalSuppliers: suppliers.length,
      totalCustomers: customers.filter(c => c.id !== 1).length,
      totalPurchases: purchases.length,
      totalSales: sales.length,
      totalExpenses: expenses.length,
      totalPayments: payments.length,
      databaseSize: calculateStorageSize(),
      lastUpdated: new Date().toLocaleDateString(),
      version: '2.0.0'
    });
  }, [users, medicines, suppliers, customers, purchases, sales, expenses, payments]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const calculateStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // Approximate bytes
      }
    }
    return (total / 1024 / 1024).toFixed(2) + ' MB';
  };

  // ===== PERMISSION CHECKS =====
  const isAdmin = user?.role === 'admin';
  const canEditCompany = isAdmin && checkPermission('settings', 'edit');
  const canEditBackup = isAdmin && checkPermission('settings', 'edit');
  const canEditSystem = isAdmin && checkPermission('settings', 'view');

  // ===== COMPANY SETTINGS =====
  const handleCompanyInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompanyData({
      ...companyData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveCompany = () => {
    if (!isAdmin) {
      showNotification('Only admin can change company settings', 'error');
      return;
    }

    setIsSaving(true);
    
    if (!companyData.name) {
      showNotification('Company name is required', 'error');
      setIsSaving(false);
      return;
    }

    if (!companyData.email || !companyData.email.includes('@')) {
      showNotification('Valid email is required', 'error');
      setIsSaving(false);
      return;
    }

    updateCompanySettings(companyData);
    localStorage.setItem('companySettings', JSON.stringify(companyData));
    
    setTimeout(() => {
      setIsSaving(false);
      showNotification('Company settings saved successfully', 'success');
    }, 500);
  };

  // ===== PROFILE SETTINGS =====
  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };

  const handleSaveProfile = () => {
    setIsSaving(true);

    if (!profileData.name) {
      showNotification('Name is required', 'error');
      setIsSaving(false);
      return;
    }

    if (profileData.newPassword) {
      if (profileData.newPassword !== profileData.confirmPassword) {
        showNotification('Passwords do not match', 'error');
        setIsSaving(false);
        return;
      }
      if (profileData.newPassword.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        setIsSaving(false);
        return;
      }
    }

    updateUser(user.id, {
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      ...(profileData.newPassword ? { password: profileData.newPassword } : {})
    });

    setTimeout(() => {
      setIsSaving(false);
      setProfileData({
        ...profileData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      showNotification('Profile updated successfully', 'success');
    }, 500);
  };

  // ===== BACKUP FUNCTIONS =====
  const handleBackupSelection = (type) => {
    setBackupSelection({
      ...backupSelection,
      [type]: !backupSelection[type]
    });
  };

  const handleSelectAllBackup = () => {
    const allSelected = Object.values(backupSelection).every(v => v === true);
    const newSelection = {};
    Object.keys(backupSelection).forEach(key => {
      newSelection[key] = !allSelected;
    });
    setBackupSelection(newSelection);
  };

  const handleCreateBackup = () => {
    if (!isAdmin) {
      showNotification('Only admin can create backups', 'error');
      return;
    }

    try {
      const backup = {};
      
      // Add selected data to backup
      if (backupSelection.companySettings) {
        backup.companySettings = companyData;
      }
      if (backupSelection.users) {
        backup.users = JSON.parse(localStorage.getItem('users') || '[]');
      }
      if (backupSelection.medicines) {
        backup.medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
      }
      if (backupSelection.suppliers) {
        backup.suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
      }
      if (backupSelection.customers) {
        backup.customers = JSON.parse(localStorage.getItem('customers') || '[]');
      }
      if (backupSelection.purchases) {
        backup.purchases = JSON.parse(localStorage.getItem('purchases') || '[]');
      }
      if (backupSelection.sales) {
        backup.sales = JSON.parse(localStorage.getItem('sales') || '[]');
      }
      if (backupSelection.expenses) {
        backup.expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      }
      if (backupSelection.payments) {
        backup.payments = JSON.parse(localStorage.getItem('payments') || '[]');
      }

      backup.backupDate = new Date().toISOString();
      backup.version = systemStats.version;
      backup.selectedTypes = Object.keys(backupSelection).filter(key => backupSelection[key]);

      const backupString = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      const selectedTypes = backup.selectedTypes.join('_');
      a.download = `backup_${selectedTypes}_${new Date().toISOString().split('T')[0]}.json`;
      
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = new Date().toLocaleString();
      setBackupData({
        ...backupData,
        lastBackup: now
      });
      localStorage.setItem('lastBackup', now);

      showNotification(`Backup created successfully! (${backup.selectedTypes.length} sections)`, 'success');
    } catch (error) {
      showNotification('Error creating backup', 'error');
      console.error('Backup error:', error);
    }
  };

  // ===== RESTORE FUNCTIONS =====
  const handleRestoreSelection = (type) => {
    setRestoreSelection({
      ...restoreSelection,
      [type]: !restoreSelection[type]
    });
  };

  const handleSelectAllRestore = () => {
    const allSelected = Object.values(restoreSelection).every(v => v === true);
    const newSelection = {};
    Object.keys(restoreSelection).forEach(key => {
      newSelection[key] = !allSelected;
    });
    setRestoreSelection(newSelection);
  };

  const handleRestoreBackup = (e) => {
    if (!isAdmin) {
      showNotification('Only admin can restore backups', 'error');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        
        if (!backup.version || !backup.backupDate) {
          showNotification('Invalid backup file', 'error');
          return;
        }

        let restoredCount = 0;

        // Restore selected data
        if (restoreSelection.companySettings && backup.companySettings) {
          localStorage.setItem('companySettings', JSON.stringify(backup.companySettings));
          updateCompanySettings(backup.companySettings);
          restoredCount++;
        }
        if (restoreSelection.users && backup.users) {
          localStorage.setItem('users', JSON.stringify(backup.users));
          restoredCount++;
        }
        if (restoreSelection.medicines && backup.medicines) {
          localStorage.setItem('medicines', JSON.stringify(backup.medicines));
          restoredCount++;
        }
        if (restoreSelection.suppliers && backup.suppliers) {
          localStorage.setItem('suppliers', JSON.stringify(backup.suppliers));
          restoredCount++;
        }
        if (restoreSelection.customers && backup.customers) {
          localStorage.setItem('customers', JSON.stringify(backup.customers));
          restoredCount++;
        }
        if (restoreSelection.purchases && backup.purchases) {
          localStorage.setItem('purchases', JSON.stringify(backup.purchases));
          restoredCount++;
        }
        if (restoreSelection.sales && backup.sales) {
          localStorage.setItem('sales', JSON.stringify(backup.sales));
          restoredCount++;
        }
        if (restoreSelection.expenses && backup.expenses) {
          localStorage.setItem('expenses', JSON.stringify(backup.expenses));
          restoredCount++;
        }
        if (restoreSelection.payments && backup.payments) {
          localStorage.setItem('payments', JSON.stringify(backup.payments));
          restoredCount++;
        }

        showNotification(`${restoredCount} sections restored successfully! Refreshing page...`, 'success');
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        showNotification('Error restoring backup', 'error');
        console.error('Restore error:', error);
      }
    };
    reader.readAsText(file);
  };

  // ===== DELETE FUNCTIONS =====
  const handleDeleteSelection = (type) => {
    setDeleteSelection({
      ...deleteSelection,
      [type]: !deleteSelection[type]
    });
  };

  const handleSelectAllDelete = () => {
    const allSelected = Object.values(deleteSelection).every(v => v === true);
    const newSelection = {};
    Object.keys(deleteSelection).forEach(key => {
      newSelection[key] = !allSelected;
    });
    setDeleteSelection(newSelection);
    setDeleteAll(!allSelected);
  };

  const handleDeleteData = () => {
    if (!isAdmin) {
      showNotification('Only admin can delete data', 'error');
      return;
    }

    const selectedCount = Object.values(deleteSelection).filter(v => v === true).length;
    
    if (selectedCount === 0) {
      showNotification('Please select at least one data type to delete', 'error');
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    let deletedCount = 0;

    if (deleteSelection.users) {
      // Keep at least admin user
      const adminUser = users.find(u => u.id === 1);
      localStorage.setItem('users', JSON.stringify([adminUser]));
      deletedCount++;
    }
    if (deleteSelection.medicines) {
      localStorage.setItem('medicines', JSON.stringify([]));
      deletedCount++;
    }
    if (deleteSelection.suppliers) {
      localStorage.setItem('suppliers', JSON.stringify([]));
      deletedCount++;
    }
    if (deleteSelection.customers) {
      // Keep cash customer
      const cashCustomer = customers.find(c => c.id === 1);
      localStorage.setItem('customers', JSON.stringify([cashCustomer]));
      deletedCount++;
    }
    if (deleteSelection.purchases) {
      localStorage.setItem('purchases', JSON.stringify([]));
      deletedCount++;
    }
    if (deleteSelection.sales) {
      localStorage.setItem('sales', JSON.stringify([]));
      deletedCount++;
    }
    if (deleteSelection.expenses) {
      localStorage.setItem('expenses', JSON.stringify([]));
      deletedCount++;
    }
    if (deleteSelection.payments) {
      localStorage.setItem('payments', JSON.stringify([]));
      deletedCount++;
    }
    if (deleteSelection.companySettings) {
      // Reset to defaults
      const defaultSettings = {
        name: 'Logixify Labs',
        address: 'Nishtar Medical University, Nishtar Rd, Gillani Colony, Multan, 66000, Pakistan',
        phone: '0303 8275195',
        mobile: '0313 5151043',
        email: 'info@logixify.com',
        currency: 'Rs.',
        currencySymbol: '₨'
      };
      localStorage.setItem('companySettings', JSON.stringify(defaultSettings));
      updateCompanySettings(defaultSettings);
      deletedCount++;
    }

    setShowDeleteConfirm(false);
    
    // Reset selections
    setDeleteSelection({
      users: false,
      medicines: false,
      suppliers: false,
      customers: false,
      purchases: false,
      sales: false,
      expenses: false,
      payments: false,
      companySettings: false
    });
    setDeleteAll(false);

    showNotification(`${deletedCount} sections cleared successfully! Refreshing page...`, 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('settings', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view settings.</p>
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
          {/* Notification */}
          {notification.show && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
            </div>
          )}

          {/* Header */}
          <div className="page-header">
            <h1>Settings</h1>
          </div>

          {/* Settings Tabs */}
          <div className="settings-tabs">
            <button 
              className={`tab ${activeTab === 'company' ? 'active' : ''}`}
              onClick={() => setActiveTab('company')}
            >
              🏢 Company
              {!isAdmin && activeTab === 'company' && <span className="badge badge-warning">View Only</span>}
            </button>
            <button 
              className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
            <button 
              className={`tab ${activeTab === 'backup' ? 'active' : ''}`}
              onClick={() => setActiveTab('backup')}
            >
              💾 Backup
              {!isAdmin && activeTab === 'backup' && <span className="badge badge-warning">View Only</span>}
            </button>
            <button 
              className={`tab ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              ⚙️ System
              {!isAdmin && activeTab === 'system' && <span className="badge badge-warning">View Only</span>}
            </button>
          </div>

          {/* Company Settings - Only Admin can edit */}
          {activeTab === 'company' && (
            <div className="card">
              <div className="card-header">
                <h2>Company Information</h2>
                {!isAdmin && <span className="badge badge-warning">View Only Mode</span>}
                {canEditCompany && (
                  <button 
                    className="btn-primary"
                    onClick={handleSaveCompany}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>

              <div className="settings-form">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Company Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={companyData.name}
                        onChange={handleCompanyInputChange}
                        placeholder="Enter company name"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                      {!canEditCompany && <small className="help-text">Only admin can edit</small>}
                    </div>

                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={companyData.email}
                        onChange={handleCompanyInputChange}
                        placeholder="Enter email"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={companyData.address}
                      onChange={handleCompanyInputChange}
                      placeholder="Enter company address"
                      rows="3"
                      className="form-textarea"
                      disabled={!canEditCompany}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={companyData.phone}
                        onChange={handleCompanyInputChange}
                        placeholder="Enter phone number"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Mobile</label>
                      <input
                        type="text"
                        name="mobile"
                        value={companyData.mobile}
                        onChange={handleCompanyInputChange}
                        placeholder="Enter mobile number"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Website</label>
                      <input
                        type="text"
                        name="website"
                        value={companyData.website}
                        onChange={handleCompanyInputChange}
                        placeholder="Enter website"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>GST No</label>
                      <input
                        type="text"
                        name="gstNo"
                        value={companyData.gstNo}
                        onChange={handleCompanyInputChange}
                        placeholder="Enter GST number"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>PAN No</label>
                      <input
                        type="text"
                        name="panNo"
                        value={companyData.panNo}
                        onChange={handleCompanyInputChange}
                        placeholder="Enter PAN number"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Currency & Format</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Currency Code</label>
                      <input
                        type="text"
                        name="currency"
                        value={companyData.currency}
                        onChange={handleCompanyInputChange}
                        placeholder="e.g., Rs., $, €"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Currency Symbol</label>
                      <input
                        type="text"
                        name="currencySymbol"
                        value={companyData.currencySymbol}
                        onChange={handleCompanyInputChange}
                        placeholder="e.g., ₨, $, €"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Date Format</label>
                      <select
                        name="dateFormat"
                        value={companyData.dateFormat}
                        onChange={handleCompanyInputChange}
                        className="form-select"
                        disabled={!canEditCompany}
                      >
                        <option value="YYYY.MM.DD">2025.03.15</option>
                        <option value="DD/MM/YYYY">15/03/2025</option>
                        <option value="MM/DD/YYYY">03/15/2025</option>
                        <option value="YYYY-MM-DD">2025-03-15</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Time Format</label>
                      <select
                        name="timeFormat"
                        value={companyData.timeFormat}
                        onChange={handleCompanyInputChange}
                        className="form-select"
                        disabled={!canEditCompany}
                      >
                        <option value="12h">12 Hour (03:30 PM)</option>
                        <option value="24h">24 Hour (15:30)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Tax & Inventory</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tax Name</label>
                      <input
                        type="text"
                        name="taxName"
                        value={companyData.taxName}
                        onChange={handleCompanyInputChange}
                        placeholder="e.g., GST, VAT"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Tax Rate (%)</label>
                      <input
                        type="number"
                        name="taxRate"
                        value={companyData.taxRate}
                        onChange={handleCompanyInputChange}
                        step="0.1"
                        min="0"
                        max="100"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Low Stock Alert (Units)</label>
                      <input
                        type="number"
                        name="lowStockAlert"
                        value={companyData.lowStockAlert}
                        onChange={handleCompanyInputChange}
                        min="1"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="enableExpiryAlert"
                          checked={companyData.enableExpiryAlert}
                          onChange={handleCompanyInputChange}
                          disabled={!canEditCompany}
                        />
                        Enable Expiry Alerts
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="enableNegativeStock"
                          checked={companyData.enableNegativeStock}
                          onChange={handleCompanyInputChange}
                          disabled={!canEditCompany}
                        />
                        Allow Negative Stock
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Invoice Settings</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Invoice Prefix</label>
                      <input
                        type="text"
                        name="invoicePrefix"
                        value={companyData.invoicePrefix}
                        onChange={handleCompanyInputChange}
                        placeholder="e.g., INV"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Starting Number</label>
                      <input
                        type="number"
                        name="invoiceStartingNumber"
                        value={companyData.invoiceStartingNumber}
                        onChange={handleCompanyInputChange}
                        min="1"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Receipt Prefix</label>
                      <input
                        type="text"
                        name="receiptPrefix"
                        value={companyData.receiptPrefix}
                        onChange={handleCompanyInputChange}
                        placeholder="e.g., RCP"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Receipt Starting No</label>
                      <input
                        type="number"
                        name="receiptStartingNumber"
                        value={companyData.receiptStartingNumber}
                        onChange={handleCompanyInputChange}
                        min="1"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Default Payment Terms (Days)</label>
                      <input
                        type="number"
                        name="defaultPaymentTerms"
                        value={companyData.defaultPaymentTerms}
                        onChange={handleCompanyInputChange}
                        min="0"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>

                    <div className="form-group">
                      <label>Default Discount (%)</label>
                      <input
                        type="number"
                        name="defaultDiscount"
                        value={companyData.defaultDiscount}
                        onChange={handleCompanyInputChange}
                        step="0.1"
                        min="0"
                        max="100"
                        className="form-input"
                        disabled={!canEditCompany}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Footer & Terms</h3>
                  <div className="form-group">
                    <label>Footer Text</label>
                    <input
                      type="text"
                      name="footerText"
                      value={companyData.footerText}
                      onChange={handleCompanyInputChange}
                      placeholder="Footer text for invoices"
                      className="form-input"
                      disabled={!canEditCompany}
                    />
                  </div>

                  <div className="form-group">
                    <label>Terms & Conditions</label>
                    <textarea
                      name="termsAndConditions"
                      value={companyData.termsAndConditions}
                      onChange={handleCompanyInputChange}
                      placeholder="Terms and conditions for invoices"
                      rows="4"
                      className="form-textarea"
                      disabled={!canEditCompany}
                    />
                  </div>
                </div>

                {!canEditCompany && (
                  <div className="alert-card info">
                    <p>You are in view-only mode. Only administrators can edit company settings.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Settings - Anyone can edit their own profile */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h2>My Profile</h2>
              </div>

              <div className="settings-form">
                <div className="form-section">
                  <h3>Personal Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileInputChange}
                        placeholder="Enter your name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileInputChange}
                        placeholder="Enter your email"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileInputChange}
                        placeholder="Enter your phone"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Change Password</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={profileData.currentPassword}
                        onChange={handleProfileInputChange}
                        placeholder="Enter current password"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={profileData.newPassword}
                        onChange={handleProfileInputChange}
                        placeholder="Enter new password"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={profileData.confirmPassword}
                        onChange={handleProfileInputChange}
                        placeholder="Confirm new password"
                        className="form-input"
                      />
                    </div>
                  </div>
                  <p className="help-text">Password must be at least 6 characters long</p>
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-primary"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backup Settings - Only Admin can backup/restore */}
          {activeTab === 'backup' && (
            <div className="card">
              <div className="card-header">
                <h2>Backup & Restore</h2>
                {!isAdmin && <span className="badge badge-warning">View Only Mode</span>}
              </div>

              <div className="backup-container">
                <div className="backup-stats">
                  <div className="stat-item">
                    <label>Last Backup</label>
                    <span className="stat-value">{backupData.lastBackup}</span>
                  </div>
                  <div className="stat-item">
                    <label>Storage Used</label>
                    <span className="stat-value">{systemStats.databaseSize}</span>
                  </div>
                  <div className="stat-item">
                    <label>Total Records</label>
                    <span className="stat-value">
                      {systemStats.totalMedicines + systemStats.totalSuppliers + 
                       systemStats.totalCustomers + systemStats.totalPurchases + 
                       systemStats.totalSales + systemStats.totalExpenses + 
                       systemStats.totalPayments + systemStats.totalUsers}
                    </span>
                  </div>
                </div>

                {isAdmin ? (
                  <>
                    {/* Backup Selection */}
                    <div className="form-section">
                      <div className="card-header">
                        <h3>Select Data to Backup</h3>
                        <button className="btn-small" onClick={handleSelectAllBackup}>
                          {Object.values(backupSelection).every(v => v) ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="backup-selection-grid">
                        {Object.entries(backupSelection).map(([key, value]) => (
                          <label key={key} className="checkbox-group">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={() => handleBackupSelection(key)}
                            />
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="backup-actions">
                      <div className="action-card">
                        <h3>Create Backup</h3>
                        <p>Download selected data as backup file</p>
                        <button 
                          className="btn-primary"
                          onClick={handleCreateBackup}
                        >
                          📥 Download Selected Backup
                        </button>
                      </div>

                      <div className="action-card">
                        <h3>Restore Backup</h3>
                        <p>Restore selected data from backup file</p>
                        
                        <div className="form-section" style={{marginBottom: '15px'}}>
                          <div className="card-header">
                            <h4>Select Data to Restore</h4>
                            <button className="btn-small" onClick={handleSelectAllRestore}>
                              {Object.values(restoreSelection).every(v => v) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="backup-selection-grid">
                            {Object.entries(restoreSelection).map(([key, value]) => (
                              <label key={key} className="checkbox-group">
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={() => handleRestoreSelection(key)}
                                />
                                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                              </label>
                            ))}
                          </div>
                        </div>

                        <input
                          type="file"
                          accept=".json"
                          onChange={handleRestoreBackup}
                          className="file-input"
                          id="restore-file"
                        />
                        <label htmlFor="restore-file" className="btn-secondary">
                          📤 Restore Selected Data
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="alert-card info">
                    <p>You are in view-only mode. Only administrators can create or restore backups.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Information - View only for non-admin */}
          {activeTab === 'system' && (
            <div className="card">
              <div className="card-header">
                <h2>System Information</h2>
                {!isAdmin && <span className="badge badge-warning">View Only</span>}
              </div>

              <div className="system-info">
                <div className="info-grid">
                  <div className="info-group">
                    <h3>Database Statistics</h3>
                    <div className="info-item">
                      <span>Total Medicines:</span>
                      <strong>{systemStats.totalMedicines}</strong>
                    </div>
                    <div className="info-item">
                      <span>Total Suppliers:</span>
                      <strong>{systemStats.totalSuppliers}</strong>
                    </div>
                    <div className="info-item">
                      <span>Total Customers:</span>
                      <strong>{systemStats.totalCustomers}</strong>
                    </div>
                    <div className="info-item">
                      <span>Total Purchases:</span>
                      <strong>{systemStats.totalPurchases}</strong>
                    </div>
                    <div className="info-item">
                      <span>Total Sales:</span>
                      <strong>{systemStats.totalSales}</strong>
                    </div>
                    <div className="info-item">
                      <span>Total Expenses:</span>
                      <strong>{systemStats.totalExpenses}</strong>
                    </div>
                    <div className="info-item">
                      <span>Total Payments:</span>
                      <strong>{systemStats.totalPayments}</strong>
                    </div>
                    <div className="info-item">
                      <span>Total Users:</span>
                      <strong>{systemStats.totalUsers}</strong>
                    </div>
                  </div>

                  <div className="info-group">
                    <h3>System Details</h3>
                    <div className="info-item">
                      <span>Version:</span>
                      <strong>{systemStats.version}</strong>
                    </div>
                    <div className="info-item">
                      <span>Last Updated:</span>
                      <strong>{systemStats.lastUpdated}</strong>
                    </div>
                    <div className="info-item">
                      <span>Database Size:</span>
                      <strong>{systemStats.databaseSize}</strong>
                    </div>
                    <div className="info-item">
                      <span>Browser:</span>
                      <strong>{navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                               navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                               navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}</strong>
                    </div>
                    <div className="info-item">
                      <span>Screen Resolution:</span>
                      <strong>{window.screen.width} x {window.screen.height}</strong>
                    </div>
                  </div>

                  <div className="info-group">
                    <h3>Storage Usage</h3>
                    <div className="storage-bar-container">
                      <div className="storage-bar">
                        <div 
                          className="storage-fill" 
                          style={{width: `${Math.min(100, parseFloat(systemStats.databaseSize) / 6.5 * 100)}%`}}
                        ></div>
                      </div>
                      <p>{systemStats.databaseSize} used</p>
                    </div>
                  </div>
                </div>

                {/* Delete Section - Only for Admin */}
                {isAdmin && (
                  <div className="danger-zone">
                    <h3>Data Management</h3>
                    
                    <div className="form-section">
                      <div className="card-header">
                        <h4>Select Data to Delete</h4>
                        <button className="btn-small" onClick={handleSelectAllDelete}>
                          {deleteAll ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="backup-selection-grid">
                        {Object.entries(deleteSelection).map(([key, value]) => (
                          <label key={key} className="checkbox-group">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={() => handleDeleteSelection(key)}
                            />
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                            {key === 'users' && <small className="help-text"> (Admin will be kept)</small>}
                            {key === 'customers' && <small className="help-text"> (Cash Customer kept)</small>}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="danger-action">
                      <div>
                        <h4>Clear Selected Data</h4>
                        <p>Permanently delete selected data. This action cannot be undone.</p>
                      </div>
                      <button 
                        className="btn-danger"
                        onClick={handleDeleteData}
                      >
                        🗑️ Delete Selected Data
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-section">
                  <h3>About</h3>
                  <p className="about-text">
                    <strong>Pharmacy Management System</strong><br />
                    Version {systemStats.version}<br />
                    Developed by Logixify Labs<br />
                    © 2025 All rights reserved.<br /><br />
                    This software is designed for pharmacy management including inventory,
                    sales, purchases, expenses, and reporting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="modal">
              <div className="modal-content small">
                <h3>⚠️ Confirm Delete</h3>
                <p>Are you sure you want to delete the selected data?</p>
                <p className="warning-text">This action cannot be undone!</p>
                <div className="selected-items">
                  <strong>Selected:</strong>
                  <ul>
                    {Object.entries(deleteSelection)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <li key={key}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</li>
                      ))}
                  </ul>
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={confirmDelete}
                  >
                    Yes, Delete Selected Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .settings-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .settings-tabs .tab {
          padding: 12px 24px;
          border: none;
          background: var(--white);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
          color: var(--gray-600);
          transition: all 0.2s ease;
          border: 1px solid var(--gray-200);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .settings-tabs .tab:hover {
          background: var(--primary-soft);
          color: var(--primary);
          border-color: var(--primary);
        }

        .settings-tabs .tab.active {
          background: var(--primary);
          color: var(--white);
          border-color: var(--primary);
        }

        .backup-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
          padding: 15px 0;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--gray-50);
          border-radius: var(--radius-md);
          border: 1px solid var(--gray-200);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .checkbox-group:hover {
          background: var(--primary-soft);
          border-color: var(--primary);
        }

        .checkbox-group input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--primary);
        }

        .selected-items {
          background: var(--gray-50);
          padding: 15px;
          border-radius: var(--radius-md);
          margin: 15px 0;
        }

        .selected-items ul {
          margin: 10px 0 0 20px;
          color: var(--danger);
        }

        .alert-card {
          padding: 15px;
          border-radius: var(--radius-md);
          margin: 15px 0;
        }

        .alert-card.info {
          background: var(--info-soft);
          border-left: 4px solid var(--info);
          color: var(--info-dark);
        }
      `}</style>
    </div>
  );
};

export default Settings;