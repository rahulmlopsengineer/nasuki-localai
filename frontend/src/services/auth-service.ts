// AuthService — real Google auth (Emergent-managed, keyless) + dev-only demo.
// The UI talks ONLY to this service. Tokens live in secure storage, never in
// SQLite and never logged. Local user profile lives in the SQLite users table.

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import {
  ACTIVE_USER_KEY,
  API_BASE,
  CREDITS,
  DEV_AUTH_ENABLED,
  SESSION_TOKEN_KEY,
} from "@/src/constants/config";
import { mockUser } from "@/src/constants/mock-data";
import { bootstrapDatabase, CreditRepository, UserRepository } from "@/src/database";
import { User } from "@/src/types";
import { storage } from "@/src/utils/storage";
import { setActiveUserId } from "./session-context";

WebBrowser.maybeCompleteAuthSession();

const AUTH_PAGE = "https://auth.emergentagent.com/";
const exchanged = new Set<string>();

const extractSessionId = (url: string | null): string | null => {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

const setLocalSession = async (userId: string): Promise<void> => {
  setActiveUserId(userId);
  await storage.setItem(ACTIVE_USER_KEY, userId);
  await CreditRepository.ensureWallet(userId, CREDITS.starting);
};

// Exchange a one-time session_id with our backend for a 7-day session_token.
const exchangeSessionId = async (sessionId: string): Promise<User> => {
  if (exchanged.has(sessionId)) throw new Error("session already used");
  exchanged.add(sessionId);

  const res = await fetch(`${API_BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error("authentication_failed");
  const data = (await res.json()) as {
    session_token: string;
    user: { id: string; email: string; name: string; picture?: string };
  };

  await storage.secureSet(SESSION_TOKEN_KEY, data.session_token);
  const local = await UserRepository.upsertRemote({
    remoteId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    profileImage: data.user.picture,
  });
  await setLocalSession(local.id);
  return local;
};

export const AuthService = {
  /** Open DB + restore any existing session. Returns the restored user or null. */
  async initialize(): Promise<User | null> {
    await bootstrapDatabase();

    // Web: a Google redirect returns with session_id on the URL — handle first.
    if (Platform.OS === "web") {
      const fromUrl = await AuthService.consumeWebRedirect();
      if (fromUrl) return fromUrl;
    }

    // Restore a Google session via stored token.
    const token = await storage.secureGet<string>(SESSION_TOKEN_KEY, "");
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const me = (await res.json()) as {
            id: string;
            email: string;
            name: string;
            picture?: string;
          };
          const local = await UserRepository.upsertRemote({
            remoteId: me.id,
            name: me.name,
            email: me.email,
            profileImage: me.picture,
          });
          await setLocalSession(local.id);
          return local;
        }
        await storage.secureRemove(SESSION_TOKEN_KEY);
      } catch {
        // network offline — fall through to local restore below
      }
    }

    // Restore a local (demo) session, or an offline Google profile, by id.
    const savedId = await storage.getItem<string>(ACTIVE_USER_KEY, "");
    if (savedId) {
      const local = await UserRepository.findById(savedId);
      if (local && (local.isDemoUser || !token || true)) {
        await setLocalSession(local.id);
        return local;
      }
    }
    return null;
  },

  async signInWithGoogle(): Promise<User> {
    const redirectUrl =
      Platform.OS === "web"
        ? `${window.location.origin}/`
        : Linking.createURL("");
    const authUrl = `${AUTH_PAGE}?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      // Full-page navigate; the redirect is processed on next mount.
      window.location.href = authUrl;
      // Never resolves before navigation; keep types happy.
      return new Promise<User>(() => {});
    }

    // Native: listen for the deep link BEFORE opening the browser.
    let linkUrl: string | null = null;
    const sub = Linking.addEventListener("url", (e) => {
      if (!linkUrl) linkUrl = e.url;
    });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      const resultUrl = result.type === "success" ? result.url : null;
      const initial = await Linking.getInitialURL();
      const sessionId =
        extractSessionId(resultUrl) ??
        extractSessionId(linkUrl) ??
        extractSessionId(initial);
      if (!sessionId) throw new Error("sign_in_cancelled");
      return await exchangeSessionId(sessionId);
    } finally {
      sub.remove();
    }
  },

  /** Web-only: consume ?session_id / #session_id from the current URL. */
  async consumeWebRedirect(): Promise<User | null> {
    if (Platform.OS !== "web") return null;
    const sessionId =
      extractSessionId(window.location.hash) ??
      extractSessionId(window.location.search);
    if (!sessionId) return null;
    try {
      const user = await exchangeSessionId(sessionId);
      // Strip only the session_id, preserve everything else.
      const clean = window.location.href
        .replace(/([?#&])session_id=[^&#]+/, "$1")
        .replace(/[?#&]$/, "");
      window.history.replaceState(window.history.state, "", clean);
      return user;
    } catch {
      return null;
    }
  },

  async signInWithDemo(): Promise<User> {
    if (!DEV_AUTH_ENABLED) throw new Error("demo_login_disabled");
    const user = await UserRepository.ensureDemoUser({
      name: mockUser.name,
      email: mockUser.email,
    });
    await setLocalSession(user.id);
    return user;
  },

  async signOut(): Promise<void> {
    // Local cleanup only — never delete the user's local data on logout.
    const token = await storage.secureGet<string>(SESSION_TOKEN_KEY, "");
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* ignore network errors on logout */
      }
    }
    await storage.secureRemove(SESSION_TOKEN_KEY);
    await storage.removeItem(ACTIVE_USER_KEY);
    setActiveUserId(null);
  },

  async getCurrentUser(): Promise<User | null> {
    const id = await storage.getItem<string>(ACTIVE_USER_KEY, "");
    return id ? UserRepository.findById(id) : null;
  },

  async isAuthenticated(): Promise<boolean> {
    return (await AuthService.getCurrentUser()) !== null;
  },

  async refreshSession(): Promise<User | null> {
    return AuthService.initialize();
  },
};
