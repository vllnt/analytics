"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { disableAnalytics, enableAnalytics, initAnalytics } from "./analytics";
import {
  clearConsent,
  CONSENT_VERSION,
  createAcceptAllConsent,
  createDeclineAnalyticsConsent,
  loadConsent,
  needsRePrompt,
  saveConsent,
  updateConsentCategory,
} from "./consent";
import type {
  AnalyticsConfig,
  ConsentCategory,
  ConsentState,
  UseConsentOptions,
  UseConsentReturn,
} from "./types";

// Context for analytics configuration
type AnalyticsContextValue = {
  acceptAll: () => void;
  config: AnalyticsConfig;
  consent: ConsentState | null;
  declineAnalytics: () => void;
  hasResponded: boolean;
  isLoading: boolean;
  resetConsent: () => void;
  updateConsent: (category: ConsentCategory, value: boolean) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

/**
 * Analytics provider component
 */
export function AnalyticsProvider({
  children,
  config,
  consentVersion = CONSENT_VERSION,
}: {
  children: ReactNode;
  config: AnalyticsConfig;
  consentVersion?: number;
}) {
  const [consent, setConsent] = useState<ConsentState | null>(() => {
    const stored = loadConsent();
    if (!stored) return null;
    if (needsRePrompt(stored, consentVersion)) {
      clearConsent();
      return null;
    }
    return stored;
  });

  const [hasResponded, setHasResponded] = useState(() => consent !== null);

  // Initialize analytics if stored consent allows
  useEffect(() => {
    if (consent?.analytics) {
      initAnalytics(config);
    }
  }, [consent, config]);

  const acceptAll = useCallback(() => {
    const newConsent = createAcceptAllConsent();
    saveConsent(newConsent);
    setConsent(newConsent);
    setHasResponded(true);
    enableAnalytics(config);
  }, [config]);

  const declineAnalytics = useCallback(() => {
    const newConsent = createDeclineAnalyticsConsent();
    saveConsent(newConsent);
    setConsent(newConsent);
    setHasResponded(true);
    disableAnalytics();
  }, []);

  const updateConsentHandler = useCallback(
    (category: ConsentCategory, value: boolean) => {
      if (!consent) return;

      const newConsent = updateConsentCategory(consent, category, value);
      saveConsent(newConsent);
      setConsent(newConsent);

      // Update analytics state
      if (category === "analytics") {
        if (value) {
          enableAnalytics(config);
        } else {
          disableAnalytics();
        }
      }
    },
    [consent, config],
  );

  const resetConsentHandler = useCallback(() => {
    clearConsent();
    setConsent(null);
    setHasResponded(false);
    disableAnalytics();
  }, []);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      acceptAll,
      config,
      consent,
      declineAnalytics,
      hasResponded,
      isLoading: false,
      resetConsent: resetConsentHandler,
      updateConsent: updateConsentHandler,
    }),
    [
      config,
      consent,
      hasResponded,
      acceptAll,
      declineAnalytics,
      updateConsentHandler,
      resetConsentHandler,
    ],
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * Hook to access analytics context
 */
export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}

/**
 * Hook to manage consent state
 */
export function useConsent(options: UseConsentOptions = {}): UseConsentReturn {
  const { consentVersion = CONSENT_VERSION } = options;

  const [consent, setConsent] = useState<ConsentState | null>(() => {
    const stored = loadConsent();
    if (!stored) return null;
    if (needsRePrompt(stored, consentVersion)) {
      clearConsent();
      return null;
    }
    return stored;
  });

  const [hasResponded, setHasResponded] = useState(() => consent !== null);

  const acceptAll = useCallback(() => {
    const newConsent = createAcceptAllConsent();
    saveConsent(newConsent);
    setConsent(newConsent);
    setHasResponded(true);
  }, []);

  const declineAnalytics = useCallback(() => {
    const newConsent = createDeclineAnalyticsConsent();
    saveConsent(newConsent);
    setConsent(newConsent);
    setHasResponded(true);
  }, []);

  const updateConsentHandler = useCallback(
    (category: ConsentCategory, value: boolean) => {
      if (!consent) return;

      const newConsent = updateConsentCategory(consent, category, value);
      saveConsent(newConsent);
      setConsent(newConsent);
    },
    [consent],
  );

  const resetConsentHandler = useCallback(() => {
    clearConsent();
    setConsent(null);
    setHasResponded(false);
  }, []);

  return {
    acceptAll,
    consent,
    declineAnalytics,
    hasResponded,
    isLoading: false,
    resetConsent: resetConsentHandler,
    updateConsent: updateConsentHandler,
  };
}

// Re-export core analytics functions for convenience
export { initAnalytics } from "./analytics";
