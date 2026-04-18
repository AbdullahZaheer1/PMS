import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

const PurchaseReport = () => {
  const { user, purchases, suppliers, medicines } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filters, setFilters] = useState({
    company: '',
    item: '',
    fromDate: '',
    toDate: '',
    category: 'all'
  });
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalQty: 0,
    totalItems: 0,
    avgRate: 0
  });
  const [groupBy, setGroupBy] = useState('date');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let filtered = [...purchases];

    if (filters.company) {
      filtered = filtered.filter(p => p.supplierId === parseInt(filters.company));
    }

    if (filters.fromDate) {
      filtered = filtered.filter(p => p.date >= filters.fromDate);
    }
    if (filters.toDate) {
      filtered = filtered.filter(p => p.date <= filters.toDate);
    }

    if (filters.item) {
      filtered = filtered.filter(p => 
        p.items?.some(item => 
          item.medicineName?.toLowerCase().includes(filters.item.toLowerCase())
        )
      );
    }

    setFilteredPurchases(filtered);

    const allItems = filtered.flatMap(p => p.items || []);
    const totalAmount = allItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalQty = allItems.reduce((sum, item) => sum + (item.qty || 0), 0);
    
    setSummary({
      totalAmount,
      totalQty,
      totalItems: allItems.length,
      avgRate: totalQty > 0 ? totalAmount / totalQty : 0
    });
  }, [filters, purchases]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const allPurchaseItems = filteredPurchases.flatMap(purchase => 
    (purchase.items || []).map(item => ({
      ...item,
      purchaseDate: purchase.date,
      billNo: purchase.billNo,
      supplierId: purchase.supplierId,
      supplierName: suppliers.find(s => s.id === purchase.supplierId)?.name || 'Unknown',
      purchaseTotal: purchase.total,
      purchaseGST: purchase.gst,
      purchaseGrandTotal: purchase.grandTotal || purchase.total
    }))
  ).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

  const getGroupedData = () => {
    if (groupBy === 'company') {
      const grouped = {};
      allPurchaseItems.forEach(item => {
        if (!grouped[item.supplierName]) {
          grouped[item.supplierName] = { items: [], totalQty: 0, totalAmount: 0 };
        }
        grouped[item.supplierName].items.push(item);
        grouped[item.supplierName].totalQty += item.qty || 0;
        grouped[item.supplierName].totalAmount += item.total || 0;
      });
      return grouped;
    } else if (groupBy === 'item') {
      const grouped = {};
      allPurchaseItems.forEach(item => {
        if (!grouped[item.medicineName]) {
          grouped[item.medicineName] = { items: [], totalQty: 0, totalAmount: 0, avgRate: 0 };
        }
        grouped[item.medicineName].items.push(item);
        grouped[item.medicineName].totalQty += item.qty || 0;
        grouped[item.medicineName].totalAmount += item.total || 0;
      });
      
      Object.keys(grouped).forEach(key => {
        grouped[key].avgRate = grouped[key].totalQty > 0 ? grouped[key].totalAmount / grouped[key].totalQty : 0;
      });
      
      return grouped;
    }
    return null;
  };

  const groupedData = getGroupedData();

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    
    let content = '';
    
    if (groupBy === 'date') {
      content = `
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th>Date</th>
              <th>Bill No</th>
              <th>Supplier</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${allPurchaseItems.map(item => `
              <tr>
                <td>${item.purchaseDate}</td>
                <td>${item.billNo}</td>
                <td>${item.supplierName}</td>
                <td>${item.medicineName}</td>
                <td align="center">${item.qty}</td>
                <td align="right">Rs. ${item.rate.toFixed(2)}</td>
                <td align="right">Rs. ${item.total?.toFixed(2) || 0}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #f3f4f6;">
              <td colspan="6" align="right">Grand Total:</td>
              <td align="right">Rs. ${summary.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (groupBy === 'company' && groupedData) {
      content = Object.entries(groupedData).map(([company, data]) => `
        <h3>${company}</h3>
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th>Date</th>
              <th>Bill No</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.purchaseDate}</td>
                <td>${item.billNo}</td>
                <td>${item.medicineName}</td>
                <td align="center">${item.qty}</td>
                <td align="right">Rs. ${item.rate.toFixed(2)}</td>
                <td align="right">Rs. ${item.total?.toFixed(2) || 0}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #f3f4f6;">
              <td colspan="5" align="right">Total for ${company}:</td>
              <td align="right">Rs. ${data.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      `).join('');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .summary { margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 5px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Logixify Labs</h1>
            <p>Purchase Report</p>
            <p>Period: ${filters.fromDate || 'All'} to ${filters.toDate || 'All'}</p>
          </div>
          
          <div class="summary">
            <p><strong>Total Items:</strong> ${summary.totalItems}</p>
            <p><strong>Total Quantity:</strong> ${summary.totalQty}</p>
            <p><strong>Total Amount:</strong> Rs. ${summary.totalAmount.toFixed(2)}</p>
            <p><strong>Average Rate:</strong> Rs. ${summary.avgRate.toFixed(2)}</p>
          </div>
          
          ${content}
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Software by Logixify Labs :- +92 325 6260050</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header user={user} time={formatTime(currentTime)} />
        
        <div className="content">
          {/* Header */}
          <div className="stock-header">
            <h2>Purchase Report</h2>
            <div style={{display: 'flex', gap: '10px'}}>
              <select 
                className="stock-type" 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="date">Group by Date</option>
                <option value="company">Group by Company</option>
                <option value="item">Group by Item</option>
              </select>
              <button className="btn-primary" onClick={handlePrintReport}>
                Print Report
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="search-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="filterCompany">Filter by Company</label>
                <select
                  id="filterCompany"
                  className="filter-select"  // ✅ Added className
                  value={filters.company}
                  onChange={(e) => setFilters({...filters, company: e.target.value})}
                >
                  <option value="">All Companies</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="filterItem">Filter by Item</label>
                <input
                  id="filterItem"
                  type="text"
                  className="filter-input"  // ✅ ADDED: className="filter-input"
                  placeholder="Search item..."
                  value={filters.item}
                  onChange={(e) => setFilters({...filters, item: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fromDate">From Date</label>
                <input
                  id="fromDate"
                  type="date"
                  className="filter-input"  // ✅ Already had className
                  value={filters.fromDate}
                  onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="toDate">To Date</label>
                <input
                  id="toDate"
                  type="date"
                  className="filter-input"  // ✅ Already had className
                  value={filters.toDate}
                  onChange={(e) => setFilters({...filters, toDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="report-summary">
            <div className="summary-card">
              <h3>Total Items</h3>
              <p>{summary.totalItems}</p>
            </div>
            <div className="summary-card">
              <h3>Total Quantity</h3>
              <p>{summary.totalQty}</p>
            </div>
            <div className="summary-card">
              <h3>Total Amount</h3>
              <p>Rs. {summary.totalAmount.toFixed(2)}</p>
            </div>
            <div className="summary-card">
              <h3>Average Rate</h3>
              <p>Rs. {summary.avgRate.toFixed(2)}</p>
            </div>
          </div>

          {/* Detailed Report */}
          <div className="card">
            <div className="card-header">
              <h2>Purchase Details</h2>
              <span>{filteredPurchases.length} transactions</span>
            </div>

            {groupBy === 'date' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill No</th>
                    <th>Supplier</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {allPurchaseItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.purchaseDate}</td>
                      <td>{item.billNo}</td>
                      <td>{item.supplierName}</td>
                      <td>{item.medicineName}</td>
                      <td>{item.qty}</td>
                      <td>Rs. {item.rate.toFixed(2)}</td>
                      <td>Rs. {item.total?.toFixed(2) || 0}</td>
                    </tr>
                  ))}
                  {allPurchaseItems.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center">No purchases found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {groupBy === 'company' && groupedData && (
              <div>
                {Object.entries(groupedData).map(([company, data]) => (
                  <div key={company} style={{marginBottom: '30px'}}>
                    <h3 style={{margin: '15px 0', padding: '10px', background: '#f3f4f6'}}>
                      {company} - Total: Rs. {data.totalAmount.toFixed(2)}
                    </h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Bill No</th>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.purchaseDate}</td>
                            <td>{item.billNo}</td>
                            <td>{item.medicineName}</td>
                            <td>{item.qty}</td>
                            <td>Rs. {item.rate.toFixed(2)}</td>
                            <td>Rs. {item.total?.toFixed(2) || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {groupBy === 'item' && groupedData && (
              <div>
                {Object.entries(groupedData).map(([itemName, data]) => (
                  <div key={itemName} style={{marginBottom: '30px'}}>
                    <h3 style={{margin: '15px 0', padding: '10px', background: '#f3f4f6'}}>
                      {itemName} - Total Qty: {data.totalQty}, Avg Rate: Rs. {data.avgRate.toFixed(2)}
                    </h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Bill No</th>
                          <th>Supplier</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.purchaseDate}</td>
                            <td>{item.billNo}</td>
                            <td>{item.supplierName}</td>
                            <td>{item.qty}</td>
                            <td>Rs. {item.rate.toFixed(2)}</td>
                            <td>Rs. {item.total?.toFixed(2) || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReport;