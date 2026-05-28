import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "../src/pages/SettingsPage.jsx";
import { renderWithProviders } from "./render.jsx";

const mockGetProfile = vi.fn();
const mockGetPreferences = vi.fn();
const mockUpdateProfile = vi.fn();
const mockUpdatePreferences = vi.fn();
const mockDeleteAccount = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockSetLanguage = vi.fn();
const mockReleaseLanguageLock = vi.fn();

vi.mock("../src/services/api", () => ({
  settingsApi: {
    getProfile: (...args) => mockGetProfile(...args),
    getPreferences: (...args) => mockGetPreferences(...args),
    updateProfile: (...args) => mockUpdateProfile(...args),
    updatePreferences: (...args) => mockUpdatePreferences(...args),
  },
  authApi: {
    deleteAccount: (...args) => mockDeleteAccount(...args),
  },
}));

vi.mock("../src/context/I18nContext", () => ({
  useI18n: () => ({
    t: (key) =>
      ({
        "settings.title": "Einstellungen",
        "settings.description": "Verwalte deine Einstellungen",
        "settings.savePreferences": "Einstellungen speichern",
        "settings.appPreferences": "App-Einstellungen",
        "settings.currency": "Währung",
        "settings.language": "Sprache",
        "settings.location": "Standort",
        "settings.jobSearchPreferences": "Jobsuche",
        "common.loading": "Lädt...",
      })[key] || key,
    setLanguage: mockSetLanguage,
    releaseLanguageLock: mockReleaseLanguageLock,
  }),
}));

vi.mock("../src/hooks/useAuthStore", () => ({
  default: (selector) => selector({ logout: mockLogout, user: { language: "de" } }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
  },
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.setItem(
      "profile",
      JSON.stringify({
        desired_locations: ["Wien"],
        salary_min: 30,
        salary_max: 50,
        job_types: [],
        industries: [],
        experience_level: "",
        is_open_to_relocation: false,
        avatar: null,
      }),
    );
    localStorage.setItem(
      "preferences",
      JSON.stringify({
        currency: "EUR",
        location: "Österreich",
        language: "de",
      }),
    );
    mockGetProfile.mockResolvedValue({ data: JSON.parse(localStorage.getItem("profile")) });
    mockGetPreferences.mockResolvedValue({ data: JSON.parse(localStorage.getItem("preferences")) });
    mockUpdateProfile.mockReset();
    mockUpdatePreferences.mockReset();
    mockDeleteAccount.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
    mockNavigate.mockReset();
    mockLogout.mockReset();
    mockSetLanguage.mockReset();
    mockReleaseLanguageLock.mockReset();
  });

  it("submits profile and preferences updates and shows one success toast", async () => {
    mockUpdateProfile.mockResolvedValue({ data: {} });
    mockUpdatePreferences.mockResolvedValue({ data: {} });

    renderWithProviders(<SettingsPage />);

    // The standalone "Suchregion" / language / currency controls were
    // removed (single-option dropdowns + a duplicate of Arbeitsorte).
    // Change a still-rendered preference instead — the desired-locations
    // text input — to verify the save flow.
    const locationsInput = await screen.findByDisplayValue("Wien");
    fireEvent.change(locationsInput, { target: { value: "Wien, Graz" } });

    await userEvent.click(screen.getByRole("button", { name: "Einstellungen speichern" }));

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledTimes(1);
      expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    });

    // Preferences are still saved (location/language/currency carried from
    // the loaded defaults), even though the user can't edit them here.
    expect(mockUpdatePreferences.mock.calls[0][0]).toMatchObject({
      currency: "EUR",
      language: "de",
    });
    expect(mockUpdateProfile.mock.calls[0][0]).toMatchObject({
      desired_locations: ["Wien", "Graz"],
    });
    expect(mockSuccess).toHaveBeenCalledWith("Einstellungen speichern ✓");
    expect(mockReleaseLanguageLock).toHaveBeenCalled();
  });

  it("deletes the account after password confirmation and redirects to login", async () => {
    mockUpdateProfile.mockResolvedValue({ data: {} });
    mockUpdatePreferences.mockResolvedValue({ data: {} });
    mockDeleteAccount.mockResolvedValue({ data: {} });

    renderWithProviders(<SettingsPage />);

    // Danger-zone trigger button was renamed from "Konto endgültig löschen"
    // to the shorter "Konto löschen" while the confirm CTA inside the modal
    // remained "Unwiderruflich löschen".
    await userEvent.click(await screen.findByRole("button", { name: /^Konto löschen$/i }));
    // Password placeholder in the danger-zone modal was reworded.
    await userEvent.type(screen.getByPlaceholderText("Aktuelles Passwort eingeben"), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Unwiderruflich löschen" }));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith("Password1");
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
    expect(mockSuccess).toHaveBeenCalledWith("Konto wurde gelöscht");
  });
});
