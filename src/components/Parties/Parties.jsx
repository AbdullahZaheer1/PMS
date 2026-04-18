import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../../App.css';

const Parties = () => {
  const { 
    user, 
    suppliers, 
    customers, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    getSupplierById,
    getCustomerById,
    checkPermission,
    companySettings,
    getPartyTransactions
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('suppliers'); // suppliers, customers
  const [activeView, setActiveView] = useState('list'); // list, add, edit, detail
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [transactions, setTransactions] = useState([]);
  
  // Party form state
  const [partyData, setPartyData] = useState({
    id: null,
    name: '',
    type: 'business', // business, individual
    company: '',
    contactPerson: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNo: '',
    panNo: '',
    openingBalance: 0,
    balance: 0,
    creditLimit: 0,
    creditDays: 0,
    discount: 0,
    notes: '',
    active: true
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedParty && activeView === 'detail') {
      const partyType = activeTab === 'suppliers' ? 'supplier' : 'customer';
      const trans = getPartyTransactions(selectedParty.id, partyType);
      setTransactions(trans);
    }
  }, [selectedParty, activeView, activeTab, getPartyTransactions]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const formatCurrency = (amount) => {
    return `${companySettings.currency} ${amount.toFixed(2)}`;
  };

  // Get current parties list
  const currentParties = activeTab === 'suppliers' ? suppliers : customers;

  // Filter parties
  const filteredParties = currentParties.filter(party => {
    if (party.id === 1 && activeTab === 'customers') return false; // Hide Owner from list
    
    return (
      party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.phone && party.phone.includes(searchTerm)) ||
      (party.email && party.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (party.gstNo && party.gstNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Calculate totals
  const totalBalance = currentParties.reduce((sum, party) => sum + (party.balance || 0), 0);
  const totalDue = currentParties.filter(party => (party.balance || 0) > 0).length;
  const totalCredit = currentParties.filter(party => (party.balance || 0) < 0).length;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPartyData({
      ...partyData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddNew = () => {
    setPartyData({
      id: null,
      name: '',
      type: 'business',
      company: '',
      contactPerson: '',
      phone: '',
      mobile: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstNo: '',
      panNo: '',
      openingBalance: 0,
      balance: 0,
      creditLimit: 0,
      creditDays: 0,
      discount: 0,
      notes: '',
      active: true
    });
    setActiveView('add');
  };

  const handleEdit = (party) => {
    setPartyData(party);
    setActiveView('edit');
  };

  const handleViewDetail = (party) => {
    setSelectedParty(party);
    setActiveView('detail');
  };

  const handleSave = () => {
    // Validation
    if (!partyData.name) {
      showNotification('Please enter party name', 'error');
      return;
    }

    if (!checkPermission('parties', partyData.id ? 'edit' : 'add')) {
      showNotification(`You do not have permission to ${partyData.id ? 'edit' : 'add'} parties`, 'error');
      return;
    }

    const partyToSave = {
      ...partyData,
      balance: partyData.openingBalance || 0
    };

    if (activeTab === 'suppliers') {
      if (partyData.id) {
        updateSupplier(partyData.id, partyToSave);
        showNotification('Supplier updated successfully', 'success');
      } else {
        addSupplier(partyToSave);
        showNotification('Supplier added successfully', 'success');
      }
    } else {
      if (partyData.id) {
        updateCustomer(partyData.id, partyToSave);
        showNotification('Customer updated successfully', 'success');
      } else {
        addCustomer(partyToSave);
        showNotification('Customer added successfully', 'success');
      }
    }

    setActiveView('list');
  };

  const handleDelete = () => {
    if (!checkPermission('parties', 'delete')) {
      showNotification('You do not have permission to delete parties', 'error');
      return;
    }

    if (activeTab === 'suppliers') {
      deleteSupplier(selectedParty.id);
    } else {
      if (selectedParty.id === 1) {
        showNotification('Cannot delete Owner', 'error');
        setShowDeleteConfirm(false);
        return;
      }
      deleteCustomer(selectedParty.id);
    }

    setShowDeleteConfirm(false);
    setSelectedParty(null);
    setActiveView('list');
    showNotification(`${activeTab === 'suppliers' ? 'Supplier' : 'Customer'} deleted successfully`, 'success');
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredParties.map(p => ({
        'Name': p.name,
        'Contact Person': p.contactPerson || '-',
        'Phone': p.phone || '-',
        'Mobile': p.mobile || '-',
        'Email': p.email || '-',
        'City': p.city || '-',
        'GST No': p.gstNo || '-',
        'Balance': p.balance || 0,
        'Credit Limit': p.creditLimit || 0,
        'Status': p.active ? 'Active' : 'Inactive'
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'suppliers' ? 'Suppliers' : 'Customers');
    XLSX.writeFile(workbook, `${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel file downloaded successfully', 'success');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(activeTab === 'suppliers' ? 'Suppliers Report' : 'Customers Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Total ${activeTab === 'suppliers' ? 'Suppliers' : 'Customers'}: ${filteredParties.length}`, 14, 42);
    doc.text(`Total Balance: ${formatCurrency(totalBalance)}`, 14, 52);
    
    const tableColumn = ['Name', 'Phone', 'Email', 'City', 'Balance', 'Status'];
    const tableRows = [];
    
    filteredParties.slice(0, 50).forEach(p => {
      const row = [
        p.name,
        p.phone || '-',
        p.email || '-',
        p.city || '-',
        formatCurrency(p.balance || 0),
        p.active ? 'Active' : 'Inactive'
      ];
      tableRows.push(row);
    });
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save(`${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF file downloaded successfully', 'success');
  };

  const handlePrintStatement = () => {
    if (!selectedParty) return;

    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedParty.name} - Statement</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .info { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 5px; }
            .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #2563eb; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .total { text-align: right; margin-top: 20px; font-size: 1.2rem; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companySettings.name}</h1>
            <p>${companySettings.address}</p>
            <p>Tel: ${companySettings.phone}</p>
          </div>
          
          <h2>${activeTab === 'suppliers' ? 'Supplier' : 'Customer'} Statement</h2>
          
          <div class="info">
            <div class="info-row">
              <span><strong>Name:</strong> ${selectedParty.name}</span>
              <span><strong>Balance:</strong> ${formatCurrency(selectedParty.balance || 0)}</span>
            </div>
            <div class="info-row">
              <span><strong>Phone:</strong> ${selectedParty.phone || 'N/A'}</span>
              <span><strong>Email:</strong> ${selectedParty.email || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Address:</strong> ${selectedParty.address || 'N/A'}</span>
              <span><strong>GST No:</strong> ${selectedParty.gstNo || 'N/A'}</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Bill No</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td>${t.type}</td>
                  <td>${t.billNo || '-'}</td>
                  <td>${t.type === 'Purchase' || t.type === 'Sale' ? formatCurrency(t.total) : '-'}</td>
                  <td>${t.type === 'Payment' ? formatCurrency(t.payment) : '-'}</td>
                  <td>${formatCurrency(t.balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <strong>Current Balance: ${formatCurrency(selectedParty.balance || 0)}</strong>
          </div>
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Software by Logixify Labs</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('parties', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view parties.</p>
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
            <h1>Parties Management</h1>
            <div className="header-actions">
              {checkPermission('parties', 'add') && (
                <button className="btn-primary" onClick={handleAddNew}>
                  + Add {activeTab === 'suppliers' ? 'Supplier' : 'Customer'}
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

          {/* Tabs */}
          <div className="parties-tabs">
            <button 
              className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('suppliers');
                setActiveView('list');
                setSelectedParty(null);
              }}
            >
              Suppliers ({suppliers.length})
            </button>
            <button 
              className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('customers');
                setActiveView('list');
                setSelectedParty(null);
              }}
            >
              Customers ({customers.length - 1}) {/* Exclude Owner */}
            </button>
          </div>

          {/* Statistics Cards */}
          {activeView === 'list' && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Total {activeTab === 'suppliers' ? 'Suppliers' : 'Customers'}</h3>
                  <p className="stat-value">{filteredParties.length}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>Total Balance</h3>
                  <p className={`stat-value ${totalBalance >= 0 ? 'negative' : 'profit'}`}>
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⚠️</div>
                <div className="stat-info">
                  <h3>With Due</h3>
                  <p className="stat-value negative">{totalDue}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>With Credit</h3>
                  <p className="stat-value profit">{totalCredit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar - Only in list view */}
          {activeView === 'list' && (
            <div className="search-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'suppliers' ? 'suppliers' : 'customers'} by name, phone, email, GST...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          )}

          {/* List View */}
          {activeView === 'list' && (
            <div className="card">
              <div className="card-header">
                <h2>{activeTab === 'suppliers' ? 'Suppliers List' : 'Customers List'}</h2>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>City</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map(party => (
                    <tr key={party.id}>
                      <td><strong>{party.name}</strong></td>
                      <td>{party.contactPerson || '-'}</td>
                      <td>{party.phone || party.mobile || '-'}</td>
                      <td>{party.email || '-'}</td>
                      <td>{party.city || '-'}</td>
                      <td className={party.balance > 0 ? 'text-danger' : party.balance < 0 ? 'text-success' : ''}>
                        {formatCurrency(party.balance || 0)}
                      </td>
                      <td>
                        <span className={`badge ${party.active ? 'badge-success' : 'badge-danger'}`}>
                          {party.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleViewDetail(party)}
                          title="View Details"
                        >👁️</button>
                        {checkPermission('parties', 'edit') && (
                          <button 
                            className="btn-icon" 
                            onClick={() => handleEdit(party)}
                            title="Edit"
                          >✏️</button>
                        )}
                        {checkPermission('parties', 'delete') && party.id !== 1 && (
                          <button 
                            className="btn-icon" 
                            onClick={() => {
                              setSelectedParty(party);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete"
                          >🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredParties.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center">
                        No {activeTab === 'suppliers' ? 'suppliers' : 'customers'} found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Add/Edit Form */}
          {(activeView === 'add' || activeView === 'edit') && (
            <div className="card">
              <div className="card-header">
                <h2>
                  {activeView === 'add' ? 'Add' : 'Edit'} {activeTab === 'suppliers' ? 'Supplier' : 'Customer'}
                </h2>
              </div>

              <div className="form-container">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Party Type</label>
                      <select
                        name="type"
                        value={partyData.type}
                        onChange={handleInputChange}
                      >
                        <option value="business">Business</option>
                        <option value="individual">Individual</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={partyData.name}
                        onChange={handleInputChange}
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Company Name</label>
                      <input
                        type="text"
                        name="company"
                        value={partyData.company}
                        onChange={handleInputChange}
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Contact Person</label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={partyData.contactPerson}
                        onChange={handleInputChange}
                        placeholder="Enter contact person"
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={partyData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Mobile</label>
                      <input
                        type="text"
                        name="mobile"
                        value={partyData.mobile}
                        onChange={handleInputChange}
                        placeholder="Enter mobile number"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={partyData.email}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                      />
                    </div>

                    <div className="form-group">
                      <label>GST No</label>
                      <input
                        type="text"
                        name="gstNo"
                        value={partyData.gstNo}
                        onChange={handleInputChange}
                        placeholder="Enter GST number"
                      />
                    </div>

                    <div className="form-group">
                      <label>PAN No</label>
                      <input
                        type="text"
                        name="panNo"
                        value={partyData.panNo}
                        onChange={handleInputChange}
                        placeholder="Enter PAN number"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Address Information</h3>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={partyData.address}
                      onChange={handleInputChange}
                      placeholder="Enter complete address"
                      rows="2"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        name="city"
                        value={partyData.city}
                        onChange={handleInputChange}
                        placeholder="Enter city"
                      />
                    </div>

                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        name="state"
                        value={partyData.state}
                        onChange={handleInputChange}
                        placeholder="Enter state"
                      />
                    </div>

                    <div className="form-group">
                      <label>Pincode</label>
                      <input
                        type="text"
                        name="pincode"
                        value={partyData.pincode}
                        onChange={handleInputChange}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Financial Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Opening Balance</label>
                      <input
                        type="number"
                        name="openingBalance"
                        value={partyData.openingBalance}
                        onChange={handleInputChange}
                        step="0.01"
                        placeholder="Enter opening balance"
                      />
                    </div>

                    <div className="form-group">
                      <label>Credit Limit</label>
                      <input
                        type="number"
                        name="creditLimit"
                        value={partyData.creditLimit}
                        onChange={handleInputChange}
                        step="0.01"
                        placeholder="Enter credit limit"
                      />
                    </div>

                    <div className="form-group">
                      <label>Credit Days</label>
                      <input
                        type="number"
                        name="creditDays"
                        value={partyData.creditDays}
                        onChange={handleInputChange}
                        placeholder="Enter credit days"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Discount (%)</label>
                      <input
                        type="number"
                        name="discount"
                        value={partyData.discount}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="Enter discount percentage"
                      />
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        name="active"
                        value={partyData.active}
                        onChange={handleInputChange}
                      >
                        <option value={true}>Active</option>
                        <option value={false}>Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={partyData.notes}
                      onChange={handleInputChange}
                      placeholder="Enter any additional notes..."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setActiveView('list')}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={handleSave}
                  >
                    {activeView === 'add' ? 'Save' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detail View */}
          {activeView === 'detail' && selectedParty && (
            <div className="card">
              <div className="card-header">
                <h2>{selectedParty.name} - Details</h2>
                <button 
                  className="btn-secondary"
                  onClick={() => setActiveView('list')}
                >
                  ← Back to List
                </button>
              </div>

              <div className="party-detail">
                <div className="party-info-grid">
                  <div className="party-info-section">
                    <h3>Basic Information</h3>
                    <table className="info-table">
                      <tbody>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{selectedParty.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Type:</strong></td>
                          <td>{selectedParty.type || 'Business'}</td>
                        </tr>
                        <tr>
                          <td><strong>Company:</strong></td>
                          <td>{selectedParty.company || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>Contact Person:</strong></td>
                          <td>{selectedParty.contactPerson || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>Phone:</strong></td>
                          <td>{selectedParty.phone || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>Mobile:</strong></td>
                          <td>{selectedParty.mobile || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{selectedParty.email || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="party-info-section">
                    <h3>Address & Tax</h3>
                    <table className="info-table">
                      <tbody>
                        <tr>
                          <td><strong>Address:</strong></td>
                          <td>{selectedParty.address || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>City:</strong></td>
                          <td>{selectedParty.city || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>State:</strong></td>
                          <td>{selectedParty.state || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>Pincode:</strong></td>
                          <td>{selectedParty.pincode || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>GST No:</strong></td>
                          <td>{selectedParty.gstNo || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>PAN No:</strong></td>
                          <td>{selectedParty.panNo || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="party-info-section">
                    <h3>Financial Information</h3>
                    <table className="info-table">
                      <tbody>
                        <tr>
                          <td><strong>Current Balance:</strong></td>
                          <td className={selectedParty.balance > 0 ? 'text-danger' : selectedParty.balance < 0 ? 'text-success' : ''}>
                            {formatCurrency(selectedParty.balance || 0)}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Opening Balance:</strong></td>
                          <td>{formatCurrency(selectedParty.openingBalance || 0)}</td>
                        </tr>
                        <tr>
                          <td><strong>Credit Limit:</strong></td>
                          <td>{formatCurrency(selectedParty.creditLimit || 0)}</td>
                        </tr>
                        <tr>
                          <td><strong>Credit Days:</strong></td>
                          <td>{selectedParty.creditDays || 0} days</td>
                        </tr>
                        <tr>
                          <td><strong>Discount:</strong></td>
                          <td>{selectedParty.discount || 0}%</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${selectedParty.active ? 'badge-success' : 'badge-danger'}`}>
                              {selectedParty.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedParty.notes && (
                  <div className="party-notes">
                    <h3>Notes</h3>
                    <p>{selectedParty.notes}</p>
                  </div>
                )}

                <div className="party-actions">
                  {checkPermission('parties', 'edit') && (
                    <button className="btn-primary" onClick={() => handleEdit(selectedParty)}>
                      Edit Party
                    </button>
                  )}
                  <button className="btn-secondary" onClick={handlePrintStatement}>
                    Print Statement
                  </button>
                  <button className="btn-secondary" onClick={() => {
                    // Navigate to payment
                    window.location.href = '/payments';
                  }}>
                    {activeTab === 'suppliers' ? 'Make Payment' : 'Receive Payment'}
                  </button>
                </div>

                <h3 style={{margin: '30px 0 15px'}}>Transaction History</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Bill No</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, index) => (
                      <tr key={index}>
                        <td>{t.date}</td>
                        <td>
                          <span className={`badge ${
                            t.type === 'Purchase' ? 'badge-warning' :
                            t.type === 'Sale' ? 'badge-success' :
                            'badge-info'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td>{t.billNo || '-'}</td>
                        <td>{t.type === 'Purchase' || t.type === 'Sale' ? formatCurrency(t.total) : '-'}</td>
                        <td>{t.type === 'Payment' ? formatCurrency(t.payment) : '-'}</td>
                        <td className={t.balance > 0 ? 'text-danger' : t.balance < 0 ? 'text-success' : ''}>
                          {formatCurrency(t.balance)}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center">No transactions found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="modal">
              <div className="modal-content small">
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete {selectedParty?.name}?</p>
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

export default Parties;