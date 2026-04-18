import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Stock = () => {
  const { 
    user, 
    medicines, 
    addMedicine, 
    updateMedicine, 
    deleteMedicine,
    getMedicineById,
    checkPermission,
    companySettings,
    getLowStockMedicines,
    getNegativeStockMedicines,
    getExpiredMedicines,
    getNearExpiryMedicines
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [filterType, setFilterType] = useState('all');
  const [viewType, setViewType] = useState('grid');
  
  const [medicineData, setMedicineData] = useState({
    id: null,
    name: '',
    category: 'Tablet',
    manufacturer: '',
    description: '',
    purchasePrice: 0,
    salePrice: 0,
    mrp: 0,
    stock: 0,
    minStock: 10,
    maxStock: 100,
    location: '',
    rack: '',
    shelf: '',
    expiry: '',
    batchNo: '',
    barcode: '',
    formula: '',
    strength: '',
    unit: 'Pcs',
    pktSize: 1,
    gst: 0,
    hsnCode: '',
    active: true
  });

  const categories = [
    'Tablet', 'Capsule', 'Syrup', 'Drops', 'Injection', 
    'Ointment', 'Cream', 'Inhaler', 'Suspension', 'Powder',
    'IV Fluid', 'Surgical', 'Vitamin', 'Antibiotic', 'Other'
  ];

  const units = ['Pcs', 'Strip', 'Box', 'Bottle', 'Vial', 'Ampoule', 'Tube', 'Pack'];

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

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = 
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.category && med.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (med.manufacturer && med.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (med.batchNo && med.batchNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (med.barcode && med.barcode.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterType === 'low') {
      return med.stock <= (med.minStock || 10) && med.stock >= 0;
    } else if (filterType === 'negative') {
      return med.stock < 0;
    } else if (filterType === 'expired') {
      if (!med.expiry) return false;
      const today = new Date();
      const expiryDate = new Date(med.expiry + '-01');
      return expiryDate < today;
    } else if (filterType === 'nearExpiry') {
      if (!med.expiry) return false;
      const today = new Date();
      const expiryDate = new Date(med.expiry + '-01');
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      return expiryDate > today && expiryDate <= threeMonthsLater;
    }

    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = medicines.length;
  const totalStock = medicines.reduce((sum, med) => sum + med.stock, 0);
  const totalValue = medicines.reduce((sum, med) => sum + (med.stock * med.purchasePrice), 0);
  const totalSaleValue = medicines.reduce((sum, med) => sum + (med.stock * med.salePrice), 0);
  const potentialProfit = totalSaleValue - totalValue;

  const lowStockCount = getLowStockMedicines().length;
  const negativeStockCount = getNegativeStockMedicines().length;
  const expiredCount = getExpiredMedicines().length;
  const nearExpiryCount = getNearExpiryMedicines().length;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMedicineData({
      ...medicineData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveMedicine = () => {
    if (!medicineData.name) {
      showNotification('Please enter medicine name', 'error');
      return;
    }

    if (!medicineData.purchasePrice || medicineData.purchasePrice <= 0) {
      showNotification('Please enter valid purchase price', 'error');
      return;
    }

    if (!medicineData.salePrice || medicineData.salePrice <= 0) {
      showNotification('Please enter valid sale price', 'error');
      return;
    }

    if (!checkPermission('stock', 'add') && !medicineData.id) {
      showNotification('You do not have permission to add medicines', 'error');
      return;
    }

    if (!checkPermission('stock', 'edit') && medicineData.id) {
      showNotification('You do not have permission to edit medicines', 'error');
      return;
    }

    if (medicineData.id) {
      updateMedicine(medicineData.id, medicineData);
      showNotification('Medicine updated successfully', 'success');
    } else {
      addMedicine(medicineData);
      showNotification('Medicine added successfully', 'success');
    }

    setMedicineData({
      id: null,
      name: '',
      category: 'Tablet',
      manufacturer: '',
      description: '',
      purchasePrice: 0,
      salePrice: 0,
      mrp: 0,
      stock: 0,
      minStock: 10,
      maxStock: 100,
      location: '',
      rack: '',
      shelf: '',
      expiry: '',
      batchNo: '',
      barcode: '',
      formula: '',
      strength: '',
      unit: 'Pcs',
      pktSize: 1,
      gst: 0,
      hsnCode: '',
      active: true
    });

    setActiveTab('list');
  };

  const handleDeleteMedicine = () => {
    if (!checkPermission('stock', 'delete')) {
      showNotification('You do not have permission to delete medicines', 'error');
      return;
    }

    deleteMedicine(selectedMedicine.id);
    setShowDeleteConfirm(false);
    setSelectedMedicine(null);
    showNotification('Medicine deleted successfully', 'success');
  };

  const handleEditMedicine = (medicine) => {
    setMedicineData(medicine);
    setActiveTab('edit');
  };

  const handleStockAdjustment = (medicine, type) => {
    let newStock = medicine.stock;
    
    if (type === 'add') {
      newStock += 1;
    } else if (type === 'remove') {
      newStock -= 1;
    } else if (type === 'set') {
      const value = prompt('Enter new stock quantity:', medicine.stock);
      if (value !== null) {
        newStock = parseInt(value) || 0;
      }
    }

    if (newStock !== medicine.stock) {
      updateMedicine(medicine.id, { ...medicine, stock: newStock });
      showNotification(`Stock updated to ${newStock}`, 'success');
    }
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredMedicines.map(m => ({
        'Name': m.name,
        'Category': m.category,
        'Manufacturer': m.manufacturer,
        'Stock': m.stock,
        'Purchase Price': m.purchasePrice,
        'Sale Price': m.salePrice,
        'Location': m.location,
        'Expiry': m.expiry,
        'Batch No': m.batchNo
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
    XLSX.writeFile(workbook, `stock_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Excel file downloaded successfully', 'success');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Stock Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Total Items: ${totalItems} | Total Value: ${companySettings.currency} ${totalValue.toFixed(2)}`, 14, 42);
    
    const tableColumn = ['Name', 'Category', 'Stock', 'Price', 'Location', 'Expiry'];
    const tableRows = [];
    
    filteredMedicines.slice(0, 50).forEach(m => {
      const row = [
        m.name,
        m.category || '-',
        m.stock,
        `${companySettings.currency} ${m.salePrice}`,
        m.location || '-',
        m.expiry || '-'
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
    
    doc.save(`stock_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('PDF file downloaded successfully', 'success');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('stock', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view stock.</p>
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
            <h1>Stock Management</h1>
            <div className="header-actions">
              {checkPermission('stock', 'add') && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setMedicineData({
                      id: null,
                      name: '',
                      category: 'Tablet',
                      manufacturer: '',
                      description: '',
                      purchasePrice: 0,
                      salePrice: 0,
                      mrp: 0,
                      stock: 0,
                      minStock: 10,
                      maxStock: 100,
                      location: '',
                      rack: '',
                      shelf: '',
                      expiry: '',
                      batchNo: '',
                      barcode: '',
                      formula: '',
                      strength: '',
                      unit: 'Pcs',
                      pktSize: 1,
                      gst: 0,
                      hsnCode: '',
                      active: true
                    });
                    setActiveTab('add');
                  }}
                >
                  + Add Medicine
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

          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h3>Total Items</h3>
                <p className="stat-value">{totalItems}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>Stock Value</h3>
                <p className="stat-value">{companySettings.currency} {totalValue.toFixed(2)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-info">
                <h3>Sale Value</h3>
                <p className="stat-value">{companySettings.currency} {totalSaleValue.toFixed(2)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💵</div>
              <div className="stat-info">
                <h3>Profit Potential</h3>
                <p className={`stat-value ${potentialProfit >= 0 ? 'profit' : 'negative'}`}>
                  {companySettings.currency} {potentialProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Alert Cards */}
          <div className="alert-grid">
            <div className="alert-card warning">
              <h3>Low Stock</h3>
              <p className="alert-value">{lowStockCount}</p>
            </div>
            <div className="alert-card danger">
              <h3>Negative Stock</h3>
              <p className="alert-value">{negativeStockCount}</p>
            </div>
            <div className="alert-card info">
              <h3>Near Expiry</h3>
              <p className="alert-value">{nearExpiryCount}</p>
            </div>
            <div className="alert-card secondary">
              <h3>Expired</h3>
              <p className="alert-value">{expiredCount}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Stock List
            </button>
            <button 
              className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              Categories
            </button>
            {(activeTab === 'add' || activeTab === 'edit') && (
              <button className="tab active">
                {activeTab === 'add' ? 'Add Medicine' : 'Edit Medicine'}
              </button>
            )}
          </div>

          {/* Stock List Tab */}
          {activeTab === 'list' && (
            <div className="card">
              <div className="card-header">
                <h2>Stock Inventory</h2>
                <div className="filter-section">
                  <select 
                    className="filter-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Items</option>
                    <option value="low">Low Stock</option>
                    <option value="negative">Negative Stock</option>
                    <option value="nearExpiry">Near Expiry</option>
                    <option value="expired">Expired</option>
                  </select>

                  <select 
                    className="filter-select"
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                  >
                    <option value="grid">Grid View</option>
                    <option value="list">List View</option>
                    <option value="value">Value View</option>
                  </select>

                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search medicines..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
              </div>

              {/* Grid View */}
              {viewType === 'grid' && (
                <div className="stock-grid">
                  {filteredMedicines.map(medicine => {
                    const isLowStock = medicine.stock <= (medicine.minStock || 10) && medicine.stock >= 0;
                    const isNegative = medicine.stock < 0;
                    const isExpired = medicine.expiry && new Date(medicine.expiry + '-01') < new Date();
                    
                    return (
                      <div key={medicine.id} className="stock-card">
                        <div className="stock-card-header">
                          <h3>{medicine.name}</h3>
                          <div className="stock-badges">
                            {isExpired && <span className="badge badge-danger">Expired</span>}
                            {isNegative && <span className="badge badge-danger">Negative</span>}
                            {isLowStock && !isNegative && <span className="badge badge-warning">Low</span>}
                          </div>
                        </div>
                        <div className="stock-card-body">
                          <p><strong>Category:</strong> {medicine.category || '-'}</p>
                          <p><strong>Stock:</strong> 
                            <span className={isNegative ? 'text-danger' : isLowStock ? 'text-warning' : 'text-success'}>
                              {medicine.stock} {medicine.unit || 'Pcs'}
                            </span>
                          </p>
                          <p><strong>Purchase:</strong> {companySettings.currency} {medicine.purchasePrice}</p>
                          <p><strong>Sale:</strong> {companySettings.currency} {medicine.salePrice}</p>
                          <p><strong>Location:</strong> {medicine.location || '-'}</p>
                          <p><strong>Expiry:</strong> 
                            <span className={isExpired ? 'text-danger' : ''}>
                              {medicine.expiry || 'N/A'}
                            </span>
                          </p>
                        </div>
                        <div className="stock-card-footer">
                          <button 
                            className="btn-icon" 
                            onClick={() => handleStockAdjustment(medicine, 'remove')}
                            title="Decrease Stock"
                          >➖</button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleStockAdjustment(medicine, 'set')}
                            title="Set Stock"
                          >✏️</button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleStockAdjustment(medicine, 'add')}
                            title="Increase Stock"
                          >➕</button>
                          {checkPermission('stock', 'edit') && (
                            <button 
                              className="btn-icon" 
                              onClick={() => handleEditMedicine(medicine)}
                              title="Edit"
                            >📝</button>
                          )}
                          {checkPermission('stock', 'delete') && (
                            <button 
                              className="btn-icon" 
                              onClick={() => {
                                setSelectedMedicine(medicine);
                                setShowDeleteConfirm(true);
                              }}
                              title="Delete"
                            >🗑️</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List View */}
              {viewType === 'list' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Purchase</th>
                      <th>Sale</th>
                      <th>Location</th>
                      <th>Expiry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedicines.map(medicine => {
                      const isLowStock = medicine.stock <= (medicine.minStock || 10) && medicine.stock >= 0;
                      const isNegative = medicine.stock < 0;
                      const isExpired = medicine.expiry && new Date(medicine.expiry + '-01') < new Date();
                      
                      return (
                        <tr key={medicine.id}>
                          <td><strong>{medicine.name}</strong></td>
                          <td>{medicine.category || '-'}</td>
                          <td className={
                            isNegative ? 'text-danger' : 
                            isLowStock ? 'text-warning' : 'text-success'
                          }>
                            {medicine.stock} {medicine.unit || 'Pcs'}
                          </td>
                          <td>{companySettings.currency} {medicine.purchasePrice}</td>
                          <td>{companySettings.currency} {medicine.salePrice}</td>
                          <td>{medicine.location || '-'}</td>
                          <td className={isExpired ? 'text-danger' : ''}>
                            {medicine.expiry || '-'}
                          </td>
                          <td>
                            <button className="btn-icon" onClick={() => handleStockAdjustment(medicine, 'remove')}>➖</button>
                            <button className="btn-icon" onClick={() => handleStockAdjustment(medicine, 'set')}>✏️</button>
                            <button className="btn-icon" onClick={() => handleStockAdjustment(medicine, 'add')}>➕</button>
                            {checkPermission('stock', 'edit') && (
                              <button className="btn-icon" onClick={() => handleEditMedicine(medicine)}>📝</button>
                            )}
                            {checkPermission('stock', 'delete') && (
                              <button className="btn-icon" onClick={() => {
                                setSelectedMedicine(medicine);
                                setShowDeleteConfirm(true);
                              }}>🗑️</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Value View */}
              {viewType === 'value' && (
                <div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Stock</th>
                        <th>Purchase Value</th>
                        <th>Sale Value</th>
                        <th>Profit</th>
                        <th>Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMedicines.map(medicine => {
                        const purchaseValue = medicine.stock * medicine.purchasePrice;
                        const saleValue = medicine.stock * medicine.salePrice;
                        const profit = saleValue - purchaseValue;
                        const margin = medicine.purchasePrice > 0 
                          ? ((medicine.salePrice - medicine.purchasePrice) / medicine.purchasePrice * 100).toFixed(1)
                          : 0;
                        
                        return (
                          <tr key={medicine.id}>
                            <td><strong>{medicine.name}</strong></td>
                            <td>{medicine.stock}</td>
                            <td>{companySettings.currency} {purchaseValue.toFixed(2)}</td>
                            <td>{companySettings.currency} {saleValue.toFixed(2)}</td>
                            <td className={profit >= 0 ? 'text-success' : 'text-danger'}>
                              {companySettings.currency} {profit.toFixed(2)}
                            </td>
                            <td className={margin >= 0 ? 'text-success' : 'text-danger'}>
                              {margin}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="card">
              <div className="card-header">
                <h2>Categories Summary</h2>
              </div>

              <div className="categories-grid">
                {categories.map(category => {
                  const categoryItems = medicines.filter(m => m.category === category);
                  const totalStock = categoryItems.reduce((sum, m) => sum + m.stock, 0);
                  const totalValue = categoryItems.reduce((sum, m) => sum + (m.stock * m.purchasePrice), 0);
                  
                  return (
                    <div key={category} className="category-card">
                      <h3>{category}</h3>
                      <div className="category-stats">
                        <p><strong>Items:</strong> {categoryItems.length}</p>
                        <p><strong>Total Stock:</strong> {totalStock}</p>
                        <p><strong>Total Value:</strong> {companySettings.currency} {totalValue.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add/Edit Medicine Form */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <div className="card">
              <div className="card-header">
                <h2>{medicineData.id ? 'Edit Medicine' : 'Add New Medicine'}</h2>
              </div>

              <div className="form-container">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Medicine Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={medicineData.name}
                        onChange={handleInputChange}
                        placeholder="Enter medicine name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Category *</label>
                      <select
                        name="category"
                        value={medicineData.category}
                        onChange={handleInputChange}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Manufacturer</label>
                      <input
                        type="text"
                        name="manufacturer"
                        value={medicineData.manufacturer}
                        onChange={handleInputChange}
                        placeholder="Enter manufacturer"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Barcode</label>
                      <input
                        type="text"
                        name="barcode"
                        value={medicineData.barcode}
                        onChange={handleInputChange}
                        placeholder="Enter barcode"
                      />
                    </div>

                    <div className="form-group">
                      <label>HSN Code</label>
                      <input
                        type="text"
                        name="hsnCode"
                        value={medicineData.hsnCode}
                        onChange={handleInputChange}
                        placeholder="Enter HSN code"
                      />
                    </div>

                    <div className="form-group">
                      <label>GST (%)</label>
                      <input
                        type="number"
                        name="gst"
                        value={medicineData.gst}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Pricing & Stock</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Purchase Price *</label>
                      <input
                        type="number"
                        name="purchasePrice"
                        value={medicineData.purchasePrice}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Sale Price *</label>
                      <input
                        type="number"
                        name="salePrice"
                        value={medicineData.salePrice}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>MRP</label>
                      <input
                        type="number"
                        name="mrp"
                        value={medicineData.mrp}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Current Stock *</label>
                      <input
                        type="number"
                        name="stock"
                        value={medicineData.stock}
                        onChange={handleInputChange}
                        min="0"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Minimum Stock</label>
                      <input
                        type="number"
                        name="minStock"
                        value={medicineData.minStock}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Maximum Stock</label>
                      <input
                        type="number"
                        name="maxStock"
                        value={medicineData.maxStock}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Unit</label>
                      <select
                        name="unit"
                        value={medicineData.unit}
                        onChange={handleInputChange}
                      >
                        {units.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Packet Size</label>
                      <input
                        type="number"
                        name="pktSize"
                        value={medicineData.pktSize}
                        onChange={handleInputChange}
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label>Batch No</label>
                      <input
                        type="text"
                        name="batchNo"
                        value={medicineData.batchNo}
                        onChange={handleInputChange}
                        placeholder="Enter batch number"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Location & Expiry</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        name="location"
                        value={medicineData.location}
                        onChange={handleInputChange}
                        placeholder="e.g., Shelf A-1"
                      />
                    </div>

                    <div className="form-group">
                      <label>Rack</label>
                      <input
                        type="text"
                        name="rack"
                        value={medicineData.rack}
                        onChange={handleInputChange}
                        placeholder="Rack number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Shelf</label>
                      <input
                        type="text"
                        name="shelf"
                        value={medicineData.shelf}
                        onChange={handleInputChange}
                        placeholder="Shelf number"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input
                        type="month"
                        name="expiry"
                        value={medicineData.expiry}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Formula/Composition</label>
                      <input
                        type="text"
                        name="formula"
                        value={medicineData.formula}
                        onChange={handleInputChange}
                        placeholder="e.g., Paracetamol 500mg"
                      />
                    </div>

                    <div className="form-group">
                      <label>Strength</label>
                      <input
                        type="text"
                        name="strength"
                        value={medicineData.strength}
                        onChange={handleInputChange}
                        placeholder="e.g., 500mg"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Additional Information</h3>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={medicineData.description}
                      onChange={handleInputChange}
                      placeholder="Enter medicine description..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        name="active"
                        checked={medicineData.active}
                        onChange={handleInputChange}
                      />
                      Active (available for sale)
                    </label>
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
                    onClick={handleSaveMedicine}
                  >
                    {medicineData.id ? 'Update Medicine' : 'Save Medicine'}
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
                <p>Are you sure you want to delete {selectedMedicine?.name}?</p>
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
                    onClick={handleDeleteMedicine}
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

export default Stock;