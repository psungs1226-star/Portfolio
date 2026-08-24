import { getSchemeUri } from "@apps-in-toss/web-framework";
import type { Referrer } from "./analytics";

export function getNormalizedReferrer(): Referrer {
  const rawReferrer = getRawReferrer();

  if (rawReferrer == null || rawReferrer === "") {
    return "direct";
  }

  if (rawReferrer === "share_song" || rawReferrer === "share_playlist") {
    return rawReferrer;
  }

  if (rawReferrer === "challenge_surface") {
    return "challenge_surface";
  }

  return "unknown";
}

function getRawReferrer() {
  const searchReferrer = new URLSearchParams(window.location.search).get("referrer");
  if (searchReferrer != null) {
    return searchReferrer;
  }

  const hashQuery = window.location.hash.split("?")[1];
  if (hashQuery != null) {
    const hashReferrer = new URLSearchParams(hashQuery).get("referrer");
    if (hashReferrer != null) {
      return hashReferrer;
    }
  }

  try {
    return new URL(getSchemeUri()).searchParams.get("referrer");
  } catch {
    return null;
  }
}

