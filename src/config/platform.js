// platform.js — SourceHUB client-side platform configuration.
// Location: client/src/config/platform.js
// Uses ES module exports (export const) for React/Vite compatibility.
//
// To rename anything: change it HERE ONLY.
// All pages and components import from this file.

export const PLATFORM = {
  name:            'SourceHUB',
  storageToken:    'sourcehub_token',
  storageRedirect: 'sourcehub_redirect',
}

export const TOOLS = {
  quotex: {
    code: 'quotex',
    name: 'QuoteX',
    routes: {
      dashboard:    '/quotex/dashboard',
      tracker:      '/quotex/tracker',
      newQuotation: '/quotex/new',
    },
  },
  // Future tools added here:
  // negohelp: {
  //   code: 'negohelp',
  //   name: 'NegoHelp',
  //   routes: { dashboard: '/negohelp/dashboard' },
  // },
}

// Shorthand for the QuoteX tool config — used throughout QuoteX pages
export const QUOTEX = TOOLS.quotex
