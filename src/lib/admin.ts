import { User } from '../types';

export const DEFAULT_ADMIN_EMAILS = [
  'davinwijaya16@gmail.com',
  'davinwijaya1996@gmail.com',
  'davin@wealthtrack.app',
];

const ADMIN_EMAILS_STORAGE_KEY = 'wealthtrack_admin_emails';

export function getCustomAdminEmails(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_EMAILS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...parsed.map((e: string) => e.toLowerCase().trim())]));
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_ADMIN_EMAILS;
}

export function saveAdminEmails(emails: string[]): void {
  try {
    const clean = Array.from(new Set(emails.map((e) => e.toLowerCase().trim())));
    localStorage.setItem(ADMIN_EMAILS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore
  }
}

export function isUserAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;
  
  if (user.role === 'admin') return true;
  
  const email = user.email.toLowerCase().trim();
  const allowed = getCustomAdminEmails();
  return allowed.includes(email);
}
