export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'E2ETestPass1';

export const users = {
  admin: 'e2e_admin',
  calisan: 'e2e_calisan',
  muhasebeci: 'e2e_muhasebeci',
} as const;
