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
  LogOut,
  Receipt,
  CheckSquare,
  Inbox,
  TrendingUp
} from 'lucide-react';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Timer from './components/Timer';

// Utility helper to get YYYY-MM-DD in local contractor time (prevents UTC date-shifts past 4/5 PM Pacific)
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import ClientMgr from './components/ClientMgr';
import CategoryMgr from './components/CategoryMgr';
import Analytics from './components/Analytics';
import ProfileMgr from './components/ProfileMgr';
import Invoices from './components/Invoices';
import TempoTasks from './components/TempoTasks';

// Local Storage Fallback Helpers
import { 
  getCurrentUser as getLocalCurrentUser,
  saveCurrentUser as saveLocalCurrentUser,
  getClients as getLocalClients, 
  saveClients as saveLocalClients, 
  getCategories as getLocalCategories, 
  saveCategories as saveLocalCategories, 
  getEntries as getLocalEntries, 
  saveEntries as saveLocalEntries, 
  getUserProfile as getLocalUserProfile, 
  saveUserProfile as saveLocalUserProfile, 
  getInvoices as getLocalInvoices,
  saveInvoices as saveLocalInvoices,
  getTheme, 
  saveTheme,
  getTimerState,
  saveTimerState,
  getSavedFilters as getLocalSavedFilters,
  saveSavedFilters as saveLocalSavedFilters
} from './utils/storage';

import { generateInvoicePDF } from './utils/pdfGenerator';

// Amplify Libraries
import { generateClient } from 'aws-amplify/data';
import { signOut, deleteUser, getCurrentUser as getCognitoUser, fetchUserAttributes } from 'aws-amplify/auth';
import outputs from '../amplify_outputs.json';

const isAmplifyConfigured = outputs && Object.keys(outputs).length > 0;
const dataClient = isAmplifyConfigured ? generateClient() : null;

const listAll = async (model) => {
  let allItems = [];
  let nextToken = null;
  do {
    const res = await model.list({ nextToken });
    if (res.data) {
      allItems = allItems.concat(res.data);
    }
    nextToken = res.nextToken;
  } while (nextToken);
  return { data: allItems };
};


// Rounding utility helper
const getRoundedDuration = (duration, clientId, clientsList, profile) => {
  const client = clientsList.find(c => c.id === clientId);
  let rule = client?.roundingRule || 'default';
  
  if (rule === 'default') {
    rule = profile?.defaultRounding || 'none';
  }
  
  if (rule === 'none') {
    return duration;
  }
  
  let rounded = duration;
  if (rule === 'nearest_6') {
    rounded = Math.round(duration * 10) / 10;
  } else if (rule === 'nearest_15') {
    rounded = Math.round(duration * 4) / 4;
  } else if (rule === 'nearest_30') {
    rounded = Math.round(duration * 2) / 2;
  } else if (rule === 'ceil_15') {
    rounded = Math.ceil(duration * 4) / 4;
  }
  
  return rounded > 0 ? parseFloat(rounded.toFixed(2)) : 0.01;
};

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  // App States
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [userProfile, setUserProfile] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [savedFilters, setSavedFilters] = useState([]);
  
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

  // Batch Invoicing Modal States
  const [batchInvoiceModalOpen, setBatchInvoiceModalOpen] = useState(false);
  const [batchInvoiceGroups, setBatchInvoiceGroups] = useState([]);
  const [batchStartingNumber, setBatchStartingNumber] = useState('');
  const [batchDate, setBatchDate] = useState('');
  const [batchDueDate, setBatchDueDate] = useState('');
  const [batchTaxRate, setBatchTaxRate] = useState(0);

  const isPopout = window.location.search.includes('popout=true');

  // Initialize Auth, Theme, and network listeners on mount
  useEffect(() => {
    const initAuth = async () => {
      if (isAmplifyConfigured) {
        try {
          const user = await getCognitoUser();
          const attributes = await fetchUserAttributes();
          const mergedUser = {
            ...user,
            email: attributes.email || '',
            name: attributes.name || attributes.given_name || ''
          };
          setCurrentUser(mergedUser);
        } catch {
          // No active Cognito session
          setCurrentUser(null);
        }
      } else {
        const user = getLocalCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      }
      setAuthInitialized(true);
    };

    initAuth();

    const savedTheme = getTheme();
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync data when currentUser changes
  useEffect(() => {
    const syncData = async () => {
      if (!currentUser) {
        setClients([]);
        setCategories([]);
        setEntries([]);
        setUserProfile({});
        setInvoices([]);
        setInvoiceTaxRate(0);
        return;
      }

      if (isAmplifyConfigured) {
        setLoading(true);
        try {
          // 1. Fetch Clients
          const { data: clientsData } = await listAll(dataClient.models.Client);
          setClients(clientsData);

          // 2. Fetch Categories (Seed defaults if empty)
          const { data: categoriesData } = await listAll(dataClient.models.Category);
          if (categoriesData.length === 0) {
            const seedCats = ['Software Development', 'UI/UX Design', 'Technical Consulting', 'Project Management', 'QA & Testing', 'Code Review'];
            await Promise.all(seedCats.map(name => dataClient.models.Category.create({ name, isPinned: false })));
            const { data: refetchedCats } = await listAll(dataClient.models.Category);
            setCategories(refetchedCats);
          } else {
            setCategories(categoriesData);
          }

          // 3. Fetch Entries
          const { data: entriesData } = await listAll(dataClient.models.TimeEntry);
          // Sort by date descending locally for best visual layout
          const sortedEntries = [...entriesData].sort((a, b) => new Date(b.date) - new Date(a.date));
          setEntries(sortedEntries);

          // 4. Fetch User Profile (Seed defaults if empty)
          const { data: profileData } = await listAll(dataClient.models.UserProfile);
          if (profileData.length === 0) {
            const defaultName = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Developer');
            const { data: newProfile } = await dataClient.models.UserProfile.create({
              name: defaultName,
              email: currentUser.email || '',
              company: '',
              address: '',
              paymentDetails: '',
              taxRate: 0,
              defaultRounding: 'none'
            });

            setUserProfile(newProfile);
            setInvoiceTaxRate(0);
          } else {
            let currentProfile = profileData[0];
            // Repair if name or email matches the UUID (username) and we have attributes
            if (
              (currentProfile.name === currentUser.username || currentProfile.email === currentUser.username) &&
              (currentUser.name || currentUser.email)
            ) {
              const updatedName = currentProfile.name === currentUser.username 
                ? (currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Developer')) 
                : currentProfile.name;
              const updatedEmail = currentProfile.email === currentUser.username 
                ? (currentUser.email || '') 
                : currentProfile.email;
              
              try {
                const { data: repairedProfile } = await dataClient.models.UserProfile.update({
                  id: currentProfile.id,
                  name: updatedName,
                  email: updatedEmail
                });
                currentProfile = repairedProfile;
              } catch (updateErr) {
                console.error("Failed to repair UserProfile metadata:", updateErr);
              }
            }
            setUserProfile(currentProfile);
            setInvoiceTaxRate(currentProfile.taxRate || 0);
          }

          // 5. Fetch Invoices
          const { data: invoicesData } = await listAll(dataClient.models.Invoice);
          const sortedInvoices = [...invoicesData].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
          setInvoices(sortedInvoices);

           // 6. Fetch Saved Filters
          const { data: savedFiltersData } = await listAll(dataClient.models.SavedFilter);
          setSavedFilters(savedFiltersData);
        } catch (err) {
          console.error("Amplify data fetch error:", err);
        } finally {
          setLoading(false);
        }
      } else {
        // Local fallback
        setClients(getLocalClients(currentUser.id));
        setCategories(getLocalCategories(currentUser.id));
        setEntries(getLocalEntries(currentUser.id));
        setInvoices(getLocalInvoices(currentUser.id));
        setSavedFilters(getLocalSavedFilters(currentUser.id));
        
        const profile = getLocalUserProfile(currentUser.id);
        setUserProfile(profile);
        setInvoiceTaxRate(profile.taxRate || 0);
      }
    };

    syncData();
  }, [currentUser]);

  // Synchronize LocalStorage state across tabs (only in fallback mode)
  useEffect(() => {
    if (isAmplifyConfigured || !currentUser) return;

    const handleStorageChange = (e) => {
      if (e.key === `tempo_entries_${currentUser.id}`) {
        setEntries(getLocalEntries(currentUser.id));
      }
      if (e.key === `tempo_clients_${currentUser.id}`) {
        setClients(getLocalClients(currentUser.id));
      }
      if (e.key === `tempo_categories_${currentUser.id}`) {
        setCategories(getLocalCategories(currentUser.id));
      }
      if (e.key === `tempo_saved_filters_${currentUser.id}`) {
        setSavedFilters(getLocalSavedFilters(currentUser.id));
      }
      if (e.key === 'tempo_current_user') {
        const user = getLocalCurrentUser();
        setCurrentUser(user);
      }
      if (e.key === 'tempo_theme') {
        const savedTheme = getTheme();
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser]);

  // Warning guard before browser window closes if a timer is running
  useEffect(() => {
    if (!currentUser) return;
    
    const handleBeforeUnload = (e) => {
      const userIdVal = isAmplifyConfigured ? currentUser.userId : currentUser.id;
      const timerState = getTimerState(userIdVal);
      if (timerState && timerState.isRunning && !timerState.isPaused) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser]);

  // Global Keyboard Shortcuts (Hotkeys)
  useEffect(() => {
    if (!currentUser) return;

    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      );

      if (isInputFocused) return;

      // Space: Toggle active timer
      if (e.code === 'Space') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('tempo-toggle-timer'));
      }

      // N: Open manual logger modal
      if (e.key === 'N' || e.key === 'n') {
        e.preventDefault();
        setIsManualLogModalOpen(true);
      }

      // /: Focus search query inside entries list
      if (e.key === '/') {
        e.preventDefault();
        setActiveTab('entries');
        setTimeout(() => {
          const searchInput = document.getElementById('logs-search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 50);
      }

      // 1-8 keys: Switch navigation tabs
      const tabKeys = ['1', '2', '3', '4', '5', '6', '7', '8'];
      if (tabKeys.includes(e.key)) {
        e.preventDefault();
        const tabMap = {
          '1': 'dashboard',
          '2': 'timer',
          '3': 'entries',
          '4': 'invoices',
          '5': 'clients',
          '6': 'categories',
          '7': 'analytics',
          '8': 'profile'
        };
        setActiveTab(tabMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  // Theme toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // --- Auth Handlers ---
  const handleLoginSuccess = async (user) => {
    if (isAmplifyConfigured) {
      try {
        const attributes = await fetchUserAttributes();
        const mergedUser = {
          ...user,
          email: attributes.email || '',
          name: attributes.name || attributes.given_name || ''
        };
        setCurrentUser(mergedUser);
      } catch (err) {
        setCurrentUser(user);
      }
    } else {
      setCurrentUser(user);
    }
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    const userIdVal = isAmplifyConfigured ? currentUser.userId : currentUser.id;
    const timerState = getTimerState(userIdVal);
    
    if (timerState && timerState.isRunning && !timerState.isPaused) {
      if (!window.confirm("You have an active timer running. Logging out will clear your active timer session. Do you want to proceed?")) {
        return;
      }
    } else {
      if (!window.confirm("Are you sure you want to log out?")) {
        return;
      }
    }

    try {
      if (isAmplifyConfigured) {
        try {
          const { data: timers } = await listAll(dataClient.models.ActiveTimer);
          await Promise.all(timers.map(t => dataClient.models.ActiveTimer.delete({ id: t.id })));
        } catch (err) {
          console.warn("Failed to clear cloud timer on logout:", err);
        }
        await signOut();
      } else {
        saveLocalCurrentUser(null);
      }
      saveTimerState(userIdVal, null);
    } catch (err) {
      console.error("Signout error:", err);
    } finally {
      setCurrentUser(null);
      setActiveTab('dashboard');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete all your data and Cognito login credentials. This cannot be undone!")) {
      setLoading(true);
      try {
        if (isAmplifyConfigured) {
          // 1. Delete all user-associated DynamoDB objects
          const deleteClients = clients.map(c => dataClient.models.Client.delete({ id: c.id }));
          const deleteEntries = entries.map(e => dataClient.models.TimeEntry.delete({ id: e.id }));
          
          const { data: catsList } = await listAll(dataClient.models.Category);
          const deleteCats = catsList.map(c => dataClient.models.Category.delete({ id: c.id }));
          const deleteProfile = dataClient.models.UserProfile.delete({ id: userProfile.id });

          const { data: timersList } = await listAll(dataClient.models.ActiveTimer);
          const deleteTimers = timersList.map(t => dataClient.models.ActiveTimer.delete({ id: t.id }));

          await Promise.all([...deleteClients, ...deleteEntries, ...deleteCats, ...deleteTimers, deleteProfile]);

          // 2. Delete Cognito Authentication Account
          await deleteUser();
          saveTimerState(currentUser.userId, null);
        } else {
          // Local fallback delete
          localStorage.removeItem(`tempo_clients_${currentUser.id}`);
          localStorage.removeItem(`tempo_categories_${currentUser.id}`);
          localStorage.removeItem(`tempo_entries_${currentUser.id}`);
          localStorage.removeItem(`tempo_user_profile_${currentUser.id}`);
          localStorage.removeItem(`tempo_timer_state_${currentUser.id}`);
          
          const users = JSON.parse(localStorage.getItem('tempo_users')) || [];
          const updatedUsers = users.filter(u => u.id !== currentUser.id);
          localStorage.setItem('tempo_users', JSON.stringify(updatedUsers));
          saveLocalCurrentUser(null);
        }
        
        setCurrentUser(null);
        alert("Your account has been deleted permanently.");
      } catch (err) {
        console.error("Account deletion error:", err);
        alert("Failed to delete account: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // --- Clients CRUD Handlers ---
  const handleAddClient = async (newClient) => {
    if (isAmplifyConfigured) {
      const { data } = await dataClient.models.Client.create({
        name: newClient.name,
        email: newClient.email,
        defaultRate: newClient.defaultRate,
        address: newClient.address,
        notes: newClient.notes,
        roundingRule: newClient.roundingRule || 'default',
        budgetType: newClient.budgetType || 'none',
        budgetLimit: newClient.budgetLimit,
        budgetPeriod: newClient.budgetPeriod || 'none'
      });
      setClients([...clients, data]);

    } else {
      const payload = { ...newClient, id: `client-${Date.now()}` };
      const updated = [...clients, payload];
      setClients(updated);
      saveLocalClients(currentUser.id, updated);
    }
  };

  const handleUpdateClient = async (id, updatedDetails) => {
    if (isAmplifyConfigured) {
      const { data } = await dataClient.models.Client.update({
        id,
        ...updatedDetails
      });
      setClients(clients.map(c => c.id === id ? data : c));
    } else {
      const updated = clients.map(c => c.id === id ? { ...c, ...updatedDetails } : c);
      setClients(updated);
      saveLocalClients(currentUser.id, updated);
    }
  };

  const handleDeleteClient = async (id) => {
    if (isAmplifyConfigured) {
      await dataClient.models.Client.delete({ id });
      setClients(clients.filter(c => c.id !== id));
    } else {
      const updated = clients.filter(c => c.id !== id);
      setClients(updated);
      saveLocalClients(currentUser.id, updated);
    }
  };

  // --- Categories CRUD Handlers ---
  const handleAddCategory = async (newCat) => {
    if (isAmplifyConfigured) {
      const { data } = await dataClient.models.Category.create({ name: newCat, isPinned: false });
      setCategories([...categories, data]);
    } else {
      const payload = { id: `cat-${Date.now()}`, name: newCat, isPinned: false };
      const updated = [...categories, payload];
      setCategories(updated);
      saveLocalCategories(currentUser.id, updated);
    }
  };

  const handleDeleteCategory = async (idToDelete) => {
    if (isAmplifyConfigured) {
      await dataClient.models.Category.delete({ id: idToDelete });
      setCategories(categories.filter(c => c.id !== idToDelete));
    } else {
      const updated = categories.filter(c => c.id !== idToDelete);
      setCategories(updated);
      saveLocalCategories(currentUser.id, updated);
    }
  };

  const handleUpdateCategory = async (id, newCatName) => {
    if (isAmplifyConfigured) {
      const oldCat = categories.find(c => c.id === id);
      const { data } = await dataClient.models.Category.update({ id, name: newCatName });
      setCategories(categories.map(c => c.id === id ? data : c));

      // Cascade update to entries in DynamoDB
      if (oldCat) {
        const entriesToUpdate = entries.filter(e => e.category === oldCat.name);
        await Promise.all(entriesToUpdate.map(e => dataClient.models.TimeEntry.update({ id: e.id, category: newCatName })));
        
        const { data: refetchedEntries } = await listAll(dataClient.models.TimeEntry);
        const sorted = [...refetchedEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sorted);
      }
    } else {
      const oldCat = categories.find(c => c.id === id);
      const updatedCats = categories.map(c => c.id === id ? { ...c, name: newCatName } : c);
      setCategories(updatedCats);
      saveLocalCategories(currentUser.id, updatedCats);

      if (oldCat) {
        const updatedEntries = entries.map(e => e.category === oldCat.name ? { ...e, category: newCatName } : e);
        setEntries(updatedEntries);
        saveLocalEntries(currentUser.id, updatedEntries);
      }
    }
  };

  // --- Pin / Unpin Handlers ---
  const handleTogglePinClient = async (id) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    const nextPinned = !client.isPinned;
    if (isAmplifyConfigured) {
      const { data } = await dataClient.models.Client.update({
        id,
        isPinned: nextPinned
      });
      setClients(clients.map(c => c.id === id ? data : c));
    } else {
      const updated = clients.map(c => c.id === id ? { ...c, isPinned: nextPinned } : c);
      setClients(updated);
      saveLocalClients(currentUser.id, updated);
    }
  };

  const handleTogglePinCategory = async (id) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const nextPinned = !cat.isPinned;
    if (isAmplifyConfigured) {
      const { data } = await dataClient.models.Category.update({
        id,
        isPinned: nextPinned
      });
      setCategories(categories.map(c => c.id === id ? data : c));
    } else {
      const updated = categories.map(c => c.id === id ? { ...c, isPinned: nextPinned } : c);
      setCategories(updated);
      saveLocalCategories(currentUser.id, updated);
    }
  };

  // --- Saved Filters Handlers ---
  const handleCreateSavedFilter = async (name, payload) => {
    if (isAmplifyConfigured) {
      const { data } = await dataClient.models.SavedFilter.create({
        name,
        filterClient: payload.filterClient || '',
        filterCategory: payload.filterCategory || '',
        filterStatus: payload.filterStatus || '',
        filterStartDate: payload.filterStartDate || '',
        filterEndDate: payload.filterEndDate || '',
        searchQuery: payload.searchQuery || '',
      });
      setSavedFilters([...savedFilters, data]);
    } else {
      const newFilter = {
        id: `filter-${Date.now()}`,
        name,
        filterClient: payload.filterClient || '',
        filterCategory: payload.filterCategory || '',
        filterStatus: payload.filterStatus || '',
        filterStartDate: payload.filterStartDate || '',
        filterEndDate: payload.filterEndDate || '',
        searchQuery: payload.searchQuery || '',
      };
      const updated = [...savedFilters, newFilter];
      setSavedFilters(updated);
      saveLocalSavedFilters(currentUser.id, updated);
    }
  };

  const handleDeleteSavedFilter = async (id) => {
    if (isAmplifyConfigured) {
      await dataClient.models.SavedFilter.delete({ id });
      setSavedFilters(savedFilters.filter(f => f.id !== id));
    } else {
      const updated = savedFilters.filter(f => f.id !== id);
      setSavedFilters(updated);
      saveLocalSavedFilters(currentUser.id, updated);
    }
  };

  // --- Time Entries CRUD Handlers ---
  const handleSaveEntry = async (entryPayload) => {
    const roundedDuration = getRoundedDuration(
      entryPayload.duration, 
      entryPayload.clientId, 
      clients, 
      userProfile
    );
    
    const finalPayload = {
      ...entryPayload,
      duration: roundedDuration,
      isBillable: entryPayload.isBillable !== false
    };

    if (isAmplifyConfigured) {
      if (finalPayload.id) {
        const { data } = await dataClient.models.TimeEntry.update({
          id: finalPayload.id,
          clientId: finalPayload.clientId,
          category: finalPayload.category,
          duration: finalPayload.duration,
          rate: finalPayload.rate,
          date: finalPayload.date,
          description: finalPayload.description,
          status: finalPayload.status,
          invoiceNumber: finalPayload.invoiceNumber || null,
          isBillable: finalPayload.isBillable
        });
        setEntries(entries.map(e => e.id === finalPayload.id ? data : e));
        setEditingEntry(null);
      } else {
        const { data } = await dataClient.models.TimeEntry.create({
          clientId: finalPayload.clientId,
          category: finalPayload.category,
          duration: finalPayload.duration,
          rate: finalPayload.rate,
          date: finalPayload.date,
          description: finalPayload.description || 'Timer log entry',
          status: finalPayload.status,
          invoiceNumber: null,
          isBillable: finalPayload.isBillable
        });
        setEntries([data, ...entries]);
        setIsManualLogModalOpen(false);
        setEditingEntry(null);
      }
    } else {
      let updated;
      if (finalPayload.id) {
        updated = entries.map(e => e.id === finalPayload.id ? { ...e, ...finalPayload } : e);
        setEditingEntry(null);
      } else {
        const newEntry = { ...finalPayload, id: `entry-${Date.now()}` };
        updated = [newEntry, ...entries];
        setIsManualLogModalOpen(false);
        setEditingEntry(null);
      }
      setEntries(updated);
      saveLocalEntries(currentUser.id, updated);
    }
  };

  // Sync helper to update Invoice status when Time Entries change status or get deleted
  const syncInvoiceStatusAfterEntryChange = async (affectedInvoices, latestEntries) => {
    if (!affectedInvoices || affectedInvoices.size === 0) return;
    
    const updatedInvoicesList = [...invoices];
    let invoicesChanged = false;

    for (const invNum of affectedInvoices) {
      if (!invNum) continue;
      const invoice = invoices.find(i => i.invoiceNumber === invNum);
      if (!invoice) continue;

      const invoiceEntries = latestEntries.filter(e => e.invoiceNumber === invNum);
      
      let targetStatus = invoice.status;
      if (invoiceEntries.length > 0) {
        const allPaid = invoiceEntries.every(e => e.status === 'Paid');
        const anyBilled = invoiceEntries.some(e => e.status === 'Billed');

        if (allPaid && invoice.status !== 'Paid') {
          targetStatus = 'Paid';
        } else if (anyBilled && invoice.status === 'Paid') {
          targetStatus = 'Unpaid';
        }
      } else {
        // No entries left associated with this invoice
        if (invoice.status === 'Paid') {
          targetStatus = 'Unpaid';
        }
      }

      if (targetStatus !== invoice.status) {
        invoicesChanged = true;
        if (isAmplifyConfigured) {
          await dataClient.models.Invoice.update({
            id: invoice.id,
            status: targetStatus
          });
        } else {
          const index = updatedInvoicesList.findIndex(i => i.id === invoice.id);
          if (index !== -1) {
            updatedInvoicesList[index] = { ...updatedInvoicesList[index], status: targetStatus };
          }
        }
      }
    }

    if (invoicesChanged) {
      if (isAmplifyConfigured) {
        const { data } = await listAll(dataClient.models.Invoice);
        const sorted = [...data].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        setInvoices(sorted);
      } else {
        setInvoices(updatedInvoicesList);
        saveLocalInvoices(currentUser.id, updatedInvoicesList);
      }
    }
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm("Are you sure you want to delete this time entry?")) {
      const entryToDelete = entries.find(e => e.id === id);
      const affectedInvoiceNumber = entryToDelete?.invoiceNumber;

      if (isAmplifyConfigured) {
        await dataClient.models.TimeEntry.delete({ id });
        const updated = entries.filter(e => e.id !== id);
        setEntries(updated);
        if (affectedInvoiceNumber) {
          await syncInvoiceStatusAfterEntryChange(new Set([affectedInvoiceNumber]), updated);
        }
      } else {
        const updated = entries.filter(e => e.id !== id);
        setEntries(updated);
        saveLocalEntries(currentUser.id, updated);
        if (affectedInvoiceNumber) {
          await syncInvoiceStatusAfterEntryChange(new Set([affectedInvoiceNumber]), updated);
        }
      }
    }
  };

  const handleUpdateStatus = async (ids, nextStatus) => {
    const affectedInvoiceNumbers = new Set();
    ids.forEach(id => {
      const entry = entries.find(e => e.id === id);
      if (entry && entry.invoiceNumber) {
        affectedInvoiceNumbers.add(entry.invoiceNumber);
      }
    });

    if (isAmplifyConfigured) {
      await Promise.all(ids.map(id => {
        const entry = entries.find(e => e.id === id);
        const patch = { id, status: nextStatus };
        if (nextStatus !== 'Billed' && entry && entry.invoiceNumber) {
          patch.invoiceNumber = null;
        }
        return dataClient.models.TimeEntry.update(patch);
      }));
      const { data } = await listAll(dataClient.models.TimeEntry);
      const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(sorted);

      await syncInvoiceStatusAfterEntryChange(affectedInvoiceNumbers, sorted);
    } else {
      const updated = entries.map(e => {
        if (ids.includes(e.id)) {
          const updatedEntry = { ...e, status: nextStatus };
          if (nextStatus !== 'Billed') {
            delete updatedEntry.invoiceNumber;
          }
          return updatedEntry;
        }
        return e;
      });
      setEntries(updated);
      saveLocalEntries(currentUser.id, updated);

      await syncInvoiceStatusAfterEntryChange(affectedInvoiceNumbers, updated);
    }
  };

  // --- User Profile Handlers ---
  const handleUpdateProfile = async (updatedProfile) => {
    if (isAmplifyConfigured) {
      const { data } = await dataClient.models.UserProfile.update({
        id: userProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        company: updatedProfile.company,
        address: updatedProfile.address,
        paymentDetails: updatedProfile.paymentDetails,
        taxRate: updatedProfile.taxRate,
        defaultRounding: updatedProfile.defaultRounding || 'none'
      });
      setUserProfile(data);
      setInvoiceTaxRate(data.taxRate || 0);
    } else {
      setUserProfile(updatedProfile);
      saveLocalUserProfile(currentUser.id, updatedProfile);
      setInvoiceTaxRate(updatedProfile.taxRate || 0);
    }
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
    
    const todayStr = getLocalDateString();
    setInvoiceDate(todayStr);
    
    // Default Net 14 due date
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const dueStr = getLocalDateString(due);
    setInvoiceDueDate(dueStr);

    setInvoiceModalOpen(true);
  };

  const handleGenerateInvoicePDF = async (e) => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      alert("Invoice Number is required.");
      return;
    }

    // 1. Generate PDF Invoicing
    await generateInvoicePDF(userProfile, invoiceClient, invoiceEntries, {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate: invoiceDueDate,
      taxRate: invoiceTaxRate
    });

    const subtotal = invoiceEntries.reduce((sum, entry) => sum + (entry.isBillable !== false ? entry.duration * entry.rate : 0), 0);
    const tax = subtotal * (parseFloat(invoiceTaxRate) / 100);
    const totalAmount = subtotal + tax;

    // 2. Mark entries as billed in database
    const invoiceIds = invoiceEntries.map(entry => entry.id);
    if (isAmplifyConfigured) {
      await Promise.all(invoiceIds.map(id => dataClient.models.TimeEntry.update({
        id,
        status: 'Billed',
        invoiceNumber: invoiceNumber.trim()
      })));
      
      const { data: newInvoice } = await dataClient.models.Invoice.create({
        invoiceNumber: invoiceNumber.trim(),
        clientId: invoiceClient.id,
        issueDate: invoiceDate,
        dueDate: invoiceDueDate,
        taxRate: parseFloat(invoiceTaxRate) || 0,
        status: 'Unpaid',
        amount: totalAmount,
        notes: ''
      });

      const { data } = await listAll(dataClient.models.TimeEntry);
      const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(sorted);

      const { data: refetchedInvs } = await listAll(dataClient.models.Invoice);
      const sortedInvs = [...refetchedInvs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
      setInvoices(sortedInvs);
    } else {
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
      saveLocalEntries(currentUser.id, updatedEntries);

      const newInvoice = {
        id: `invoice-${Date.now()}`,
        invoiceNumber: invoiceNumber.trim(),
        clientId: invoiceClient.id,
        issueDate: invoiceDate,
        dueDate: invoiceDueDate,
        taxRate: parseFloat(invoiceTaxRate) || 0,
        status: 'Unpaid',
        amount: totalAmount,
        notes: ''
      };
      const updatedInvoices = [newInvoice, ...invoices];
      setInvoices(updatedInvoices);
      saveLocalInvoices(currentUser.id, updatedInvoices);
    }

    // 3. Reset Modal
    setInvoiceModalOpen(false);
    setInvoiceClient(null);
    setInvoiceEntries([]);
    
    alert(`Invoice ${invoiceNumber} downloaded and entries updated successfully!`);
  };

  const handleInitBatchInvoice = (selectedTimeEntries) => {
    const entriesByClient = selectedTimeEntries.reduce((acc, entry) => {
      if (!acc[entry.clientId]) {
        acc[entry.clientId] = [];
      }
      acc[entry.clientId].push(entry);
      return acc;
    }, {});

    const groups = Object.keys(entriesByClient).map(clientId => {
      const client = clients.find(c => c.id === clientId);
      return {
        client: client || { id: clientId, name: 'Unknown Client' },
        entries: entriesByClient[clientId]
      };
    });

    setBatchInvoiceGroups(groups);

    const year = new Date().getFullYear();
    const billedCount = entries.filter(e => e.invoiceNumber).length;
    setBatchStartingNumber(`INV-${year}-${String(billedCount + 1).padStart(3, '0')}`);

    const todayStr = getLocalDateString();
    setBatchDate(todayStr);

    const due = new Date();
    due.setDate(due.getDate() + 14);
    setBatchDueDate(getLocalDateString(due));
    setBatchTaxRate(userProfile.taxRate || 0);

    setBatchInvoiceModalOpen(true);
  };

  const handleGenerateBatchInvoices = async (e) => {
    e.preventDefault();

    if (!batchStartingNumber.trim()) {
      alert("Starting Invoice Number is required.");
      return;
    }

    setLoading(true);

    try {
      const match = batchStartingNumber.trim().match(/^(.*?)(\d+)$/);
      let prefix = batchStartingNumber.trim();
      let startNum = 1;
      let padLen = 0;

      if (match) {
        prefix = match[1];
        startNum = parseInt(match[2], 10);
        padLen = match[2].length;
      }

      const newInvoicesToSaveLocal = [];

      for (let i = 0; i < batchInvoiceGroups.length; i++) {
        const { client, entries: groupEntries } = batchInvoiceGroups[i];
        const currentInvNum = `${prefix}${String(startNum + i).padStart(padLen, '0')}`;
        
        await generateInvoicePDF(userProfile, client, groupEntries, {
          invoiceNumber: currentInvNum,
          invoiceDate: batchDate,
          dueDate: batchDueDate,
          taxRate: batchTaxRate
        });

        const subtotal = groupEntries.reduce((sum, entry) => sum + (entry.isBillable !== false ? entry.duration * entry.rate : 0), 0);
        const tax = subtotal * (parseFloat(batchTaxRate) / 100);
        const totalAmount = subtotal + tax;

        const invoiceIds = groupEntries.map(entry => entry.id);
        if (isAmplifyConfigured) {
          await Promise.all(invoiceIds.map(id => dataClient.models.TimeEntry.update({
            id,
            status: 'Billed',
            invoiceNumber: currentInvNum
          })));

          await dataClient.models.Invoice.create({
            invoiceNumber: currentInvNum,
            clientId: client.id,
            issueDate: batchDate,
            dueDate: batchDueDate,
            taxRate: parseFloat(batchTaxRate) || 0,
            status: 'Unpaid',
            amount: totalAmount,
            notes: ''
          });
        } else {
          const localEntries = getLocalEntries(currentUser.id);
          const updatedLocal = localEntries.map(le => {
            if (invoiceIds.includes(le.id)) {
              return {
                ...le,
                status: 'Billed',
                invoiceNumber: currentInvNum
              };
            }
            return le;
          });
          saveLocalEntries(currentUser.id, updatedLocal);

          const localInvoice = {
            id: `invoice-${Date.now()}-${i}`,
            invoiceNumber: currentInvNum,
            clientId: client.id,
            issueDate: batchDate,
            dueDate: batchDueDate,
            taxRate: parseFloat(batchTaxRate) || 0,
            status: 'Unpaid',
            amount: totalAmount,
            notes: ''
          };
          newInvoicesToSaveLocal.push(localInvoice);
        }
      }

      if (isAmplifyConfigured) {
        const { data: refetchedEntries } = await listAll(dataClient.models.TimeEntry);
        const sortedEntries = [...refetchedEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sortedEntries);

        const { data: refetchedInvs } = await listAll(dataClient.models.Invoice);
        const sortedInvs = [...refetchedInvs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        setInvoices(sortedInvs);
      } else {
        const localEntries = getLocalEntries(currentUser.id);
        const sortedEntries = [...localEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sortedEntries);

        const localInvoices = getLocalInvoices(currentUser.id);
        const updatedInvoices = [...newInvoicesToSaveLocal, ...localInvoices];
        setInvoices(updatedInvoices);
        saveLocalInvoices(currentUser.id, updatedInvoices);
      }

      setBatchInvoiceModalOpen(false);
      setBatchInvoiceGroups([]);
      alert(`Successfully generated and downloaded ${batchInvoiceGroups.length} invoices!`);
    } catch (err) {
      console.error("Batch invoicing failed:", err);
      alert("An error occurred during batch invoice generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId) => {
    const invoiceToPay = invoices.find(inv => inv.id === invoiceId);
    if (!invoiceToPay) return;

    setLoading(true);
    try {
      if (isAmplifyConfigured) {
        await dataClient.models.Invoice.update({
          id: invoiceId,
          status: 'Paid'
        });

        const entriesToUpdate = entries.filter(e => e.invoiceNumber === invoiceToPay.invoiceNumber);
        await Promise.all(entriesToUpdate.map(e => dataClient.models.TimeEntry.update({
          id: e.id,
          status: 'Paid'
        })));

        const { data: refetchedInvs } = await listAll(dataClient.models.Invoice);
        const sortedInvs = [...refetchedInvs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        setInvoices(sortedInvs);

        const { data: refetchedEntries } = await listAll(dataClient.models.TimeEntry);
        const sortedEntries = [...refetchedEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sortedEntries);
      } else {
        const updatedInvoices = invoices.map(inv => inv.id === invoiceId ? { ...inv, status: 'Paid' } : inv);
        setInvoices(updatedInvoices);
        saveLocalInvoices(currentUser.id, updatedInvoices);

        const updatedEntries = entries.map(e => e.invoiceNumber === invoiceToPay.invoiceNumber ? { ...e, status: 'Paid' } : e);
        setEntries(updatedEntries);
        saveLocalEntries(currentUser.id, updatedEntries);
      }
    } catch (err) {
      console.error("Failed to mark invoice as paid:", err);
      alert("An error occurred while updating the invoice payment status.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInvoiceUnpaid = async (invoiceId) => {
    const invoiceToUnpay = invoices.find(inv => inv.id === invoiceId);
    if (!invoiceToUnpay) return;

    setLoading(true);
    try {
      if (isAmplifyConfigured) {
        await dataClient.models.Invoice.update({
          id: invoiceId,
          status: 'Unpaid'
        });

        const entriesToUpdate = entries.filter(e => e.invoiceNumber === invoiceToUnpay.invoiceNumber);
        await Promise.all(entriesToUpdate.map(e => dataClient.models.TimeEntry.update({
          id: e.id,
          status: 'Billed'
        })));

        const { data: refetchedInvs } = await listAll(dataClient.models.Invoice);
        const sortedInvs = [...refetchedInvs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        setInvoices(sortedInvs);

        const { data: refetchedEntries } = await listAll(dataClient.models.TimeEntry);
        const sortedEntries = [...refetchedEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sortedEntries);
      } else {
        const updatedInvoices = invoices.map(inv => inv.id === invoiceId ? { ...inv, status: 'Unpaid' } : inv);
        setInvoices(updatedInvoices);
        saveLocalInvoices(currentUser.id, updatedInvoices);

        const updatedEntries = entries.map(e => e.invoiceNumber === invoiceToUnpay.invoiceNumber ? { ...e, status: 'Billed' } : e);
        setEntries(updatedEntries);
        saveLocalEntries(currentUser.id, updatedEntries);
      }
    } catch (err) {
      console.error("Failed to mark invoice as unpaid:", err);
      alert("An error occurred while updating the invoice payment status.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    const invoiceToDelete = invoices.find(inv => inv.id === invoiceId);
    if (!invoiceToDelete) return;

    setLoading(true);
    try {
      if (isAmplifyConfigured) {
        await dataClient.models.Invoice.delete({ id: invoiceId });

        const entriesToReset = entries.filter(e => e.invoiceNumber === invoiceToDelete.invoiceNumber);
        await Promise.all(entriesToReset.map(e => dataClient.models.TimeEntry.update({
          id: e.id,
          status: 'Unbilled',
          invoiceNumber: null
        })));

        const { data: refetchedInvs } = await listAll(dataClient.models.Invoice);
        const sortedInvs = [...refetchedInvs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        setInvoices(sortedInvs);

        const { data: refetchedEntries } = await listAll(dataClient.models.TimeEntry);
        const sortedEntries = [...refetchedEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sortedEntries);
      } else {
        const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
        setInvoices(updatedInvoices);
        saveLocalInvoices(currentUser.id, updatedInvoices);

        const updatedEntries = entries.map(e => e.invoiceNumber === invoiceToDelete.invoiceNumber ? { ...e, status: 'Unbilled', invoiceNumber: null } : e);
        setEntries(updatedEntries);
        saveLocalEntries(currentUser.id, updatedEntries);
      }
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      alert("An error occurred while deleting the invoice.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedownloadInvoicePDF = (invoiceRecord) => {
    const client = clients.find(c => c.id === invoiceRecord.clientId);
    if (!client) {
      alert("Cannot find the associated client for this invoice.");
      return;
    }

    const invoiceEntries = entries.filter(e => e.invoiceNumber === invoiceRecord.invoiceNumber);
    if (invoiceEntries.length === 0) {
      alert("No matching time entries found for this invoice. Regenerating PDF with entries matching the invoice number.");
    }

    generateInvoicePDF(userProfile, client, invoiceEntries, {
      invoiceNumber: invoiceRecord.invoiceNumber,
      invoiceDate: invoiceRecord.issueDate,
      dueDate: invoiceRecord.dueDate,
      taxRate: invoiceRecord.taxRate
    });
  };

  // Wait until auth is checked
  if (!authInitialized) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#fff' }}>Loading Tempo...</div>;
  }

  // Render Login Gate if no active user session
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render ONLY the Timer Component if page is opened in Popout Mode
  if (isPopout) {
    const userIdVal = isAmplifyConfigured ? currentUser.userId : currentUser.id;
    return (
      <div style={{ padding: '1rem', height: '100vh', boxSizing: 'border-box', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
        <Timer 
          userId={userIdVal} 
          clients={clients} 
          categories={categories} 
          onLogEntry={handleSaveEntry} 
          entries={entries}
          userProfile={userProfile}
        />
      </div>
    );
  }

  // Calculate quick summary metrics
  const unbilledCount = entries.filter(e => e.status === 'Unbilled').length;
  const userIdVal = isAmplifyConfigured ? currentUser.userId : currentUser.id;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <img 
            src="/tempo_logo.png" 
            alt="Tempo" 
            className="logo-icon" 
            style={{ objectFit: 'cover', borderRadius: '8px', border: 'none' }}
          />
          <span className="logo-text">Tempo</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li className="nav-section-title" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
              Time & Billing
            </li>
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
                className={`nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                <Receipt size={20} />
                <span>Invoices</span>
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
                className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`}
                onClick={() => setActiveTab('clients')}
              >
                <Users size={20} />
                <span>Clients</span>
              </button>
            </li>

            <li className="nav-section-title" style={{ padding: '0.4rem 1rem', marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
              PLANNING
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                <CheckSquare size={20} />
                <span>Task Planner</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'backlog' ? 'active' : ''}`}
                onClick={() => setActiveTab('backlog')}
              >
                <Inbox size={20} />
                <span>Task Backlog</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'task-analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('task-analytics')}
              >
                <TrendingUp size={20} />
                <span>Planning Analytics</span>
              </button>
            </li>

            {/* Global Configuration Utilities */}
            <li className="nav-section-title" style={{ padding: '0.4rem 1rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
              MANAGE
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
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <UserCircle2 size={20} />
                <span>Settings</span>
              </button>
            </li>
            <li style={{ marginTop: '0.75rem' }}>
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
        {/* Loading Overlay */}
        {loading && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(11, 15, 25, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(3px)' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>Syncing with cloud...</span>
          </div>
        )}

        {/* Header Block */}
        <header className="top-header">
          <div className="page-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ textTransform: 'capitalize', margin: 0 }}>
                {activeTab === 'tasks' && 'Task Planner'}
                {activeTab === 'backlog' && 'Task Backlog'}
                {activeTab === 'task-analytics' && 'Planning Analytics'}
                {activeTab === 'profile' && 'Settings'}
                {activeTab !== 'tasks' && activeTab !== 'backlog' && activeTab !== 'task-analytics' && activeTab !== 'profile' && activeTab}
              </h1>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                padding: '0.25rem 0.6rem', 
                borderRadius: '50px', 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border-color)',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: !isAmplifyConfigured 
                    ? '#818cf8' 
                    : isOnline 
                      ? 'var(--color-paid)' 
                      : 'var(--color-unbilled)',
                  boxShadow: `0 0 8px ${
                    !isAmplifyConfigured 
                      ? 'rgba(129, 140, 248, 0.6)' 
                      : isOnline 
                        ? 'rgba(16, 185, 129, 0.6)' 
                        : 'rgba(245, 158, 11, 0.6)'
                  }`
                }} />
                <span>
                  {!isAmplifyConfigured 
                    ? 'Sandbox Mode' 
                    : isOnline 
                      ? 'Cloud Synced' 
                      : 'Offline Mode'}
                </span>
              </div>
            </div>
            <p style={{ marginTop: '0.25rem' }}>
              {activeTab === 'dashboard' && 'Visual overview of your contract operations, workload, and collections.'}
              {activeTab === 'timer' && 'Track contract hours in real-time or log them using the stopwatch.'}
              {activeTab === 'entries' && 'Filter, search, edit, and invoice your logged time sheets.'}
              {activeTab === 'invoices' && 'View, search, pay, delete, and re-download generated client invoices.'}
              {activeTab === 'analytics' && 'Inspect earning breakdowns and work distribution.'}
              {activeTab === 'clients' && 'Manage corporate client lists and default hourly rates.'}
              {activeTab === 'categories' && 'Configure custom task categories for accurate segmentation.'}
              {activeTab === 'tasks' && 'Plan standalone tasks, run focus timers, and compare estimates with actuals.'}
              {activeTab === 'backlog' && 'Organize future workload, set estimates, and queue tasks for today.'}
              {activeTab === 'task-analytics' && 'Analyze planning accuracy, variance, and overrun categories.'}
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
              <Dashboard 
                entries={entries} 
                clients={clients} 
                userProfile={userProfile} 
                onNavigate={setActiveTab} 
                onQuickLog={(initialValues) => setEditingEntry(initialValues)}
              />
              <div className="dashboard-grid">
                <Timer 
                  userId={userIdVal} 
                  clients={clients} 
                  categories={categories} 
                  onLogEntry={handleSaveEntry} 
                  entries={entries} 
                  userProfile={userProfile}
                />
                <Analytics entries={entries} clients={clients} invoices={invoices} />
              </div>
            </div>
          )}
          
          {activeTab === 'timer' && (
            <div style={{ maxWidth: '750px', margin: '0 auto' }}>
              <Timer 
                userId={userIdVal} 
                clients={clients} 
                categories={categories} 
                onLogEntry={handleSaveEntry} 
                entries={entries} 
                userProfile={userProfile}
              />
            </div>
          )}
          
          {activeTab === 'entries' && (
            <EntryList 
              entries={entries} 
              clients={clients} 
              userProfile={userProfile}
              onDeleteEntry={handleDeleteEntry}
              onEditEntry={(entry) => setEditingEntry(entry)}
              onUpdateStatus={handleUpdateStatus}
              onGenerateInvoice={handleInitInvoice}
              onGenerateBatchInvoice={handleInitBatchInvoice}
              savedFilters={savedFilters}
              onAddSavedFilter={handleCreateSavedFilter}
              onDeleteSavedFilter={handleDeleteSavedFilter}
            />
          )}

          {activeTab === 'invoices' && (
            <Invoices 
              invoices={invoices}
              clients={clients}
              entries={entries}
              onMarkPaid={handleMarkInvoicePaid}
              onMarkUnpaid={handleMarkInvoiceUnpaid}
              onDeleteInvoice={handleDeleteInvoice}
              onRedownloadPDF={handleRedownloadInvoicePDF}
            />
          )}

          {activeTab === 'clients' && (
            <ClientMgr 
              clients={clients} 
              onAddClient={handleAddClient} 
              onUpdateClient={handleUpdateClient} 
              onDeleteClient={handleDeleteClient} 
              onTogglePinClient={handleTogglePinClient}
            />
          )}

          {activeTab === 'categories' && (
            <CategoryMgr 
              categories={categories} 
              onAddCategory={handleAddCategory} 
              onDeleteCategory={handleDeleteCategory} 
              onUpdateCategory={handleUpdateCategory}
              onTogglePinCategory={handleTogglePinCategory}
            />
          )}

          {(activeTab === 'tasks' || activeTab === 'backlog' || activeTab === 'task-analytics') && (
            <TempoTasks 
              userId={userIdVal}
              isAmplifyConfigured={isAmplifyConfigured}
              dataClient={dataClient}
              categories={categories}
              view={
                activeTab === 'tasks' 
                  ? 'today' 
                  : activeTab === 'backlog' 
                    ? 'backlog' 
                    : 'analytics'
              }
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics entries={entries} clients={clients} invoices={invoices} />
          )}

          {activeTab === 'profile' && (
            <ProfileMgr 
              userProfile={userProfile} 
              onUpdateProfile={handleUpdateProfile} 
              onDeleteAccount={handleDeleteAccount}
              onLogout={handleLogout}
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

      {/* --- Overlay Modal: Batch Invoice Metadata Form & Summary --- */}
      {batchInvoiceModalOpen && batchInvoiceGroups.length > 0 && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleGenerateBatchInvoices} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Configure Batch Invoicing</h2>
              <button type="button" className="modal-close-btn" onClick={() => setBatchInvoiceModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Clients to Invoice in this Batch ({batchInvoiceGroups.length}):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                  {batchInvoiceGroups.map((g, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: idx < batchInvoiceGroups.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: idx < batchInvoiceGroups.length - 1 ? '0.4rem' : '0', paddingTop: idx > 0 ? '0.4rem' : '0' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{g.client.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {g.entries.length} entries &bull; {g.entries.reduce((sum, e) => sum + e.duration, 0).toFixed(2)} hrs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Starting Invoice Number *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={batchStartingNumber} 
                    onChange={(e) => setBatchStartingNumber(e.target.value)} 
                    placeholder="e.g. INV-2026-001"
                    required 
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Numbers will auto-increment sequentially for each client.
                  </small>
                </div>

                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    min="0" 
                    max="100" 
                    step="0.01" 
                    value={batchTaxRate} 
                    onChange={(e) => setBatchTaxRate(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Issue Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={batchDate} 
                    onChange={(e) => setBatchDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={batchDueDate} 
                    onChange={(e) => setBatchDueDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setBatchInvoiceModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Generate Invoices ({batchInvoiceGroups.length})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav-bar">
        <button 
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          <Clock size={20} />
          <span>Track</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'entries' ? 'active' : ''}`}
          onClick={() => setActiveTab('entries')}
        >
          <FileText size={20} />
          <span>Logs</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <Receipt size={20} />
          <span>Invoices</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <Users size={20} />
          <span>Clients</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={20} />
          <span>Tasks</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <UserCircle2 size={20} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
