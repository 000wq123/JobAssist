/**
 * JobAssist Chrome Extension — Content Script
 * Injects a "In JobAssist speichern" button on supported job boards.
 */

(function () {
  'use strict';

  const JOBASSIST_ORIGIN = 'https://jobassist.at';

  // ═══════════════════════════════════════════════════════════════════════════
  // Site-specific selectors
  // ═══════════════════════════════════════════════════════════════════════════

  const EXTRACTORS = {
    'karriere.at': {
      title: () => document.querySelector('h1[data-testid="job-title"]')?.textContent?.trim()
        || document.querySelector('h1')?.textContent?.trim(),
      company: () => document.querySelector('a[data-testid="company-name"]')?.textContent?.trim()
        || document.querySelector('[data-testid="company-link"]')?.textContent?.trim()
        || document.querySelector('.job-detail-header__company')?.textContent?.trim(),
      location: () => document.querySelector('[data-testid="job-location"]')?.textContent?.trim()
        || document.querySelector('.job-detail-header__location')?.textContent?.trim(),
    },
    'willhaben.at': {
      title: () => document.querySelector('h1')?.textContent?.trim(),
      company: () => {
        const el = document.querySelector('[data-testid="advertiser-info"] h2')
          || document.querySelector('.TopHeader-right h2');
        return el?.textContent?.trim();
      },
      location: () => {
        const el = document.querySelector('[data-testid="attribute-location"]')
          || document.querySelector('.top-description-attribute span');
        return el?.textContent?.trim();
      },
    },
    'jobs.ams.at': {
      title: () => document.querySelector('.job-title')?.textContent?.trim()
        || document.querySelector('h1')?.textContent?.trim(),
      company: () => document.querySelector('.company-name')?.textContent?.trim()
        || document.querySelector('.employer')?.textContent?.trim(),
      location: () => document.querySelector('.job-location')?.textContent?.trim(),
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  function getDomain() {
    const host = location.hostname;
    if (host.includes('karriere.at')) return 'karriere.at';
    if (host.includes('willhaben.at')) return 'willhaben.at';
    if (host.includes('jobs.ams.at')) return 'jobs.ams.at';
    return null;
  }

  function buildUrl(params) {
    const url = new URL(`${JOBASSIST_ORIGIN}/jobs/neu`);
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    return url.toString();
  }

  function createButton(onClick) {
    const btn = document.createElement('button');
    btn.textContent = 'In JobAssist speichern';
    btn.className = 'jobassist-save-btn';
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function injectFloatingButton(data) {
    if (document.querySelector('.jobassist-save-btn')) return;

    const container = document.createElement('div');
    container.className = 'jobassist-float-container';

    const btn = createButton(() => {
      const url = buildUrl({
        url: location.href,
        title: data.title,
        company: data.company,
        location: data.location,
        source: getDomain(),
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    container.appendChild(btn);
    document.body.appendChild(container);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Main
  // ═══════════════════════════════════════════════════════════════════════════

  function run() {
    const domain = getDomain();
    if (!domain) return;

    const extractor = EXTRACTORS[domain];
    if (!extractor) return;

    const data = {
      title: extractor.title(),
      company: extractor.company(),
      location: extractor.location(),
    };

    if (!data.title) {
      // Retry after a short delay if the page is still hydrating
      setTimeout(run, 1500);
      return;
    }

    injectFloatingButton(data);
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
