// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  _resetAnalyticsState,
  getAnalyticsState,
  identify,
  isAnalyticsEnabled,
  resetAnalytics,
  track,
  trackPage,
} from '../analytics'
import { isDoNotTrackEnabled, isStorageAvailable } from '../consent'

describe('SSR safety (node environment)', () => {
  beforeEach(() => {
    _resetAnalyticsState()
  })

  afterEach(() => {
    _resetAnalyticsState()
  })

  describe('analytics functions return early without window', () => {
    it('track returns early in SSR (AC-16)', () => {
      expect(() => track('test_event', { key: 'value' })).not.toThrow()
    })

    it('trackPage returns early in SSR (AC-16)', () => {
      expect(() => trackPage({ path: '/test' })).not.toThrow()
    })

    it('identify returns early in SSR (AC-16)', () => {
      expect(() => identify('user-123', { name: 'test' })).not.toThrow()
    })

    it('resetAnalytics returns early in SSR (AC-16)', () => {
      expect(() => resetAnalytics()).not.toThrow()
    })

    it('analytics state is not affected by SSR calls', () => {
      track('ssr_event')
      trackPage({ path: '/ssr' })
      identify('ssr-user')
      resetAnalytics()

      expect(getAnalyticsState()).toBeUndefined()
      expect(isAnalyticsEnabled()).toBe(false)
    })
  })

  describe('consent functions return safe defaults without window', () => {
    it('isStorageAvailable returns false in SSR (AC-17)', () => {
      expect(isStorageAvailable()).toBe(false)
    })

    it('isDoNotTrackEnabled returns false in SSR (AC-17)', () => {
      expect(isDoNotTrackEnabled()).toBe(false)
    })
  })
})
