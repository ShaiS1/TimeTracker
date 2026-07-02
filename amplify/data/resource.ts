import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Client: a.model({
    name: a.string().required(),
    email: a.string(),
    defaultRate: a.float().required(),
    address: a.string(),
    notes: a.string(),
    roundingRule: a.string(),
    budgetType: a.string(), // 'hours', 'revenue', or 'none'
    budgetLimit: a.float(),
    budgetPeriod: a.string(), // 'weekly', 'monthly', 'total', or 'none'
    isPinned: a.boolean(),
  }).authorization((allow) => [allow.owner()]),

  Category: a.model({
    name: a.string().required(),
    isPinned: a.boolean(),
  }).authorization((allow) => [allow.owner()]),

  SavedFilter: a.model({
    name: a.string().required(),
    filterClient: a.string(),
    filterCategory: a.string(),
    filterStatus: a.string(),
    filterStartDate: a.string(),
    filterEndDate: a.string(),
    searchQuery: a.string(),
  }).authorization((allow) => [allow.owner()]),

  TimeEntry: a.model({
    clientId: a.string().required(),
    category: a.string().required(),
    duration: a.float().required(),
    rate: a.float().required(),
    date: a.string().required(),
    description: a.string().required(),
    status: a.string().required(),
    invoiceNumber: a.string(),
    isBillable: a.boolean(),
  }).authorization((allow) => [allow.owner()]),

  UserProfile: a.model({
    name: a.string().required(),
    email: a.string(),
    company: a.string(),
    address: a.string(),
    paymentDetails: a.string(),
    taxRate: a.float(),
    defaultRounding: a.string(),
  }).authorization((allow) => [allow.owner()]),

  ActiveTimer: a.model({
    clientId: a.string(),
    category: a.string(),
    description: a.string(),
    startTime: a.float(),
    accumulatedSeconds: a.float().required(),
    isRunning: a.boolean().required(),
    isPaused: a.boolean().required(),
    isBillable: a.boolean(),
  }).authorization((allow) => [allow.owner()]),

  Invoice: a.model({
    invoiceNumber: a.string().required(),
    clientId: a.string().required(),
    issueDate: a.string().required(),
    dueDate: a.string().required(),
    taxRate: a.float().required(),
    status: a.string().required(), // 'Unpaid', 'Paid', 'Overdue'
    amount: a.float().required(),
    notes: a.string(),
  }).authorization((allow) => [allow.owner()]),

  Task: a.model({
    title: a.string().required(),
    notes: a.string(),
    status: a.string().required(), // "planned" | "active" | "paused" | "done"
    estimatedMinutes: a.float().required(),
    actualMinutes: a.float().required(),
    category: a.string(),
    priority: a.string(), // "low" | "medium" | "high"
    tags: a.string().array(),
    scheduledDate: a.string(),
    createdAt: a.string().required(),
    startedAt: a.string(),
    completedAt: a.string(),
  }).authorization((allow) => [allow.owner()]),

  TaskSession: a.model({
    taskId: a.string().required(),
    startedAt: a.string().required(),
    endedAt: a.string(),
    durationMinutes: a.float().required(),
  }).authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
