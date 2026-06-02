import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  Plus, 
  Users, 
  Folder, 
  UserCircle2, 
  BarChart3,
  Moon, 
  Sun,
  FileText,
  X,
  LogOut
} from 'lucide-react';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Timer from './components/Timer';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import ClientMgr from './components/ClientMgr';
import CategoryMgr from './components/CategoryMgr';
import Analytics from './components/Analytics';
import ProfileMgr from './components/ProfileMgr';

import { 
  getCurrentUser,
  saveCurrentUser,
  getClients, 
  saveClients, 
  getCategories, 
  saveCategories, 
  getEntries, 
  saveEntries, 
  getUserProfile, 
  saveUserProfile, 
  getTheme, 
  saveTheme 
} from './utils/storage';

import { generateInvoicePDF } from './utils/pdfGenerator';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // App States
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [userProfile, setUserProfile] = useState({});
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  
  // Modal States
  const [editingEntry, setEditingEntry] = useState(null);
  const [isManualLogModalOpen, setIsManualLogModalOpen] = useState(false);
  
  // Invoicing Modal States
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState(null);
  const [invoiceEntries, setInvoiceEntries] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(0);

  // Initialize Auth & Theme on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setAuthInitialized(true);

    const savedTheme = getTheme();
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Sync data when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setClients(getClients(currentUser.id));
      setCategories(getCategories(currentUser.id));
      setEntries(getEntries(currentUser.id));
      
      const profile = getUserProfile(currentUser.id);
      setUserProfile(profile);
      setInvoiceTaxRate(profile.taxRate || 0);
    } else {
      setClients([]);
      setCategories([]);
      setEntries([]);
      setUserProfile({});
      setInvoiceTaxRate(0);
    }
  }, [currentUser]);

  // Theme toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // --- Auth Handlers ---
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      saveCurrentUser(null);
      setCurrentUser(null);
    }
  };

  // --- Clients CRUD Handlers ---
  const handleAddClient = (newClient) => {
    const payload = {
      ...newClient,
      id: `client-${Date.now()}`
    };
    const updated = [...clients, payload];
    setClients(updated);
    saveClients(currentUser.id, updated);
  };

  const handleUpdateClient = (id, updatedDetails) => {
    const updated = clients.map(c => c.id === id ? { ...c, ...updatedDetails } : c);
    setClients(updated);
    saveClients(currentUser.id, updated);
  };

  const handleDeleteClient = (id) => {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    saveClients(currentUser.id, updated);
  };

  // --- Categories CRUD Handlers ---
  const handleAddCategory = (newCat) => {
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(currentUser.id, updated);
  };

  const handleDeleteCategory = (catToDelete) => {
    const updated = categories.filter(c => c !== catToDelete);
    setCategories(updated);
    saveCategories(currentUser.id, updated);
  };

  // --- Entries CRUD Handlers ---
  const handleSaveEntry = (entryPayload) => {
    let updated;
    if (entryPayload.id) {
      // Editing
      updated = entries.map(e => e.id === entryPayload.id ? { ...e, ...entryPayload } : e);
      setEditingEntry(null);
    } else {
      // New Entry
      const newEntry = {
        ...entryPayload,
        id: `entry-${Date.now()}`
      };
      updated = [newEntry, ...entries];
      setIsManualLogModalOpen(false);
    }
    setEntries(updated);
    saveEntries(currentUser.id, updated);
  };

  const handleDeleteEntry = (id) => {
    if (window.confirm("Are you sure you want to delete this time entry?")) {
      const updated = entries.filter(e => e.id !== id);
      setEntries(updated);
      saveEntries(currentUser.id, updated);
    }
  };

  const handleUpdateStatus = (ids, nextStatus) => {
    const updated = entries.map(e => {
      if (ids.includes(e.id)) {
        const updatedEntry = { ...e, status: nextStatus };
        // If status changed away from Billed, strip invoice details
        if (nextStatus !== 'Billed') {
          delete updatedEntry.invoiceNumber;
        }
        return updatedEntry;
      }
      return e;
    });
    setEntries(updated);
    saveEntries(currentUser.id, updated);
  };

  // --- User Profile Handlers ---
  const handleUpdateProfile = (updatedProfile) => {
    setUserProfile(updatedProfile);
    saveUserProfile(currentUser.id, updatedProfile);
    setInvoiceTaxRate(updatedProfile.taxRate || 0);
  };

  // --- Invoicing Flow ---
  const handleInitInvoice = (clientId, selectedTimeEntries) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    setInvoiceClient(client);
    setInvoiceEntries(selectedTimeEntries);
    
    // Auto-generate invoice values
    const year = new Date().getFullYear();
    const billedCount = entries.filter(e => e.invoiceNumber).length;
    const invNum = `INV-${year}-${String(billedCount + 1).padStart(3, '0')}`;
    
    setInvoiceNumber(invNum);
    
    const todayStr = new Date().toISOString().split('T')[0];
    setInvoiceDate(todayStr);
    
    // Default Net 14 due date
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const dueStr = due.toISOString().split('T')[0];
    setInvoiceDueDate(dueStr);

    setInvoiceModalOpen(true);
  };

  const handleGenerateInvoicePDF = (e) => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      alert("Invoice Number is required.");
      return;
    }

    // 1. Generate PDF Invoicing
    generateInvoicePDF(userProfile, invoiceClient, invoiceEntries, {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate: invoiceDueDate,
      taxRate: invoiceTaxRate
    });

    // 2. Mark entries as billed
    const invoiceIds = invoiceEntries.map(entry => entry.id);
    const updatedEntries = entries.map(e => {
      if (invoiceIds.includes(e.id)) {
        return {
          ...e,
          status: 'Billed',
          invoiceNumber: invoiceNumber.trim()
        };
      }
      return e;
    });
    
    setEntries(updatedEntries);
    saveEntries(currentUser.id, updatedEntries);

    // 3. Reset Modal
    setInvoiceModalOpen(false);
    setInvoiceClient(null);
    setInvoiceEntries([]);
    
    alert(`Invoice ${invoiceNumber} downloaded and entries updated successfully!`);
  };

  // Wait until auth is checked
  if (!authInitialized) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#fff' }}>Loading Tempo...</div>;
  }

  // Render Login Gate if no active user session
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Calculate quick summary metrics
  const unbilledCount = entries.filter(e => e.status === 'Unbilled').length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">T</div>
          <span className="logo-text">Tempo</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'timer' ? 'active' : ''}`}
                onClick={() => setActiveTab('timer')}
              >
                <Clock size={20} />
                <span>Time Tracker</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'entries' ? 'active' : ''}`}
                onClick={() => setActiveTab('entries')}
              >
                <FileText size={20} />
                <span>Time Logs</span>
                {unbilledCount > 0 && (
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '0.75rem', 
                    padding: '0.1rem 0.4rem', 
                    backgroundColor: 'var(--color-unbilled)', 
                    color: '#000', 
                    borderRadius: '50px', 
                    fontWeight: 'bold' 
                  }}>
                    {unbilledCount}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`}
                onClick={() => setActiveTab('clients')}
              >
                <Users size={20} />
                <span>Clients</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                <Folder size={20} />
                <span>Categories</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 size={20} />
                <span>Analytics</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <UserCircle2 size={20} />
                <span>Settings</span>
              </button>
            </li>
            
            {/* Log Out Action */}
            <li style={{ marginTop: '2.5rem' }}>
              <button 
                className="nav-item"
                onClick={handleLogout}
                style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.1)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}
              >
                <LogOut size={20} />
                <span>Log Out</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* User Card */}
        <div className="user-badge" onClick={() => setActiveTab('profile')}>
          <div className="user-avatar">
            {userProfile.name ? userProfile.name.charAt(0) : 'A'}
          </div>
          <div className="user-info">
            <span className="user-name">{userProfile.name || 'Contractor'}</span>
            <span className="user-role">{userProfile.company || 'Freelancer'}</span>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {/* Header Block */}
        <header className="top-header">
          <div className="page-title">
            <h1 style={{ textTransform: 'capitalize' }}>{activeTab}</h1>
            <p>
              {activeTab === 'dashboard' && 'Visual overview of your contract operations, workload, and collections.'}
              {activeTab === 'timer' && 'Track contract hours in real-time or log them using the stopwatch.'}
              {activeTab === 'entries' && 'Filter, search, edit, and invoice your logged time sheets.'}
              {activeTab === 'clients' && 'Manage corporate client lists and default hourly rates.'}
              {activeTab === 'categories' && 'Configure custom task categories for accurate segmentation.'}
              {activeTab === 'analytics' && 'Inspect earning breakdowns and work distribution.'}
              {activeTab === 'profile' && 'Configure your developer identity, taxation, payments, and system backups.'}
            </p>
          </div>

          <div className="header-actions">
            {activeTab === 'entries' && (
              <button 
                className="btn btn-primary"
                onClick={() => setIsManualLogModalOpen(true)}
              >
                <Plus size={16} /> Log Entry Manually
              </button>
            )}
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Dynamic View rendering */}
        <div className="view-container">
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <Dashboard entries={entries} clients={clients} />
              <div className="dashboard-grid">
                <Timer clients={clients} categories={categories} onLogEntry={handleSaveEntry} />
                <Analytics entries={entries} clients={clients} />
              </div>
            </div>
          )}
          
          {activeTab === 'timer' && (
            <div style={{ maxWidth: '750px', margin: '0 auto' }}>
              <Timer clients={clients} categories={categories} onLogEntry={handleSaveEntry} />
            </div>
          )}
          
          {activeTab === 'entries' && (
            <EntryList 
              entries={entries} 
              clients={clients} 
              onDeleteEntry={handleDeleteEntry}
              onEditEntry={(entry) => setEditingEntry(entry)}
              onUpdateStatus={handleUpdateStatus}
              onGenerateInvoice={handleInitInvoice}
            />
          )}

          {activeTab === 'clients' && (
            <ClientMgr 
              clients={clients} 
              onAddClient={handleAddClient} 
              onUpdateClient={handleUpdateClient} 
              onDeleteClient={handleDeleteClient} 
            />
          )}

          {activeTab === 'categories' && (
            <CategoryMgr 
              categories={categories} 
              onAddCategory={handleAddCategory} 
              onDeleteCategory={handleDeleteCategory} 
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics entries={entries} clients={clients} />
          )}

          {activeTab === 'profile' && (
            <ProfileMgr 
              userProfile={userProfile} 
              onUpdateProfile={handleUpdateProfile} 
            />
          )}
        </div>
      </main>

      {/* --- Overlay Modal: Manual Entry Logger --- */}
      {isManualLogModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <EntryForm 
              clients={clients} 
              categories={categories} 
              onLogEntry={handleSaveEntry} 
              onCancel={() => setIsManualLogModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* --- Overlay Modal: Edit Existing Entry --- */}
      {editingEntry && (
        <div className="modal-overlay">
          <div className="modal-content">
            <EntryForm 
              clients={clients} 
              categories={categories} 
              initialValues={editingEntry}
              onLogEntry={handleSaveEntry} 
              onCancel={() => setEditingEntry(null)}
            />
          </div>
        </div>
      )}

      {/* --- Overlay Modal: Invoice Metadata Form & Preview --- */}
      {invoiceModalOpen && invoiceClient && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleGenerateInvoicePDF} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Configure Invoice details</h2>
              <button type="button" className="modal-close-btn" onClick={() => setInvoiceModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{invoiceClient.name}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '1rem' }}>Total Items: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{invoiceEntries.length} entries</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '1rem' }}>Hours: </span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {invoiceEntries.reduce((sum, e) => sum + e.duration, 0).toFixed(2)} hrs
                </strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Invoice Number *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={invoiceNumber} 
                    onChange={(e) => setInvoiceNumber(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    min="0" 
                    max="100" 
                    step="0.01" 
                    value={invoiceTaxRate} 
                    onChange={(e) => setInvoiceTaxRate(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Issue Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={invoiceDate} 
                    onChange={(e) => setInvoiceDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={invoiceDueDate} 
                    onChange={(e) => setInvoiceDueDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setInvoiceModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm & Download Invoice
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
