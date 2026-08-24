import { Storage } from "@apps-in-toss/web-framework";

const FAVORITES_KEY = "summer-song:favorites:v1";

export async function loadFavoriteSongIds() {
  const storedValue = await readStoredValue();
  if (storedValue == null) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    if (Array.isArray(parsedValue)) {
      return parsedValue.filter((value): value is string => typeof value === "string");
    }
  } catch {
    return [];
  }

  return [];
}

export async function saveFavoriteSongIds(songIds: string[]) {
  const value = JSON.stringify(songIds);

  try {
    await Storage.setItem(FAVORITES_KEY, value);
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FAVORITES_KEY, value);
      return;
    }
    throw new Error("Storage is not available");
  }
}

async function readStoredValue() {
  try {
    return await Storage.getItem(FAVORITES_KEY);
  } catch {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(FAVORITES_KEY);
    }
    return null;
  }
}
