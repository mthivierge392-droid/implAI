/**
 * Centralized application constants
 * This file ensures consistency across the entire codebase
 */

// API Configuration
export const API_CONFIG = {
  RATE_LIMIT: {
    WINDOW_MS: 10000, // 10 seconds
    MAX_REQUESTS: 10,
  },
  CACHE_DURATION: 1000 * 60 * 5, // 5 minutes
  STALE_TIME: 1000 * 60 * 5, // 5 minutes for React Query
  RETRY_ATTEMPTS: 2,
} as const;

// Input Validation
export const VALIDATION = {
  PROMPT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 5000,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
  },
} as const;

// UI Configurations
export const UI_CONFIG = {
  TOAST_DURATION: 5000, // 5 seconds
  DEBOUNCE_DELAY: 300, // 300ms for search debouncing
  ITEMS_PER_PAGE: 50, // For pagination
} as const;

// External API Configuration
export const EXTERNAL_API = {
  RETELL: {
    BASE_URL: 'https://api.retellai.com',
  },
} as const;