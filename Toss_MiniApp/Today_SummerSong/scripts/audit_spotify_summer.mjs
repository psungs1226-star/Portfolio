import fs from "node:fs";

const playlistIds = [
  "7pP6gSb8vMsFSGx4T1QHY0",
  "1cOmrSwyIwmnLTDo0cHrGZ",
  "0qsoSU5k8DURNv64YxWU2O",
  "0n57vf7EqIOew4XD4zOQt8",
  "4P91GWre5DqJt93x4dCCYb",
];

const normalize = (value) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\([^)]*(?:version|ver\.|feat\.|english|japanese)[^)]*\)/g, "")
    .replace(/[^a-z0-9가-힣]/g, "");

const decode = (value) => JSON.parse(`"${value}"`);

const playlistTracks = [];
for (const id of playlistIds) {
  const response = await fetch(`https://open.spotify.com/embed/playlist/${id}`);
  const html = await response.text();
  const pattern = /"title":"((?:\\.|[^"])*)","subtitle":"((?:\\.|[^"])*)"/g;
  for (const match of html.matchAll(pattern)) {
    playlistTracks.push({ title: decode(match[1]), artist: decode(match[2]), playlistId: id });
  }
}

const allSongs = JSON.parse(fs.readFileSync("data/summer-songs.filtered.json", "utf8"));
const rawCandidates = JSON.parse(fs.readFileSync("data/summer-video-candidates.raw.json", "utf8"));
const byTitle = new Map();
for (const song of allSongs) {
  const key = normalize(song.title);
  if (!byTitle.has(key)) byTitle.set(key, []);
  byTitle.get(key).push(song);
}

const matched = [];
const unmatched = [];
const seen = new Set();
for (const track of playlistTracks) {
  const titleKey = normalize(track.title);
  const candidates = byTitle.get(titleKey) ?? allSongs.filter((song) => {
    const candidateKey = normalize(song.title);
    return titleKey.length >= 5 && (candidateKey.includes(titleKey) || titleKey.includes(candidateKey));
  });
  const artistKey = normalize(track.artist).slice(0, 5);
  const song = candidates.find((candidate) => normalize(candidate.artist).includes(artistKey)) ?? candidates[0];
  if (song && !seen.has(song.videoId)) {
    seen.add(song.videoId);
    matched.push({ ...song, evidence: track.playlistId });
  } else if (!song) {
    unmatched.push(track);
  }
}

const rawMatched = [];
for (const track of unmatched) {
  const titleKey = normalize(track.title);
  const artistTokens = track.artist.split(/[,/&]/).map(normalize).filter((value) => value.length >= 3);
  const candidate = rawCandidates.find((raw) => {
    const rawKey = normalize(raw.rawTitle ?? "");
    return titleKey.length >= 5 && rawKey.includes(titleKey) && artistTokens.some((artist) => rawKey.includes(artist));
  });
  if (candidate && !seen.has(candidate.videoId)) {
    seen.add(candidate.videoId);
    rawMatched.push({ ...track, videoId: candidate.videoId, rawTitle: candidate.rawTitle });
  }
}

console.log(JSON.stringify({ playlistTracks: playlistTracks.length, matched: matched.length, rawMatched: rawMatched.length }, null, 2));
console.log(matched.map((song) => `${song.id}\t${song.title}\t${song.artist}`).join("\n"));
console.log(rawMatched.map((song) => `NEW\t${song.title}\t${song.artist}\t${song.videoId}`).join("\n"));
