import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  _resetAnalyticsState,
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
} from '../analytics'
import { CONSENT_STORAGE_KEY } from '../consent'
import type { ConsentState } from '../types'

describe('analytics', () => {
  const baseConfig = { app: 'test-app', version: 1 }

  beforeEach(() => {
    localStorage.clear()
    _resetAnalyticsState()
    vi.restoreAllMocks()

    // Reset navigator.doNotTrack
    Object.defineProperty(navigator, 'doNotTrack', {
      configurable: true,
      value: null,
      writable: true,
    })
  })

  afterEach(() => {
    localStorage.clear()
    _resetAnalyticsState()
  })

  describe('initAnalytics', () => {
    it('creates analytics state with config', () => {
      initAnalytics(baseConfig)

      const state = getAnalyticsState()
      expect(state).toBeDefined()
      expect(state?.app).toBe('test-app')
      expect(state?.version).toBe(1)
    })

    it('does not reinitialize on multiple calls', () => {
      initAnalytics(baseConfig)
      initAnalytics({ app: 'different-app', version: 2 })

      const state = getAnalyticsState()
      expect(state?.app).toBe('test-app')
    })

    it('blocks analytics when Do Not Track is enabled', () => {
      Object.defineProperty(navigator, 'doNotTrack', {
        configurable: true,
        value: '1',
        writable: true,
      })

      initAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(false)
    })

    it('blocks analytics when consent is declined', () => {
      const declinedConsent: ConsentState = {
        analytics: false,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(declinedConsent))

      initAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(false)
    })

    it('enables analytics when consent is granted', () => {
      const grantedConsent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(grantedConsent))

      initAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(true)
    })

    it('enables analytics when no consent is stored (default allow)', () => {
      initAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(true)
    })

    it('logs init in debug mode', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      initAnalytics({ ...baseConfig, debug: true })

      expect(logSpy).toHaveBeenCalledWith('[analytics:init]', { app: 'test-app', version: 1 })

      logSpy.mockRestore()
    })
  })

  describe('track', () => {
    it('queues events before initialization', () => {
      // Track before init - should be queued without error
      expect(() => {
        track('test_event', { foo: 'bar' })
      }).not.toThrow()

      // Initialize
      initAnalytics(baseConfig)

      // Event should have been processed (no error)
      expect(isAnalyticsEnabled()).toBe(true)
    })

    it('does nothing when blocked', () => {
      const declinedConsent: ConsentState = {
        analytics: false,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(declinedConsent))

      initAnalytics(baseConfig)

      // Should not throw
      expect(() => {
        track('test_event')
      }).not.toThrow()
    })

    it('tracks events after initialization', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      initAnalytics({ ...baseConfig, debug: true })

      track('test_event', { value: 123 })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'test_event',
        properties: { value: 123 },
      })

      logSpy.mockRestore()
    })

    it('processes queued events on initialization', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Queue event
      track('queued_event', { queued: true })

      // Initialize with debug
      initAnalytics({ ...baseConfig, debug: true })

      // Queued event should have been processed
      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'queued_event',
        properties: { queued: true },
      })

      logSpy.mockRestore()
    })
  })

  describe('trackPage', () => {
    it('tracks page view after initialization', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      initAnalytics({ ...baseConfig, debug: true })
      trackPage({ path: '/test' })

      expect(logSpy).toHaveBeenCalledWith('[analytics:page]', { path: '/test' })

      logSpy.mockRestore()
    })

    it('queues page views before initialization', () => {
      // Should not throw
      expect(() => {
        trackPage({ path: '/test' })
      }).not.toThrow()
    })

    it('does nothing when blocked', () => {
      const declinedConsent: ConsentState = {
        analytics: false,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(declinedConsent))

      initAnalytics(baseConfig)

      expect(() => {
        trackPage({ path: '/test' })
      }).not.toThrow()
    })
  })

  describe('identify', () => {
    it('identifies user after initialization', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      initAnalytics({ ...baseConfig, debug: true })
      identify('user-123', { email: 'test@example.com' })

      expect(logSpy).toHaveBeenCalledWith('[analytics:identify]', {
        traits: { email: 'test@example.com' },
        userId: 'user-123',
      })

      const state = getAnalyticsState()
      expect(state?.userId).toBe('user-123')
      expect(state?.traits).toEqual({ email: 'test@example.com' })

      logSpy.mockRestore()
    })

    it('does nothing before initialization', () => {
      // Should not throw
      expect(() => {
        identify('user-123')
      }).not.toThrow()
    })

    it('does nothing when blocked', () => {
      const declinedConsent: ConsentState = {
        analytics: false,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(declinedConsent))

      initAnalytics(baseConfig)

      expect(() => {
        identify('user-123')
      }).not.toThrow()
    })
  })

  describe('resetAnalytics', () => {
    it('clears user data from state', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      initAnalytics({ ...baseConfig, debug: true })
      identify('user-123', { email: 'test@example.com' })

      expect(getAnalyticsState()?.userId).toBe('user-123')

      resetAnalytics()

      expect(getAnalyticsState()?.userId).toBeUndefined()
      expect(getAnalyticsState()?.traits).toBeUndefined()
      expect(logSpy).toHaveBeenCalledWith('[analytics:reset]', undefined)

      logSpy.mockRestore()
    })

    it('does nothing before initialization', () => {
      expect(() => {
        resetAnalytics()
      }).not.toThrow()
    })
  })

  describe('enableAnalytics / disableAnalytics', () => {
    it('enableAnalytics initializes when previously blocked', () => {
      const declinedConsent: ConsentState = {
        analytics: false,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(declinedConsent))

      initAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(false)

      // Clear declined consent
      localStorage.removeItem(CONSENT_STORAGE_KEY)

      enableAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(true)
    })

    it('enableAnalytics does not re-enable when Do Not Track is set', () => {
      Object.defineProperty(navigator, 'doNotTrack', {
        configurable: true,
        value: '1',
        writable: true,
      })

      initAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(false)

      enableAnalytics(baseConfig)

      // Should still be blocked due to DNT
      expect(isAnalyticsEnabled()).toBe(false)
    })

    it('disableAnalytics blocks tracking', () => {
      initAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(true)

      disableAnalytics()

      expect(isAnalyticsEnabled()).toBe(false)
    })

    it('disableAnalytics clears event queue', () => {
      // Queue some events
      track('event1')
      track('event2')

      disableAnalytics()

      // Initialize - queued events should not be processed
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      initAnalytics({ ...baseConfig, debug: true })

      // Should not have logged any queued events (queue was cleared by disableAnalytics)
      expect(logSpy).not.toHaveBeenCalledWith(
        '[analytics:track]',
        expect.objectContaining({ name: 'event1' }),
      )
      expect(logSpy).not.toHaveBeenCalledWith(
        '[analytics:track]',
        expect.objectContaining({ name: 'event2' }),
      )

      logSpy.mockRestore()
    })
  })

  describe('getAnalyticsState', () => {
    it('returns undefined before initialization', () => {
      expect(getAnalyticsState()).toBeUndefined()
    })

    it('returns analytics state after initialization', () => {
      initAnalytics(baseConfig)

      const state = getAnalyticsState()
      expect(state).toBeDefined()
      expect(state?.app).toBe('test-app')
    })
  })

  describe('tutorial tracking helpers', () => {
    const baseTutorialProps = {
      locale: 'en',
      tutorial_id: 'test-tutorial',
      tutorial_title: 'Test Tutorial',
    }

    let logSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      initAnalytics({ ...baseConfig, debug: true })
    })

    afterEach(() => {
      logSpy.mockRestore()
    })

    it('trackTutorialStart tracks tutorial_start event', () => {
      trackTutorialStart({
        ...baseTutorialProps,
        total_sections: 5,
      })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'tutorial_start',
        properties: {
          locale: 'en',
          total_sections: 5,
          tutorial_id: 'test-tutorial',
          tutorial_title: 'Test Tutorial',
        },
      })
    })

    it('trackSectionView tracks tutorial_section_view event', () => {
      trackSectionView({
        ...baseTutorialProps,
        section_id: 'section-1',
        section_index: 0,
        total_sections: 5,
      })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'tutorial_section_view',
        properties: {
          locale: 'en',
          section_id: 'section-1',
          section_index: 0,
          total_sections: 5,
          tutorial_id: 'test-tutorial',
          tutorial_title: 'Test Tutorial',
        },
      })
    })

    it('trackSectionComplete tracks tutorial_section_complete event', () => {
      trackSectionComplete({
        ...baseTutorialProps,
        completion_percent: 20,
        section_id: 'section-1',
        section_index: 0,
      })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'tutorial_section_complete',
        properties: {
          completion_percent: 20,
          locale: 'en',
          section_id: 'section-1',
          section_index: 0,
          tutorial_id: 'test-tutorial',
          tutorial_title: 'Test Tutorial',
        },
      })
    })

    it('trackTutorialComplete tracks tutorial_complete event', () => {
      trackTutorialComplete({
        ...baseTutorialProps,
        completion_percent: 100,
        total_sections: 5,
      })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'tutorial_complete',
        properties: {
          completion_percent: 100,
          locale: 'en',
          total_sections: 5,
          tutorial_id: 'test-tutorial',
          tutorial_title: 'Test Tutorial',
        },
      })
    })

    it('trackTutorialNavigation tracks tutorial_navigation event', () => {
      trackTutorialNavigation({
        ...baseTutorialProps,
        navigation_type: 'next',
        section_id: 'section-2',
      })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'tutorial_navigation',
        properties: {
          locale: 'en',
          navigation_type: 'next',
          section_id: 'section-2',
          tutorial_id: 'test-tutorial',
          tutorial_title: 'Test Tutorial',
        },
      })
    })

    it('trackTimeSpent tracks tutorial_time_spent event', () => {
      trackTimeSpent({
        ...baseTutorialProps,
        section_id: 'section-1',
        time_spent_seconds: 120,
      })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'tutorial_time_spent',
        properties: {
          locale: 'en',
          section_id: 'section-1',
          time_spent_seconds: 120,
          tutorial_id: 'test-tutorial',
          tutorial_title: 'Test Tutorial',
        },
      })
    })

    it('trackTutorialNavigation supports all navigation types', () => {
      const navTypes: ('keyboard' | 'next' | 'prev' | 'toc')[] = ['keyboard', 'next', 'prev', 'toc']

      for (const navType of navTypes) {
        trackTutorialNavigation({
          ...baseTutorialProps,
          navigation_type: navType,
          section_id: 'section-1',
        })

        expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
          name: 'tutorial_navigation',
          properties: expect.objectContaining({ navigation_type: navType }),
        })
      }
    })
  })

  describe('consent lifecycle integration', () => {
    it('queued events are permanently lost after disable/enable cycle (AC-15)', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      track('queued_event_1', { data: 'before_decline' })
      track('queued_event_2', { data: 'before_decline' })

      disableAnalytics()

      localStorage.removeItem(CONSENT_STORAGE_KEY)

      enableAnalytics({ ...baseConfig, debug: true })

      expect(logSpy).not.toHaveBeenCalledWith(
        '[analytics:track]',
        expect.objectContaining({ name: 'queued_event_1' }),
      )
      expect(logSpy).not.toHaveBeenCalledWith(
        '[analytics:track]',
        expect.objectContaining({ name: 'queued_event_2' }),
      )

      logSpy.mockRestore()
    })

    it('PII persists in analyticsState after disableAnalytics (AC-13)', () => {
      // KNOWN LIMITATION (GDPR Art. 17): disableAnalytics() does not clear
      // in-memory userId/traits. Callers must trigger a page reload or call
      // resetAnalytics() to purge PII after consent revocation.
      initAnalytics({ ...baseConfig, debug: true })
      identify('user-123', { email: 'test@example.com' })

      expect(getAnalyticsState()?.userId).toBe('user-123')
      expect(getAnalyticsState()?.traits).toEqual({ email: 'test@example.com' })

      disableAnalytics()

      expect(getAnalyticsState()?.userId).toBe('user-123')
      expect(getAnalyticsState()?.traits).toEqual({ email: 'test@example.com' })
    })

    it('enableAnalytics does nothing when not blocked (no-op)', () => {
      initAnalytics(baseConfig)
      expect(isAnalyticsEnabled()).toBe(true)

      enableAnalytics(baseConfig)

      expect(isAnalyticsEnabled()).toBe(true)
    })
  })

  describe('queued page view flush', () => {
    it('processQueue flushes queued page views via __page__ debug path (AC-5)', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      trackPage({ path: '/queued-page' })

      initAnalytics({ ...baseConfig, debug: true })

      expect(logSpy).toHaveBeenCalledWith('[analytics:page]', { path: '/queued-page' })

      logSpy.mockRestore()
    })

    it('processQueue flushes both page views and regular events', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      track('regular_event', { key: 'value' })
      trackPage({ path: '/test-page' })

      initAnalytics({ ...baseConfig, debug: true })

      expect(logSpy).toHaveBeenCalledWith('[analytics:track]', {
        name: 'regular_event',
        properties: { key: 'value' },
      })
      expect(logSpy).toHaveBeenCalledWith('[analytics:page]', { path: '/test-page' })

      logSpy.mockRestore()
    })
  })
})
