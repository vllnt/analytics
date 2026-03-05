import { describe, expect, it } from "vitest";

import * as coreExports from "../index";
import * as reactExports from "../react";

describe("package exports", () => {
  describe("core exports (index.ts)", () => {
    it("exports all core analytics functions", () => {
      expect(typeof coreExports.initAnalytics).toBe("function");
      expect(typeof coreExports.track).toBe("function");
      expect(typeof coreExports.trackPage).toBe("function");
      expect(typeof coreExports.identify).toBe("function");
      expect(typeof coreExports.resetAnalytics).toBe("function");
      expect(typeof coreExports.enableAnalytics).toBe("function");
      expect(typeof coreExports.disableAnalytics).toBe("function");
      expect(typeof coreExports.isAnalyticsEnabled).toBe("function");
      expect(typeof coreExports.getAnalyticsState).toBe("function");
    });

    it("exports all tutorial tracking helpers", () => {
      expect(typeof coreExports.trackTutorialStart).toBe("function");
      expect(typeof coreExports.trackSectionView).toBe("function");
      expect(typeof coreExports.trackSectionComplete).toBe("function");
      expect(typeof coreExports.trackTutorialComplete).toBe("function");
      expect(typeof coreExports.trackTutorialNavigation).toBe("function");
      expect(typeof coreExports.trackTimeSpent).toBe("function");
    });

    it("exports all consent management functions", () => {
      expect(typeof coreExports.loadConsent).toBe("function");
      expect(typeof coreExports.saveConsent).toBe("function");
      expect(typeof coreExports.clearConsent).toBe("function");
      expect(typeof coreExports.createAcceptAllConsent).toBe("function");
      expect(typeof coreExports.createDeclineAnalyticsConsent).toBe("function");
      expect(typeof coreExports.updateConsentCategory).toBe("function");
      expect(typeof coreExports.needsRePrompt).toBe("function");
      expect(typeof coreExports.getConsentFromCookie).toBe("function");
      expect(typeof coreExports.isDoNotTrackEnabled).toBe("function");
      expect(typeof coreExports.isStorageAvailable).toBe("function");
      expect(typeof coreExports.isValidConsentState).toBe("function");
    });

    it("exports consent constants", () => {
      expect(typeof coreExports.CONSENT_COOKIE_NAME).toBe("string");
      expect(typeof coreExports.CONSENT_STORAGE_KEY).toBe("string");
      expect(typeof coreExports.CONSENT_VERSION).toBe("number");
    });
  });

  describe("react exports (@vllnt/analytics/react)", () => {
    it("exports AnalyticsProvider component", () => {
      expect(typeof reactExports.AnalyticsProvider).toBe("function");
    });

    it("exports hooks", () => {
      expect(typeof reactExports.useAnalytics).toBe("function");
      expect(typeof reactExports.useConsent).toBe("function");
    });

    it("re-exports initAnalytics for convenience", () => {
      expect(typeof reactExports.initAnalytics).toBe("function");
    });
  });
});
