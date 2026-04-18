import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
// import './App.css';

const DetailList = () => {
  const { 
    user, 
    suppliers, 
    customers, 
    addSupplier, 
    addCustomer,
    addPayment,
    deleteSupplier,
    deleteCustomer,
    getPartyTransactions,
    updateSupplierBalance,
    updateCustomerBalance,
    checkPermission 
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('vendors');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [newParty, setNewParty] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    contactPerson: ''
  });

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load transactions when party changes
  useEffect(() => {
    if (selectedParty && showDetail) {
      loadTransactions();
    }
  }, [selectedParty, showDetail, activeTab]);

  const loadTransactions = () => {
    try {
      const partyType = activeTab === 'vendors' ? 'supplier' : 'customer';
      const trans = getPartyTransactions(selectedParty.id, partyType);
      setTransactions(trans || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // ===== FIXED formatCurrency function =====
  const formatCurrency = (amount) => {
    // Convert to number first, then format
    const numAmount = parseFloat(amount) || 0;
    return `Rs. ${numAmount.toFixed(2)}`;
  };

  // Filter parties based on search
  const filteredVendors = suppliers.filter(sup =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sup.phone && sup.phone.includes(searchTerm)) ||
    (sup.email && sup.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCustomers = customers.filter(cust =>
    cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cust.phone && cust.phone.includes(searchTerm)) ||
    (cust.email && cust.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate totals
  const totalVendorBalance = suppliers.reduce((sum, sup) => sum + (sup.balance || 0), 0);
  const totalCustomerBalance = customers.reduce((sum, cust) => sum + (cust.balance || 0), 0);

  const vendorsDue = suppliers.filter(sup => (sup.balance || 0) > 0).length;
  const customersDue = customers.filter(cust => (cust.balance || 0) > 0).length;

  // Handle view party details
  const handleViewParty = (party) => {
    setSelectedParty(party);
    setShowDetail(true);
    const partyType = activeTab === 'vendors' ? 'supplier' : 'customer';
    const trans = getPartyTransactions(party.id, partyType);
    setTransactions(trans || []);
  };

  // Handle add new party
  const handleAddParty = (e) => {
    e.preventDefault();
    
    if (!newParty.name.trim()) {
      showNotification('Please enter party name', 'error');
      return;
    }

    if (!checkPermission('parties', 'add')) {
      showNotification('You do not have permission to add parties', 'error');
      return;
    }

    try {
      if (activeTab === 'vendors') {
        addSupplier(newParty);
        showNotification('Vendor added successfully!', 'success');
      } else {
        addCustomer(newParty);
        showNotification('Customer added successfully!', 'success');
      }

      setShowAddForm(false);
      setNewParty({
        name: '',
        phone: '',
        address: '',
        email: '',
        contactPerson: ''
      });
    } catch (error) {
      showNotification('Error adding party', 'error');
    }
  };

  // Handle delete party
  const handleDelete = () => {
    if (!checkPermission('parties', 'delete')) {
      showNotification('You do not have permission to delete parties', 'error');
      return;
    }

    if (selectedParty.balance !== 0) {
      showNotification('Cannot delete party with pending balance', 'error');
      setShowDeleteConfirm(false);
      return;
    }

    try {
      if (activeTab === 'vendors') {
        deleteSupplier(selectedParty.id);
        showNotification('Vendor deleted successfully', 'success');
      } else {
        if (selectedParty.id === 1) {
          showNotification('Cannot delete Owner', 'error');
          setShowDeleteConfirm(false);
          return;
        }
        deleteCustomer(selectedParty.id);
        showNotification('Customer deleted successfully', 'success');
      }

      setShowDeleteConfirm(false);
      setSelectedParty(null);
      setShowDetail(false);
    } catch (error) {
      showNotification('Error deleting party', 'error');
    }
  };

  // ===== FIXED PAYMENT FUNCTION =====
  const handlePayment = async () => {
    // Convert to number for validation
    const amountNum = parseFloat(paymentAmount);
    
    // Validation
    if (!paymentAmount || isNaN(amountNum) || amountNum <= 0) {
      showNotification('Please enter valid amount', 'error');
      return;
    }

    if (amountNum > (selectedParty.balance || 0)) {
      showNotification('Payment amount cannot exceed balance', 'error');
      return;
    }

    if (!checkPermission('payments', 'add')) {
      showNotification('You do not have permission to add payments', 'error');
      return;
    }

    // Check if addPayment function exists
    if (!addPayment) {
      showNotification('Payment function not available', 'error');
      console.error('addPayment function is missing in AppContext');
      return;
    }

    setLoading(true);

    try {
      // Create payment record with amount as NUMBER (not string)
      const paymentData = {
        partyId: selectedParty.id,
        partyType: activeTab === 'vendors' ? 'supplier' : 'customer',
        partyName: selectedParty.name,
        amount: amountNum,  // ✅ Already a number
        paymentMode: paymentMode,
        date: new Date().toISOString().split('T')[0],
        notes: `Payment from ${activeTab === 'vendors' ? 'Vendor' : 'Customer'}`
      };

      console.log('Sending payment data:', paymentData);

      // Add payment using context function
      const result = await addPayment(paymentData);
      
      console.log('Payment result:', result);

      if (!result) {
        throw new Error('Payment failed - no result returned');
      }

      // Update local state
      if (activeTab === 'vendors') {
        // Update supplier balance using context function
        if (updateSupplierBalance) {
          updateSupplierBalance(selectedParty.id, amountNum, 'subtract');
        }
        
        // Update local selected party
        const updatedSupplier = {
          ...selectedParty,
          balance: (selectedParty.balance || 0) - amountNum
        };
        setSelectedParty(updatedSupplier);
      } else {
        // Update customer balance using context function
        if (updateCustomerBalance) {
          updateCustomerBalance(selectedParty.id, amountNum, 'subtract');
        }
        
        // Update local selected party
        const updatedCustomer = {
          ...selectedParty,
          balance: (selectedParty.balance || 0) - amountNum
        };
        setSelectedParty(updatedCustomer);
      }

      // Refresh transactions
      setTimeout(() => {
        const partyType = activeTab === 'vendors' ? 'supplier' : 'customer';
        const trans = getPartyTransactions(selectedParty.id, partyType);
        setTransactions(trans || []);
      }, 100);

      // Close modal and reset
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentMode('cash');
      
      // Show success message
      showNotification(`Payment of ${formatCurrency(amountNum)} recorded successfully!`, 'success');

    } catch (error) {
      console.error('Payment error details:', error);
      showNotification(`Error processing payment: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Calculate statistics
  const totalPurchases = transactions.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + (t.total || 0), 0);
  const totalPayments = transactions.filter(t => t.type === 'Payment').reduce((sum, t) => sum + (t.payment || 0), 0);
  const totalSales = transactions.filter(t => t.type === 'Sale').reduce((sum, t) => sum + (t.total || 0), 0);
  const totalReceipts = transactions.filter(t => t.type === 'Payment' && t.payment > 0).reduce((sum, t) => sum + (t.payment || 0), 0);

  // Permission check
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

          <div className="parties-container">
            {/* Header */}
            <div className="page-header">
              <h1>Parties Management</h1>
              <div className="header-actions">
                {checkPermission('parties', 'add') && (
                  <button 
                    className="btn-primary" 
                    onClick={() => setShowAddForm(true)}
                  >
                    + Add New {activeTab === 'vendors' ? 'Vendor' : 'Customer'}
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="parties-tabs">
              <button 
                className={`tab ${activeTab === 'vendors' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('vendors');
                  setShowDetail(false);
                  setSelectedParty(null);
                }}
              >
                Vendors ({suppliers.length})
                <span style={{marginLeft: '8px', fontSize: '12px', color: vendorsDue > 0 ? 'var(--danger)' : 'var(--success)'}}>
                  Due: {formatCurrency(totalVendorBalance)}
                </span>
              </button>
              <button 
                className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('customers');
                  setShowDetail(false);
                  setSelectedParty(null);
                }}
              >
                Customers ({customers.length})
                <span style={{marginLeft: '8px', fontSize: '12px', color: customersDue > 0 ? 'var(--danger)' : 'var(--success)'}}>
                  Due: {formatCurrency(totalCustomerBalance)}
                </span>
              </button>
            </div>

            {/* Search Bar */}
            {!showDetail && (
              <div className="search-section">
                <div className="search-box">
                  <input
                    type="text"
                    className="search-input"
                    placeholder={`Search ${activeTab === 'vendors' ? 'vendors' : 'customers'} by name, phone or email...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Add Party Form Modal */}
            {showAddForm && (
              <div className="modal">
                <div className="modal-content">
                  <h3>Add New {activeTab === 'vendors' ? 'Vendor' : 'Customer'}</h3>
                  
                  <form onSubmit={handleAddParty}>
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={newParty.name}
                        onChange={(e) => setNewParty({...newParty, name: e.target.value})}
                        placeholder="Enter full name"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={newParty.phone}
                        onChange={(e) => setNewParty({...newParty, phone: e.target.value})}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={newParty.email}
                        onChange={(e) => setNewParty({...newParty, email: e.target.value})}
                        placeholder="Enter email address"
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Person</label>
                      <input
                        type="text"
                        value={newParty.contactPerson}
                        onChange={(e) => setNewParty({...newParty, contactPerson: e.target.value})}
                        placeholder="Enter contact person name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <textarea
                        rows="3"
                        value={newParty.address}
                        onChange={(e) => setNewParty({...newParty, address: e.target.value})}
                        placeholder="Enter complete address"
                      />
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Save Party
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedParty && (
              <div className="modal">
                <div className="modal-content small">
                  <h3>
                    {activeTab === 'vendors' ? 'Make Payment to' : 'Receive Payment from'} {selectedParty.name}
                  </h3>
                  
                  <div className="payment-info" style={{marginBottom: '20px'}}>
                    <p>Current Balance: <strong className={selectedParty.balance > 0 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(selectedParty.balance || 0)}
                    </strong></p>
                  </div>

                  <div className="form-group">
                    <label>Amount *</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      step="0.01"
                      min="0.01"
                      max={selectedParty.balance}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Mode</label>
                    <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online Transfer</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div className="modal-actions">
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => {
                        setShowPaymentModal(false);
                        setPaymentAmount('');
                        setPaymentMode('cash');
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      onClick={handlePayment}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Confirm Payment'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedParty && (
              <div className="modal">
                <div className="modal-content small">
                  <h3>Confirm Delete</h3>
                  <p>Are you sure you want to delete <strong>{selectedParty.name}</strong>?</p>
                  {selectedParty.balance !== 0 && (
                    <p className="warning-text">Warning: This party has a balance of {formatCurrency(selectedParty.balance)}</p>
                  )}
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

            {/* Main Content - List View */}
            {!showDetail && (
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Contact Person</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'vendors' ? filteredVendors : filteredCustomers).map((party, index) => (
                      <tr key={party.id}>
                        <td>{index + 1}</td>
                        <td><strong>{party.name}</strong></td>
                        <td>{party.contactPerson || '-'}</td>
                        <td>{party.phone || '-'}</td>
                        <td>{party.email || '-'}</td>
                        <td className={party.balance > 0 ? 'text-danger' : party.balance < 0 ? 'text-success' : ''}>
                          {formatCurrency(party.balance || 0)}
                        </td>
                        <td>
                          <span className={`badge ${
                            party.balance > 0 ? 'badge-danger' : 
                            party.balance < 0 ? 'badge-success' : 
                            'badge-secondary'
                          }`}>
                            {party.balance > 0 ? 'Due' : party.balance < 0 ? 'Credit' : 'Settled'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleViewParty(party)}
                            title="View Details"
                          >👁️</button>
                          {(party.balance || 0) > 0 && (
                            <button 
                              className="btn-icon" 
                              onClick={() => {
                                setSelectedParty(party);
                                setShowPaymentModal(true);
                              }}
                              title={activeTab === 'vendors' ? 'Pay' : 'Receive'}
                            >💳</button>
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
                    {(activeTab === 'vendors' ? filteredVendors : filteredCustomers).length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center">No parties found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Party Detail View */}
            {showDetail && selectedParty && (
              <div className="card">
                <div className="card-header">
                  <h2>{selectedParty.name} - Details</h2>
                  <button className="btn-secondary" onClick={() => setShowDetail(false)}>
                    ← Back to List
                  </button>
                </div>

                <div className="party-detail">
                  <div className="party-info">
                    <div>
                      <h3 className="party-name">{selectedParty.name}</h3>
                      <p style={{marginTop: '8px'}}>
                        <strong>Contact Person:</strong> {selectedParty.contactPerson || 'N/A'}<br/>
                        <strong>Phone:</strong> {selectedParty.phone || 'N/A'}<br/>
                        <strong>Email:</strong> {selectedParty.email || 'N/A'}<br/>
                        <strong>Address:</strong> {selectedParty.address || 'N/A'}
                      </p>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div className={`party-balance ${(selectedParty.balance || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                        Current Balance: {formatCurrency(selectedParty.balance || 0)}
                      </div>
                      {(selectedParty.balance || 0) > 0 && (
                        <button 
                          className="btn-primary" 
                          onClick={() => setShowPaymentModal(true)}
                          style={{marginTop: '10px', marginRight: '10px'}}
                        >
                          {activeTab === 'vendors' ? 'Make Payment' : 'Receive Payment'}
                        </button>
                      )}
                      {checkPermission('parties', 'delete') && selectedParty.id !== 1 && (
                        <button 
                          className="btn-danger" 
                          onClick={() => setShowDeleteConfirm(true)}
                          style={{marginTop: '10px'}}
                        >
                          Delete Party
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Statistics Cards */}
                  <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px'}}>
                    <div className="stat-card">
                      <div className="stat-info">
                        <h3>Total {activeTab === 'vendors' ? 'Purchases' : 'Sales'}</h3>
                        <p className="stat-value">
                          {formatCurrency(activeTab === 'vendors' ? totalPurchases : totalSales)}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-info">
                        <h3>Total {activeTab === 'vendors' ? 'Payments' : 'Receipts'}</h3>
                        <p className="stat-value text-success">
                          {formatCurrency(activeTab === 'vendors' ? totalPayments : totalReceipts)}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-info">
                        <h3>Pending Amount</h3>
                        <p className="stat-value text-danger">
                          {formatCurrency(selectedParty.balance || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-info">
                        <h3>Total Transactions</h3>
                        <p className="stat-value">{transactions.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <h3 style={{margin: '20px 0 10px'}}>Transaction History</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Bill No</th>
                        <th>Description</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map((trans, index) => (
                          <tr key={index}>
                            <td>{trans.date}</td>
                            <td>
                              <span className={`badge ${
                                trans.type === 'Purchase' ? 'badge-warning' :
                                trans.type === 'Sale' ? 'badge-success' :
                                'badge-info'
                              }`}>
                                {trans.type}
                              </span>
                            </td>
                            <td>{trans.billNo || '-'}</td>
                            <td>{trans.description || '-'}</td>
                            <td className="text-danger">{trans.total ? formatCurrency(trans.total) : '-'}</td>
                            <td className="text-success">{trans.payment ? formatCurrency(trans.payment) : '-'}</td>
                            <td className={trans.balance > 0 ? 'text-danger' : trans.balance < 0 ? 'text-success' : ''}>
                              {formatCurrency(trans.balance)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center">No transactions found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Action Buttons */}
                  <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                    <button className="btn-secondary" onClick={() => window.print()}>
                      🖨️ Print Statement
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailList;