// Seed script – Budiman HRMS, Login module.
// Loads the fixed lists (Reference A) and the six demo people (Reference B)
// from the HRMS document. Idempotent (design rule 12): safe to re-run,
// never duplicates rows.

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'password123'

// Reference A – fixed choices.
export const ROLES = ['Employee', 'Supervisor', 'HR', 'Admin'] as const

export const DIVISIONS: Record<string, string[]> = {
  Finance: ['Finance Manager', 'Accountant', 'Accounts Clerk'],
  'Human Resources': ['HR Manager', 'HR Officer', 'HR Assistant'],
  'Information Technology': [
    'IT Manager',
    'Software Developer',
    'IT Support Officer',
  ],
  Operations: [
    'Operations Manager',
    'Operations Supervisor',
    'Operations Executive',
  ],
  Marketing: [
    'Marketing Manager',
    'Marketing Executive',
    'Marketing Assistant',
  ],
  Admin: ['Admin Manager'],
}

// Reference B – demo people. Everyone logs in with `password123`; only the
// bcrypt hash is stored.
const DEMO_USERS = [
  {
    email: 'employee-1@budiman.com',
    name: 'Employee 1',
    icNumber: '00-148888',
    role: 'Employee',
    division: 'Finance',
    designation: 'Accounts Clerk',
  },
  {
    email: 'supervisor-1@budiman.com',
    name: 'Supervisor 1',
    icNumber: '00-157777',
    role: 'Supervisor',
    division: 'Finance',
    designation: 'Finance Manager',
  },
  {
    email: 'supervisor-2@budiman.com',
    name: 'Supervisor 2',
    icNumber: '00-166666',
    role: 'Supervisor',
    division: 'Finance',
    designation: 'Accountant',
  },
  {
    email: 'hr-1@budiman.com',
    name: 'HR 1',
    icNumber: '00-175555',
    role: 'HR',
    division: 'Human Resources',
    designation: 'HR Officer',
  },
  {
    email: 'hr-2@budiman.com',
    name: 'HR 2',
    icNumber: '00-184444',
    role: 'HR',
    division: 'Human Resources',
    designation: 'HR Officer',
  },
  {
    email: 'admin@budiman.com',
    name: 'Admin',
    icNumber: '00-193333',
    role: 'Admin',
    division: 'Admin',
    designation: 'Admin Manager',
  },
]

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, 10)

  for (const user of DEMO_USERS) {
    // The seed must not be able to write rows that break the fixed lists.
    if (!(ROLES as readonly string[]).includes(user.role)) {
      throw new Error(`${user.email}: unknown role ${user.role}`)
    }
    if (!DIVISIONS[user.division]) {
      throw new Error(`${user.email}: unknown division ${user.division}`)
    }
    if (!DIVISIONS[user.division].includes(user.designation)) {
      throw new Error(
        `${user.email}: ${user.designation} is not a designation of ${user.division}`,
      )
    }
    if (!/^\d{2}-\d{6}$/.test(user.icNumber)) {
      throw new Error(`${user.email}: bad IC ${user.icNumber}`)
    }
    if (!user.email.endsWith('@budiman.com')) {
      throw new Error(`${user.email}: must end with @budiman.com`)
    }

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    })
  }

  const count = await prisma.user.count()
  console.log(`Seed complete. Users in the database: ${count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
