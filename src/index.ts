// Core analytics
export {
  disableAnalytics,
  enableAnalytics,
  getAnalyticsState,
  identify,
  initAnalytics,
  isAnalyticsEnabled,
  resetAnalytics,
  track,
  trackPage,
  trackSectionComplete,
  trackSectionView,
  trackTimeSpent,
  trackTutorialComplete,
  trackTutorialNavigation,
  trackTutorialStart,
} from './analytics'

// Consent management
export {
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
} from './consent'

// Types
export type {
  AnalyticsConfig,
  AnalyticsEvent,
  ConsentCategory,
  ConsentState,
  TutorialEventName,
  TutorialEventProperties,
  UseConsentOptions,
  UseConsentReturn,
} from './types'
