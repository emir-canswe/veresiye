/**
 * Backend'in çalışıyor olması gerekir: uvicorn backend.main:app --port 8000
 * Ortak E2E kullanıcıları oluşturur (zaten varsa 400 yok sayılır).
 */
async function globalSetup(): Promise<void> {
  const api = process.env.API_URL ?? 'http://127.0.0.1:8000';
  const password = process.env.E2E_PASSWORD ?? 'E2ETestPass1';

  const health = await fetch(`${api}/`);
  if (!health.ok) {
    throw new Error(
      `E2E: API yanıt vermiyor (${api}). Backend'i başlatın: cd backend && uvicorn main:app --reload --port 8000`
    );
  }

  const users: [string, string][] = [
    ['e2e_admin', 'admin'],
    ['e2e_calisan', 'calisan'],
    ['e2e_muhasebeci', 'muhasebeci'],
  ];

  for (const [username, role] of users) {
    const res = await fetch(`${api}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
    if (!res.ok && res.status !== 400) {
      const t = await res.text();
      throw new Error(`E2E: register ${username} failed ${res.status}: ${t}`);
    }
  }
}

export default globalSetup;
