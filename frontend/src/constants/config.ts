// App-wide constants (routes, storage keys, config).

export const APP = {
  name: "NASUKI",
  tagline: "YOUR LOCAL AI",
  version: "1.0",
} as const;

export const STORAGE_KEYS = {
  onboardingComplete: "nasuki.onboarding.complete",
  authUser: "nasuki.auth.user",
  themeMode: "nasuki.theme.mode",
} as const;

// 1 credit = 20 messages (from Figma Home card).
export const CREDITS = {
  messagesPerCredit: 20,
  rewardPerAd: 5,
  starting: 100,
} as const;

// Backend base URL (never hardcode). All auth calls go to `${API_BASE}/api/...`.
export const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

// Development-only demo login. Production builds must set this to false.
export const DEV_AUTH_ENABLED = process.env.EXPO_PUBLIC_DEV_AUTH_ENABLED === "true";

// Secure-storage key for the backend session token (Keychain, never SQLite).
export const SESSION_TOKEN_KEY = "nasuki.session.token";
// Persisted active user id (non-secret) so we can restore the local profile fast.
export const ACTIVE_USER_KEY = "nasuki.active.user.id";
