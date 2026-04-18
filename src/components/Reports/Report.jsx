import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// import './App.css';  // ✅ Add CSS import

const Reports = () => {
  const { 
    user, 
    medicines, 
    suppliers, 
    customers,
    purchases,
    sales,
    expenses,
    payments,
    getSupplierById,
    getCustomerById,
    getMedicineById,
    checkPermission,
    companySettings
  } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [selectedParty, setSelectedParty] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [groupBy, setGroupBy] = useState('daily');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await generateReport();
      } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Error generating report', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeReport, dateRange, selectedParty, selectedProduct, groupBy]);

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

  // ===== FIXED: Safe number formatting function =====
  const formatCurrency = (amount) => {
    // Convert to number first, handle null/undefined/string
    const num = amount === null || amount === undefined ? 0 : Number(amount);
    // Check if it's a valid number
    if (isNaN(num)) {
      return `${companySettings?.currency || 'Rs.'} 0.00`;
    }
    return `${companySettings?.currency || 'Rs.'} ${num.toFixed(2)}`;
  };

  // Generate report based on type
  const generateReport = () => {
    let data = [];

    switch(activeReport) {
      case 'sales':
        data = generateSalesReport();
        break;
      case 'purchase':
        data = generatePurchaseReport();
        break;
      case 'stock':
        data = generateStockReport();
        break;
      case 'party':
        data = generatePartyReport();
        break;
      case 'profit':
        data = generateProfitReport();
        break;
      case 'expense':
        data = generateExpenseReport();
        break;
      default:
        data = [];
    }

    setReportData(data || []);
  };

  // Sales Report
  const generateSalesReport = () => {
    if (!sales || !Array.isArray(sales)) return [];
    
    let filtered = sales.filter(s => 
      s && s.date >= dateRange.from && s.date <= dateRange.to
    );

    if (selectedParty !== 'all' && selectedParty) {
      filtered = filtered.filter(s => s.customerId === parseInt(selectedParty));
    }

    if (selectedProduct !== 'all' && selectedProduct) {
      filtered = filtered.filter(s => 
        s.items?.some(item => item?.medicineId === parseInt(selectedProduct))
      );
    }

    let grouped = [];
    if (groupBy === 'daily') {
      const daily = {};
      filtered.forEach(s => {
        if (!s || !s.date) return;
        if (!daily[s.date]) {
          daily[s.date] = {
            date: s.date,
            count: 0,
            items: 0,
            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0,
            profit: 0
          };
        }
        daily[s.date].count++;
        daily[s.date].items += s.items?.length || 0;
        daily[s.date].subtotal += Number(s.subtotal) || 0;
        daily[s.date].discount += Number(s.discount) || 0;
        daily[s.date].tax += Number(s.tax) || 0;
        daily[s.date].total += Number(s.grandTotal) || 0;
        
        s.items?.forEach(item => {
          const medicine = getMedicineById(item?.medicineId);
          if (medicine) {
            const cost = (Number(medicine.purchasePrice) || 0) * (Number(item?.qty) || 0);
            const revenue = (Number(item?.price) || 0) * (Number(item?.qty) || 0);
            daily[s.date].profit += (revenue - cost);
          }
        });
      });
      grouped = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
    }

    setSummary({
      totalSales: filtered.length,
      totalItems: filtered.reduce((sum, s) => sum + (s.items?.length || 0), 0),
      totalAmount: filtered.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0),
      totalDiscount: filtered.reduce((sum, s) => sum + (Number(s.discount) || 0), 0),
      totalTax: filtered.reduce((sum, s) => sum + (Number(s.tax) || 0), 0),
      totalProfit: grouped.reduce((sum, g) => sum + (Number(g.profit) || 0), 0)
    });

    return grouped;
  };

  // Purchase Report
  const generatePurchaseReport = () => {
    if (!purchases || !Array.isArray(purchases)) return [];
    
    let filtered = purchases.filter(p => 
      p && p.date >= dateRange.from && p.date <= dateRange.to
    );

    if (selectedParty !== 'all' && selectedParty) {
      filtered = filtered.filter(p => p.supplierId === parseInt(selectedParty));
    }

    if (selectedProduct !== 'all' && selectedProduct) {
      filtered = filtered.filter(p => 
        p.items?.some(item => item?.medicineId === parseInt(selectedProduct))
      );
    }

    let grouped = [];
    if (groupBy === 'daily') {
      const daily = {};
      filtered.forEach(p => {
        if (!p || !p.date) return;
        if (!daily[p.date]) {
          daily[p.date] = {
            date: p.date,
            count: 0,
            items: 0,
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0
          };
        }
        daily[p.date].count++;
        daily[p.date].items += p.items?.length || 0;
        daily[p.date].subtotal += Number(p.subtotal) || 0;
        daily[p.date].tax += Number(p.tax) || 0;
        daily[p.date].discount += Number(p.discount) || 0;
        daily[p.date].total += Number(p.grandTotal) || 0;
      });
      grouped = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
    }

    setSummary({
      totalPurchases: filtered.length,
      totalItems: filtered.reduce((sum, p) => sum + (p.items?.length || 0), 0),
      totalAmount: filtered.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0),
      totalTax: filtered.reduce((sum, p) => sum + (Number(p.tax) || 0), 0),
      totalDiscount: filtered.reduce((sum, p) => sum + (Number(p.discount) || 0), 0)
    });

    return grouped;
  };

  // Stock Report
  const generateStockReport = () => {
    if (!medicines || !Array.isArray(medicines)) return [];
    
    const data = medicines.map(m => ({
      id: m.id,
      name: m.name || '',
      category: m.category || '-',
      manufacturer: m.manufacturer || '-',
      stock: Number(m.stock) || 0,
      purchasePrice: Number(m.purchasePrice) || 0,
      salePrice: Number(m.salePrice) || 0,
      mrp: Number(m.mrp) || 0,
      location: m.location || '-',
      expiry: m.expiry || '-',
      batchNo: m.batchNo || '-',
      value: (Number(m.stock) || 0) * (Number(m.purchasePrice) || 0),
      saleValue: (Number(m.stock) || 0) * (Number(m.salePrice) || 0),
      profit: ((Number(m.stock) || 0) * (Number(m.salePrice) || 0)) - ((Number(m.stock) || 0) * (Number(m.purchasePrice) || 0)),
      margin: Number(m.purchasePrice) > 0 ? (((Number(m.salePrice) || 0) - (Number(m.purchasePrice) || 0)) / Number(m.purchasePrice) * 100).toFixed(1) : 0
    }));

    setSummary({
      totalItems: medicines.length,
      totalStock: medicines.reduce((sum, m) => sum + (Number(m.stock) || 0), 0),
      totalValue: medicines.reduce((sum, m) => sum + ((Number(m.stock) || 0) * (Number(m.purchasePrice) || 0)), 0),
      totalSaleValue: medicines.reduce((sum, m) => sum + ((Number(m.stock) || 0) * (Number(m.salePrice) || 0)), 0),
      totalProfit: medicines.reduce((sum, m) => sum + (((Number(m.stock) || 0) * (Number(m.salePrice) || 0)) - ((Number(m.stock) || 0) * (Number(m.purchasePrice) || 0))), 0),
      lowStock: medicines.filter(m => (Number(m.stock) || 0) <= (Number(m.minStock) || 10)).length,
      expired: medicines.filter(m => m.expiry && new Date(m.expiry + '-01') < new Date()).length
    });

    return data;
  };

  // Party Report
  const generatePartyReport = () => {
    if (selectedParty === 'all') {
      const supplierData = (suppliers || []).map(s => ({
        name: s.name || '',
        type: 'Supplier',
        balance: Number(s.balance) || 0,
        creditLimit: Number(s.creditLimit) || 0,
        phone: s.phone || '-',
        city: s.city || '-'
      }));

      const customerData = (customers || [])
        .filter(c => c.id !== 1)
        .map(c => ({
          name: c.name || '',
          type: 'Customer',
          balance: Number(c.balance) || 0,
          creditLimit: Number(c.creditLimit) || 0,
          phone: c.phone || '-',
          city: c.city || '-'
        }));

      const data = [...supplierData, ...customerData];

      setSummary({
        totalParties: data.length,
        totalBalance: data.reduce((sum, p) => sum + (Number(p.balance) || 0), 0),
        positiveBalance: data.filter(p => Number(p.balance) > 0).length,
        negativeBalance: data.filter(p => Number(p.balance) < 0).length
      });

      return data;
    } else {
      const partyId = parseInt(selectedParty);
      const isSupplier = (suppliers || []).some(s => s.id === partyId);
      const party = isSupplier 
        ? (suppliers || []).find(s => s.id === partyId)
        : (customers || []).find(c => c.id === partyId);

      if (!party) return [];

      const purchases_ = (purchases || []).filter(p => p.supplierId === partyId);
      const sales_ = (sales || []).filter(s => s.customerId === partyId);
      const payments_ = (payments || []).filter(p => 
        (isSupplier && p.partyType === 'supplier' && p.partyId === partyId) ||
        (!isSupplier && p.partyType === 'customer' && p.partyId === partyId)
      );

      let transactions = [];

      purchases_.forEach(p => {
        transactions.push({
          date: p.date,
          type: 'Purchase',
          billNo: p.billNo,
          debit: Number(p.grandTotal) || 0,
          credit: 0,
          balance: 0
        });
      });

      sales_.forEach(s => {
        transactions.push({
          date: s.date,
          type: 'Sale',
          billNo: s.billNo,
          debit: Number(s.grandTotal) || 0,
          credit: 0,
          balance: 0
        });
      });

      payments_.forEach(p => {
        transactions.push({
          date: p.date,
          type: 'Payment',
          billNo: p.billNo || '-',
          debit: 0,
          credit: Number(p.amount) || 0,
          balance: 0
        });
      });

      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      let balance = 0;
      transactions = transactions.map(t => {
        if (isSupplier) {
          balance = balance + (Number(t.debit) || 0) - (Number(t.credit) || 0);
        } else {
          balance = balance + (Number(t.debit) || 0) - (Number(t.credit) || 0);
        }
        return { ...t, balance };
      });

      setSummary({
        partyName: party.name,
        currentBalance: Number(party.balance) || 0,
        totalPurchases: purchases_.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0),
        totalSales: sales_.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0),
        totalPayments: payments_.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      });

      return transactions;
    }
  };

  // Profit Report
  const generateProfitReport = () => {
    const filteredSales = (sales || []).filter(s => 
      s && s.date >= dateRange.from && s.date <= dateRange.to
    );

    let totalRevenue = 0;
    let totalCost = 0;
    let totalExpenses = (expenses || []).filter(e => 
      e && e.date >= dateRange.from && e.date <= dateRange.to
    ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const dailyData = [];

    const byDate = {};
    filteredSales.forEach(sale => {
      if (!sale || !sale.date) return;
      if (!byDate[sale.date]) {
        byDate[sale.date] = {
          date: sale.date,
          revenue: 0,
          cost: 0,
          profit: 0,
          count: 0
        };
      }
      
      let saleRevenue = Number(sale.grandTotal) || 0;
      let saleCost = 0;
      
      sale.items?.forEach(item => {
        const medicine = getMedicineById(item?.medicineId);
        if (medicine) {
          saleCost += (Number(medicine.purchasePrice) || 0) * (Number(item?.qty) || 0);
        }
      });

      byDate[sale.date].revenue += saleRevenue;
      byDate[sale.date].cost += saleCost;
      byDate[sale.date].profit += (saleRevenue - saleCost);
      byDate[sale.date].count++;

      totalRevenue += saleRevenue;
      totalCost += saleCost;
    });

    Object.values(byDate).forEach(d => {
      dailyData.push(d);
    });

    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;

    setSummary({
      totalRevenue,
      totalCost,
      grossProfit,
      totalExpenses,
      netProfit,
      margin: totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : 0,
      days: dailyData.length
    });

    return dailyData;
  };

  // Expense Report
  const generateExpenseReport = () => {
    let filtered = (expenses || []).filter(e => 
      e && e.date >= dateRange.from && e.date <= dateRange.to
    );

    const byCategory = {};
    filtered.forEach(e => {
      const cat = e.category || 'General';
      if (!byCategory[cat]) {
        byCategory[cat] = {
          category: cat,
          count: 0,
          amount: 0
        };
      }
      byCategory[cat].count++;
      byCategory[cat].amount += Number(e.amount) || 0;
    });

    const data = Object.values(byCategory);

    setSummary({
      totalExpenses: filtered.length,
      totalAmount: filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      categories: data.length,
      averagePerDay: filtered.length > 0 
        ? filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) / filtered.length 
        : 0
    });

    return data;
  };

  // Handle print report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    
    let title = '';
    let content = '';

    switch(activeReport) {
      case 'sales':
        title = 'Sales Report';
        content = generateSalesPrintContent();
        break;
      case 'purchase':
        title = 'Purchase Report';
        content = generatePurchasePrintContent();
        break;
      case 'stock':
        title = 'Stock Report';
        content = generateStockPrintContent();
        break;
      case 'party':
        title = selectedParty === 'all' ? 'Parties Summary' : 'Party Ledger';
        content = generatePartyPrintContent();
        break;
      case 'profit':
        title = 'Profit & Loss Report';
        content = generateProfitPrintContent();
        break;
      case 'expense':
        title = 'Expense Report';
        content = generateExpensePrintContent();
        break;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} - ${companySettings?.name || 'Pharmacy'}</title>
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
            <h1>${companySettings?.name || 'Pharmacy'}</h1>
            <p>${companySettings?.address || ''}</p>
            <p>Tel: ${companySettings?.phone || ''} | Email: ${companySettings?.email || ''}</p>
          </div>
          
          <h2>${title}</h2>
          
          <div class="info">
            <div class="info-row">
              <span><strong>Generated:</strong> ${formatDateTime(new Date())}</span>
              <span><strong>Period:</strong> ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}</span>
            </div>
          </div>
          
          ${content}
          
          <div class="footer">
            <p>Generated by ${user?.name || 'User'} | Software by Logixify Labs</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Generate sales print content
  const generateSalesPrintContent = () => {
    return `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoices</th>
            <th>Items</th>
            <th>Subtotal</th>
            <th>Discount</th>
            <th>Tax</th>
            <th>Total</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData || []).map(d => `
            <tr>
              <td>${d.date || ''}</td>
              <td>${d.count || 0}</td>
              <td>${d.items || 0}</td>
              <td>${formatCurrency(d.subtotal)}</td>
              <td>${formatCurrency(d.discount)}</td>
              <td>${formatCurrency(d.tax)}</td>
              <td>${formatCurrency(d.total)}</td>
              <td>${formatCurrency(d.profit)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="7">Total</th>
            <th>${formatCurrency(summary.totalProfit)}</th>
          </tr>
        </tfoot>
      </table>
      
      <div class="total">
        <p><strong>Summary</strong></p>
        <p>Total Sales: ${summary.totalSales || 0}</p>
        <p>Total Items: ${summary.totalItems || 0}</p>
        <p>Total Amount: ${formatCurrency(summary.totalAmount)}</p>
        <p>Total Profit: ${formatCurrency(summary.totalProfit)}</p>
      </div>
    `;
  };

  // Generate stock print content
  const generateStockPrintContent = () => {
    return `
      <table>
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Purchase Price</th>
            <th>Sale Price</th>
            <th>Value</th>
            <th>Location</th>
            <th>Expiry</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData || []).slice(0, 100).map(item => `
            <tr>
              <td>${item.name || ''}</td>
              <td>${item.category || '-'}</td>
              <td>${item.stock || 0}</td>
              <td>${formatCurrency(item.purchasePrice)}</td>
              <td>${formatCurrency(item.salePrice)}</td>
              <td>${formatCurrency(item.value)}</td>
              <td>${item.location || '-'}</td>
              <td>${item.expiry || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total">
        <p><strong>Summary</strong></p>
        <p>Total Items: ${summary.totalItems || 0}</p>
        <p>Total Stock: ${summary.totalStock || 0}</p>
        <p>Total Value: ${formatCurrency(summary.totalValue)}</p>
        <p>Total Sale Value: ${formatCurrency(summary.totalSaleValue)}</p>
        <p>Potential Profit: ${formatCurrency(summary.totalProfit)}</p>
        <p>Low Stock Items: ${summary.lowStock || 0}</p>
        <p>Expired Items: ${summary.expired || 0}</p>
      </div>
    `;
  };

  // Generate profit print content
  const generateProfitPrintContent = () => {
    return `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Margin</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData || []).map(d => {
            const margin = d.revenue > 0 ? ((d.profit || 0) / d.revenue * 100).toFixed(1) : 0;
            return `
              <tr>
                <td>${d.date || ''}</td>
                <td>${d.count || 0}</td>
                <td>${formatCurrency(d.revenue)}</td>
                <td>${formatCurrency(d.cost)}</td>
                <td>${formatCurrency(d.profit)}</td>
                <td>${margin}%</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="total">
        <p><strong>Profit & Loss Summary</strong></p>
        <p>Total Revenue: ${formatCurrency(summary.totalRevenue)}</p>
        <p>Total Cost: ${formatCurrency(summary.totalCost)}</p>
        <p>Gross Profit: ${formatCurrency(summary.grossProfit)}</p>
        <p>Total Expenses: ${formatCurrency(summary.totalExpenses)}</p>
        <p><strong>Net Profit: ${formatCurrency(summary.netProfit)}</strong></p>
        <p>Profit Margin: ${summary.margin || 0}%</p>
      </div>
    `;
  };

  // Generate party print content
  const generatePartyPrintContent = () => {
    if (selectedParty === 'all') {
      return `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Credit Limit</th>
              <th>Phone</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData || []).map(p => `
              <tr>
                <td>${p.name || ''}</td>
                <td>${p.type || ''}</td>
                <td class="${p.balance > 0 ? 'text-danger' : p.balance < 0 ? 'text-success' : ''}">
                  ${formatCurrency(p.balance)}
                </td>
                <td>${formatCurrency(p.creditLimit)}</td>
                <td>${p.phone || '-'}</td>
                <td>${p.city || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p><strong>Summary</strong></p>
          <p>Total Parties: ${summary.totalParties || 0}</p>
          <p>Total Balance: ${formatCurrency(summary.totalBalance)}</p>
          <p>Parties with Due: ${summary.positiveBalance || 0}</p>
          <p>Parties with Credit: ${summary.negativeBalance || 0}</p>
        </div>
      `;
    } else {
      return `
        <div class="info">
          <p><strong>Party:</strong> ${summary.partyName || ''}</p>
          <p><strong>Current Balance:</strong> ${formatCurrency(summary.currentBalance)}</p>
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
            ${(reportData || []).map(t => `
              <tr>
                <td>${t.date || ''}</td>
                <td>${t.type || ''}</td>
                <td>${t.billNo || '-'}</td>
                <td>${t.debit ? formatCurrency(t.debit) : '-'}</td>
                <td>${t.credit ? formatCurrency(t.credit) : '-'}</td>
                <td class="${t.balance > 0 ? 'text-danger' : t.balance < 0 ? 'text-success' : ''}">
                  ${formatCurrency(t.balance)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Total Purchases: ${formatCurrency(summary.totalPurchases)}</p>
          <p>Total Sales: ${formatCurrency(summary.totalSales)}</p>
          <p>Total Payments: ${formatCurrency(summary.totalPayments)}</p>
        </div>
      `;
    }
  };

  // Generate purchase print content
  const generatePurchasePrintContent = () => {
    return `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Purchases</th>
            <th>Items</th>
            <th>Subtotal</th>
            <th>Tax</th>
            <th>Discount</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData || []).map(d => `
            <tr>
              <td>${d.date || ''}</td>
              <td>${d.count || 0}</td>
              <td>${d.items || 0}</td>
              <td>${formatCurrency(d.subtotal)}</td>
              <td>${formatCurrency(d.tax)}</td>
              <td>${formatCurrency(d.discount)}</td>
              <td>${formatCurrency(d.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total">
        <p><strong>Summary</strong></p>
        <p>Total Purchases: ${summary.totalPurchases || 0}</p>
        <p>Total Items: ${summary.totalItems || 0}</p>
        <p>Total Amount: ${formatCurrency(summary.totalAmount)}</p>
      </div>
    `;
  };

  // Generate expense print content
  const generateExpensePrintContent = () => {
    return `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Count</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData || []).map(d => `
            <tr>
              <td>${d.category || ''}</td>
              <td>${d.count || 0}</td>
              <td>${formatCurrency(d.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total">
        <p><strong>Summary</strong></p>
        <p>Total Expenses: ${summary.totalExpenses || 0}</p>
        <p>Total Amount: ${formatCurrency(summary.totalAmount)}</p>
        <p>Categories: ${summary.categories || 0}</p>
        <p>Average per Expense: ${formatCurrency(summary.averagePerDay)}</p>
      </div>
    `;
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(reportData || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, activeReport);
      XLSX.writeFile(workbook, `${activeReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Excel file downloaded successfully', 'success');
    } catch (error) {
      showNotification('Error exporting to Excel', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!checkPermission('reports', 'view')) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Header user={user} time={formatTime(currentTime)} />
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Denied</h3>
              <p>You do not have permission to view reports.</p>
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
            <h1>Reports & Analytics</h1>
            <div className="header-actions">
              {checkPermission('reports', 'print') && (
                <button className="btn-primary" onClick={handlePrintReport}>
                  🖨️ Print Report
                </button>
              )}
              {checkPermission('reports', 'export') && (
                <button className="btn-secondary" onClick={handleExportExcel}>
                  📊 Export Excel
                </button>
              )}
            </div>
          </div>

          {/* Report Type Tabs */}
          <div className="reports-tabs">
            <button 
              className={`tab ${activeReport === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveReport('sales')}
            >
              Sales Report
            </button>
            <button 
              className={`tab ${activeReport === 'purchase' ? 'active' : ''}`}
              onClick={() => setActiveReport('purchase')}
            >
              Purchase Report
            </button>
            <button 
              className={`tab ${activeReport === 'stock' ? 'active' : ''}`}
              onClick={() => setActiveReport('stock')}
            >
              Stock Report
            </button>
            <button 
              className={`tab ${activeReport === 'party' ? 'active' : ''}`}
              onClick={() => setActiveReport('party')}
            >
              Party Report
            </button>
            <button 
              className={`tab ${activeReport === 'profit' ? 'active' : ''}`}
              onClick={() => setActiveReport('profit')}
            >
              Profit & Loss
            </button>
            <button 
              className={`tab ${activeReport === 'expense' ? 'active' : ''}`}
              onClick={() => setActiveReport('expense')}
            >
              Expense Report
            </button>
          </div>

          {/* Filters */}
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

              {(activeReport === 'sales' || activeReport === 'purchase' || activeReport === 'party') && (
                <div className="filter-group">
                  <label>Party</label>
                  <select
                    value={selectedParty}
                    onChange={(e) => setSelectedParty(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Parties</option>
                    {activeReport === 'party' ? (
                      <>
                        <optgroup label="Suppliers">
                          {(suppliers || []).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Customers">
                          {(customers || []).filter(c => c.id !== 1).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </optgroup>
                      </>
                    ) : activeReport === 'sales' ? (
                      (customers || []).filter(c => c.id !== 1).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    ) : (
                      (suppliers || []).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {(activeReport === 'sales' || activeReport === 'purchase') && (
                <div className="filter-group">
                  <label>Product</label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Products</option>
                    {(medicines || []).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(activeReport === 'sales' || activeReport === 'purchase') && (
                <div className="filter-group">
                  <label>Group By</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="filter-select"
                  >
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="summary-cards">
            {Object.entries(summary || {}).map(([key, value]) => (
              <div key={key} className="summary-card">
                <h3>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
                <p className={typeof value === 'number' && value < 0 ? 'text-danger' : ''}>
                  {typeof value === 'number' ? 
                    (key.includes('Amount') || key.includes('Value') || key.includes('Profit') || key.includes('Balance') ? 
                      formatCurrency(value) : value) 
                    : value}
                </p>
              </div>
            ))}
          </div>

          {/* Report Table */}
          <div className="card">
            <div className="card-header">
              <h2>
                {activeReport === 'sales' && 'Sales Report'}
                {activeReport === 'purchase' && 'Purchase Report'}
                {activeReport === 'stock' && 'Stock Report'}
                {activeReport === 'party' && (selectedParty === 'all' ? 'Parties Summary' : 'Party Ledger')}
                {activeReport === 'profit' && 'Profit & Loss Report'}
                {activeReport === 'expense' && 'Expense Report'}
              </h2>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  {activeReport === 'sales' && (
                    <tr>
                      <th>Date</th>
                      <th>Invoices</th>
                      <th>Items</th>
                      <th>Subtotal</th>
                      <th>Discount</th>
                      <th>Tax</th>
                      <th>Total</th>
                      <th>Profit</th>
                    </tr>
                  )}
                  {activeReport === 'purchase' && (
                    <tr>
                      <th>Date</th>
                      <th>Purchases</th>
                      <th>Items</th>
                      <th>Subtotal</th>
                      <th>Tax</th>
                      <th>Discount</th>
                      <th>Total</th>
                    </tr>
                  )}
                  {activeReport === 'stock' && (
                    <tr>
                      <th>Medicine</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Purchase Price</th>
                      <th>Sale Price</th>
                      <th>Value</th>
                      <th>Location</th>
                      <th>Expiry</th>
                    </tr>
                  )}
                  {activeReport === 'party' && selectedParty === 'all' && (
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Balance</th>
                      <th>Credit Limit</th>
                      <th>Phone</th>
                      <th>City</th>
                    </tr>
                  )}
                  {activeReport === 'party' && selectedParty !== 'all' && (
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Bill No</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  )}
                  {activeReport === 'profit' && (
                    <tr>
                      <th>Date</th>
                      <th>Sales</th>
                      <th>Revenue</th>
                      <th>Cost</th>
                      <th>Profit</th>
                      <th>Margin</th>
                    </tr>
                  )}
                  {activeReport === 'expense' && (
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Amount</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {(reportData || []).length > 0 ? (
                    (reportData || []).map((row, index) => (
                      <tr key={index}>
                        {activeReport === 'sales' && (
                          <>
                            <td>{row.date}</td>
                            <td>{row.count}</td>
                            <td>{row.items}</td>
                            <td>{formatCurrency(row.subtotal)}</td>
                            <td>{formatCurrency(row.discount)}</td>
                            <td>{formatCurrency(row.tax)}</td>
                            <td>{formatCurrency(row.total)}</td>
                            <td className={row.profit >= 0 ? 'text-success' : 'text-danger'}>
                              {formatCurrency(row.profit)}
                            </td>
                          </>
                        )}
                        {activeReport === 'purchase' && (
                          <>
                            <td>{row.date}</td>
                            <td>{row.count}</td>
                            <td>{row.items}</td>
                            <td>{formatCurrency(row.subtotal)}</td>
                            <td>{formatCurrency(row.tax)}</td>
                            <td>{formatCurrency(row.discount)}</td>
                            <td>{formatCurrency(row.total)}</td>
                          </>
                        )}
                        {activeReport === 'stock' && (
                          <>
                            <td><strong>{row.name}</strong></td>
                            <td>{row.category || '-'}</td>
                            <td className={row.stock < 0 ? 'text-danger' : row.stock < 10 ? 'text-warning' : ''}>
                              {row.stock}
                            </td>
                            <td>{formatCurrency(row.purchasePrice)}</td>
                            <td>{formatCurrency(row.salePrice)}</td>
                            <td>{formatCurrency(row.value)}</td>
                            <td>{row.location || '-'}</td>
                            <td className={row.expiry && new Date(row.expiry + '-01') < new Date() ? 'text-danger' : ''}>
                              {row.expiry || '-'}
                            </td>
                          </>
                        )}
                        {activeReport === 'party' && selectedParty === 'all' && (
                          <>
                            <td><strong>{row.name}</strong></td>
                            <td>{row.type}</td>
                            <td className={row.balance > 0 ? 'text-danger' : row.balance < 0 ? 'text-success' : ''}>
                              {formatCurrency(row.balance)}
                            </td>
                            <td>{formatCurrency(row.creditLimit)}</td>
                            <td>{row.phone || '-'}</td>
                            <td>{row.city || '-'}</td>
                          </>
                        )}
                        {activeReport === 'party' && selectedParty !== 'all' && (
                          <>
                            <td>{row.date}</td>
                            <td>
                              <span className={`badge ${
                                row.type === 'Purchase' ? 'badge-warning' :
                                row.type === 'Sale' ? 'badge-success' :
                                'badge-info'
                              }`}>
                                {row.type}
                              </span>
                            </td>
                            <td>{row.billNo}</td>
                            <td>{row.debit ? formatCurrency(row.debit) : '-'}</td>
                            <td>{row.credit ? formatCurrency(row.credit) : '-'}</td>
                            <td className={row.balance > 0 ? 'text-danger' : row.balance < 0 ? 'text-success' : ''}>
                              {formatCurrency(row.balance)}
                            </td>
                          </>
                        )}
                        {activeReport === 'profit' && (
                          <>
                            <td>{row.date}</td>
                            <td>{row.count}</td>
                            <td>{formatCurrency(row.revenue)}</td>
                            <td>{formatCurrency(row.cost)}</td>
                            <td className={row.profit >= 0 ? 'text-success' : 'text-danger'}>
                              {formatCurrency(row.profit)}
                            </td>
                            <td className={row.profit >= 0 ? 'text-success' : 'text-danger'}>
                              {row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : 0}%
                            </td>
                          </>
                        )}
                        {activeReport === 'expense' && (
                          <>
                            <td><strong>{row.category}</strong></td>
                            <td>{row.count}</td>
                            <td className="text-danger">{formatCurrency(row.amount)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center">
                        No data found for selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;