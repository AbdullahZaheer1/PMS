import React, { createContext, useState, useContext, useEffect } from "react";

const AppContext = createContext();

export const useAuth = () => useContext(AppContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Company Settings
  const [companySettings, setCompanySettings] = useState({
    name: "Logixify Labs",
    address: "Nishtar Medical University, Nishtar Rd, Gillani Colony, Multan, 66000, Pakistan",
    phone: "0303 8275195",
    mobile: "0313 5151043",
    email: "info@zretail.com",
    website: "www.zretail.com",
    taxRate: 17,
    currency: "Rs.",
    dateFormat: "YYYY.MM.DD",
    lowStockAlert: 10,
    enableExpiryAlert: true,
    enableNegativeStock: true,
  });

  // Users data
  const [users, setUsers] = useState([]);

  // Main data states
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);

  // Load all data from localStorage on startup
  useEffect(() => {
    const loadData = () => {
      try {
        // Load company settings
        const savedSettings = localStorage.getItem("companySettings");
        if (savedSettings) {
          setCompanySettings(JSON.parse(savedSettings));
        }

        // Load users
        const savedUsers = localStorage.getItem("users");
        if (savedUsers) {
          setUsers(JSON.parse(savedUsers));
        } else {
          // Create default users
          const initialUsers = [
            {
              id: 1,
              username: "admin",
              password: "admin",
              name: "Administrator",
              role: "admin",
              email: "admin@pharmacy.com",
              phone: "0300-1234567",
              active: true,
              permissions: {
                dashboard: { view: true },
                purchases: { view: true, add: true, edit: true, delete: true },
                sales: { view: true, add: true, edit: true, delete: true },
                stock: { view: true, add: true, edit: true, delete: true },
                parties: { view: true, add: true, edit: true, delete: true },
                payments: { view: true, add: true, edit: true, delete: true },
                reports: { view: true, export: true, print: true },
                expenses: { view: true, add: true, edit: true, delete: true },
                users: {
                  view: true,
                  add: true,
                  edit: true,
                  delete: true,
                  permissions: true,
                },
                settings: { view: true, edit: true },
              },
            },
            // {
            //   id: 2,
            //   username: "manager",
            //   password: "manager",
            //   name: "Store Manager",
            //   role: "manager",
            //   email: "manager@pharmacy.com",
            //   phone: "0300-7654321",
            //   active: true,
            //   permissions: {
            //     dashboard: { view: true },
            //     purchases: { view: true, add: true, edit: true, delete: false },
            //     sales: { view: true, add: true, edit: true, delete: false },
            //     stock: { view: true, add: true, edit: false, delete: false },
            //     parties: { view: true, add: true, edit: true, delete: false },
            //     payments: { view: true, add: true, edit: false, delete: false },
            //     reports: { view: true, export: true, print: true },
            //     expenses: { view: true, add: true, edit: true, delete: false },
            //     users: {
            //       view: false,
            //       add: false,
            //       edit: false,
            //       delete: false,
            //       permissions: false,
            //     },
            //     settings: { view: false, edit: false },
            //   },
            // },
            // {
            //   id: 3,
            //   username: "cashier",
            //   password: "cashier",
            //   name: "Cashier",
            //   role: "cashier",
            //   email: "cashier@pharmacy.com",
            //   phone: "0300-1122334",
            //   active: true,
            //   permissions: {
            //     dashboard: { view: true },
            //     purchases: {
            //       view: false,
            //       add: false,
            //       edit: false,
            //       delete: false,
            //     },
            //     sales: { view: true, add: true, edit: false, delete: false },
            //     stock: { view: true, add: false, edit: false, delete: false },
            //     parties: { view: true, add: false, edit: false, delete: false },
            //     payments: {
            //       view: true,
            //       add: false,
            //       edit: false,
            //       delete: false,
            //     },
            //     reports: { view: false, export: false, print: false },
            //     expenses: {
            //       view: false,
            //       add: false,
            //       edit: false,
            //       delete: false,
            //     },
            //     users: {
            //       view: false,
            //       add: false,
            //       edit: false,
            //       delete: false,
            //       permissions: false,
            //     },
            //     settings: { view: false, edit: false },
            //   },
            // },
          ];
          setUsers(initialUsers);
          localStorage.setItem("users", JSON.stringify(initialUsers));
        }

        // Load current user
        const savedUser = localStorage.getItem("currentUser");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // Load medicines
        const savedMedicines = localStorage.getItem("medicines");
        if (savedMedicines) {
          setMedicines(JSON.parse(savedMedicines));
        } else {
          // Initialize with sample data
          const initialMedicines = [
            // {
            //   id: 1,
            //   name: "Medicine",
            //   stock: 0,
            //   salePrice: 0,
            //   purchasePrice: 0,
            //   location: "9/5",
            //   formula: "",
            //   pktSize: 10,
            //   expiry: "2025-12",
            //   category: "Syrup",
            //   manufacturer: "GSK",
            // },
          ];
          setMedicines(initialMedicines);
          localStorage.setItem("medicines", JSON.stringify(initialMedicines));
        }

        // Load suppliers
        const savedSuppliers = localStorage.getItem("suppliers");
        if (savedSuppliers) {
          setSuppliers(JSON.parse(savedSuppliers));
        } else {
          const initialSuppliers = [
            {
              id: 1,
              name: "Owner",
              balance: 0,
              phone: "03001234567",
              address: "Multan",
              email: "owner@pharma.com",
              contactPerson: "Mr. Abdullah",
            },
          ];
          setSuppliers(initialSuppliers);
          localStorage.setItem("suppliers", JSON.stringify(initialSuppliers));
        }

        // Load customers
        const savedCustomers = localStorage.getItem("customers");
        if (savedCustomers) {
          setCustomers(JSON.parse(savedCustomers));
        } else {
          const initialCustomers = [
            {
              id: 1,
              name: "Customer Cash",
              balance: 0,
              phone: "03001234567",
              email:"customercash@pharmacy.com",
              address: "Multan",
              type: "cash",
              contactPerson: "Mr. Abdullah",
            },
          ];
          setCustomers(initialCustomers);
          localStorage.setItem("customers", JSON.stringify(initialCustomers));
        }

        // Load other data
        const savedPurchases = localStorage.getItem("purchases");
        if (savedPurchases) setPurchases(JSON.parse(savedPurchases));

        const savedSales = localStorage.getItem("sales");
        if (savedSales) setSales(JSON.parse(savedSales));

        const savedExpenses = localStorage.getItem("expenses");
        if (savedExpenses) {
          setExpenses(JSON.parse(savedExpenses));
        }

        const savedPayments = localStorage.getItem("payments");
        if (savedPayments) setPayments(JSON.parse(savedPayments));
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save company settings
  const updateCompanySettings = (newSettings) => {
    setCompanySettings(newSettings);
    localStorage.setItem("companySettings", JSON.stringify(newSettings));
  };

  // ========== AUTH FUNCTIONS ==========
  const login = (username, password) => {
    const foundUser = users.find(
      (u) => u.username === username && u.password === password && u.active,
    );

    if (foundUser) {
      const userData = {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        role: foundUser.role,
        permissions: foundUser.permissions,
      };
      localStorage.setItem("currentUser", JSON.stringify(userData));
      setUser(userData);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
  };

  const checkPermission = (module, action) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.permissions?.[module]?.[action] || false;
  };

  // ========== USER MANAGEMENT ==========
  const addUser = (userData) => {
    const newUser = {
      id: Date.now(),
      ...userData,
      active: true,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem("users", JSON.stringify(updated));
    return newUser;
  };

  const updateUser = (id, updatedData) => {
    const updated = users.map((u) =>
      u.id === id ? { ...u, ...updatedData } : u,
    );
    setUsers(updated);
    localStorage.setItem("users", JSON.stringify(updated));

    if (user && user.id === id) {
      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
    }
  };

  const deleteUser = (id) => {
    if (id === 1) return false;
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    localStorage.setItem("users", JSON.stringify(updated));
    return true;
  };

  // ========== MEDICINE FUNCTIONS ==========
  const addMedicine = (medicine) => {
    const newMedicine = {
      ...medicine,
      id: Date.now(),
      stock: medicine.stock || 0,
    };
    const updated = [...medicines, newMedicine];
    setMedicines(updated);
    localStorage.setItem("medicines", JSON.stringify(updated));
    return newMedicine;
  };

  const updateMedicine = (id, updatedMedicine) => {
    const updated = medicines.map((m) =>
      m.id === id ? { ...m, ...updatedMedicine } : m,
    );
    setMedicines(updated);
    localStorage.setItem("medicines", JSON.stringify(updated));
  };

  const deleteMedicine = (id) => {
    const updated = medicines.filter((m) => m.id !== id);
    setMedicines(updated);
    localStorage.setItem("medicines", JSON.stringify(updated));
  };

  const updateMedicineStock = (id, quantity, type = "add") => {
    const medicine = medicines.find((m) => m.id === id);
    if (!medicine) return;

    let newStock;
    if (type === "add") {
      newStock = medicine.stock + quantity;
    } else {
      newStock = medicine.stock - quantity;
    }

    const updated = medicines.map((m) =>
      m.id === id ? { ...m, stock: newStock } : m,
    );
    setMedicines(updated);
    localStorage.setItem("medicines", JSON.stringify(updated));
  };

  // ========== SUPPLIER FUNCTIONS ==========
  const addSupplier = (supplier) => {
    const newSupplier = {
      ...supplier,
      id: Date.now(),
      balance: 0,
    };
    const updated = [...suppliers, newSupplier];
    setSuppliers(updated);
    localStorage.setItem("suppliers", JSON.stringify(updated));
    return newSupplier;
  };

  const updateSupplier = (id, updatedSupplier) => {
    const updated = suppliers.map((s) =>
      s.id === id ? { ...s, ...updatedSupplier } : s,
    );
    setSuppliers(updated);
    localStorage.setItem("suppliers", JSON.stringify(updated));
  };

  const deleteSupplier = (id) => {
    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    localStorage.setItem("suppliers", JSON.stringify(updated));
  };

  const updateSupplierBalance = (id, amount, type = "add") => {
    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier) return;

    let newBalance;
    if (type === "add") {
      newBalance = supplier.balance + amount;
    } else {
      newBalance = supplier.balance - amount;
    }

    const updated = suppliers.map((s) =>
      s.id === id ? { ...s, balance: newBalance } : s,
    );
    setSuppliers(updated);
    localStorage.setItem("suppliers", JSON.stringify(updated));
  };

  // ========== CUSTOMER FUNCTIONS ==========
  const addCustomer = (customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now(),
      balance: 0,
    };
    const updated = [...customers, newCustomer];
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    return newCustomer;
  };

  const updateCustomer = (id, updatedCustomer) => {
    const updated = customers.map((c) =>
      c.id === id ? { ...c, ...updatedCustomer } : c,
    );
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
  };

  const deleteCustomer = (id) => {
    if (id === 1) return false; // Can't delete Owner
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    return true;
  };

  const updateCustomerBalance = (id, amount, type = "add") => {
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;

    let newBalance;
    if (type === "add") {
      newBalance = customer.balance + amount;
    } else {
      newBalance = customer.balance - amount;
    }

    const updated = customers.map((c) =>
      c.id === id ? { ...c, balance: newBalance } : c,
    );
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
  };

  // ========== PURCHASE FUNCTIONS ==========
  const addPurchase = (purchaseData) => {
    const newPurchase = {
      id: Date.now(),
      ...purchaseData,
      items: purchaseData.items.map((item) => ({
        ...item,
        medicineId: parseInt(item.medicineId),
      })),
    };

    const updatedPurchases = [...purchases, newPurchase];
    setPurchases(updatedPurchases);
    localStorage.setItem("purchases", JSON.stringify(updatedPurchases));

    // Update supplier balance
    if (purchaseData.supplierId) {
      updateSupplierBalance(
        purchaseData.supplierId,
        purchaseData.grandTotal,
        "add",
      );
    }

    // Update medicine stock and purchase price
    purchaseData.items.forEach((item) => {
      updateMedicineStock(item.medicineId, item.qty, "add");

      // Update medicine purchase price if different
      const medicine = medicines.find((m) => m.id === item.medicineId);
      if (medicine && medicine.purchasePrice !== item.rate) {
        updateMedicine(item.medicineId, { purchasePrice: item.rate });
      }
    });

    return newPurchase;
  };

  const updatePurchase = (id, updatedData) => {
    const updated = purchases.map((p) =>
      p.id === id ? { ...p, ...updatedData } : p,
    );
    setPurchases(updated);
    localStorage.setItem("purchases", JSON.stringify(updated));
  };

  const deletePurchase = (id) => {
    const updated = purchases.filter((p) => p.id !== id);
    setPurchases(updated);
    localStorage.setItem("purchases", JSON.stringify(updated));
  };

  // ========== SALE FUNCTIONS ==========
  const addSale = (saleData) => {
    const newSale = {
      id: Date.now(),
      ...saleData,
      items: saleData.items.map((item) => ({
        ...item,
        medicineId: parseInt(item.medicineId),
      })),
    };

    const updatedSales = [...sales, newSale];
    setSales(updatedSales);
    localStorage.setItem("sales", JSON.stringify(updatedSales));

    // Update medicine stock
    saleData.items.forEach((item) => {
      updateMedicineStock(parseInt(item.medicineId), item.qty, "remove");
    });

    // Update customer balance if credit sale
    if (saleData.customerId && saleData.customerId !== 1) {
      updateCustomerBalance(
        parseInt(saleData.customerId),
        saleData.grandTotal,
        "add",
      );
    }

    return newSale;
  };

  const updateSale = (id, updatedData) => {
    const updated = sales.map((s) =>
      s.id === id ? { ...s, ...updatedData } : s,
    );
    setSales(updated);
    localStorage.setItem("sales", JSON.stringify(updated));
  };

  const deleteSale = (id) => {
    const updated = sales.filter((s) => s.id !== id);
    setSales(updated);
    localStorage.setItem("sales", JSON.stringify(updated));
  };

  // ========== EXPENSE FUNCTIONS ==========
  const addExpense = (expenseData) => {
    const newExpense = {
      id: Date.now(),
      ...expenseData,
      amount: parseFloat(expenseData.amount),
    };
    const updated = [...expenses, newExpense];
    setExpenses(updated);
    localStorage.setItem("expenses", JSON.stringify(updated));
    return newExpense;
  };

  const updateExpense = (id, updatedData) => {
    const updated = expenses.map((e) =>
      e.id === id ? { ...e, ...updatedData } : e,
    );
    setExpenses(updated);
    localStorage.setItem("expenses", JSON.stringify(updated));
  };

  const deleteExpense = (id) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    localStorage.setItem("expenses", JSON.stringify(updated));
  };

  // ========== PAYMENT FUNCTIONS ==========
  const addPayment = (paymentData) => {
    const newPayment = {
      id: Date.now(),
      ...paymentData,
      amount: parseFloat(paymentData.amount),
      date: new Date().toISOString().split("T")[0],
    };

    const updatedPayments = [...payments, newPayment];
    setPayments(updatedPayments);
    localStorage.setItem("payments", JSON.stringify(updatedPayments));

    // Update party balance
    if (paymentData.partyType === "supplier") {
      updateSupplierBalance(
        parseInt(paymentData.partyId),
        paymentData.amount,
        "subtract",
      );
    } else {
      updateCustomerBalance(
        parseInt(paymentData.partyId),
        paymentData.amount,
        "subtract",
      );
    }

    return newPayment;
  };

  // ========== HELPER FUNCTIONS ==========
  const getMedicineById = (id) => {
    return medicines.find((m) => m.id === parseInt(id));
  };

  const getSupplierById = (id) => {
    return suppliers.find((s) => s.id === parseInt(id));
  };

  const getCustomerById = (id) => {
    return customers.find((c) => c.id === parseInt(id));
  };

  const getPartyTransactions = (partyId, partyType) => {
    let transactions = [];

    if (partyType === "supplier") {
      // Get purchases
      const supplierPurchases = purchases
        .filter((p) => p.supplierId === parseInt(partyId))
        .map((p) => ({
          date: p.date,
          billNo: p.billNo,
          type: "Purchase",
          total: p.grandTotal,
          payment: 0,
          balance: 0,
        }));

      // Get payments
      const supplierPayments = payments
        .filter(
          (p) => p.partyType === "supplier" && p.partyId === parseInt(partyId),
        )
        .map((p) => ({
          date: p.date,
          billNo: p.billNo || "-",
          type: "Payment",
          total: 0,
          payment: p.amount,
          balance: 0,
        }));

      transactions = [...supplierPurchases, ...supplierPayments];
    } else {
      // Get sales
      const customerSales = sales
        .filter((s) => s.customerId === parseInt(partyId))
        .map((s) => ({
          date: s.date,
          billNo: s.billNo,
          type: "Sale",
          total: s.grandTotal,
          payment: 0,
          balance: 0,
        }));

      // Get payments
      const customerPayments = payments
        .filter(
          (p) => p.partyType === "customer" && p.partyId === parseInt(partyId),
        )
        .map((p) => ({
          date: p.date,
          billNo: p.billNo || "-",
          type: "Payment",
          total: 0,
          payment: p.amount,
          balance: 0,
        }));

      transactions = [...customerSales, ...customerPayments];
    }

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let balance = 0;
    transactions = transactions.map((t) => {
      if (partyType === "supplier") {
        balance = balance + (t.type === "Purchase" ? t.total : -t.payment);
      } else {
        balance = balance + (t.type === "Sale" ? t.total : -t.payment);
      }
      return { ...t, balance };
    });

    return transactions.reverse();
  };

  const getLowStockMedicines = () => {
    return medicines.filter(
      (m) => m.stock < companySettings.lowStockAlert && m.stock >= 0,
    );
  };

  const getNegativeStockMedicines = () => {
    return medicines.filter((m) => m.stock < 0);
  };

  const getExpiredMedicines = () => {
    const today = new Date();
    return medicines.filter((m) => {
      if (!m.expiry) return false;
      const expiryDate = new Date(m.expiry + "-01");
      return expiryDate < today;
    });
  };

  const getNearExpiryMedicines = (months = 3) => {
    const today = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + months);

    return medicines.filter((m) => {
      if (!m.expiry) return false;
      const expiryDate = new Date(m.expiry + "-01");
      return expiryDate > today && expiryDate <= future;
    });
  };

  // Date range filter functions for Reports
  const getSalesByDateRange = (from, to) => {
    return sales.filter((s) => s.date >= from && s.date <= to);
  };

  const getPurchasesByDateRange = (from, to) => {
    return purchases.filter((p) => p.date >= from && p.date <= to);
  };

  const getExpensesByDateRange = (from, to) => {
    return expenses.filter((e) => e.date >= from && e.date <= to);
  };

  const getDashboardStats = () => {
    const today = new Date().toISOString().split("T")[0];

    // Today's sales
    const todaySales = sales.filter((s) => s.date === today);
    const totalSales = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);

    // Today's purchases
    const todayPurchases = purchases.filter((p) => p.date === today);
    const totalPurchases = todayPurchases.reduce(
      (sum, p) => sum + p.grandTotal,
      0,
    );

    // Today's expenses
    const todayExpenses = expenses.filter((e) => e.date === today);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate profit
    let totalProfit = 0;
    todaySales.forEach((sale) => {
      sale.items.forEach((item) => {
        const medicine = getMedicineById(item.medicineId);
        if (medicine) {
          const cost = medicine.purchasePrice * item.qty;
          const revenue = item.price * item.qty;
          totalProfit += revenue - cost;
        }
      });
    });

    const netProfit = totalProfit - totalExpenses;

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      totalProfit: netProfit,
      cashInHand: totalSales - totalExpenses,
      totalItems: medicines.length,
      lowStock: getLowStockMedicines().length,
      negativeStock: getNegativeStockMedicines().length,
      expiredStock: getExpiredMedicines().length,
      totalSuppliers: suppliers.length,
      totalCustomers: customers.filter((c) => c.id !== 1).length,
      totalUsers: users.length,
    };
  };

  const value = {
    // Company Settings
    companySettings,
    updateCompanySettings,

    // Auth
    user,
    users,
    login,
    logout,
    loading,
    checkPermission,

    // User Management
    addUser,
    updateUser,
    deleteUser,

    // Medicines
    medicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    getMedicineById,
    getLowStockMedicines,
    getNegativeStockMedicines,
    getExpiredMedicines,
    getNearExpiryMedicines,

    // Suppliers
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    updateSupplierBalance,

    // Customers
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    updateCustomerBalance,

    // Purchases
    purchases,
    addPurchase,
    updatePurchase,
    deletePurchase,

    // Sales
    sales,
    addSale,
    updateSale,
    deleteSale,

    // Expenses
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,

    // Payments
    payments,
    addPayment,

    // Helper functions
    getPartyTransactions,
    getDashboardStats,
    getSalesByDateRange,
    getPurchasesByDateRange,
    getExpensesByDateRange,
  };

  return (
    <AppContext.Provider value={value}>
      {!loading && children}
    </AppContext.Provider>
  );
};
