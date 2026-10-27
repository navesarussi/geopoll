// Guard (bug-learnings #1): evaluate the full app module graph (index.ts → App.tsx → src/native/platform)
// with native modules mocked, so a throw at module-load time fails CI instead of crashing on device.
import { describe, expect, it, vi } from "vitest";

const { RN, registerRootComponent } = vi.hoisted(() => ({ registerRootComponent: vi.fn(), RN: () => {
  const C = (name: string) => Object.assign(() => null, { displayName: name });
  return {
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default },
    StyleSheet: { create: <T,>(s: T) => s, hairlineWidth: 1 },
    AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
    Linking: { openURL: vi.fn(), addEventListener: () => ({ remove() {} }) },
    I18nManager: { isRTL: false, allowRTL() {}, forceRTL() {} },
    ActivityIndicator: C("ActivityIndicator"), Pressable: C("Pressable"), SafeAreaView: C("SafeAreaView"),
    ScrollView: C("ScrollView"), Switch: C("Switch"), Text: C("Text"), TextInput: C("TextInput"), View: C("View"),
  };
} }));
vi.mock("react-native", RN);
vi.mock("@sentry/react-native", () => ({ init: vi.fn(), wrap: (c: unknown) => c, captureException: vi.fn() }));
vi.mock("react-native-quick-crypto", () => ({ install: vi.fn() }));
vi.mock("expo-secure-store", () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1, getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));
vi.mock("expo-local-authentication", () => ({ hasHardwareAsync: vi.fn(), isEnrolledAsync: vi.fn(), authenticateAsync: vi.fn() }));
vi.mock("expo-notifications", () => ({ requestPermissionsAsync: vi.fn(), getExpoPushTokenAsync: vi.fn(), setNotificationHandler: vi.fn() }));
vi.mock("expo-web-browser", () => ({ openAuthSessionAsync: vi.fn(), maybeCompleteAuthSession: vi.fn() }));
vi.mock("expo-application", () => ({ nativeApplicationVersion: "0.1.0" }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { version: "0.1.0", extra: {} } } }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("@react-native-community/netinfo", () => ({ default: { fetch: vi.fn(), addEventListener: () => () => {} } }));
vi.mock("expo", () => ({ registerRootComponent }));

describe("module graph loads without throwing", () => {
  it("App.tsx evaluates and exports a component", async () => {
    const mod = await import("../App");
    expect(typeof mod.default).toBe("function");
  });
  it("index.ts evaluates and registers a root component", async () => {
    // Note: under vitest, index.ts's CJS require("./App") can't resolve .tsx, so it takes the FatalScreen path;
    // App itself is covered by the test above. Here we only guard that index.ts never throws and always registers.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await import("../index");
    spy.mockRestore();
    expect(registerRootComponent).toHaveBeenCalledTimes(1);
  });
});
