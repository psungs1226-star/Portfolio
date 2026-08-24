import fs from "node:fs";
import { execFileSync } from "node:child_process";

const normalize = (value) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const original = JSON.parse(fs.readFileSync("src/data/curatedSongs.json", "utf8"));

const excluded = new Set([
  "Shape of You", "Uptown Funk (feat. Bruno Mars)", "Sugar", "Lean On", "Shake It Off", "Closer",
  "Rockabye (feat. Sean Paul & Anne-Marie)", "Work from Home (feat. Ty Dolla $ign)",
  "Sunflower - Spider-Man: Into the Spider-Verse", "This Is What You Came For", "On The Floor", "Rude",
  "Wake Me Up - Radio Edit", "Something Just Like This", "Dynamite", "Havana (feat. Young Thug)",
  "Cheap Thrills", "CAN'T STOP THE FEELING! (from DreamWorks Animation's \"TROLLS\")", "Call Me Maybe",
  "Ice Cream (with Selena Gomez)", "Break Ice", "How Sweet", "Bubble Gum", "Dolphin",
  "MORE & MORE (English Version)", "RUB-A-DUM", "﻿Bubble (English Ver.)", "Magnetic", "LORO",
  "Like Ooh-Ahh", "Feel Good (SECRET CODE)", "CHEER UP", "DOOM DOOM TA", "FIESTA", "HAPPY", "Likey",
  "Dun Dun Dance", "What is Love", "As You Wish", "BIM BAM BUM", "7days Tension", "Chica", "WE ARE YOUNG",
  "Super Shy", "BBoom BBoom", "UTOPIA", "Dreamers", "FANCY", "Shine", "Go Big or Go Home",
  "Secret Story of the Swan", "Back for More (with Anitta)", "Cream Soda", "plot twist", "Earth, Wind & Fire",
  "Queendom", "RUN2U", "Roller Coaster",
  "Step and a step", "Passionfruit", "End of Spring", "Alcohol-Free (English ver.)", "POP!",
].map(normalize));

const source = "https://music.apple.com/us/playlist/100-all-time-summer-songs/pl.122bc516cd8045558e127ccd5f5d84cc";
const additions = [
  ["California Gurls", "Katy Perry feat. Snoop Dogg", 2010, "상큼발랄", ["바다"], "해변 배경과 캘리포니아 여름 이미지"],
  ["Teenage Dream", "Katy Perry", 2010, "설렘두근", ["드라이브", "바다"], "해안 드라이브와 여름 로맨스 MV"],
  ["Cruel Summer", "Taylor Swift", 2019, "설렘두근", ["밤바다"], "여름밤의 강렬한 로맨스"],
  ["august", "Taylor Swift", 2020, "센치감성", ["밤바다"], "끝나가는 8월의 회상"],
  ["Malibu", "Miley Cyrus", 2017, "청량시원", ["바다"], "말리부 해변을 직접 노래한 곡"],
  ["Solar Power", "Lorde", 2021, "청량시원", ["바다"], "햇빛과 해변 중심의 여름 MV"],
  ["Summertime Magic", "Childish Gambino", 2018, "설렘두근", ["밤바다"], "여름의 사랑을 직접 노래한 곡"],
  ["Feels Like Summer", "Childish Gambino", 2018, "센치감성", ["밤바다"], "무더운 여름의 느린 저녁 분위기"],
  ["Summer Paradise", "Simple Plan feat. Sean Paul", 2011, "청량시원", ["바다"], "여름 낙원과 해변을 직접 노래한 곡"],
  ["Summer Days", "Martin Garrix feat. Macklemore & Patrick Stump", 2019, "상큼발랄", ["드라이브"], "여름날의 자유로운 에너지"],
  ["Summer Feelings", "Lennon Stella feat. Charlie Puth", 2020, "상큼발랄", ["드라이브"], "여름 감정을 직접 주제로 한 곡"],
  ["Summer Love", "Justin Timberlake", 2006, "설렘두근", ["드라이브"], "여름에 시작된 사랑을 직접 노래한 곡"],
  ["Summer on You", "PRETTYMUCH", 2018, "설렘두근", ["바다"], "여름 로맨스를 직접 주제로 한 곡"],
  ["Summertime Sadness", "Lana Del Rey", 2012, "센치감성", ["밤바다"], "여름의 상실감과 황혼 분위기"],
  ["The Ocean", "Mike Perry feat. Shy Martin", 2016, "청량시원", ["바다"], "바다를 직접 배경으로 한 트로피컬 팝"],
  ["Riptide", "Vance Joy", 2013, "청량시원", ["바다", "드라이브"], "해안 여행에 어울리는 대표 여름 큐레이션 곡"],
  ["Shotgun", "George Ezra", 2018, "상큼발랄", ["드라이브"], "햇빛 아래 로드트립을 노래한 곡"],
  ["I'm Yours", "Jason Mraz", 2008, "설렘두근", ["바다"], "하와이에서 촬영한 여유로운 해변 MV"],
  ["Island in the Sun", "Weezer", 2001, "청량시원", ["바다"], "햇빛과 섬을 직접 노래한 곡"],
  ["Pure Shores", "All Saints", 2000, "센치감성", ["바다"], "해변 영화의 대표적인 오션 팝"],
  ["Walking on Sunshine", "Katrina & The Waves", 1985, "상큼발랄", ["드라이브"], "시대를 넘는 햇빛·여름 대표곡"],
  ["Steal My Sunshine", "Len", 1999, "상큼발랄", ["바다"], "해변 MV와 여름 햇빛을 직접 다룬 곡"],
  ["Soak Up the Sun", "Sheryl Crow", 2002, "청량시원", ["바다"], "햇빛과 해변을 직접 다룬 곡"],
  ["Pocketful of Sunshine", "Natasha Bedingfield", 2007, "상큼발랄", ["드라이브"], "햇빛과 탈출감을 주제로 한 여름 팝"],
  ["Sunset Lover", "Petit Biscuit", 2015, "센치감성", ["밤바다"], "해 질 무렵 바다에 맞는 칠 전자음악"],
  ["A Sky Full of Stars", "Coldplay", 2014, "설렘두근", ["밤바다"], "별이 가득한 여름밤 장면"],
  ["Midnight City", "M83", 2011, "센치감성", ["밤바다", "드라이브"], "한밤의 드라이브에 맞는 신스팝"],
  ["We Found Love", "Rihanna feat. Calvin Harris", 2011, "설렘두근", ["드라이브"], "여름 페스티벌 계열의 대표 댄스 팝"],
  ["Feel It Still", "Portugal. The Man", 2017, "상큼발랄", ["드라이브"], "가볍고 빠른 로드트립 리듬"],
  ["Sweet Disposition", "The Temper Trap", 2008, "센치감성", ["밤바다", "드라이브"], "해 질 녘 장거리 드라이브에 맞는 곡"],
  ["Electric Feel", "MGMT", 2007, "센치감성", ["밤바다"], "따뜻한 밤공기와 맞는 사이키델릭 팝"],
  ["The Sweet Escape", "Gwen Stefani feat. Akon", 2006, "상큼발랄", ["드라이브"], "휴가처럼 가볍게 벗어나는 분위기"],
  ["Never Be Like You", "Flume feat. Kai", 2016, "센치감성", ["밤바다"], "여름밤에 맞는 몽환적 전자음악"],
  ["One More Time", "Daft Punk", 2000, "상큼발랄", ["드라이브"], "야외 여름 파티의 대표 댄스곡"],
  ["Passionfruit", "Drake", 2017, "센치감성", ["밤바다"], "열대감 있는 늦은 밤 R&B"],
  ["Padam Padam", "Kylie Minogue", 2023, "설렘두근", ["밤바다"], "뜨거운 여름밤의 댄스 팝"],
  ["Got Me Started", "Troye Sivan", 2023, "상큼발랄", ["드라이브"], "도시 여행과 야외 활동 중심 MV"],
  ["Dancing in the Moonlight", "Toploader", 2000, "설렘두근", ["밤바다"], "달빛 아래 여름밤을 직접 묘사"],
  ["Summer 91 (Looking Back)", "Noizu", 2021, "청량시원", ["드라이브"], "여름을 직접 주제로 한 하우스"],
  ["By Your Side", "Calvin Harris feat. Tom Grennan", 2021, "상큼발랄", ["드라이브"], "밝은 여름 페스티벌 팝"],
  ["Holiday", "KSI", 2021, "설렘두근", ["바다"], "휴가와 해변 로맨스를 직접 다룬 곡"],
  ["Higher Love", "Kygo & Whitney Houston", 2019, "청량시원", ["드라이브"], "야외 여름 페스티벌 계열 트로피컬 팝"],
  ["It Ain't Me", "Kygo & Selena Gomez", 2017, "센치감성", ["드라이브"], "해 질 녘 드라이브에 맞는 트로피컬 팝"],
  ["Middle", "DJ Snake feat. Bipolar Sunshine", 2015, "센치감성", ["밤바다"], "여름밤에 맞는 부드러운 전자 팝"],
  ["Ocean", "Martin Garrix feat. Khalid", 2018, "센치감성", ["밤바다"], "바다 이미지를 직접 사용한 느린 전자 팝"],
  ["Lush Life", "Zara Larsson", 2015, "상큼발랄", ["바다"], "걱정 없이 즐기는 여름을 직접 노래한 곡"],
  ["Symphony", "Clean Bandit feat. Zara Larsson", 2017, "설렘두근", ["드라이브"], "탁 트인 드라이브에 맞는 상승감"],
  ["Prayer in C (Robin Schulz Remix)", "Lilly Wood & The Prick", 2014, "센치감성", ["밤바다"], "여름밤 대표 딥하우스 리믹스"],
  ["Jubel", "Klingande", 2013, "청량시원", ["바다", "드라이브"], "해변·로드트립 MV의 대표 색소폰 하우스"],
  ["I Got U", "Duke Dumont feat. Jax Jones", 2014, "청량시원", ["바다"], "열대 휴양지 MV와 스틸드럼 사운드"],
  ["Fireball", "Pitbull feat. John Ryan", 2014, "상큼발랄", ["바다"], "라틴 계열 풀사이드 파티 곡"],
  ["This Summer's Gonna Hurt like a Motherf****r", "Maroon 5", 2015, "상큼발랄", ["드라이브"], "여름을 직접 주제로 한 팝록"],
  ["Cool", "Jonas Brothers", 2019, "상큼발랄", ["바다"], "마이애미 해변에서 촬영한 여름 MV"],
  ["Vacation", "Dirty Heads", 2017, "상큼발랄", ["바다"], "휴가를 직접 주제로 한 곡"],
  ["Beach House", "The Chainsmokers", 2018, "설렘두근", ["바다"], "해변의 집과 여름 로맨스를 직접 노래한 곡"],
  ["Miami", "Will Smith", 1997, "상큼발랄", ["바다"], "마이애미 해변과 여름 파티를 직접 다룬 곡"],
  ["Sun Goes Down", "Robin Schulz feat. Jasmine Thompson", 2014, "센치감성", ["밤바다"], "해 질 녘을 직접 주제로 한 딥하우스"],
  ["Places", "Martin Solveig feat. Ina Wroldsen", 2016, "상큼발랄", ["드라이브"], "여행과 이동감이 선명한 여름 하우스"],
  ["Call on Me (Ryan Riback Remix)", "Starley", 2016, "상큼발랄", ["드라이브"], "햇빛 아래 드라이브에 맞는 트로피컬 리믹스"],
  ["Fast Car", "Jonas Blue feat. Dakota", 2015, "청량시원", ["드라이브"], "로드트립을 직접 연상시키는 트로피컬 팝"],
  ["Perfect Strangers", "Jonas Blue feat. JP Cooper", 2016, "설렘두근", ["바다"], "여행지에서 만난 로맨스를 다룬 MV"],
  ["Mama", "Jonas Blue feat. William Singe", 2017, "상큼발랄", ["드라이브"], "젊은 여름과 자유를 노래한 트로피컬 팝"],
  ["Sun Is Shining", "Axwell / Ingrosso", 2015, "청량시원", ["바다", "드라이브"], "햇빛과 야외 여름 장면이 선명한 하우스 팝"],
];

const officialOverrides = new Map([
  [normalize("Cruel Summer|Taylor Swift"), "ic8j13piAhQ"],
  [normalize("Summer Love|Justin Timberlake"), "zMaNfqfsMtE"],
  [normalize("We Found Love|Rihanna feat. Calvin Harris"), "tg00YEETFzg"],
  [normalize("Passionfruit|Drake"), "EgfsXTOn_pI"],
]);
const momentOverrides = new Map([
  [normalize("Klaxon"), ["바다"]],
  [normalize("Poongdung"), ["바다"]],
  [normalize("Mojito"), ["바다"]],
  [normalize("La Isla Bonita"), ["바다"]],
  [normalize("Aloha Oe"), ["바다"]],
  [normalize("CHILLAX"), ["바다", "드라이브"]],
  [normalize("JUICY"), ["바다"]],
  [normalize("Tide"), ["바다"]],
  [normalize("PARADISE"), ["바다"]],
  [normalize("POPSICLE"), ["바다"]],
  [normalize("After School"), ["드라이브"]],
  [normalize("Now or Never"), ["바다"]],
  [normalize("DUMDi DUMDi"), ["드라이브"]],
  [normalize("Red Flavor"), ["바다"]],
  [normalize("Up!"), ["바다"]],
  [normalize("Supernatural"), ["드라이브"]],
  [normalize("Espresso"), ["바다"]],
  [normalize("Heat Waves"), ["밤바다"]],
  [normalize("Dance The Night Away"), ["바다", "밤바다"]],
]);
const resolveVideo = ([title, artist]) => {
  const override = officialOverrides.get(normalize(`${title}|${artist}`));
  if (override) return override;
  const query = encodeURIComponent(`${artist} ${title} official music video`);
  const html = execFileSync("curl", ["-fsSL", `https://www.youtube.com/results?search_query=${query}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  return html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)?.[1];
};

const kept = original.filter((song) => !excluded.has(normalize(song.title)));
const existingVideos = new Set(kept.map((song) => song.videoId));
const existingTracks = new Set(kept.map((song) => `${normalize(song.title)}|${normalize(song.artist)}`));
for (const item of additions) {
  if (kept.length === 200) break;
  const [title, artist, year, mood, moments, tagReason] = item;
  const trackKey = `${normalize(title)}|${normalize(artist)}`;
  if (existingTracks.has(trackKey)) continue;
  const videoId = resolveVideo(item);
  if (!videoId || existingVideos.has(videoId)) continue;
  kept.push({ title, artist, year, mood, moments, group: "기타", videoId, evidenceUrl: source, tagReason });
  existingTracks.add(trackKey);
  existingVideos.add(videoId);
}

if (kept.length !== 200) throw new Error(`Strict catalog has ${kept.length} songs, expected 200`);
const finalized = kept.map((song, index) => {
  const moments = momentOverrides.get(normalize(song.title)) ?? song.moments;
  return {
    ...song,
    id: `S${String(index + 1).padStart(3, "0")}`,
    moments,
    selectionBasis: song.selectionBasis ?? (song.group === "기타" ? "편집자 여름 큐레이션 또는 계절·장소가 명시된 곡" : "계절·해변·휴가가 제목·가사·MV에 명시되거나 K-pop 여름 대표곡으로 교차검증"),
  };
});
fs.writeFileSync("src/data/curatedSongs.json", `${JSON.stringify(finalized, null, 2)}\n`);
console.log(JSON.stringify({ removed: original.length - kept.filter((song) => original.some((old) => old.videoId === song.videoId)).length, songs: finalized.length }, null, 2));
