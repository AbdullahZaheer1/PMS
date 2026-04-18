import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Sale = () => {
  const { 
    user, 
    customers, 
    medicines, 
    addSale, 
    updateSale, 
    deleteSale,
    sales,
    getCustomerById,
    getMedicineById,
    checkPermission,
    companySettings,
    updateMedicineStock
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Sale form state
  const [saleData, setSaleData] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    billNo: generateBillNo(),
    customerId: '1', // Default to Owner
    customerName: 'Owner',
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    grandTotal: 0,
    paid: 0,
    paymentMode: 'cash',
    notes: '',
    status: 'completed'
  });

  // Current item state
  const [currentItem, setCurrentItem] = useState({
    medicineId: '',
    medicineName: '',
    qty: 1,
    price: 0,
    mrp: 0,
    discount: 0,
    total: 0
  });

  const [searchMedicine, setSearchMedicine] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Generate bill number
  function generateBillNo() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SALE-${year}${month}${day}-${random}`;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // ===== FIXED: Safe number formatting function =====
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `${companySettings?.currency || 'Rs.'} ${num.toFixed(2)}`;
  };

  // Filter medicines for search
  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchMedicine.toLowerCase()) ||
    (med.category && med.category.toLowerCase().includes(searchMedicine.toLowerCase())) ||
    (med.barcode && med.barcode.includes(searchMedicine))
  );

  // Filter sales for list
  const filteredSales = sales.filter(s => 
    s.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.date.includes(searchTerm)
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  // ===== FIXED: Calculate item total with number conversion =====
  const calculateItemTotal = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.price) || 0;
    const discount = parseFloat(item.discount) || 0;
    return (qty * price) - discount;
  };

  // ===== FIXED: Calculate sale totals with number conversion =====
  const calculateTotals = (items, discount, tax) => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const discountAmount = parseFloat(discount) || 0;
    const taxAmount = ((subtotal - discountAmount) * (parseFloat(tax) || 0)) / 100;
    const grandTotal = subtotal - discountAmount + taxAmount;
    
    return { subtotal, grandTotal };
  };

  // Handle barcode scan
  const handleBarcodeScan = (e) => {
    e.preventDefault();
    const medicine = medicines.find(m => m.barcode === barcodeInput);
    if (medicine) {
      setCurrentItem({
        ...currentItem,
        medicineId: medicine.id,
        medicineName: medicine.name,
        price: medicine.salePrice,
        mrp: medicine.salePrice
      });
      setBarcodeInput('');
      showNotification('Medicine found: ' + medicine.name, 'success');
    } else {
      showNotification('Medicine not found', 'error');
    }
  };

  // Handle add item
  const handleAddItem = () => {
    if (!currentItem.medicineId) {
      showNotification('Please select a medicine', 'error');
      return;
    }

    if (!currentItem.qty || currentItem.qty <= 0) {
      showNotification('Please enter valid quantity', 'error');
      return;
    }

    const medicine = getMedicineById(currentItem.medicineId);
    
    // Check stock
    if (medicine.stock < currentItem.qty) {
      showNotification(`Insufficient stock! Available: ${medicine.stock}`, 'error');
      return;
    }

    const total = calculateItemTotal(currentItem);
    
    // ===== FIXED: Ensure all numbers are stored as numbers =====
    const newItem = {
      medicineId: parseInt(currentItem.medicineId),
      medicineName: medicine.name,
      qty: parseInt(currentItem.qty) || 0,
      price: parseFloat(currentItem.price) || 0,
      mrp: parseFloat(currentItem.mrp) || 0,
      discount: parseFloat(currentItem.discount) || 0,
      total: total
    };

    const updatedItems = [...saleData.items, newItem];
    const { subtotal, grandTotal } = calculateTotals(
      updatedItems, 
      saleData.discount, 
      saleData.tax
    );

    setSaleData({
      ...saleData,
      items: updatedItems,
      subtotal,
      grandTotal
    });

    // Reset current item
    setCurrentItem({
      medicineId: '',
      medicineName: '',
      qty: 1,
      price: 0,
      mrp: 0,
      discount: 0,
      total: 0
    });
    setSearchMedicine('');

    showNotification('Item added successfully', 'success');
  };

  // Handle remove item
  const handleRemoveItem = (index) => {
    const updatedItems = saleData.items.filter((_, i) => i !== index);
    const { subtotal, grandTotal } = calculateTotals(
      updatedItems, 
      saleData.discount, 
      saleData.tax
    );

    setSaleData({
      ...saleData,
      items: updatedItems,
      subtotal,
      grandTotal
    });

    showNotification('Item removed', 'info');
  };

  // Handle discount change
  const handleDiscountChange = (discount) => {
    const discountValue = parseFloat(discount) || 0;
    const { subtotal, grandTotal } = calculateTotals(
      saleData.items, 
      discountValue, 
      saleData.tax
    );
    setSaleData({ ...saleData, discount: discountValue, grandTotal });
  };

  // Handle tax change
  const handleTaxChange = (tax) => {
    const taxValue = parseFloat(tax) || 0;
    const { subtotal, grandTotal } = calculateTotals(
      saleData.items, 
      saleData.discount, 
      taxValue
    );
    setSaleData({ ...saleData, tax: taxValue, grandTotal });
  };

  // Handle customer select
  const handleCustomerSelect = (customerId) => {
    const customer = getCustomerById(customerId);
    setSaleData({
      ...saleData,
      customerId: parseInt(customerId),
      customerName: customer?.name || 'Owner'
    });
  };

  // Handle save sale
  const handleSaveSale = () => {
    // Validation
    if (saleData.items.length === 0) {
      showNotification('Please add at least one item', 'error');
      return;
    }

    if (!checkPermission('sales', 'add') && !saleData.id) {
      showNotification('You do not have permission to add sales', 'error');
      return;
    }

    // Prepare data
    const saleToSave = {
      ...saleData,
      date: saleData.date,
      billNo: saleData.billNo || generateBillNo()
    };

    // Save
    if (saleData.id) {
      updateSale(saleData.id, saleToSave);
      showNotification('Sale updated successfully', 'success');
    } else {
      addSale(saleToSave);
      showNotification('Sale completed successfully', 'success');
      
      // Print bill after saving
      handlePrintBill(saleToSave);
      
      // Reset form for new sale
      setSaleData({
        id: null,
        date: new Date().toISOString().split('T')[0],
        billNo: generateBillNo(),
        customerId: '1',
        customerName: 'Owner',
        items: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        grandTotal: 0,
        paid: 0,
        paymentMode: 'cash',
        notes: '',
        status: 'completed'
      });
    }
  };

  // Handle print bill
  const handlePrintBill = (sale) => {
    const customer = getCustomerById(sale.customerId);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Sale Invoice #${sale.billNo}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 20px; 
              max-width: 300px;
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .header h1 { 
              margin: 0; 
              font-size: 18px;
              text-transform: uppercase;
            }
            .header p { 
              margin: 5px 0; 
              font-size: 12px;
            }
            .info {
              margin: 15px 0;
              font-size: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0;
              font-size: 12px;
            }
            th { 
              text-align: left; 
              border-bottom: 1px solid #000;
              padding: 5px 0;
            }
            td { 
              padding: 3px 0;
            }
            .total {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px dashed #000;
              text-align: right;
              font-size: 14px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companySettings.name}</h1>
            <p>${companySettings.address}</p>
            <p>Tel: ${companySettings.phone}</p>
          </div>
          
          <div class="info">
            <div class="info-row">
              <span>Bill No:</span>
              <span><strong>${sale.billNo}</strong></span>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${formatDate(sale.date)} ${formatTime(new Date())}</span>
            </div>
            <div class="info-row">
              <span>Customer:</span>
              <span>${customer?.name || 'Owner'}</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.medicineName.substring(0, 15)}</td>
                  <td>${item.qty}</td>
                  <td>${companySettings.currency} ${parseFloat(item.price).toFixed(2)}</td>
                  <td>${companySettings.currency} ${parseFloat(item.total).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p>Subtotal: ${companySettings.currency} ${parseFloat(sale.subtotal).toFixed(2)}</p>
            ${sale.discount > 0 ? `<p>Discount: ${companySettings.currency} ${parseFloat(sale.discount).toFixed(2)}</p>` : ''}
            ${sale.tax > 0 ? `<p>Tax (${sale.tax}%): ${companySettings.currency} ${(((parseFloat(sale.subtotal) - parseFloat(sale.discount)) * parseFloat(sale.tax)) / 100).toFixed(2)}</p>` : ''}
            <p><strong>Grand Total: ${companySettings.currency} ${parseFloat(sale.grandTotal).toFixed(2)}</strong></p>
            <p>Paid: ${companySettings.currency} ${parseFloat(sale.paid || sale.grandTotal).toFixed(2)}</p>
          </div>
          
          <div class="footer">
            <p>Items are not returnable</p>
            <p>Thank you for your business!</p>
            <p>Software by Logixify Labs</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      sales.map(s => ({
        'Bill No': s.billNo,
        'Date': s.date,
        'Customer': s.customerName,
        'Items': s.items.length,
        'Subtotal': s.subtotal,
        'Discount': s.discount,
        'Tax': s.tax,
        'Grand Total': s.grandTotal,
        'Status': s.status
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    XLSX.writeFile(workbook, `sales_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel file downloaded successfully', 'success');
  };

  // Handle export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Sales Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    
    const tableColumn = ['Bill No', 'Date', 'Customer', 'Items', 'Total'];
    const tableRows = [];
    
    sales.slice(0, 20).forEach(s => {
      const row = [
        s.billNo,
        s.date,
        s.customerName || 'Cash',
        s.items.length,
        `${companySettings.currency} ${parseFloat(s.grandTotal).toFixed(2)}`
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
    
    doc.save(`sales_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF file downloaded successfully', 'success');
  };

  // Calculate change
  const calculateChange = () => {
    const paid = parseFloat(saleData.paid) || 0;
    const total = saleData.grandTotal;
    return paid - total;
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Check permission
  if (!checkPermission('sales', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view sales.</p>
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
            <h1>Sale / Billing</h1>
            <div className="header-actions">
              {checkPermission('sales', 'add') && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setActiveTab('new');
                    setSaleData({
                      id: null,
                      date: new Date().toISOString().split('T')[0],
                      billNo: generateBillNo(),
                      customerId: '1',
                      customerName: 'Owner',
                      items: [],
                      subtotal: 0,
                      discount: 0,
                      tax: 0,
                      grandTotal: 0,
                      paid: 0,
                      paymentMode: 'cash',
                      notes: '',
                      status: 'completed'
                    });
                  }}
                >
                  + New Sale
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
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              New Sale
            </button>
            <button 
              className={`tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Sales History
            </button>
          </div>

          {/* New Sale Form */}
          {activeTab === 'new' && (
            <div className="card">
              <div className="card-header">
                <h2>New Sale / Billing</h2>
              </div>

              <div className="form-container">
                {/* Basic Information */}
                <div className="form-section">
                  <h3>Bill Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        value={saleData.date}
                        onChange={(e) => setSaleData({...saleData, date: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Bill Number *</label>
                      <input
                        type="text"
                        value={saleData.billNo}
                        onChange={(e) => setSaleData({...saleData, billNo: e.target.value})}
                        placeholder="Enter bill number"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Customer *</label>
                      <select
                        value={saleData.customerId}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        required
                      >
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} {customer.balance > 0 ? `(Due: ${companySettings.currency} ${customer.balance})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Payment Mode</label>
                      <select
                        value={saleData.paymentMode}
                        onChange={(e) => setSaleData({...saleData, paymentMode: e.target.value})}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="online">Online Transfer</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Amount Paid</label>
                      <input
                        type="number"
                        value={saleData.paid}
                        onChange={(e) => setSaleData({...saleData, paid: parseFloat(e.target.value) || 0})}
                        placeholder="Enter paid amount"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    {saleData.paid > 0 && (
                      <div className="form-group">
                        <label>Change</label>
                        <input
                          type="text"
                          value={`${companySettings.currency} ${calculateChange().toFixed(2)}`}
                          disabled
                          className={calculateChange() >= 0 ? 'success' : 'danger'}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Barcode Scanner */}
                <div className="form-section">
                  <h3>Barcode Scanner</h3>
                  <form onSubmit={handleBarcodeScan} className="form-row">
                    <div className="form-group" style={{flex: 3}}>
                      <label>Scan Barcode</label>
                      <input
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan or type barcode..."
                        autoFocus
                      />
                    </div>
                    <div className="form-group" style={{flex: 1}}>
                      <button type="submit" className="btn-primary" style={{marginTop: '24px'}}>
                        Scan
                      </button>
                    </div>
                  </form>
                </div>

                {/* Add Items */}
                <div className="form-section">
                  <h3>Add Items</h3>
                  
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search medicine by name or category..."
                      value={searchMedicine}
                      onChange={(e) => setSearchMedicine(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  {searchMedicine && filteredMedicines.length > 0 && (
                    <div className="search-results">
                      {filteredMedicines.slice(0, 5).map(med => (
                        <div 
                          key={med.id}
                          className="search-result-item"
                          onClick={() => {
                            setCurrentItem({
                              ...currentItem,
                              medicineId: med.id,
                              medicineName: med.name,
                              price: med.salePrice,
                              mrp: med.salePrice
                            });
                            setSearchMedicine('');
                          }}
                        >
                          <div>
                            <strong>{med.name}</strong>
                            <br />
                            <small>Stock: {med.stock} | Price: {companySettings.currency} {med.salePrice}</small>
                          </div>
                          {med.stock < 10 && (
                            <span className="badge badge-warning">Low Stock</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="item-form">
                    <div className="form-row">
                      <div className="form-group" style={{flex: 2}}>
                        <label>Medicine *</label>
                        <select
                          value={currentItem.medicineId}
                          onChange={(e) => {
                            const med = getMedicineById(e.target.value);
                            setCurrentItem({
                              ...currentItem,
                              medicineId: e.target.value,
                              medicineName: med?.name || '',
                              price: med?.salePrice || 0,
                              mrp: med?.salePrice || 0
                            });
                          }}
                        >
                          <option value="">Select Medicine</option>
                          {medicines.map(med => (
                            <option key={med.id} value={med.id}>
                              {med.name} (Stock: {med.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Quantity *</label>
                        <input
                          type="number"
                          value={currentItem.qty}
                          onChange={(e) => setCurrentItem({...currentItem, qty: parseInt(e.target.value) || 0})}
                          min="1"
                        />
                      </div>

                      <div className="form-group">
                        <label>Price *</label>
                        <input
                          type="number"
                          value={currentItem.price}
                          onChange={(e) => setCurrentItem({...currentItem, price: parseFloat(e.target.value) || 0})}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className="form-group">
                        <label>Discount</label>
                        <input
                          type="number"
                          value={currentItem.discount}
                          onChange={(e) => setCurrentItem({...currentItem, discount: parseFloat(e.target.value) || 0})}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className="form-group">
                        <label>Total</label>
                        <input
                          type="text"
                          value={formatCurrency(calculateItemTotal(currentItem))}
                          disabled
                          className="total-field"
                        />
                      </div>

                      <div className="form-group">
                        <button 
                          type="button" 
                          className="btn-add btn-primary"
                          onClick={handleAddItem}
                          style={{marginTop: '24px'}}
                        >
                          Add to Bill
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {saleData.items.length > 0 && (
                  <div className="items-section">
                    <h3>Sale Items</h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Discount</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {saleData.items.map((item, index) => (
                          <tr key={index}>
                            <td><strong>{item.medicineName}</strong></td>
                            <td>{item.qty}</td>
                            <td>{formatCurrency(item.price)}</td>
                            <td>{formatCurrency(item.discount || 0)}</td>
                            <td>{formatCurrency(item.total)}</td>
                            <td>
                              <button 
                                className="btn-icon" 
                                onClick={() => handleRemoveItem(index)}
                                title="Remove"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary */}
                <div className="form-section">
                  <h3>Payment Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <label>Subtotal:</label>
                      <span>{formatCurrency(saleData.subtotal)}</span>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Discount</label>
                        <input
                          type="number"
                          value={saleData.discount}
                          onChange={(e) => handleDiscountChange(e.target.value)}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className="form-group">
                        <label>Tax (%)</label>
                        <input
                          type="number"
                          value={saleData.tax}
                          onChange={(e) => handleTaxChange(e.target.value)}
                          step="0.1"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="summary-item total">
                      <label>Grand Total:</label>
                      <span>{formatCurrency(saleData.grandTotal)}</span>
                    </div>

                    <div className="summary-item">
                      <label>Balance Due:</label>
                      <span className={saleData.grandTotal - (saleData.paid || 0) > 0 ? 'danger' : 'success'}>
                        {formatCurrency(saleData.grandTotal - (saleData.paid || 0))}
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={saleData.notes}
                      onChange={(e) => setSaleData({...saleData, notes: e.target.value})}
                      placeholder="Enter any additional notes..."
                      rows="3"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear the bill?')) {
                        setSaleData({
                          id: null,
                          date: new Date().toISOString().split('T')[0],
                          billNo: generateBillNo(),
                          customerId: '1',
                          customerName: 'Owner',
                          items: [],
                          subtotal: 0,
                          discount: 0,
                          tax: 0,
                          grandTotal: 0,
                          paid: 0,
                          paymentMode: 'cash',
                          notes: '',
                          status: 'completed'
                        });
                      }
                    }}
                  >
                    Clear Bill
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={handleSaveSale}
                  >
                    Complete Sale & Print
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sales History */}
          {activeTab === 'list' && (
            <div className="card">
              <div className="card-header">
                <h2>Sales History</h2>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by bill no, customer, date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill No</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Subtotal</th>
                    <th>Discount</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => (
                    <tr key={sale.id}>
                      <td>{sale.date}</td>
                      <td><strong>{sale.billNo}</strong></td>
                      <td>{sale.customerName || 'Cash'}</td>
                      <td>{sale.items.length}</td>
                      <td>{formatCurrency(sale.subtotal)}</td>
                      <td>{formatCurrency(sale.discount || 0)}</td>
                      <td>{formatCurrency(sale.grandTotal)}</td>
                      <td>{formatCurrency(sale.paid || 0)}</td>
                      <td>
                        <span className={`badge badge-${sale.status}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-icon" 
                          onClick={() => handlePrintBill(sale)}
                          title="Print"
                        >
                          🖨️
                        </button>
                        {checkPermission('sales', 'edit') && (
                          <button 
                            className="btn-icon" 
                            onClick={() => {
                              setSaleData(sale);
                              setActiveTab('new');
                            }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                        )}
                        {checkPermission('sales', 'delete') && (
                          <button 
                            className="btn-icon" 
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center">
                        No sales found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="modal">
              <div className="modal-content small">
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete sale #{selectedSale?.billNo}?</p>
                <p className="warning">This action cannot be undone.</p>
                <div className="modal-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={() => {
                      deleteSale(selectedSale.id);
                      setShowDeleteConfirm(false);
                      showNotification('Sale deleted successfully', 'success');
                    }}
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

export default Sale;