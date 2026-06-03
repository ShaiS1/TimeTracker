import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Client: a.model({
    name: a.string().required(),
    email: a.string(),
    defaultRate: a.float().required(),
    address: a.string(),
    notes: a.string(),
  }).authorization((allow) => [allow.owner()]),

  Category: a.model({
    name: a.string().required(),
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
  }).authorization((allow) => [allow.owner()]),

  UserProfile: a.model({
    name: a.string().required(),
    email: a.string(),
    company: a.string(),
    address: a.string(),
    paymentDetails: a.string(),
    taxRate: a.float(),
  }).authorization((allow) => [allow.owner()]),

  ActiveTimer: a.model({
    clientId: a.string(),
    category: a.string(),
    description: a.string(),
    startTime: a.float(),
    accumulatedSeconds: a.float().required(),
    isRunning: a.boolean().required(),
    isPaused: a.boolean().required(),
  }).authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
