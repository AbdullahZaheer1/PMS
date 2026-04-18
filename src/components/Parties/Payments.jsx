import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Payments = () => {
  const { 
    user, 
    suppliers, 
    customers,
    payments,
    addPayment,
    getSupplierById,
    getCustomerById,
    checkPermission,
    companySettings,
    getPartyTransactions
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('new'); // new, history
  const [paymentType, setPaymentType] = useState('supplier'); // supplier, customer
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [pendingBills, setPendingBills] = useState([]);
  
  // Payment form state
  const [paymentData, setPaymentData] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    partyId: '',
    partyType: 'supplier',
    partyName: '',
    billNo: '',
    amount: '',
    paymentMode: 'cash',
    referenceNo: '',
    chequeNo: '',
    chequeDate: '',
    bankName: '',
    notes: '',
    status: 'completed'
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedParty) {
      loadPendingBills();
    }
  }, [selectedParty]);

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

  const formatDateTime = (date) => {
    return `${formatDate(date)} ${formatTime(new Date(date))}`;
  };

  const formatCurrency = (amount) => {
    return `${companySettings.currency} ${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Get current parties based on type
  const currentParties = paymentType === 'supplier' ? suppliers : customers.filter(c => c.id !== 1);

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const party = paymentType === 'supplier' 
      ? getSupplierById(p.partyId)
      : getCustomerById(p.partyId);
    
    return (
      p.partyType === paymentType &&
      (party?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate totals
  const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const cashPayments = filteredPayments.filter(p => p.paymentMode === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const chequePayments = filteredPayments.filter(p => p.paymentMode === 'cheque').reduce((sum, p) => sum + p.amount, 0);
  const onlinePayments = filteredPayments.filter(p => p.paymentMode === 'online').reduce((sum, p) => sum + p.amount, 0);

  // Load pending bills for selected party
  const loadPendingBills = () => {
    if (!selectedParty) return;

    const partyType = paymentType === 'supplier' ? 'supplier' : 'customer';
    const transactions = getPartyTransactions(selectedParty.id, partyType);
    
    // Get pending bills (positive balance)
    const pending = transactions
      .filter(t => t.type === (paymentType === 'supplier' ? 'Purchase' : 'Sale') && t.balance > 0)
      .map(t => ({
        date: t.date,
        billNo: t.billNo,
        amount: t.total,
        due: t.balance
      }));

    setPendingBills(pending);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };

  const handlePartySelect = (partyId) => {
    const party = paymentType === 'supplier' 
      ? getSupplierById(partyId)
      : getCustomerById(partyId);
    
    setSelectedParty(party);
    setPaymentData({
      ...paymentData,
      partyId: parseInt(partyId),
      partyType: paymentType,
      partyName: party?.name || ''
    });
  };

  const handleUseBill = (bill) => {
    setPaymentData({
      ...paymentData,
      billNo: bill.billNo,
      amount: bill.due
    });
  };

  const handleSavePayment = () => {
    // Validation
    if (!paymentData.partyId) {
      showNotification('Please select a party', 'error');
      return;
    }

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      showNotification('Please enter valid amount', 'error');
      return;
    }

    if (parseFloat(paymentData.amount) > selectedParty.balance) {
      showNotification('Payment amount cannot exceed current balance', 'error');
      return;
    }

    if (paymentData.paymentMode === 'cheque' && !paymentData.chequeNo) {
      showNotification('Please enter cheque number', 'error');
      return;
    }

    if (!checkPermission('payments', 'add')) {
      showNotification('You do not have permission to add payments', 'error');
      return;
    }

    // Save payment
    const paymentToSave = {
      ...paymentData,
      amount: parseFloat(paymentData.amount),
      date: paymentData.date
    };

    addPayment(paymentToSave);
    showNotification('Payment recorded successfully', 'success');

    // Reset form
    setPaymentData({
      id: null,
      date: new Date().toISOString().split('T')[0],
      partyId: '',
      partyType: paymentType,
      partyName: '',
      billNo: '',
      amount: '',
      paymentMode: 'cash',
      referenceNo: '',
      chequeNo: '',
      chequeDate: '',
      bankName: '',
      notes: '',
      status: 'completed'
    });
    setSelectedParty(null);
    setPendingBills([]);
  };

  const handlePrintReceipt = (payment) => {
    const party = payment.partyType === 'supplier' 
      ? getSupplierById(payment.partyId)
      : getCustomerById(payment.partyId);

    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #333; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; font-size: 12px; color: #666; }
            .info { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 5px 0; border-bottom: 1px dashed #ddd; }
            .amount { font-size: 24px; font-weight: bold; color: #2563eb; text-align: right; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px dashed #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>${companySettings.name}</h1>
              <p>${companySettings.address}</p>
              <p>Tel: ${companySettings.phone}</p>
            </div>
            
            <h2 style="text-align: center;">PAYMENT RECEIPT</h2>
            
            <div class="info">
              <div class="info-row">
                <span>Receipt No:</span>
                <span><strong>RCP-${payment.id}</strong></span>
              </div>
              <div class="info-row">
                <span>Date:</span>
                <span>${formatDate(payment.date)}</span>
              </div>
              <div class="info-row">
                <span>Time:</span>
                <span>${formatTime(new Date())}</span>
              </div>
              <div class="info-row">
                <span>Party:</span>
                <span><strong>${party?.name}</strong></span>
              </div>
              <div class="info-row">
                <span>Payment Mode:</span>
                <span>${payment.paymentMode.toUpperCase()}</span>
              </div>
              ${payment.billNo ? `
                <div class="info-row">
                  <span>Against Bill:</span>
                  <span>${payment.billNo}</span>
                </div>
              ` : ''}
              ${payment.chequeNo ? `
                <div class="info-row">
                  <span>Cheque No:</span>
                  <span>${payment.chequeNo}</span>
                </div>
              ` : ''}
              ${payment.referenceNo ? `
                <div class="info-row">
                  <span>Reference No:</span>
                  <span>${payment.referenceNo}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="amount">
              Amount: ${formatCurrency(payment.amount)}
            </div>
            
            ${payment.notes ? `
              <div style="margin: 20px 0; padding: 10px; background: #f3f4f6; border-radius: 5px;">
                <strong>Notes:</strong><br>
                ${payment.notes}
              </div>
            ` : ''}
            
            <div style="margin: 20px 0;">
              <p><strong>Amount in words:</strong> ${numberToWords(payment.amount)}</p>
            </div>
            
            <div class="footer">
              <p>This is a computer generated receipt</p>
              <p>Software by Logixify Labs</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Simple number to words converter (for demo)
  const numberToWords = (num) => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    let amount = Math.floor(num);
    const paisa = Math.round((num - amount) * 100);
    
    let words = '';
    
    if (amount > 0) {
      if (amount >= 1000) {
        words += units[Math.floor(amount / 1000)] + ' Thousand ';
        amount %= 1000;
      }
      if (amount >= 100) {
        words += units[Math.floor(amount / 100)] + ' Hundred ';
        amount %= 100;
      }
      if (amount >= 20) {
        words += tens[Math.floor(amount / 10)] + ' ';
        amount %= 10;
      }
      if (amount > 0) {
        words += (amount < 10 ? units[amount] : teens[amount - 10]) + ' ';
      }
      words += 'Rupees ';
    }
    
    if (paisa > 0) {
      words += 'and ' + (paisa < 10 ? units[paisa] : (paisa < 20 ? teens[paisa - 10] : tens[Math.floor(paisa / 10)] + (paisa % 10 > 0 ? ' ' + units[paisa % 10] : ''))) + ' Paisa';
    }
    
    return words || 'Zero';
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredPayments.map(p => {
        const party = p.partyType === 'supplier' 
          ? getSupplierById(p.partyId)
          : getCustomerById(p.partyId);
        
        return {
          'Date': p.date,
          'Type': p.partyType === 'supplier' ? 'Supplier' : 'Customer',
          'Party': party?.name || 'Unknown',
          'Bill No': p.billNo || '-',
          'Amount': p.amount,
          'Mode': p.paymentMode,
          'Reference': p.referenceNo || p.chequeNo || '-',
          'Status': p.status
        };
      })
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    XLSX.writeFile(workbook, `payments_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel file downloaded successfully', 'success');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Payments Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    
    const tableColumn = ['Date', 'Type', 'Party', 'Bill No', 'Amount', 'Mode', 'Status'];
    const tableRows = [];
    
    filteredPayments.slice(0, 50).forEach(p => {
      const party = p.partyType === 'supplier' 
        ? getSupplierById(p.partyId)
        : getCustomerById(p.partyId);
      
      const row = [
        p.date,
        p.partyType === 'supplier' ? 'Supplier' : 'Customer',
        party?.name || 'Unknown',
        p.billNo || '-',
        formatCurrency(p.amount),
        p.paymentMode,
        p.status
      ];
      tableRows.push(row);
    });
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save(`payments_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF file downloaded successfully', 'success');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('payments', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view payments.</p>
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
            <h1>Payments Management</h1>
            <div className="header-actions">
              {checkPermission('payments', 'add') && (
                <button 
                  className="btn-primary"
                  onClick={() => setActiveTab('new')}
                >
                  + New Payment
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
          <div className="payments-tabs">
            <button 
              className={`tab ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              New Payment
            </button>
            <button 
              className={`tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Payment History
            </button>
          </div>

          {/* New Payment Form */}
          {activeTab === 'new' && (
            <div className="card">
              <div className="card-header">
                <h2>Record New Payment</h2>
              </div>

              <div className="form-container">
                {/* Payment Type Selection */}
                <div className="payment-type-section">
                  <h3>Payment Type</h3>
                  <div className="payment-type-options">
                    <label className="payment-type-option">
                      <input
                        type="radio"
                        value="supplier"
                        checked={paymentType === 'supplier'}
                        onChange={(e) => {
                          setPaymentType(e.target.value);
                          setSelectedParty(null);
                          setPaymentData({
                            ...paymentData,
                            partyId: '',
                            partyType: e.target.value,
                            partyName: ''
                          });
                        }}
                      />
                      <span>Supplier Payment</span>
                    </label>
                    <label className="payment-type-option">
                      <input
                        type="radio"
                        value="customer"
                        checked={paymentType === 'customer'}
                        onChange={(e) => {
                          setPaymentType(e.target.value);
                          setSelectedParty(null);
                          setPaymentData({
                            ...paymentData,
                            partyId: '',
                            partyType: e.target.value,
                            partyName: ''
                          });
                        }}
                      />
                      <span>Customer Receipt</span>
                    </label>
                  </div>
                </div>

                {/* Party Selection */}
                <div className="form-section">
                  <h3>Select Party</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{paymentType === 'supplier' ? 'Supplier' : 'Customer'} *</label>
                      <select
                        value={paymentData.partyId}
                        onChange={(e) => handlePartySelect(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select {paymentType === 'supplier' ? 'Supplier' : 'Customer'}</option>
                        {currentParties.map(party => (
                          <option key={party.id} value={party.id}>
                            {party.name} (Balance: {formatCurrency(party.balance || 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedParty && (
                      <div className="form-group">
                        <label>Current Balance</label>
                        <div className={`balance-display ${selectedParty.balance > 0 ? 'negative' : 'positive'}`}>
                          {formatCurrency(selectedParty.balance || 0)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Bills */}
                {selectedParty && pendingBills.length > 0 && (
                  <div className="form-section">
                    <h3>Pending Bills</h3>
                    <div className="pending-bills-list">
                      {pendingBills.map((bill, index) => (
                        <div key={index} className="pending-bill-item">
                          <div className="bill-info">
                            <span><strong>Date:</strong> {bill.date}</span>
                            <span><strong>Bill No:</strong> {bill.billNo}</span>
                            <span><strong>Amount:</strong> {formatCurrency(bill.amount)}</span>
                            <span><strong>Due:</strong> {formatCurrency(bill.due)}</span>
                          </div>
                          <button 
                            className="btn-small btn-primary"
                            onClick={() => handleUseBill(bill)}
                          >
                            Use This
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                <div className="form-section">
                  <h3>Payment Details</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Payment Date *</label>
                      <input
                        type="date"
                        name="date"
                        value={paymentData.date}
                        onChange={handleInputChange}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Bill Number (Optional)</label>
                      <input
                        type="text"
                        name="billNo"
                        value={paymentData.billNo}
                        onChange={handleInputChange}
                        placeholder="Enter bill number"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Payment Mode *</label>
                      <select
                        name="paymentMode"
                        value={paymentData.paymentMode}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="online">Online Transfer</option>
                        <option value="card">Credit/Debit Card</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Amount *</label>
                      <input
                        type="number"
                        name="amount"
                        value={paymentData.amount}
                        onChange={handleInputChange}
                        placeholder="Enter amount"
                        step="0.01"
                        min="0.01"
                        max={selectedParty?.balance}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  {paymentData.paymentMode === 'cheque' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Cheque Number *</label>
                        <input
                          type="text"
                          name="chequeNo"
                          value={paymentData.chequeNo}
                          onChange={handleInputChange}
                          placeholder="Enter cheque number"
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Cheque Date</label>
                        <input
                          type="date"
                          name="chequeDate"
                          value={paymentData.chequeDate}
                          onChange={handleInputChange}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label>Bank Name</label>
                        <input
                          type="text"
                          name="bankName"
                          value={paymentData.bankName}
                          onChange={handleInputChange}
                          placeholder="Enter bank name"
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}

                  {paymentData.paymentMode === 'online' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Reference Number</label>
                        <input
                          type="text"
                          name="referenceNo"
                          value={paymentData.referenceNo}
                          onChange={handleInputChange}
                          placeholder="Enter transaction reference"
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={paymentData.notes}
                      onChange={handleInputChange}
                      placeholder="Enter any additional notes..."
                      rows="3"
                      className="form-textarea"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setPaymentData({
                        id: null,
                        date: new Date().toISOString().split('T')[0],
                        partyId: '',
                        partyType: paymentType,
                        partyName: '',
                        billNo: '',
                        amount: '',
                        paymentMode: 'cash',
                        referenceNo: '',
                        chequeNo: '',
                        chequeDate: '',
                        bankName: '',
                        notes: '',
                        status: 'completed'
                      });
                      setSelectedParty(null);
                      setPendingBills([]);
                    }}
                  >
                    Clear
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={handleSavePayment}
                    disabled={!selectedParty}
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          {activeTab === 'history' && (
            <>
              {/* Statistics Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <h3>Total Payments</h3>
                    <p className="stat-value">{filteredPayments.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💵</div>
                  <div className="stat-info">
                    <h3>Total Amount</h3>
                    <p className="stat-value">{formatCurrency(totalPayments)}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💳</div>
                  <div className="stat-info">
                    <h3>Cash</h3>
                    <p className="stat-value">{formatCurrency(cashPayments)}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📝</div>
                  <div className="stat-info">
                    <h3>Cheque</h3>
                    <p className="stat-value">{formatCurrency(chequePayments)}</p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="search-section">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by party name, bill no, reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {/* Payments Table */}
              <div className="card">
                <div className="card-header">
                  <h2>Payment History</h2>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Party</th>
                      <th>Bill No</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(payment => {
                      const party = payment.partyType === 'supplier' 
                        ? getSupplierById(payment.partyId)
                        : getCustomerById(payment.partyId);

                      return (
                        <tr key={payment.id}>
                          <td>{payment.date}</td>
                          <td>
                            <span className={`badge ${payment.partyType === 'supplier' ? 'badge-warning' : 'badge-success'}`}>
                              {payment.partyType === 'supplier' ? 'Payment' : 'Receipt'}
                            </span>
                          </td>
                          <td><strong>{party?.name || 'Unknown'}</strong></td>
                          <td>{payment.billNo || '-'}</td>
                          <td className={payment.partyType === 'supplier' ? 'text-danger' : 'text-success'}>
                            {formatCurrency(payment.amount)}
                          </td>
                          <td>
                            <span className={`badge ${
                              payment.paymentMode === 'cash' ? 'badge-success' :
                              payment.paymentMode === 'cheque' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {payment.paymentMode}
                            </span>
                          </td>
                          <td>{payment.referenceNo || payment.chequeNo || '-'}</td>
                          <td>
                            <span className={`badge ${payment.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn-icon" 
                              onClick={() => handlePrintReceipt(payment)}
                              title="Print Receipt"
                            >🖨️</button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan="9" className="text-center">
                          No payments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;