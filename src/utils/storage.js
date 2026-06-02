// LocalStorage state management and seed data for Tempo (Contract Work Time Tracker)

const STORAGE_KEYS = {
  USERS: 'tempo_users',
  CURRENT_USER: 'tempo_current_user',
  THEME: 'tempo_theme',
  
  // Namespaced prefixes
  CLIENTS_PREFIX: 'tempo_clients_',
  CATEGORIES_PREFIX: 'tempo_categories_',
  ENTRIES_PREFIX: 'tempo_entries_',
  USER_PROFILE_PREFIX: 'tempo_user_profile_'
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

const getSeedClients = () => [
  {
    id: 'client-1',
    name: 'Acme Global Inc.',
    email: 'billing@acmeglobal.com',
    defaultRate: 125,
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

const getSeedEntries = () => [
  {
    id: 'entry-1',
    clientId: 'client-1',
    category: 'Software Development',
    duration: 6.5,
    rate: 125,
    date: getPastDate(0),
    description: 'Implemented OAuth2 authentication flows and user session management.',
    status: 'Unbilled'
  },
  {
    id: 'entry-2',
    clientId: 'client-1',
    category: 'Code Review',
    duration: 2.0,
    rate: 125,
    date: getPastDate(1),
    description: 'Reviewed PRs for core API updates and suggested structural refactoring.',
    status: 'Unbilled'
  },
  {
    id: 'entry-3',
    clientId: 'client-2',
    category: 'UI/UX Design',
    duration: 4.5,
    rate: 95,
    date: getPastDate(2),
    description: 'Designed interactive wireframes and high-fidelity mockups for landing page refresh.',
    status: 'Unbilled'
  },
  {
    id: 'entry-4',
    clientId: 'client-3',
    category: 'Technical Consulting',
    duration: 3.0,
    rate: 150,
    date: getPastDate(4),
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
    date: getPastDate(5),
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
    date: getPastDate(8),
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
    date: getPastDate(9),
    description: 'Refactored state management system and added robust error handling.',
    status: 'Paid',
    invoiceNumber: 'INV-2026-003'
  }
];

const getDefaultProfile = (name = 'Contractor') => ({
  name: name,
  email: '',
  company: '',
  address: '',
  paymentDetails: '',
  taxRate: 0
});

// Users DB operations
export const getUsers = () => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
};

export const saveUsers = (users) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const registerUser = (email, password, name) => {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();
  
  if (users.some(u => u.email === normalizedEmail)) {
    return { success: false, error: 'Email already registered.' };
  }

  const userId = `user-${Date.now()}`;
  const newUser = {
    id: userId,
    email: normalizedEmail,
    password: password, // In a real app we would hash this
    name: name.trim()
  };

  users.push(newUser);
  saveUsers(users);

  // Initialize seed data for this user
  localStorage.setItem(STORAGE_KEYS.CLIENTS_PREFIX + userId, JSON.stringify(getSeedClients()));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES_PREFIX + userId, JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.ENTRIES_PREFIX + userId, JSON.stringify(getSeedEntries()));
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE_PREFIX + userId, JSON.stringify(getDefaultProfile(name)));

  return { success: true, user: newUser };
};

export const loginUser = (email, password) => {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find(u => u.email === normalizedEmail && u.password === password);
  
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }
  
  saveCurrentUser(user);
  return { success: true, user };
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) || null;
};

export const saveCurrentUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

// Seed/Init individual store if missing
export const initializeUserStorage = (userId) => {
  if (!localStorage.getItem(STORAGE_KEYS.CLIENTS_PREFIX + userId)) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS_PREFIX + userId, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES_PREFIX + userId)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES_PREFIX + userId, JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ENTRIES_PREFIX + userId)) {
    localStorage.setItem(STORAGE_KEYS.ENTRIES_PREFIX + userId, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_PROFILE_PREFIX + userId)) {
    const user = getUsers().find(u => u.id === userId);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE_PREFIX + userId, JSON.stringify(getDefaultProfile(user?.name)));
  }
};

// Clients CRUD (Namespaced)
export const getClients = (userId) => {
  if (!userId) return [];
  initializeUserStorage(userId);
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS_PREFIX + userId)) || [];
};

export const saveClients = (userId, clients) => {
  if (!userId) return;
  localStorage.setItem(STORAGE_KEYS.CLIENTS_PREFIX + userId, JSON.stringify(clients));
};

// Categories CRUD (Namespaced)
export const getCategories = (userId) => {
  if (!userId) return [];
  initializeUserStorage(userId);
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES_PREFIX + userId)) || [];
};

export const saveCategories = (userId, categories) => {
  if (!userId) return;
  localStorage.setItem(STORAGE_KEYS.CATEGORIES_PREFIX + userId, JSON.stringify(categories));
};

// Entries CRUD (Namespaced)
export const getEntries = (userId) => {
  if (!userId) return [];
  initializeUserStorage(userId);
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES_PREFIX + userId)) || [];
};

export const saveEntries = (userId, entries) => {
  if (!userId) return;
  localStorage.setItem(STORAGE_KEYS.ENTRIES_PREFIX + userId, JSON.stringify(entries));
};

// User Profile CRUD (Namespaced)
export const getUserProfile = (userId) => {
  if (!userId) return getDefaultProfile();
  initializeUserStorage(userId);
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE_PREFIX + userId)) || getDefaultProfile();
};

export const saveUserProfile = (userId, profile) => {
  if (!userId) return;
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE_PREFIX + userId, JSON.stringify(profile));
};

// Theme helper
export const getTheme = () => {
  return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
};

export const saveTheme = (theme) => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

// Import/Export full state (namespaced by user)
export const exportBackup = (userId) => {
  if (!userId) return '';
  const data = {
    clients: getClients(userId),
    categories: getCategories(userId),
    entries: getEntries(userId),
    userProfile: getUserProfile(userId)
  };
  return JSON.stringify(data, null, 2);
};

export const importBackup = (userId, jsonString) => {
  if (!userId) return false;
  try {
    const data = JSON.parse(jsonString);
    if (data.clients && data.categories && data.entries && data.userProfile) {
      saveClients(userId, data.clients);
      saveCategories(userId, data.categories);
      saveEntries(userId, data.entries);
      saveUserProfile(userId, data.userProfile);
      return true;
    }
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
  }
  return false;
};

// Sync active stopwatch state across windows
export const getTimerState = (userId) => {
  if (!userId) return null;
  return JSON.parse(localStorage.getItem(`tempo_timer_state_${userId}`)) || null;
};

export const saveTimerState = (userId, state) => {
  if (!userId) return;
  if (state) {
    localStorage.setItem(`tempo_timer_state_${userId}`, JSON.stringify(state));
  } else {
    localStorage.removeItem(`tempo_timer_state_${userId}`);
  }
};

