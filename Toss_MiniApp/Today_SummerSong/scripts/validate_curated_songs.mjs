import fs from "node:fs";

const songs = JSON.parse(fs.readFileSync("src/data/curatedSongs.json", "utf8"));
const normalize = (value) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const invalid = [];
const mismatched = [];
const verifiedTitleVariants = new Set(["C3diP5kT6HI", "7g3x1LMnRVw", "MthLgPs7oU4", "UsvoDgmfUwc"]);
const allowedMoods = new Set(["상큼발랄", "청량시원", "설렘두근", "센치감성"]);
const allowedMoments = new Set(["바다", "드라이브", "밤바다", "비오는날"]);

for (let index = 0; index < songs.length; index += 20) {
  const batch = songs.slice(index, index + 20);
  await Promise.all(batch.map(async (song) => {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${song.videoId}&format=json`);
    if (!response.ok) {
      invalid.push(song);
      return;
    }
    const metadata = await response.json();
    const expected = normalize(song.title).slice(0, 10);
    const actual = normalize(metadata.title);
    if (expected.length >= 5 && !actual.includes(expected) && !verifiedTitleVariants.has(song.videoId)) {
      mismatched.push({ song: `${song.title} — ${song.artist}`, videoTitle: metadata.title, videoId: song.videoId });
    }
  }));
}

const count = (values) => values.reduce((result, value) => {
  result[value] = (result[value] ?? 0) + 1;
  return result;
}, {});

console.log(JSON.stringify({
  songs: songs.length,
  uniqueVideos: new Set(songs.map((song) => song.videoId)).size,
  uniqueTracks: new Set(songs.map((song) => `${song.title}|${song.artist}`)).size,
  moods: count(songs.map((song) => song.mood)),
  moments: count(songs.flatMap((song) => song.moments)),
  untaggedMoments: songs.filter((song) => song.moments.length === 0).length,
  invalidVideos: invalid.length,
  possibleMismatches: mismatched.length,
  invalidMoodTags: songs.filter((song) => !allowedMoods.has(song.mood)).length,
  invalidMomentTags: songs.filter((song) => song.moments.some((moment) => !allowedMoments.has(moment))).length,
  missingSelectionBasis: songs.filter((song) => !song.selectionBasis).length,
}, null, 2));
if (invalid.length) console.log("INVALID", invalid);
if (mismatched.length) console.log("MISMATCH", mismatched);

const uniqueVideos = new Set(songs.map((song) => song.videoId)).size;
const uniqueTracks = new Set(songs.map((song) => `${normalize(song.title)}|${normalize(song.artist)}`)).size;
const invalidTags = songs.some((song) => !allowedMoods.has(song.mood) || song.moments.length === 0 || song.moments.some((moment) => !allowedMoments.has(moment)) || !song.selectionBasis);
if (songs.length !== 200 || uniqueVideos !== 200 || uniqueTracks !== 200 || invalid.length || mismatched.length || invalidTags) {
  process.exitCode = 1;
}
