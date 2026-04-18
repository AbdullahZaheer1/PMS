import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// import '../../App.css';

const Expenses = () => {
  const { 
    user, 
    expenses, 
    addExpense, 
    updateExpense, 
    deleteExpense,
    checkPermission,
    companySettings
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('list'); // list, add, edit
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    to: new Date().toISOString().split('T')[0] // Today
  });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Expense form state
  const [expenseData, setExpenseData] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    description: '',
    amount: '',
    paymentMode: 'cash',
    referenceNo: '',
    paidTo: '',
    notes: '',
    status: 'paid'
  });

  // Expense categories
  const categories = [
    'General',
    'Rent',
    'Utilities',
    'Salary',
    'Electricity',
    'Water',
    'Internet',
    'Phone',
    'Transport',
    'Fuel',
    'Maintenance',
    'Repairs',
    'Stationery',
    'Marketing',
    'Advertising',
    'Insurance',
    'Taxes',
    'Legal',
    'Consultant',
    'Training',
    'Travel',
    'Food',
    'Tea/Coffee',
    'Miscellaneous'
  ];

  // Payment modes
  const paymentModes = ['cash', 'card', 'cheque', 'online', 'bank transfer'];

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

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const formatCurrency = (amount) => {
    return `${companySettings.currency} ${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    // Date range filter
    const matchesDate = exp.date >= dateRange.from && exp.date <= dateRange.to;
    
    // Category filter
    const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
    
    // Search filter
    const matchesSearch = 
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.category && exp.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.paidTo && exp.paidTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.referenceNo && exp.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesDate && matchesCategory && matchesSearch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate statistics
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;
  
  // Category-wise totals
  const categoryTotals = categories.reduce((acc, cat) => {
    acc[cat] = filteredExpenses
      .filter(exp => exp.category === cat)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return acc;
  }, {});

  // Payment mode totals
  const paymentModeTotals = paymentModes.reduce((acc, mode) => {
    acc[mode] = filteredExpenses
      .filter(exp => exp.paymentMode === mode)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return acc;
  }, {});

  // Daily totals for chart
  const dailyTotals = [];
  const start = new Date(dateRange.from);
  const end = new Date(dateRange.to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const total = filteredExpenses
      .filter(exp => exp.date === dateStr)
      .reduce((sum, exp) => sum + exp.amount, 0);
    dailyTotals.push({
      date: formatDate(dateStr),
      total
    });
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExpenseData({
      ...expenseData,
      [name]: value
    });
  };

  const handleAddNew = () => {
    setExpenseData({
      id: null,
      date: new Date().toISOString().split('T')[0],
      category: 'General',
      description: '',
      amount: '',
      paymentMode: 'cash',
      referenceNo: '',
      paidTo: '',
      notes: '',
      status: 'paid'
    });
    setActiveTab('add');
  };

  const handleEdit = (expense) => {
    setExpenseData(expense);
    setActiveTab('edit');
  };

  const handleSave = () => {
    // Validation
    if (!expenseData.description) {
      showNotification('Please enter expense description', 'error');
      return;
    }

    if (!expenseData.amount || parseFloat(expenseData.amount) <= 0) {
      showNotification('Please enter valid amount', 'error');
      return;
    }

    if (!checkPermission('expenses', expenseData.id ? 'edit' : 'add')) {
      showNotification(`You do not have permission to ${expenseData.id ? 'edit' : 'add'} expenses`, 'error');
      return;
    }

    const expenseToSave = {
      ...expenseData,
      amount: parseFloat(expenseData.amount)
    };

    if (expenseData.id) {
      updateExpense(expenseData.id, expenseToSave);
      showNotification('Expense updated successfully', 'success');
    } else {
      addExpense(expenseToSave);
      showNotification('Expense added successfully', 'success');
    }

    setActiveTab('list');
    setExpenseData({
      id: null,
      date: new Date().toISOString().split('T')[0],
      category: 'General',
      description: '',
      amount: '',
      paymentMode: 'cash',
      referenceNo: '',
      paidTo: '',
      notes: '',
      status: 'paid'
    });
  };

  const handleDelete = () => {
    if (!checkPermission('expenses', 'delete')) {
      showNotification('You do not have permission to delete expenses', 'error');
      return;
    }

    deleteExpense(selectedExpense.id);
    setShowDeleteConfirm(false);
    setSelectedExpense(null);
    showNotification('Expense deleted successfully', 'success');
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredExpenses.map(e => ({
        'Date': e.date,
        'Category': e.category,
        'Description': e.description,
        'Amount': e.amount,
        'Payment Mode': e.paymentMode,
        'Paid To': e.paidTo || '-',
        'Reference': e.referenceNo || '-',
        'Status': e.status
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, `expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel file downloaded successfully', 'success');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Expenses Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Period: ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`, 14, 42);
    
    const tableColumn = ['Date', 'Category', 'Description', 'Amount', 'Mode', 'Status'];
    const tableRows = [];
    
    filteredExpenses.slice(0, 50).forEach(e => {
      const row = [
        e.date,
        e.category,
        e.description.substring(0, 30),
        formatCurrency(e.amount),
        e.paymentMode,
        e.status
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
    
    // Add summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total Expenses: ${formatCurrency(totalExpenses)}`, 14, finalY);
    doc.text(`Average Expense: ${formatCurrency(averageExpense)}`, 14, finalY + 7);
    
    doc.save(`expenses_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF file downloaded successfully', 'success');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('expenses', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view expenses.</p>
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
            <h1>Expenses Management</h1>
            <div className="header-actions">
              {checkPermission('expenses', 'add') && (
                <button className="btn-primary" onClick={handleAddNew}>
                  + Add Expense
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
          <div className="expenses-tabs">
            <button 
              className={`tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Expenses List
            </button>
            <button 
              className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            {(activeTab === 'add' || activeTab === 'edit') && (
              <button className="tab active">
                {activeTab === 'add' ? 'Add Expense' : 'Edit Expense'}
              </button>
            )}
          </div>

          {/* Filters - Show only in list and summary views */}
          {(activeTab === 'list' || activeTab === 'summary') && (
            <div className="filters-section">
              <div className="filters-grid">
                <div className="filter-group">
                  <label>From Date</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>To Date</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Search</label>
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="filter-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards - Show in list and summary */}
          {(activeTab === 'list' || activeTab === 'summary') && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>Total Expenses</h3>
                  <p className="stat-value">{filteredExpenses.length}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💵</div>
                <div className="stat-info">
                  <h3>Total Amount</h3>
                  <p className="stat-value text-danger">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Average</h3>
                  <p className="stat-value">{formatCurrency(averageExpense)}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-info">
                  <h3>Categories</h3>
                  <p className="stat-value">{Object.keys(categoryTotals).filter(c => categoryTotals[c] > 0).length}</p>
                </div>
              </div>
            </div>
          )}

          {/* List View */}
          {activeTab === 'list' && (
            <div className="card">
              <div className="card-header">
                <h2>Expenses List</h2>
                <span>{filteredExpenses.length} entries</span>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Paid To</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(expense => (
                    <tr key={expense.id}>
                      <td>{expense.date}</td>
                      <td>
                        <span className="category-badge">{expense.category}</span>
                      </td>
                      <td>
                        <strong>{expense.description}</strong>
                        {expense.notes && <div className="small-text">{expense.notes}</div>}
                      </td>
                      <td className="text-danger">{formatCurrency(expense.amount)}</td>
                      <td>
                        <span className={`badge ${
                          expense.paymentMode === 'cash' ? 'badge-success' :
                          expense.paymentMode === 'card' ? 'badge-info' :
                          expense.paymentMode === 'cheque' ? 'badge-warning' :
                          'badge-secondary'
                        }`}>
                          {expense.paymentMode}
                        </span>
                      </td>
                      <td>{expense.paidTo || '-'}</td>
                      <td>
                        <span className={`badge ${expense.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                          {expense.status}
                        </span>
                      </td>
                      <td>
                        {checkPermission('expenses', 'edit') && (
                          <button 
                            className="btn-icon" 
                            onClick={() => handleEdit(expense)}
                            title="Edit"
                          >✏️</button>
                        )}
                        {checkPermission('expenses', 'delete') && (
                          <button 
                            className="btn-icon" 
                            onClick={() => {
                              setSelectedExpense(expense);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete"
                          >🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center">
                        No expenses found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary View */}
          {activeTab === 'summary' && (
            <div className="summary-container">
              {/* Category-wise Summary */}
              <div className="card">
                <div className="card-header">
                  <h2>Category-wise Expenses</h2>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Amount</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories
                      .filter(cat => categoryTotals[cat] > 0)
                      .map(cat => {
                        const percentage = totalExpenses > 0 
                          ? ((categoryTotals[cat] / totalExpenses) * 100).toFixed(1)
                          : 0;
                        return (
                          <tr key={cat}>
                            <td><strong>{cat}</strong></td>
                            <td>{filteredExpenses.filter(e => e.category === cat).length}</td>
                            <td className="text-danger">{formatCurrency(categoryTotals[cat])}</td>
                            <td>
                              <div className="progress-bar-container">
                                <div 
                                  className="progress-bar" 
                                  style={{width: `${percentage}%`}}
                                ></div>
                                <span>{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Payment Mode Summary */}
              <div className="card">
                <div className="card-header">
                  <h2>Payment Mode Summary</h2>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Payment Mode</th>
                      <th>Count</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentModes.map(mode => {
                      if (paymentModeTotals[mode] === 0) return null;
                      return (
                        <tr key={mode}>
                          <td><span className={`badge badge-${mode}`}>{mode}</span></td>
                          <td>{filteredExpenses.filter(e => e.paymentMode === mode).length}</td>
                          <td className="text-danger">{formatCurrency(paymentModeTotals[mode])}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Daily Trend */}
              <div className="card">
                <div className="card-header">
                  <h2>Daily Expense Trend</h2>
                </div>
                <div className="trend-chart">
                  {dailyTotals.map((day, index) => (
                    <div key={index} className="trend-bar-container">
                      <div 
                        className="trend-bar"
                        style={{
                          height: `${Math.max(5, (day.total / Math.max(...dailyTotals.map(d => d.total)) * 100))}%`
                        }}
                      ></div>
                      <div className="trend-label">{day.date}</div>
                      <div className="trend-value">{formatCurrency(day.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <div className="card">
              <div className="card-header">
                <h2>{activeTab === 'add' ? 'Add New Expense' : 'Edit Expense'}</h2>
              </div>

              <div className="form-container">
                <div className="form-section">
                  <h3>Expense Details</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        name="date"
                        value={expenseData.date}
                        onChange={handleInputChange}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Category *</label>
                      <select
                        name="category"
                        value={expenseData.category}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <input
                      type="text"
                      name="description"
                      value={expenseData.description}
                      onChange={handleInputChange}
                      placeholder="Enter expense description"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Amount *</label>
                      <input
                        type="number"
                        name="amount"
                        value={expenseData.amount}
                        onChange={handleInputChange}
                        placeholder="Enter amount"
                        step="0.01"
                        min="0.01"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Payment Mode</label>
                      <select
                        name="paymentMode"
                        value={expenseData.paymentMode}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        {paymentModes.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Paid To</label>
                      <input
                        type="text"
                        name="paidTo"
                        value={expenseData.paidTo}
                        onChange={handleInputChange}
                        placeholder="Enter recipient name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Reference No</label>
                      <input
                        type="text"
                        name="referenceNo"
                        value={expenseData.referenceNo}
                        onChange={handleInputChange}
                        placeholder="Enter reference number"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={expenseData.notes}
                      onChange={handleInputChange}
                      placeholder="Enter additional notes..."
                      rows="3"
                      className="form-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={expenseData.status}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setActiveTab('list')}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={handleSave}
                  >
                    {activeTab === 'add' ? 'Save Expense' : 'Update Expense'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="modal">
              <div className="modal-content small">
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete this expense?</p>
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

export default Expenses;