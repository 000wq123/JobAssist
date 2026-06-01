import { describe, it, expect, vi } from "vitest";
import useAuthStore from "../src/hooks/useAuthStore";

describe("useAuthStore", () => {
  it("boots with null token when sessionStorage is empty", () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isHydrated).toBe(true);
    expect(state.isBooting).toBe(true);
  });

  it("login sets token and clears user", () => {
    useAuthStore.getState().login("test-token");
    expect(useAuthStore.getState().token).toBe("test-token");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setAccessToken updates token only", () => {
    useAuthStore.getState().setAccessToken("new-token");
    expect(useAuthStore.getState().token).toBe("new-token");
  });

  it("logout clears everything", () => {
    useAuthStore.getState().login("test-token");
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setUser stores user object", () => {
    const user = { id: 1, email: "test@example.com" };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("setBooting toggles boot state", () => {
    useAuthStore.getState().setBooting(false);
    expect(useAuthStore.getState().isBooting).toBe(false);
    useAuthStore.getState().setBooting(true);
    expect(useAuthStore.getState().isBooting).toBe(true);
  });
});
