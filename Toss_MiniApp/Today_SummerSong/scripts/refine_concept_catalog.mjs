import fs from "node:fs";
import { execFileSync } from "node:child_process";

const normalize = (value) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const songs = JSON.parse(fs.readFileSync("src/data/curatedSongs.json", "utf8"));
const officialVideoOverrides = new Map([
  [normalize("I Swear|SISTAR"), "8PrNPhVexE4"],
  [normalize("You Better Know|Red Velvet"), "86suvlS1pGM"],
  [normalize("Cheerleader (Felix Jaehn Remix)|OMI"), "jGflUbPQfW8"],
  [normalize("This Girl|Kungs vs Cookin' on 3 Burners"), "2Y6Nne8RvaA"],
]);

// Generic chart hits and idol tracks without a clear summer scene are intentionally excluded.
const excluded = new Set([
  "비 오는 날 듣기 좋은 노래 (Rain Song) ft. Colde", "여름비 (SUMMER RAIN)",
  "Roar", "Sorry", "Girls Like You", "New Rules", "The Lazy Song", "Love Again",
  "All About That Bass", "That's What I Like", "APT.", "Side To Side", "What Do You Mean?",
  "Don't Let Me Down", "Dance Monkey", "Bang Bang", "Ring Ring", "Let Me Love You", "Señorita",
  "Thrift Shop (feat. Wanz)", "I'm the One (feat. Justin Bieber, Quavo, Chance the Rapper & Lil Wayne)",
  "Swalla (feat. Nicki Minaj & Ty Dolla $ign)", "Hips Don't Lie (feat. Wyclef Jean)",
  "DND (feat.BM of KARD)", "EASY", "No Biggie", "LIFTED", "WISH", "Loca", "It Is Said",
  "Purple", "Poppin' Shakin'", "AYAYAYA", "Take a picture", "I'm Not in Love with You",
  "TENNIS (0:0)", "SAY MY NAME", "UNNATURAL", "Only One", "Boys Like You", "Still Here",
  "HOT", "VIBE (feat. Jimin of BTS)", "ERASE ME", "Macarena", "Gangnam Style (강남스타일)",
  "Like Magic", "Wonderland (From “American Song Contest”)", "RINGO", "MOVE (T5)", "HIP",
  "On And On", "KILLA", "FLASH", "O Sole Mio", "Drink It", "Somebody", "Mantra", "Energetic",
  "Nice Guy", "ROCKY",
].map(normalize));

const additions = [
  ["Touch My Body", "SISTAR", 2014, "청량시원", ["바다"], "여돌"],
  ["Shake It", "SISTAR", 2015, "상큼발랄", ["바다"], "여돌"],
  ["Loving U", "SISTAR", 2012, "설렘두근", ["바다"], "여돌"],
  ["I Swear", "SISTAR", 2014, "청량시원", ["드라이브"], "여돌"],
  ["Darling", "Girl's Day", 2014, "설렘두근", ["바다"], "여돌"],
  ["Heart Attack", "AOA", 2015, "설렘두근", ["바다"], "여돌"],
  ["Remember", "Apink", 2015, "센치감성", ["바다"], "여돌"],
  ["Power Up", "Red Velvet", 2018, "상큼발랄", ["바다"], "여돌"],
  ["Umpah Umpah", "Red Velvet", 2019, "청량시원", ["바다"], "여돌"],
  ["You Better Know", "Red Velvet", 2017, "청량시원", ["드라이브"], "여돌"],
  ["Party", "Girls' Generation", 2015, "청량시원", ["바다"], "여돌"],
  ["Hot Summer", "f(x)", 2011, "청량시원", ["바다"], "여돌"],
  ["Falling in Love", "2NE1", 2013, "설렘두근", ["바다"], "여돌"],
  ["Bubble Pop!", "HyunA", 2011, "상큼발랄", ["바다"], "솔로"],
  ["Heart Burn", "SUNMI", 2022, "센치감성", ["밤바다"], "솔로"],
  ["Island", "WINNER", 2017, "청량시원", ["바다"], "남돌"],
  ["Love Me Love Me", "WINNER", 2017, "설렘두근", ["드라이브"], "남돌"],
  ["Everyday", "WINNER", 2018, "상큼발랄", ["바다"], "남돌"],
  ["Our Dawn Is Hotter Than Day", "SEVENTEEN", 2018, "센치감성", ["밤바다"], "남돌"],
  ["Our Summer", "TOMORROW X TOGETHER", 2019, "청량시원", ["드라이브"], "남돌"],
  ["Highway to Heaven", "NCT 127", 2019, "청량시원", ["드라이브"], "남돌"],
  ["Popping", "ONF", 2021, "청량시원", ["바다"], "남돌"],
  ["Solo Day", "B1A4", 2014, "청량시원", ["드라이브"], "남돌"],
  ["Hola Hola", "KARD", 2017, "청량시원", ["바다"], "그룹"],
  ["Ride on the Wind", "KARD", 2018, "청량시원", ["드라이브"], "그룹"],
  ["Dinosaur", "AKMU", 2017, "센치감성", ["밤바다"], "그룹"],
  ["200%", "AKMU", 2014, "설렘두근", ["드라이브"], "그룹"],
  ["Summer Hate", "ZICO feat. Rain", 2020, "청량시원", ["바다"], "솔로"],
  ["Paradise", "Eric Nam", 2020, "청량시원", ["드라이브"], "솔로"],
  ["Why", "TAEYEON", 2016, "청량시원", ["드라이브"], "솔로"],
  ["Weekend", "TAEYEON", 2021, "상큼발랄", ["드라이브"], "솔로"],
  ["Why Don't You Know", "CHUNG HA feat. Nucksal", 2017, "설렘두근", ["바다"], "솔로"],
  ["Love U", "CHUNG HA", 2018, "설렘두근", ["바다"], "솔로"],
  ["Yacht", "Jay Park feat. Sik-K", 2017, "청량시원", ["바다"], "솔로"],
  ["Hype Boy", "NewJeans", 2022, "설렘두근", ["드라이브"], "여돌"],
  ["Attention", "NewJeans", 2022, "설렘두근", ["드라이브"], "여돌"],
  ["Summer", "Calvin Harris", 2014, "청량시원", ["드라이브"], "기타"],
  ["Watermelon Sugar", "Harry Styles", 2019, "청량시원", ["바다"], "기타"],
  ["Cake by the Ocean", "DNCE", 2015, "상큼발랄", ["바다"], "기타"],
  ["I Ain't Worried", "OneRepublic", 2022, "청량시원", ["바다"], "기타"],
  ["One Kiss", "Calvin Harris & Dua Lipa", 2018, "청량시원", ["드라이브"], "기타"],
  ["Levitating", "Dua Lipa", 2020, "상큼발랄", ["드라이브"], "기타"],
  ["Espresso", "Sabrina Carpenter", 2024, "상큼발랄", ["바다"], "기타"],
  ["Feels", "Calvin Harris", 2017, "청량시원", ["바다"], "기타"],
  ["Slide", "Calvin Harris", 2017, "센치감성", ["밤바다"], "기타"],
  ["Ocean Drive", "Duke Dumont", 2015, "센치감성", ["밤바다"], "기타"],
  ["Firestone", "Kygo feat. Conrad Sewell", 2014, "청량시원", ["드라이브"], "기타"],
  ["Stole the Show", "Kygo feat. Parson James", 2015, "센치감성", ["밤바다"], "기타"],
  ["Waves (Robin Schulz Remix)", "Mr. Probz", 2014, "청량시원", ["바다"], "기타"],
  ["Cheerleader (Felix Jaehn Remix)", "OMI", 2014, "상큼발랄", ["바다"], "기타"],
  ["Rather Be", "Clean Bandit feat. Jess Glynne", 2014, "상큼발랄", ["드라이브"], "기타"],
  ["Are You With Me", "Lost Frequencies", 2014, "청량시원", ["드라이브"], "기타"],
  ["Reality", "Lost Frequencies feat. Janieck Devy", 2015, "청량시원", ["드라이브"], "기타"],
  ["This Girl", "Kungs vs Cookin' on 3 Burners", 2016, "상큼발랄", ["드라이브"], "기타"],
  ["Sunroof", "Nicky Youre & dazy", 2021, "청량시원", ["드라이브"], "기타"],
  ["Heat Waves", "Glass Animals", 2020, "센치감성", ["밤바다"], "기타"],
  ["Walking on a Dream", "Empire of the Sun", 2008, "청량시원", ["드라이브"], "기타"],
  ["The Nights", "Avicii", 2014, "청량시원", ["드라이브"], "기타"],
  ["Good Time", "Owl City & Carly Rae Jepsen", 2012, "상큼발랄", ["드라이브"], "기타"],
  ["Cool for the Summer", "Demi Lovato", 2015, "청량시원", ["바다"], "기타"],
  ["Adventure of a Lifetime", "Coldplay", 2015, "청량시원", ["드라이브"], "기타"],
  ["Despacito", "Luis Fonsi feat. Daddy Yankee", 2017, "청량시원", ["바다"], "기타"],
];

const kept = songs.filter((song) => !excluded.has(normalize(song.title)));
const existing = new Set(kept.map((song) => `${normalize(song.title)}|${normalize(song.artist)}`));
const resolveVideo = ([title, artist]) => {
  const override = officialVideoOverrides.get(normalize(`${title}|${artist}`));
  if (override) return override;
  const query = encodeURIComponent(`${artist} ${title} official music video`);
  const html = execFileSync("curl", ["-fsSL", `https://www.youtube.com/results?search_query=${query}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  return html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)?.[1];
};

for (const item of additions) {
  if (kept.length >= 200) break;
  const [title, artist, year, mood, moments, group] = item;
  const key = `${normalize(title)}|${normalize(artist)}`;
  if (existing.has(key)) continue;
  const videoId = resolveVideo(item);
  if (!videoId || kept.some((song) => song.videoId === videoId)) continue;
  kept.push({ id: `N${String(kept.length + 1).padStart(3, "0")}`, title, artist, year, mood, moments, group, videoId, evidenceUrl: `https://youtu.be/${videoId}` });
  existing.add(key);
}

if (kept.length !== 200) throw new Error(`Expected 200 concept-fit songs, got ${kept.length}`);
fs.writeFileSync("src/data/curatedSongs.json", `${JSON.stringify(kept.map((song, index) => ({ ...song, id: `S${String(index + 1).padStart(3, "0")}` })), null, 2)}\n`);
console.log(JSON.stringify({ kept: songs.length - [...excluded].length, songs: kept.length, replacements: 200 - (songs.length - [...excluded].length) }, null, 2));
