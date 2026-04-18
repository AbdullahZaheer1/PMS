import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Purchase = () => {
  const { 
    user, 
    suppliers, 
    medicines, 
    addPurchase, 
    updatePurchase, 
    deletePurchase,
    purchases,
    getSupplierById,
    getMedicineById,
    checkPermission,
    companySettings
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const [purchaseData, setPurchaseData] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    billNo: generateBillNo(),
    supplierId: '',
    supplierName: '',
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    grandTotal: 0,
    paid: 0,
    paymentMode: 'cash',
    notes: '',
    status: 'pending'
  });

  const [currentItem, setCurrentItem] = useState({
    medicineId: '',
    medicineName: '',
    qty: 1,
    rate: 0,
    mrp: 0,
    expiry: '',
    batchNo: '',
    discount: 0,
    total: 0
  });

  const [searchMedicine, setSearchMedicine] = useState('');

  function generateBillNo() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PUR-${year}${month}${day}-${random}`;
  }

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

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchMedicine.toLowerCase())
  );

  const filteredPurchases = purchases.filter(p => 
    p.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.supplierName && p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  const calculateItemTotal = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discount = parseFloat(item.discount) || 0;
    return (qty * rate) - discount;
  };

  const calculateTotals = (items, tax, discount) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal * (parseFloat(tax) || 0)) / 100;
    const grandTotal = subtotal + taxAmount - (parseFloat(discount) || 0);
    return { subtotal, grandTotal };
  };

  const handleAddItem = () => {
    if (!currentItem.medicineId) {
      showNotification('Please select a medicine', 'error');
      return;
    }
    if (!currentItem.qty || currentItem.qty <= 0) {
      showNotification('Please enter valid quantity', 'error');
      return;
    }
    if (!currentItem.rate || currentItem.rate <= 0) {
      showNotification('Please enter valid rate', 'error');
      return;
    }

    const medicine = getMedicineById(currentItem.medicineId);
    const total = calculateItemTotal(currentItem);
    
    const newItem = {
      ...currentItem,
      medicineId: parseInt(currentItem.medicineId),
      medicineName: medicine.name,
      total
    };

    const updatedItems = [...purchaseData.items, newItem];
    const { subtotal, grandTotal } = calculateTotals(
      updatedItems, 
      purchaseData.tax, 
      purchaseData.discount
    );

    setPurchaseData({
      ...purchaseData,
      items: updatedItems,
      subtotal,
      grandTotal
    });

    setCurrentItem({
      medicineId: '',
      medicineName: '',
      qty: 1,
      rate: 0,
      mrp: 0,
      expiry: '',
      batchNo: '',
      discount: 0,
      total: 0
    });
    setSearchMedicine('');
    showNotification('Item added successfully', 'success');
  };

  const handleRemoveItem = (index) => {
    const updatedItems = purchaseData.items.filter((_, i) => i !== index);
    const { subtotal, grandTotal } = calculateTotals(
      updatedItems, 
      purchaseData.tax, 
      purchaseData.discount
    );
    setPurchaseData({ ...purchaseData, items: updatedItems, subtotal, grandTotal });
    showNotification('Item removed', 'info');
  };

  const handleTaxChange = (tax) => {
    const taxValue = parseFloat(tax) || 0;
    const { subtotal, grandTotal } = calculateTotals(
      purchaseData.items, 
      taxValue, 
      purchaseData.discount
    );
    setPurchaseData({ ...purchaseData, tax: taxValue, grandTotal });
  };

  const handleDiscountChange = (discount) => {
    const discountValue = parseFloat(discount) || 0;
    const { subtotal, grandTotal } = calculateTotals(
      purchaseData.items, 
      purchaseData.tax, 
      discountValue
    );
    setPurchaseData({ ...purchaseData, discount: discountValue, grandTotal });
  };

  const handleSupplierSelect = (supplierId) => {
    const supplier = getSupplierById(supplierId);
    setPurchaseData({
      ...purchaseData,
      supplierId: parseInt(supplierId),
      supplierName: supplier?.name || ''
    });
  };

  const handleSavePurchase = () => {
    if (!purchaseData.supplierId) {
      showNotification('Please select a supplier', 'error');
      return;
    }
    if (purchaseData.items.length === 0) {
      showNotification('Please add at least one item', 'error');
      return;
    }

    const purchaseToSave = {
      ...purchaseData,
      date: purchaseData.date,
      billNo: purchaseData.billNo || generateBillNo()
    };

    if (purchaseData.id) {
      updatePurchase(purchaseData.id, purchaseToSave);
      showNotification('Purchase updated successfully', 'success');
    } else {
      addPurchase(purchaseToSave);
      showNotification('Purchase saved successfully', 'success');
      setPurchaseData({
        id: null,
        date: new Date().toISOString().split('T')[0],
        billNo: generateBillNo(),
        supplierId: '',
        supplierName: '',
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        grandTotal: 0,
        paid: 0,
        paymentMode: 'cash',
        notes: '',
        status: 'pending'
      });
    }
  };

  const handlePrintPurchase = (purchase) => {
    const supplier = getSupplierById(purchase.supplierId);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Invoice #${purchase.billNo}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #2563eb; color: white; padding: 10px; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companySettings.name}</h1>
            <p>${companySettings.address}</p>
          </div>
          <h2>Purchase Invoice #${purchase.billNo}</h2>
          <p>Date: ${purchase.date}</p>
          <p>Supplier: ${supplier?.name}</p>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>
              ${purchase.items.map(item => `
                <tr>
                  <td>${item.medicineName}</td>
                  <td>${item.qty}</td>
                  <td>${companySettings.currency} ${item.rate}</td>
                  <td>${companySettings.currency} ${item.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h3>Total: ${companySettings.currency} ${purchase.grandTotal}</h3>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      purchases.map(p => ({
        'Bill No': p.billNo,
        'Date': p.date,
        'Supplier': p.supplierName,
        'Items': p.items.length,
        'Total': p.grandTotal,
        'Status': p.status
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases');
    XLSX.writeFile(workbook, `purchases_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel file downloaded', 'success');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('purchases', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view purchases.</p>
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
            <h1>Purchase Management</h1>
            <div className="header-actions">
              {checkPermission('purchases', 'add') && (
                <button className="btn-primary" onClick={() => setActiveTab('new')}>
                  + New Purchase
                </button>
              )}
              <button className="btn-secondary" onClick={handleExportExcel}>
                📊 Export Excel
              </button>
            </div>
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>
              New Purchase
            </button>
            <button className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
              Purchase List
            </button>
          </div>

          {(activeTab === 'new' || activeTab === 'edit') && (
            <div className="card">
              <div className="card-header">
                <h2>{purchaseData.id ? 'Edit Purchase' : 'New Purchase'}</h2>
              </div>

              <div className="form-container">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date *</label>
                      <input type="date" value={purchaseData.date} onChange={(e) => setPurchaseData({...purchaseData, date: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Bill Number *</label>
                      <input type="text" value={purchaseData.billNo} onChange={(e) => setPurchaseData({...purchaseData, billNo: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Supplier *</label>
                      <select value={purchaseData.supplierId} onChange={(e) => handleSupplierSelect(e.target.value)}>
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Add Items</h3>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search medicine..."
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
                              rate: med.purchasePrice || 0
                            });
                            setSearchMedicine('');
                          }}
                        >
                          <strong>{med.name}</strong> - Stock: {med.stock}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="item-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Medicine *</label>
                        <select value={currentItem.medicineId} onChange={(e) => {
                          const med = getMedicineById(e.target.value);
                          setCurrentItem({
                            ...currentItem,
                            medicineId: e.target.value,
                            medicineName: med?.name || '',
                            rate: med?.purchasePrice || 0
                          });
                        }}>
                          <option value="">Select</option>
                          {medicines.map(med => (
                            <option key={med.id} value={med.id}>{med.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Batch No</label>
                        <input type="text" value={currentItem.batchNo} onChange={(e) => setCurrentItem({...currentItem, batchNo: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Expiry</label>
                        <input type="month" value={currentItem.expiry} onChange={(e) => setCurrentItem({...currentItem, expiry: e.target.value})} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Quantity *</label>
                        <input type="number" value={currentItem.qty} onChange={(e) => setCurrentItem({...currentItem, qty: parseInt(e.target.value) || 0})} />
                      </div>
                      <div className="form-group">
                        <label>Rate *</label>
                        <input type="number" value={currentItem.rate} onChange={(e) => setCurrentItem({...currentItem, rate: parseFloat(e.target.value) || 0})} step="0.01" />
                      </div>
                      <div className="form-group">
                        <label>Discount</label>
                        <input type="number" value={currentItem.discount} onChange={(e) => setCurrentItem({...currentItem, discount: parseFloat(e.target.value) || 0})} step="0.01" />
                      </div>
                      <div className="form-group">
                        <br />
                        <button type="button" className="btn-primary" onClick={handleAddItem}>
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {purchaseData.items.length > 0 && (
                  <div className="items-section">
                    <h3>Purchase Items</h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Batch</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseData.items.map((item, index) => (
                          <tr key={index}>
                            <td>{item.medicineName}</td>
                            <td>{item.batchNo || '-'}</td>
                            <td>{item.qty}</td>
                            <td>{companySettings.currency} {item.rate}</td>
                            <td>{companySettings.currency} {item.total}</td>
                            <td>
                              <button className="btn-icon" onClick={() => handleRemoveItem(index)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="form-section">
                  <h3>Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <label>Subtotal:</label>
                      <span>{companySettings.currency} {purchaseData.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tax (%)</label>
                        <input type="number" value={purchaseData.tax} onChange={(e) => handleTaxChange(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Discount</label>
                        <input type="number" value={purchaseData.discount} onChange={(e) => handleDiscountChange(e.target.value)} />
                      </div>
                    </div>
                    <div className="summary-item total">
                      <label>Grand Total:</label>
                      <span>{companySettings.currency} {purchaseData.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn-secondary" onClick={() => {
                    if (window.confirm('Clear form?')) {
                      setPurchaseData({
                        id: null,
                        date: new Date().toISOString().split('T')[0],
                        billNo: generateBillNo(),
                        supplierId: '',
                        supplierName: '',
                        items: [],
                        subtotal: 0,
                        tax: 0,
                        discount: 0,
                        grandTotal: 0,
                        paid: 0,
                        paymentMode: 'cash',
                        notes: '',
                        status: 'pending'
                      });
                    }
                  }}>Clear</button>
                  <button className="btn-primary" onClick={handleSavePurchase}>
                    {purchaseData.id ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="card">
              <div className="card-header">
                <h2>Purchase List</h2>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search..."
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
                    <th>Supplier</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map(p => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td><strong>{p.billNo}</strong></td>
                      <td>{p.supplierName}</td>
                      <td>{p.items.length}</td>
                      <td>{companySettings.currency} {p.grandTotal}</td>
                      <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                      <td>
                        <button className="btn-icon" onClick={() => handlePrintPurchase(p)}>🖨️</button>
                        {checkPermission('purchases', 'edit') && (
                          <button className="btn-icon" onClick={() => {
                            setPurchaseData(p);
                            setActiveTab('edit');
                          }}>✏️</button>
                        )}
                        {checkPermission('purchases', 'delete') && (
                          <button className="btn-icon" onClick={() => {
                            setSelectedPurchase(p);
                            setShowDeleteConfirm(true);
                          }}>🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="modal">
              <div className="modal-content">
                <h3>Confirm Delete</h3>
                <p>Delete purchase #{selectedPurchase?.billNo}?</p>
                <p className="warning">This action cannot be undone.</p>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  <button className="btn-danger" onClick={() => {
                    deletePurchase(selectedPurchase.id);
                    setShowDeleteConfirm(false);
                    showNotification('Purchase deleted', 'success');
                  }}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Purchase;