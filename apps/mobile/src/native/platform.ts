/** Native adapters for the core ports. Keep all react-native/expo imports here or in screens. */
import { install } from "react-native-quick-crypto";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import * as Application from "expo-application";
import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { makeHttp, SESSION_KEY } from "../core/http";
import { codeFromRedirect, makePkce } from "../core/pkce";
import type { KV } from "../core/types";

install(); // WebCrypto (subtle, getRandomValues) backed by native OpenSSL – required by blindrsa-ts.

export const API_BASE: string = (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase ?? "https://geopoll-demo.vercel.app";
export const APP_VERSION: string = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.0.0";
export const PLATFORM: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";

/** iOS Keychain (Secure Enclave-protected key class) / Android Keystore. Not synced to iCloud, not in backups. */
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const safeKey = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "_");
export const secureKV: KV = {
  get: (k) => SecureStore.getItemAsync(safeKey(k), opts),
  set: (k, v) => SecureStore.setItemAsync(safeKey(k), v, opts),
  del: (k) => SecureStore.deleteItemAsync(safeKey(k), opts),
};
export const http = makeHttp(API_BASE, secureKV);

export async function isOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return s.isConnected !== false && s.isInternetReachable !== false;
}
export const onReconnect = (fn: () => void) => NetInfo.addEventListener((s) => { if (s.isConnected && s.isInternetReachable !== false) fn(); });

// --- biometric lock ---
export const LOCK_PREF = "gp.pref.biolock";
export async function biometricAvailable(): Promise<boolean> {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}
export async function unlock(reason: string): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, disableDeviceFallback: false });
  return r.success;
}

// --- Google sign-in via the existing web backend (system auth session, PKCE-style handoff) ---
export async function signIn(): Promise<boolean> {
  const { verifier, challenge } = await makePkce();
  const res = await WebBrowser.openAuthSessionAsync(`${API_BASE}/api/auth/mobile?cc=${challenge}`, "geopoll://auth", { preferEphemeralSession: false });
  if (res.type !== "success") return false;
  const code = codeFromRedirect(res.url);
  if (!code) return false;
  const r = await http("/api/auth/mobile/exchange", { method: "POST", body: { code, verifier } });
  const token = (r.json as { token?: string } | null)?.token;
  if (r.status !== 200 || !token) return false;
  await secureKV.set(SESSION_KEY, token);
  return true;
}
export const signOut = () => secureKV.del(SESSION_KEY);
export const isSignedIn = async () => !!(await secureKV.get(SESSION_KEY));

// --- push-ready: permission + token only on explicit opt-in; NOT sent to any server yet (no backend endpoint). ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});
export async function enablePush(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return "permission-only"; // EAS project not linked yet (needs EXPO_TOKEN / `eas init`)
  try { return (await Notifications.getExpoPushTokenAsync({ projectId })).data; } catch { return null; }
}
