import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { _resetAnalyticsState } from '../analytics'
import { CONSENT_STORAGE_KEY } from '../consent'
import { AnalyticsProvider, useAnalytics, useConsent } from '../react'
import type { ConsentState } from '../types'

describe('react', () => {
  const baseConfig = { app: 'test-app', version: 1 }

  beforeEach(() => {
    localStorage.clear()
    _resetAnalyticsState()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    _resetAnalyticsState()
  })

  describe('useConsent', () => {
    it('finishes loading with no consent when storage is empty', async () => {
      const { result } = renderHook(() => useConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.consent).toBe(null)
      expect(result.current.hasResponded).toBe(false)
    })

    it('loads existing consent from localStorage', async () => {
      const storedConsent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(storedConsent))

      const { result } = renderHook(() => useConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.consent).toEqual(storedConsent)
      expect(result.current.hasResponded).toBe(true)
    })

    it('clears consent when version mismatch', async () => {
      const oldConsent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(oldConsent))

      const { result } = renderHook(() => useConsent({ consentVersion: 2 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.consent).toBe(null)
      expect(result.current.hasResponded).toBe(false)
    })

    it('acceptAll sets analytics and functional to true', async () => {
      const { result } = renderHook(() => useConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.acceptAll()
      })

      expect(result.current.consent?.analytics).toBe(true)
      expect(result.current.consent?.functional).toBe(true)
      expect(result.current.hasResponded).toBe(true)

      // Verify localStorage
      const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}')
      expect(stored.analytics).toBe(true)
    })

    it('declineAnalytics sets analytics to false', async () => {
      const { result } = renderHook(() => useConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.declineAnalytics()
      })

      expect(result.current.consent?.analytics).toBe(false)
      expect(result.current.consent?.functional).toBe(true)
      expect(result.current.hasResponded).toBe(true)
    })

    it('updateConsent updates specific category', async () => {
      const { result } = renderHook(() => useConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.acceptAll()
      })

      act(() => {
        result.current.updateConsent('analytics', false)
      })

      expect(result.current.consent?.analytics).toBe(false)
    })

    it('updateConsent does nothing when no consent exists', async () => {
      const { result } = renderHook(() => useConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.updateConsent('analytics', false)
      })

      expect(result.current.consent).toBe(null)
    })

    it('resetConsent clears all state', async () => {
      const storedConsent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(storedConsent))

      const { result } = renderHook(() => useConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasResponded).toBe(true)

      act(() => {
        result.current.resetConsent()
      })

      expect(result.current.consent).toBe(null)
      expect(result.current.hasResponded).toBe(false)
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe(null)
    })
  })

  describe('AnalyticsProvider', () => {
    const wrapper =
      (config = baseConfig) =>
      ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider config={config}>{children}</AnalyticsProvider>
      )

    it('provides analytics context', async () => {
      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.config).toEqual(baseConfig)
    })

    it('loads consent from localStorage', async () => {
      const storedConsent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(storedConsent))

      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.consent).toEqual(storedConsent)
      expect(result.current.hasResponded).toBe(true)
    })

    it('acceptAll saves consent and enables analytics', async () => {
      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.acceptAll()
      })

      expect(result.current.consent?.analytics).toBe(true)
      expect(result.current.hasResponded).toBe(true)
    })

    it('declineAnalytics saves consent and disables analytics', async () => {
      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.declineAnalytics()
      })

      expect(result.current.consent?.analytics).toBe(false)
      expect(result.current.hasResponded).toBe(true)
    })

    it('updateConsent updates and syncs analytics state', async () => {
      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.acceptAll()
      })

      act(() => {
        result.current.updateConsent('analytics', false)
      })

      expect(result.current.consent?.analytics).toBe(false)
    })

    it('resetConsent clears state and disables analytics', async () => {
      const storedConsent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(storedConsent))

      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.resetConsent()
      })

      expect(result.current.consent).toBe(null)
      expect(result.current.hasResponded).toBe(false)
    })

    it('re-prompts when consent version changes', async () => {
      const oldConsent: ConsentState = {
        analytics: true,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(oldConsent))

      const { result } = renderHook(() => useAnalytics(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <AnalyticsProvider config={baseConfig} consentVersion={2}>
            {children}
          </AnalyticsProvider>
        ),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.consent).toBe(null)
      expect(result.current.hasResponded).toBe(false)
    })

    it('updateConsent enables analytics when category is analytics and value is true (AC-S1)', async () => {
      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.acceptAll()
      })

      act(() => {
        result.current.updateConsent('analytics', false)
      })

      expect(result.current.consent?.analytics).toBe(false)

      act(() => {
        result.current.updateConsent('analytics', true)
      })

      expect(result.current.consent?.analytics).toBe(true)
    })

    it('loads stored consent with analytics declined without initializing analytics', async () => {
      const declinedConsent: ConsentState = {
        analytics: false,
        functional: true,
        timestamp: '2025-01-01T00:00:00.000Z',
        version: 1,
      }
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(declinedConsent))

      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.consent).toEqual(declinedConsent)
      expect(result.current.hasResponded).toBe(true)
    })

    it('updateConsent with functional category does not toggle analytics', async () => {
      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.acceptAll()
      })

      act(() => {
        result.current.updateConsent('functional', true)
      })

      expect(result.current.consent?.functional).toBe(true)
      expect(result.current.consent?.analytics).toBe(true)
    })

    it('updateConsent does nothing when consent is null (AC-S2)', async () => {
      const { result } = renderHook(() => useAnalytics(), {
        wrapper: wrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.consent).toBe(null)

      act(() => {
        result.current.updateConsent('analytics', false)
      })

      expect(result.current.consent).toBe(null)
    })
  })

  describe('useAnalytics error handling', () => {
    it('throws when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAnalytics())
      }).toThrow('useAnalytics must be used within an AnalyticsProvider')

      consoleSpy.mockRestore()
    })
  })
})
