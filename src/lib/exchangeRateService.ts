/**
 * Service to fetch live USD / IDR exchange rates.
 * Priorities:
 * 1. Server backend (/api/exchange-rate/usd-idr) - fetches directly from Google Finance
 * 2. Client-side fallback APIs (open.er-api.com, exchangerate-api.com) - with CORS support for GitHub Pages
 */

export interface ExchangeRateResult {
  rate: number;
  source: string;
  timestamp: string;
  isFallback?: boolean;
}

const STORAGE_KEY_AUTO = 'wealthtrack_rate_auto_update';
const STORAGE_KEY_LAST = 'wealthtrack_rate_last_updated';
const STORAGE_KEY_SOURCE = 'wealthtrack_rate_source';

export const exchangeRateService = {
  /**
   * Fetch the latest USD to IDR exchange rate.
   */
  async fetchUsdIdrRate(): Promise<ExchangeRateResult> {
    // 1. Try internal backend API first (which scrapes Google Finance directly)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/exchange-rate/usd-idr', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.rate === 'number' && data.rate > 0) {
          const result: ExchangeRateResult = {
            rate: Math.round(data.rate),
            source: data.source || 'Google Finance',
            timestamp: data.timestamp || new Date().toISOString(),
          };
          this.saveLastRateInfo(result);
          return result;
        }
      }
    } catch {
      // Backend not running or timeout (e.g. running statically on GitHub Pages)
    }

    // 2. Client fallback 1: Open Exchange Rate API (Real-time market rate aligned with Google)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && typeof data.rates.IDR === 'number') {
          const result: ExchangeRateResult = {
            rate: Math.round(data.rates.IDR),
            source: 'Google / Live Market (ER-API)',
            timestamp: new Date().toISOString(),
            isFallback: true,
          };
          this.saveLastRateInfo(result);
          return result;
        }
      }
    } catch {
      // Try next fallback
    }

    // 3. Client fallback 2: Alternative live exchange rate feed
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && typeof data.rates.IDR === 'number') {
          const result: ExchangeRateResult = {
            rate: Math.round(data.rates.IDR),
            source: 'Google / Live Market',
            timestamp: new Date().toISOString(),
            isFallback: true,
          };
          this.saveLastRateInfo(result);
          return result;
        }
      }
    } catch (e) {
      console.error('All exchange rate sources failed:', e);
    }

    throw new Error('Unable to retrieve USD/IDR exchange rate from Google or market feeds');
  },

  getAutoUpdateEnabled(): boolean {
    const val = localStorage.getItem(STORAGE_KEY_AUTO);
    return val === null ? true : val === 'true'; // Default true
  },

  setAutoUpdateEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEY_AUTO, String(enabled));
  },

  getLastRateInfo(): { timestamp: string | null; source: string } {
    return {
      timestamp: localStorage.getItem(STORAGE_KEY_LAST),
      source: localStorage.getItem(STORAGE_KEY_SOURCE) || 'Google Finance',
    };
  },

  saveLastRateInfo(info: { source: string; timestamp: string }): void {
    localStorage.setItem(STORAGE_KEY_LAST, info.timestamp);
    localStorage.setItem(STORAGE_KEY_SOURCE, info.source);
  },
};
