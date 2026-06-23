import { Page, expect } from '@playwright/test';
import { sel } from './selectors';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/signIn', { waitUntil: 'domcontentloaded' });
  }

  async login(username: string, password: string) {
    if (!username || !password) {
      throw new Error(
        'Missing credentials. Set RAPTECH_USER and RAPTECH_PASSWORD in .env (see .env.example).'
      );
    }
    await this.page.fill(sel.login.username, username);
    await this.page.fill(sel.login.password, password);
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      this.page.click(sel.login.submit),
    ]);
    // Landed on an authenticated page (the left-nav "Items" link is present).
    await expect(this.page.locator(sel.login.loggedInMarker).first()).toBeVisible();
  }
}
