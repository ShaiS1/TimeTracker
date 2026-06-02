// LocalStorage state management and seed data for Tempo (Contract Work Time Tracker)

const STORAGE_KEYS = {
  CLIENTS: 'tempo_clients',
  CATEGORIES: 'tempo_categories',
  ENTRIES: 'tempo_entries',
  THEME: 'tempo_theme',
  USER_PROFILE: 'tempo_user_profile'
};

const DEFAULT_CATEGORIES = [
  'Software Development',
  'UI/UX Design',
  'Technical Consulting',
  'Project Management',
  'QA & Testing',
  'Code Review'
];

const getPastDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

const DEFAULT_CLIENTS = [
  {
    id: 'client-1',
    name: 'Acme Global Inc.',
    email: 'billing@acmeglobal.com',
    defaultRate: 125, // $/hour
    address: '123 Enterprise Way, Suite 400, San Francisco, CA 94105',
    notes: 'Primary contact: Jane Doe (Project Manager)'
  },
  {
    id: 'client-2',
    name: 'Starlight Creative',
    email: 'finance@starlightcreative.co',
    defaultRate: 95,
    address: '88 Arts District Blvd, Suite B, Los Angeles, CA 90013',
    notes: 'Flexible creative studio. Invoices sent monthly.'
  },
  {
    id: 'client-3',
    name: 'Quantum Quantum Labs',
    email: 'ap@quantumlabs.io',
    defaultRate: 150,
    address: '500 Innovation Parkway, Boston, MA 02142',
    notes: 'High priority consulting. Overrides for Dev ops work.'
  }
];

const DEFAULT_ENTRIES = [
  {
    id: 'entry-1',
    clientId: 'client-1',
    category: 'Software Development',
    duration: 6.5, // in hours
    rate: 125,
    date: getPastDate(0), // Today
    description: 'Implemented OAuth2 authentication flows and user session management.',
    status: 'Unbilled' // Unbilled, Billed, Paid
  },
  {
    id: 'entry-2',
    clientId: 'client-1',
    category: 'Code Review',
    duration: 2.0,
    rate: 125,
    date: getPastDate(1), // Yesterday
    description: 'Reviewed PRs for core API updates and suggested structural refactoring.',
    status: 'Unbilled'
  },
  {
    id: 'entry-3',
    clientId: 'client-2',
    category: 'UI/UX Design',
    duration: 4.5,
    rate: 95,
    date: getPastDate(2), // 2 days ago
    description: 'Designed interactive wireframes and high-fidelity mockups for landing page refresh.',
    status: 'Unbilled'
  },
  {
    id: 'entry-4',
    clientId: 'client-3',
    category: 'Technical Consulting',
    duration: 3.0,
    rate: 150,
    date: getPastDate(4), // 4 days ago
    description: 'Architecture sync session regarding cloud infrastructure migration strategy.',
    status: 'Billed',
    invoiceNumber: 'INV-2026-001'
  },
  {
    id: 'entry-5',
    clientId: 'client-3',
    category: 'Software Development',
    duration: 8.0,
    rate: 150,
    date: getPastDate(5), // 5 days ago
    description: 'Configured CI/CD deployment pipelines on AWS with automated testing.',
    status: 'Billed',
    invoiceNumber: 'INV-2026-001'
  },
  {
    id: 'entry-6',
    clientId: 'client-2',
    category: 'Project Management',
    duration: 1.5,
    rate: 95,
    date: getPastDate(8), // 8 days ago
    description: 'Weekly sprint planning, backlog grooming, and client sync.',
    status: 'Paid',
    invoiceNumber: 'INV-2026-002'
  },
  {
    id: 'entry-7',
    clientId: 'client-1',
    category: 'Software Development',
    duration: 5.0,
    rate: 125,
    date: getPastDate(9), // 9 days ago
    description: 'Refactored state management system and added robust error handling.',
    status: 'Paid',
    invoiceNumber: 'INV-2026-003'
  }
];

const DEFAULT_USER_PROFILE = {
  name: 'Alex Mercer',
  email: 'alex@mercerconsulting.dev',
  company: 'Mercer Consulting LLC',
  address: '742 Evergreen Terrace, Seattle, WA 98101',
  paymentDetails: 'Bank Transfer: Route #123456789, Account #987654321',
  taxRate: 0 // Optional default tax percentage
};

// Initialize with seed data if empty
export const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ENTRIES)) {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(DEFAULT_ENTRIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(DEFAULT_USER_PROFILE));
  }
};

// Clients CRUD
export const getClients = () => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS)) || [];
};

export const saveClients = (clients) => {
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
};

// Categories CRUD
export const getCategories = () => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
};

export const saveCategories = (categories) => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

// Entries CRUD
export const getEntries = () => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES)) || [];
};

export const saveEntries = (entries) => {
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
};

// User Profile CRUD
export const getUserProfile = () => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) || DEFAULT_USER_PROFILE;
};

export const saveUserProfile = (profile) => {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
};

// Theme helper
export const getTheme = () => {
  return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
};

export const saveTheme = (theme) => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

// Import/Export full state
export const exportBackup = () => {
  const data = {
    clients: getClients(),
    categories: getCategories(),
    entries: getEntries(),
    userProfile: getUserProfile()
  };
  return JSON.stringify(data, null, 2);
};

export const importBackup = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.clients && data.categories && data.entries && data.userProfile) {
      saveClients(data.clients);
      saveCategories(data.categories);
      saveEntries(data.entries);
      saveUserProfile(data.userProfile);
      return true;
    }
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
  }
  return false;
};
