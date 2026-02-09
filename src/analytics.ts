// Lightweight custom analytics implementation
// Replaces external 'analytics' package with minimal implementation

import { isDoNotTrackEnabled, loadConsent } from './consent'
import type {
  AnalyticsConfig,
  AnalyticsEvent,
  TutorialEventName,
  TutorialEventProperties,
} from './types'

// Analytics state (singleton)
type AnalyticsState = {
  app: string
  debug?: boolean
  traits?: Record<string, unknown>
  userId?: string
  version?: number
}

let analyticsState: AnalyticsState | undefined

// Queue for events before initialization
let eventQueue: AnalyticsEvent[] = []

// Track initialization state
let isInitialized = false
let isBlocked = false

/**
 * Reset analytics state (for testing only)
 * @internal
 */
export function _resetAnalyticsState(): void {
  analyticsState = undefined
  eventQueue = []
  isInitialized = false
  isBlocked = false
}

/**
 * Log event in debug mode
 */
function debugLog(type: string, data: unknown): void {
  if (analyticsState?.debug) {
    // eslint-disable-next-line no-console -- Debug logging is intentional
    console.log(`[analytics:${type}]`, data)
  }
}

/**
 * Send event to analytics endpoint or external service
 * This is where you'd integrate with Vercel Analytics, GA, etc.
 */
function sendEvent(name: string, properties?: Record<string, unknown>): void {
  debugLog('track', { name, properties })

  // Integration point: Forward to Vercel Analytics or other services
  // Vercel Analytics integration is handled by the React provider
  // This function serves as the central tracking point

  // For custom backends, you could send to an API endpoint:
  // fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ name, properties }) })
}

/**
 * Initialize analytics with configuration
 */
export function initAnalytics(config: AnalyticsConfig): void {
  if (analyticsState) return

  // Check Do Not Track
  if (isDoNotTrackEnabled()) {
    isBlocked = true
    debugLog('init', 'Do Not Track enabled, analytics blocked')
    return
  }

  // Check consent
  const consent = loadConsent()
  if (consent && !consent.analytics) {
    isBlocked = true
    debugLog('init', 'Analytics consent declined')
    return
  }

  analyticsState = {
    app: config.app,
    debug: config.debug,
    version: config.version,
  }

  isInitialized = true

  debugLog('init', { app: config.app, version: config.version })

  // Process queued events
  processQueue()
}

/**
 * Process queued events after initialization
 */
function processQueue(): void {
  if (!analyticsState || isBlocked) return

  // Process and clear the queue
  const queue = [...eventQueue]
  eventQueue = []

  for (const event of queue) {
    if (event.name === '__page__') {
      debugLog('page', event.properties)
    } else {
      sendEvent(event.name, event.properties)
    }
  }
}

/**
 * Track a custom event
 */
export function track(name: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return

  if (isBlocked) return

  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  }

  if (!isInitialized) {
    eventQueue.push(event)
    return
  }

  sendEvent(name, properties)
}

/**
 * Track a page view
 */
export function trackPage(properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (isBlocked) return

  if (!isInitialized) {
    eventQueue.push({
      name: '__page__',
      properties,
      timestamp: new Date().toISOString(),
    })
    return
  }

  debugLog('page', properties)
}

/**
 * Identify a user
 */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (isBlocked) return

  if (!isInitialized || !analyticsState) {
    return
  }

  analyticsState.userId = userId
  analyticsState.traits = traits

  debugLog('identify', { traits, userId })
}

/**
 * Reset analytics state (on logout)
 */
export function resetAnalytics(): void {
  if (typeof window === 'undefined') return

  if (analyticsState) {
    analyticsState.userId = undefined
    analyticsState.traits = undefined
  }

  debugLog('reset', undefined)
}

/**
 * Enable analytics after consent is given
 */
export function enableAnalytics(config: AnalyticsConfig): void {
  if (isBlocked && !isDoNotTrackEnabled()) {
    isBlocked = false
    analyticsState = undefined
    initAnalytics(config)
  }
}

/**
 * Disable analytics after consent is revoked
 */
export function disableAnalytics(): void {
  isBlocked = true
  eventQueue.length = 0 // Clear queue
}

/**
 * Check if analytics is currently enabled
 */
export function isAnalyticsEnabled(): boolean {
  return isInitialized && !isBlocked
}

/**
 * Get current analytics state (for advanced usage/debugging)
 */
export function getAnalyticsState(): AnalyticsState | undefined {
  return analyticsState
}

// Tutorial-specific tracking helpers

/**
 * Track tutorial start
 */
export function trackTutorialStart(properties: Omit<TutorialEventProperties, 'section_id'>): void {
  track('tutorial_start' satisfies TutorialEventName, properties as Record<string, unknown>)
}

/**
 * Track section view
 */
export function trackSectionView(properties: TutorialEventProperties): void {
  track('tutorial_section_view' satisfies TutorialEventName, properties as Record<string, unknown>)
}

/**
 * Track section completion
 */
export function trackSectionComplete(properties: TutorialEventProperties): void {
  track(
    'tutorial_section_complete' satisfies TutorialEventName,
    properties as Record<string, unknown>,
  )
}

/**
 * Track tutorial completion
 */
export function trackTutorialComplete(
  properties: Omit<TutorialEventProperties, 'section_id'>,
): void {
  track('tutorial_complete' satisfies TutorialEventName, properties as Record<string, unknown>)
}

/**
 * Track navigation between sections
 */
export function trackTutorialNavigation(
  properties: TutorialEventProperties & { navigation_type: 'keyboard' | 'next' | 'prev' | 'toc' },
): void {
  track('tutorial_navigation' satisfies TutorialEventName, properties as Record<string, unknown>)
}

/**
 * Track time spent on a section
 */
export function trackTimeSpent(
  properties: TutorialEventProperties & { time_spent_seconds: number },
): void {
  track('tutorial_time_spent' satisfies TutorialEventName, properties as Record<string, unknown>)
}
