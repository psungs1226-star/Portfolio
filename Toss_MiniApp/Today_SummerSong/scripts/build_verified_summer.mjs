import fs from "node:fs";
import { execFileSync } from "node:child_process";

const playlistIds = [
  "7pP6gSb8vMsFSGx4T1QHY0",
  "1cOmrSwyIwmnLTDo0cHrGZ",
  "0qsoSU5k8DURNv64YxWU2O",
  "0n57vf7EqIOew4XD4zOQt8",
  "4P91GWre5DqJt93x4dCCYb",
];
const normalize = (value) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const decode = (value) => JSON.parse(`"${value}"`);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const videoOverrides = new Map([
  [normalize("I'm the One (feat. Justin Bieber, Quavo, Chance the Rapper & Lil Wayne)"), "weeI1G46q0o"],
]);
const yearOverrides = new Map([
  [normalize("Sugar|Maroon 5"), 2014],
  [normalize("Closer|The Chainsmokers, Halsey"), 2016],
  [normalize("Rockabye (feat. Sean Paul & Anne-Marie)|Clean Bandit, Sean Paul, Anne-Marie"), 2016],
  [normalize("On The Floor|Jennifer Lopez, Pitbull"), 2011],
  [normalize("Rude|MAGIC!"), 2013],
  [normalize("Wake Me Up - Radio Edit|Avicii"), 2013],
]);

const allSongs = JSON.parse(fs.readFileSync("data/summer-songs.filtered.json", "utf8"));
const rawCandidates = JSON.parse(fs.readFileSync("data/summer-video-candidates.raw.json", "utf8"));
const tracks = [];
for (const playlistId of playlistIds) {
  const html = await (await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`)).text();
  const pattern = /"uri":"spotify:track:([^"]+)".*?"title":"((?:\\.|[^"])*)","subtitle":"((?:\\.|[^"])*)"/g;
  for (const match of html.matchAll(pattern)) {
    tracks.push({ spotifyId: match[1], title: decode(match[2]), artist: decode(match[3]), playlistId });
  }
}

const uniqueTracks = [];
const trackKeys = new Set();
for (const track of tracks) {
  const key = `${normalize(track.title)}|${normalize(track.artist)}`;
  if (!trackKeys.has(key)) {
    trackKeys.add(key);
    uniqueTracks.push(track);
  }
}

const globalPlaylistId = "5V3xyKn3muR2hlcrGmveuj";
const globalHtml = await (await fetch(`https://open.spotify.com/embed/playlist/${globalPlaylistId}`)).text();
const globalTracks = [];
const globalPattern = /"uri":"spotify:track:([^"]+)".*?"title":"((?:\\.|[^"])*)","subtitle":"((?:\\.|[^"])*)"/g;
for (const match of globalHtml.matchAll(globalPattern)) {
  globalTracks.push({ spotifyId: match[1], title: decode(match[2]), artist: decode(match[3]), playlistId: globalPlaylistId });
}
const candidateTracks = [...globalTracks.slice(0, 40), ...uniqueTracks];

const findLocal = (track) => {
  const title = normalize(track.title);
  const artist = normalize(track.artist).slice(0, 5);
  const candidates = allSongs.filter((song) => {
    const songTitle = normalize(song.title);
    return songTitle === title || (title.length >= 5 && (songTitle.includes(title) || title.includes(songTitle)));
  });
  return candidates.find((song) => normalize(song.artist).includes(artist));
};

const findRaw = (track) => {
  const title = normalize(track.title);
  const artists = track.artist.split(/[,/&]/).map(normalize).filter((value) => value.length >= 3);
  return rawCandidates.find((candidate) => {
    const raw = normalize(candidate.rawTitle ?? "");
    return title.length >= 5 && raw.includes(title) && artists.some((artist) => raw.includes(artist));
  });
};

const fetchYoutube = async (track) => {
  const override = videoOverrides.get(normalize(track.title));
  if (override) return override;
  const query = encodeURIComponent(`${track.artist} ${track.title} official audio`);
  const html = execFileSync("curl", ["-fsSL", `https://www.youtube.com/results?search_query=${query}`], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)?.[1] ?? null;
};

const fetchYear = async (spotifyId) => {
  try {
    const html = await (await fetch(`https://open.spotify.com/embed/track/${spotifyId}`)).text();
    return Number(html.match(/releaseDate":\{"isoString":"(\d{4})-/)?.[1] ?? 2020);
  } catch {
    return 2020;
  }
};

const sentimentalTitles = new Set([
  "why so lonely", "slow down", "starry night", "cry for me", "ghost", "don't wanna cry",
  "sunset", "heart burn", "rooftop", "season of memories", "hurt locker", "the answer",
  "lay back", "lonely summer", "hot summer nights", "alldaylong",
].map(normalize));
const romanticTitles = new Set([
  "how sweet", "bubble gum", "magnetic", "what is love", "fancy", "back for more", "somebody",
  "love, money, fame", "always", "lucky girl syndrome", "as if it's your last", "eyes on you",
  "don't need your love", "oh my!", "honeymoon", "love bomb", "love scenario", "loving u", "love u",
  "loveade", "why don't you know", "heart attack", "darling", "want you to say", "the feels",
  "fancy", "only one", "babe", "really", "really really", "nice guy", "lucky girl syndrome",
].map(normalize));

const classifyMood = (title) => {
  const value = normalize(title);
  if (sentimentalTitles.has(value) || /rain|비|장마|lonely|slow|sunset|그리움/.test(value)) return "센치감성";
  if (romanticTitles.has(value) || /love|heart|sweet|cupid|romance|설렘/.test(value)) return "설렘두근";
  if (/summer|여름|sea|바다|surf|wave|ocean|pool|swim|tropical|breeze|cool|island|bahama|vacation|holiday|airplane|tide|aloha|alcoholfree|rollin|view|sticky|supersonic|travel|highway|eternalsunshine|utopia|dreamers|shine|kokobop|supernatural|rollercoaster|surfin|getcool|wego|play|woowoo|boogieup|bungee|umpahumpah|nonstop|holahola|chimatbaram|poongdung|icecream|juicy|foreveryoung|leftright|sunshine|california|boardwalk|beach/.test(value)) return "청량시원";
  return "상큼발랄";
};

const classifyMoments = (title) => {
  const value = normalize(title);
  if (/rain|비|장마/.test(value)) return ["비오는날"];
  if (/night|밤|sunset|moon|starry|lonely|slowdown|heartburn|closer|havana|itookapillinibiza|newrules|alldaylong|cruel summer/.test(value)) return ["밤바다"];
  if (/sea|바다|surf|wave|ocean|pool|swim|island|bahama|tropical|beach|summer|summertime|sunshine|california|boardwalk|alcoholfree|dancethenightaway|kokobop|sticky|rollin|summercomes|sunnysummer|chimatbaram|umpahumpah|bungee/.test(value)) return ["바다"];
  if (/travel|여행|vacation|holiday|airplane|highway|drive|roadtrip|view|foreveryoung|leftright|wego|reallyreally|play|shapeofyou|uptownfunk|leanon|shakeitoff|rockabye|workfromhome|sunflower|thisiswhatyoucamefor|onthefloor|wakemeup|senorita|cheapthrills|callmemaybe|24kmagic|adventureofalifetime|timber|firework|after school|thefeels/.test(value)) return ["드라이브"];
  return [];
};

const femaleGroups = [
  "twice", "idle", "aespa", "itzy", "gfriend", "ohmygirl", "blackpink", "bravegirls", "stayc",
  "illit", "wjsn", "weeekly", "tribe", "dreamcatcher", "rocketpunch", "newjeans", "izone",
  "redvelvet", "momoland", "fromis9", "kissoflife", "wondergirls", "cignature", "cherrybullet",
  "dia", "aoa", "girl'sday", "playback", "wekimiki", "viviz", "niziu", "vcha", "wooah",
];
const maleGroups = [
  "ateez", "seventeen", "exo", "shinee", "nct", "tomorrowxtogether", "txt", "straykids", "enhypen",
  "winner", "pentagon", "astro", "bap", "sf9", "ikon", "ab6ix", "nuest", "verivery", "theboyz",
  "boynextdoor", "bss", "x1", "bae173", "omegax", "ampersone",
];
const soloArtists = [
  "chungha", "hyolyn", "sunmi", "iu", "joy", "jeonsomi", "taeyeon", "bol4", "psy", "jennie",
  "nayeon", "hyuna", "daedo", "alexa", "soojin", "key",
];
const classifyGroup = (track, local) => {
  if (track.playlistId === globalPlaylistId) return "기타";
  const artist = normalize(track.artist);
  if (femaleGroups.some((name) => artist.includes(normalize(name)))) return "여돌";
  if (maleGroups.some((name) => artist.includes(normalize(name)))) return "남돌";
  if (soloArtists.some((name) => artist.includes(normalize(name)))) return "솔로";
  return local?.group ?? "기타";
};

const songs = [];
const videoIds = new Set();
const rainSongs = allSongs
  .filter((song) => /rain|비 오는|비가 오는|장마/.test(song.title.toLowerCase()))
  .filter((song) => !/(instrumental|the k-pop|1thek)/i.test(`${song.title} ${song.artist}`))
  .slice(0, 15);
for (const [index, song] of rainSongs.entries()) {
  videoIds.add(song.videoId);
  songs.push({
    ...song,
    id: `R${String(index + 1).padStart(3, "0")}`,
    mood: "센치감성",
    moments: ["비오는날"],
    evidenceUrl: `https://youtu.be/${song.videoId}`,
  });
}
for (let index = 0; index < candidateTracks.length && songs.length < 200; index += 10) {
  const batch = candidateTracks.slice(index, index + 10);
  const resolved = await Promise.all(batch.map(async (track) => {
    const local = findLocal(track);
    const raw = local ? null : findRaw(track);
    const videoId = local?.videoId ?? raw?.videoId ?? await fetchYoutube(track);
    if (!videoId) return null;
    const year = yearOverrides.get(normalize(`${track.title}|${track.artist}`)) ?? local?.year ?? await fetchYear(track.spotifyId);
    return {
      id: `C${String(index + batch.indexOf(track) + 1).padStart(3, "0")}`,
      title: track.title,
      artist: track.artist,
      year,
      mood: classifyMood(track.title),
      moments: classifyMoments(track.title),
      group: classifyGroup(track, local),
      videoId,
      evidenceUrl: `https://open.spotify.com/playlist/${track.playlistId}`,
    };
  }));
  for (const song of resolved) {
    if (song && !videoIds.has(song.videoId)) {
      videoIds.add(song.videoId);
      songs.push(song);
      if (songs.length === 200) break;
    }
  }
  await delay(100);
}

if (songs.length < 200) throw new Error(`Only ${songs.length} verified songs were resolved`);
fs.writeFileSync("src/data/curatedSongs.json", `${JSON.stringify(songs, null, 2)}\n`);
console.log(JSON.stringify({ songs: songs.length, playlists: playlistIds.length }, null, 2));
