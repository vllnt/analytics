import type { ConsentCategory, ConsentState } from './types'

/** Current consent schema version - bump to re-prompt users */
export const CONSENT_VERSION = 1

/** localStorage key for consent state */
export const CONSENT_STORAGE_KEY = 'vllnt:analytics-consent'

/** Cookie name for SSR consent detection */
export const CONSENT_COOKIE_NAME = 'vllnt-consent'

/**
 * Type guard to validate consent state from storage
 */
export function isValidConsentState(value: unknown): value is ConsentState {
  if (typeof value !== 'object' || value === null) return false

  const state = value as Record<string, unknown>

  return (
    typeof state.analytics === 'boolean' &&
    typeof state.functional === 'boolean' &&
    typeof state.timestamp === 'string' &&
    typeof state.version === 'number'
  )
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Load consent state from localStorage
 */
export function loadConsent(): ConsentState | null {
  if (!isStorageAvailable()) return null

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isValidConsentState(parsed)) return null

    return parsed
  } catch {
    return null
  }
}

/**
 * Save consent state to localStorage and cookie
 */
export function saveConsent(state: ConsentState): void {
  if (!isStorageAvailable()) return

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))

    // Also set a cookie for SSR detection (1 year expiry)
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)

    // Cookie value: "1" for analytics allowed, "0" for declined
    const cookieValue = state.analytics ? '1' : '0'
    document.cookie = `${CONSENT_COOKIE_NAME}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  } catch (error) {
    console.warn('Failed to save consent:', error)
  }
}

/**
 * Clear consent state (for re-prompting)
 */
export function clearConsent(): void {
  if (!isStorageAvailable()) return

  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY)

    // Clear cookie
    document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Create a new consent state with all categories accepted
 */
export function createAcceptAllConsent(): ConsentState {
  return {
    analytics: true,
    functional: true,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  }
}

/**
 * Create a consent state with analytics declined
 */
export function createDeclineAnalyticsConsent(): ConsentState {
  return {
    analytics: false,
    functional: true, // Functional always enabled
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  }
}

/**
 * Update a specific consent category
 */
export function updateConsentCategory(
  current: ConsentState,
  category: ConsentCategory,
  value: boolean,
): ConsentState {
  // Functional cookies cannot be disabled
  if (category === 'functional' && !value) {
    return current
  }

  return {
    ...current,
    [category]: value,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Check if consent needs to be re-prompted (version mismatch)
 */
export function needsRePrompt(consent: ConsentState, currentVersion: number): boolean {
  return consent.version < currentVersion
}

/**
 * Check Do Not Track browser setting
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof window === 'undefined') return false

  const dnt =
    navigator.doNotTrack ||
    (window as unknown as { doNotTrack?: string }).doNotTrack ||
    (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack

  return dnt === '1' || dnt === 'yes'
}

/**
 * Get consent from cookie (for SSR)
 */
export function getConsentFromCookie(cookieString: string): boolean | null {
  const match = new RegExp(`${CONSENT_COOKIE_NAME}=([^;]+)`).exec(cookieString)
  if (!match) return null
  return match[1] === '1'
}
