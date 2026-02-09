import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearConsent,
  CONSENT_COOKIE_NAME,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  createAcceptAllConsent,
  createDeclineAnalyticsConsent,
  getConsentFromCookie,
  isDoNotTrackEnabled,
  isStorageAvailable,
  isValidConsentState,
  loadConsent,
  needsRePrompt,
  saveConsent,
  updateConsentCategory,
} from '../consent'
import type { ConsentState } from '../types'

describe('consent', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`

    // Reset navigator.doNotTrack
    Object.defineProperty(navigator, 'doNotTrack', {
      configurable: true,
      value: null,
      writable: true,
    })
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('isValidConsentState', () => {
    it('returns true for valid consent state', () => {
      const valid: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      expect(isValidConsentState(valid)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isValidConsentState(null)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(isValidConsentState('string')).toBe(false)
      expect(isValidConsentState(123)).toBe(false)
      expect(isValidConsentState(undefined)).toBe(false)
    })

    it('returns false for missing analytics field', () => {
      expect(
        isValidConsentState({
          functional: true,
          timestamp: '2025-01-01T00:00:00.000Z',
          version: 1,
        }),
      ).toBe(false)
    })

    it('returns false for wrong type on analytics field', () => {
      expect(
        isValidConsentState({
          analytics: 'true',
          functional: true,
          timestamp: '2025-01-01T00:00:00.000Z',
          version: 1,
        }),
      ).toBe(false)
    })

    it('returns false for missing functional field', () => {
      expect(
        isValidConsentState({
          analytics: true,
          timestamp: '2025-01-01T00:00:00.000Z',
          version: 1,
        }),
      ).toBe(false)
    })

    it('returns false for missing timestamp field', () => {
      expect(
        isValidConsentState({
          analytics: true,
          functional: true,
          version: 1,
        }),
      ).toBe(false)
    })

    it('returns false for missing version field', () => {
      expect(
        isValidConsentState({
          analytics: true,
          functional: true,
          timestamp: '2025-01-01T00:00:00.000Z',
        }),
      ).toBe(false)
    })
  })

  describe('isStorageAvailable', () => {
    it('returns true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true)
    })
  })

  describe('loadConsent', () => {
    it('returns null when no consent stored', () => {
      expect(loadConsent()).toBe(null)
    })

    it('returns stored consent when valid', () => {
      const state: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))

      expect(loadConsent()).toEqual(state)
    })

    it('returns null for invalid JSON', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'invalid json {{{')
      expect(loadConsent()).toBe(null)
    })

    it('returns null for invalid consent structure', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ invalid: true }))
      expect(loadConsent()).toBe(null)
    })
  })

  describe('saveConsent', () => {
    it('saves consent to localStorage', () => {
      const state: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      saveConsent(state)

      const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}')
      expect(stored).toEqual(state)
    })

    it('sets cookie with value 1 when analytics allowed', () => {
      const state: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      saveConsent(state)

      expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=1`)
    })

    it('sets cookie with value 0 when analytics declined', () => {
      const state: ConsentState = {
        analytics: false,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      saveConsent(state)

      expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=0`)
    })
  })

  describe('clearConsent', () => {
    it('removes consent from localStorage', () => {
      const state: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))

      clearConsent()

      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe(null)
    })

    it('clears the cookie', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=1; path=/`

      clearConsent()

      // Cookie should be expired (value might still show but with past expiry)
      expect(document.cookie).not.toContain(`${CONSENT_COOKIE_NAME}=1`)
    })
  })

  describe('createAcceptAllConsent', () => {
    it('creates consent with all categories enabled', () => {
      const consent = createAcceptAllConsent()

      expect(consent.analytics).toBe(true)
      expect(consent.functional).toBe(true)
      expect(consent.version).toBe(CONSENT_VERSION)
      expect(typeof consent.timestamp).toBe('string')
    })

    it('uses ISO timestamp format', () => {
      const consent = createAcceptAllConsent()
      expect(consent.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('createDeclineAnalyticsConsent', () => {
    it('creates consent with analytics disabled', () => {
      const consent = createDeclineAnalyticsConsent()

      expect(consent.analytics).toBe(false)
      expect(consent.functional).toBe(true) // Always enabled
      expect(consent.version).toBe(CONSENT_VERSION)
    })
  })

  describe('updateConsentCategory', () => {
    const baseConsent: ConsentState = {
      analytics: true,
      functional: true,
      timestamp: '2025-01-01T00:00:00.000Z',
      version: 1,
    }

    it('updates analytics category', () => {
      const updated = updateConsentCategory(baseConsent, 'analytics', false)

      expect(updated.analytics).toBe(false)
      expect(updated.functional).toBe(true)
    })

    it('prevents disabling functional cookies', () => {
      const updated = updateConsentCategory(baseConsent, 'functional', false)

      // Should return original, functional cannot be disabled
      expect(updated.functional).toBe(true)
      expect(updated).toBe(baseConsent)
    })

    it('updates timestamp on change', () => {
      const updated = updateConsentCategory(baseConsent, 'analytics', false)

      expect(updated.timestamp).not.toBe(baseConsent.timestamp)
    })

    it('allows enabling functional (no-op but valid)', () => {
      const updated = updateConsentCategory(baseConsent, 'functional', true)

      expect(updated.functional).toBe(true)
      expect(updated.timestamp).not.toBe(baseConsent.timestamp)
    })
  })

  describe('needsRePrompt', () => {
    it('returns true when stored version is lower', () => {
      const consent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }

      expect(needsRePrompt(consent, 2)).toBe(true)
    })

    it('returns false when versions match', () => {
      const consent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }

      expect(needsRePrompt(consent, 1)).toBe(false)
    })

    it('returns false when stored version is higher', () => {
      const consent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 2,
      }

      expect(needsRePrompt(consent, 1)).toBe(false)
    })
  })

  describe('isDoNotTrackEnabled', () => {
    it('returns true when doNotTrack is "1"', () => {
      Object.defineProperty(navigator, 'doNotTrack', {
        configurable: true,
        value: '1',
        writable: true,
      })

      expect(isDoNotTrackEnabled()).toBe(true)
    })

    it('returns true when doNotTrack is "yes"', () => {
      Object.defineProperty(navigator, 'doNotTrack', {
        configurable: true,
        value: 'yes',
        writable: true,
      })

      expect(isDoNotTrackEnabled()).toBe(true)
    })

    it('returns false when doNotTrack is "0"', () => {
      Object.defineProperty(navigator, 'doNotTrack', {
        configurable: true,
        value: '0',
        writable: true,
      })

      expect(isDoNotTrackEnabled()).toBe(false)
    })

    it('returns false when doNotTrack is not set', () => {
      Object.defineProperty(navigator, 'doNotTrack', {
        configurable: true,
        value: null,
        writable: true,
      })

      expect(isDoNotTrackEnabled()).toBe(false)
    })
  })

  describe('getConsentFromCookie', () => {
    it('returns true when cookie value is "1"', () => {
      expect(getConsentFromCookie(`${CONSENT_COOKIE_NAME}=1`)).toBe(true)
    })

    it('returns false when cookie value is "0"', () => {
      expect(getConsentFromCookie(`${CONSENT_COOKIE_NAME}=0`)).toBe(false)
    })

    it('returns null when cookie not present', () => {
      expect(getConsentFromCookie('other-cookie=value')).toBe(null)
    })

    it('handles multiple cookies', () => {
      expect(getConsentFromCookie(`other=value; ${CONSENT_COOKIE_NAME}=1; another=test`)).toBe(true)
    })
  })
})
