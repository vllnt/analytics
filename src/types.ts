/**
 * Analytics consent state stored in localStorage
 */
export type ConsentState = {
  /** Whether analytics tracking is allowed */
  analytics: boolean
  /** Whether functional cookies are allowed (always true for site operation) */
  functional: boolean
  /** ISO timestamp when consent was given */
  timestamp: string
  /** Version of consent prompt (bump to re-prompt users) */
  version: number
}

/**
 * Consent categories that can be toggled
 */
export type ConsentCategory = 'analytics' | 'functional'

/**
 * Tutorial-specific event names
 */
export type TutorialEventName =
  | 'tutorial_complete'
  | 'tutorial_navigation'
  | 'tutorial_section_complete'
  | 'tutorial_section_view'
  | 'tutorial_start'
  | 'tutorial_time_spent'

/**
 * Tutorial event properties
 */
export type TutorialEventProperties = {
  /** Completion percentage (0-100) */
  completion_percent?: number
  /** User's locale */
  locale: string
  /** Navigation method used */
  navigation_type?: 'keyboard' | 'next' | 'prev' | 'toc'
  /** Section identifier */
  section_id?: string
  /** Section position (0-indexed) */
  section_index?: number
  /** Time spent in seconds */
  time_spent_seconds?: number
  /** Total number of sections */
  total_sections?: number
  /** Unique tutorial identifier (contentId) */
  tutorial_id: string
  /** Human-readable tutorial title */
  tutorial_title: string
}

/**
 * Generic analytics event
 */
export type AnalyticsEvent = {
  name: string
  properties?: Record<string, unknown>
  timestamp?: string
}

/**
 * Analytics instance configuration
 */
export type AnalyticsConfig = {
  /** Application name for analytics */
  app: string
  /** Enable debug mode */
  debug?: boolean
  /** Application version */
  version?: number
}

/**
 * Hook options for useConsent
 */
export type UseConsentOptions = {
  /** Current consent version (bump to re-prompt) */
  consentVersion?: number
}

/**
 * Return type for useConsent hook
 */
export type UseConsentReturn = {
  /** Accept all tracking */
  acceptAll: () => void
  /** Current consent state (null if not yet determined) */
  consent: ConsentState | null
  /** Decline analytics tracking (functional always on) */
  declineAnalytics: () => void
  /** Whether consent has been given (any response) */
  hasResponded: boolean
  /** Whether currently loading from storage */
  isLoading: boolean
  /** Reset consent (will re-show banner) */
  resetConsent: () => void
  /** Update specific consent category */
  updateConsent: (category: ConsentCategory, value: boolean) => void
}
