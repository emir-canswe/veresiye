import { expect } from '@playwright/test';
import { BaseAction } from './base.action';
import { E2E_PASSWORD, users } from '../../fixtures/e2e-users';

const apiUrl = () => process.env.API_URL ?? 'http://127.0.0.1:8000';

export class AuthAction extends BaseAction {
  async getToken(username: string = users.admin, password: string = E2E_PASSWORD): Promise<string> {
    const res = await this.request.post(`${apiUrl()}/auth/login`, {
      form: { username, password },
      headers: { Accept: 'application/json' },
    });
    expect(res.ok(), `login API failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as { access_token: string };
    return body.access_token;
  }

  async createCustomer(name: string): Promise<{ id: number }> {
    const res = await this.request.post(`${apiUrl()}/customers/`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ibans: [] }),
    });
    expect(res.ok(), `create customer failed: ${res.status()}`).toBeTruthy();
    return (await res.json()) as { id: number };
  }
}
