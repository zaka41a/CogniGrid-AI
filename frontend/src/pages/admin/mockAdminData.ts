import type { AdminUser } from '../../types'

export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: 'u1',  name: 'zakaria sabiri',   email: 'zakaria@cognigrid.ai', role: 'ANALYST', plan: 'ultra', uploadsUsed: 48,  status: 'active',    createdAt: '2026-01-10', lastLogin: '2026-04-14' },
  { id: 'u2',  name: 'Sarah Chen',       email: 'sarah@example.com',    role: 'ANALYST', plan: 'pro',   uploadsUsed: 72,  status: 'active',    createdAt: '2026-01-15', lastLogin: '2026-04-13' },
  { id: 'u3',  name: 'Marco Rossi',      email: 'marco@example.com',    role: 'ANALYST', plan: 'free',  uploadsUsed: 5,   status: 'active',    createdAt: '2026-02-01', lastLogin: '2026-04-10' },
  { id: 'u4',  name: 'Elena Müller',     email: 'elena@example.com',    role: 'ANALYST', plan: 'pro',   uploadsUsed: 30,  status: 'active',    createdAt: '2026-02-14', lastLogin: '2026-04-12' },
  { id: 'u5',  name: 'James Wilson',     email: 'james@example.com',    role: 'ANALYST', plan: 'free',  uploadsUsed: 7,   status: 'suspended', createdAt: '2026-02-20', lastLogin: '2026-03-28' },
  { id: 'u6',  name: 'Amira Traoré',     email: 'amira@example.com',    role: 'ANALYST', plan: 'ultra', uploadsUsed: 200, status: 'active',    createdAt: '2026-03-01', lastLogin: '2026-04-14' },
  { id: 'u7',  name: 'Thomas Berger',    email: 'thomas@example.com',   role: 'ANALYST', plan: 'free',  uploadsUsed: 2,   status: 'active',    createdAt: '2026-03-10', lastLogin: '2026-04-08' },
  { id: 'u8',  name: 'Yuki Tanaka',      email: 'yuki@example.com',     role: 'ANALYST', plan: 'pro',   uploadsUsed: 55,  status: 'active',    createdAt: '2026-03-15', lastLogin: '2026-04-11' },
  { id: 'u9',  name: 'Carlos López',     email: 'carlos@example.com',   role: 'ANALYST', plan: 'free',  uploadsUsed: 3,   status: 'active',    createdAt: '2026-03-20', lastLogin: '2026-04-05' },
  { id: 'u10', name: 'Fatima Al-Hassan', email: 'fatima@example.com',   role: 'ANALYST', plan: 'pro',   uploadsUsed: 88,  status: 'active',    createdAt: '2026-04-01', lastLogin: '2026-04-13' },
]
