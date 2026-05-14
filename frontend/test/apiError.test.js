import { test, expect } from "vitest";

import { getApiErrorMessage } from "../src/utils/apiError.js";

test("returns network fallback when no response exists", () => {
  const result = getApiErrorMessage(new Error("network"));
  expect(result).toBe("Server nicht erreichbar. Bitte prüfe API-URL, Domain und CORS-Konfiguration.");
});

test("returns string detail when backend sends plain detail", () => {
  const result = getApiErrorMessage({
    response: {
      data: {
        detail: "Ungültige E-Mail-Adresse oder Passwort",
      },
    },
  });

  expect(result).toBe("Ungültige E-Mail-Adresse oder Passwort");
});

test("returns first validation message when detail is an array", () => {
  const result = getApiErrorMessage({
    response: {
      data: {
        detail: [
          { msg: "Passwort muss mindestens 8 Zeichen lang sein" },
          { msg: "zweite Meldung" },
        ],
      },
    },
  });

  expect(result).toBe("Passwort muss mindestens 8 Zeichen lang sein");
});

test("returns nested detail.message when present", () => {
  const result = getApiErrorMessage({
    response: {
      data: {
        detail: {
          message: "Bitte bestätige zuerst deine E-Mail-Adresse",
        },
      },
    },
  });

  expect(result).toBe("Bitte bestätige zuerst deine E-Mail-Adresse");
});

test("returns data.error string when detail is absent", () => {
  const result = getApiErrorMessage(
    {
      response: {
        data: {
          error: "usage_limit",
        },
      },
    },
    "fallback",
  );

  expect(result).toBe("usage_limit");
});

test("returns explicit fallback when nothing useful exists", () => {
  const result = getApiErrorMessage(
    {
      response: {
        data: {},
      },
    },
    "Eigene Fallback-Meldung",
  );

  expect(result).toBe("Eigene Fallback-Meldung");
});
