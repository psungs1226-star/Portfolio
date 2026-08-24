# Phase 4 링크 검증 메모

## 범위

- 대상 파일: `data/songs.json`, `summer-song/src/data/songs.ts`
- 검증일: 2026-07-08
- 입력: `여름노래_큐레이션_마스터.xlsx` 300곡
- 기준: 공식 MV, 아티스트/소속사/레이블 공식 채널, 공식 Topic 채널
- 제외 기준: 비공식 재업로드, 팬메이드/가사/방송 클립, 티저/메이킹/안무 버전, 곡명 또는 아티스트 불일치, 접근 불가 링크

## 선정 요약

- 출시 후보 앱 반영: 100곡
- 모든 반영 곡은 `videoId` 기반 YouTube oEmbed 접근과 `hqdefault.jpg` 썸네일 접근을 확인함
- Phase 1 스키마를 유지하고 URL 전체가 아닌 `videoId`만 저장함
- 2012~2024 주요 구간은 모두 포함됨. 마스터의 2011년 후보 1곡도 추억 보강 목적으로 포함함

## 카테고리 집계

### 무드

- 상큼발랄: 25곡
- 청량시원: 25곡
- 설렘두근: 25곡
- 센치감성: 25곡

### 순간

- 바다: 40곡
- 드라이브: 32곡
- 밤바다: 50곡
- 비오는날: 12곡

### 그룹

- 여돌: 65곡
- 남돌: 21곡
- 솔로: 13곡
- 기타: 1곡

### 연도

- 2024: 10곡
- 2023: 24곡
- 2022: 13곡
- 2021: 14곡
- 2020: 9곡
- 2019: 7곡
- 2018: 11곡
- 2017: 2곡
- 2016: 2곡
- 2015: 1곡
- 2014: 2곡
- 2013: 3곡
- 2012: 1곡
- 2011: 1곡

## 제외 곡

| id | 곡 | 아티스트 | 제외 사유 |
| --- | --- | --- | --- |
| S120 | Hype Boy | NewJeans | 공식 MV/Topic 기준 외 영상: NewJeans (뉴진스) 'Hype Boy' Official MV (Performance ver.1) |
| S253 | 마음 (Heart) | 화사 | 아티스트 불일치: IU - Topic / heart (마음) |
| S014 | After School | 위클리 | 의심 공식 채널(BIGHIT MUSIC OFFICIAL)로 제외 |
| S021 | 살짝 설렜어 (Nonstop) | 오마이걸 | 공식 MV/Topic 기준 외 영상: 오마이걸(OH MY GIRL)_살짝 설렜어 (Nonstop) M/V Making Film |
| S125 | BUNGEE (Fall in Love) | 오마이걸 | 공식 MV/Topic 기준 외 영상: 오마이걸(OH MY GIRL)_BUNGEE (FALL IN LOVE) MV Making Film |
| S128 | 너를 만나 (Rainbow) | 여자친구 | 아티스트 불일치: 1theK (원더케이) / [MV] Paul Kim(폴킴) _ Me After You(너를 만나) |
| S129 | Destiny (나의 지구) | 러블리즈 | 공식 MV/Topic 기준 외 영상: [MV] Lovelyz(러블리즈) _ 나의 지구(Destiny) (Choreography Ver.) |
| S131 | Hush | 미쓰에이 | 동명곡/아티스트 불일치(Apink Hush) |
| S193 | But I Like You | 보이넥스트도어 | 검색 결과 곡명 불일치 |
| S137 | Number 9 | 티아라 | 일본어 버전 제외: Number Nine (Japanese Version) |

## 반영 곡별 검증

| id | 곡 | 아티스트 | videoId | oEmbed 채널 | oEmbed 제목 |
| --- | --- | --- | --- | --- | --- |
| S001 | How Sweet | NewJeans | `Q3K0TOvTOno` | HYBE LABELS | NewJeans (뉴진스) 'How Sweet' Official MV |
| S002 | Cake | 있지 | `0bIRwBpBcZQ` | JYP Entertainment | ITZY “CAKE” M/V @ITZY |
| S003 | Cupid | 피프티 피프티 | `Qc7_zRjH808` | FIFTY FIFTY Official | FIFTY FIFTY (피프티피프티) - 'Cupid'  Official MV |
| S004 | Kitsch | IVE | `pG6iaOMV46I` | STARSHIP | IVE 아이브 'Kitsch' MV |
| S005 | Queencard (퀸카) | 여자아이들 | `7HDeem-JaSY` | i-dle (아이들) | (여자)아이들((G)I-DLE) - '퀸카 (Queencard)' Official Music Video |
| S006 | Teddy Bear | STAYC | `SxHmoifp0oQ` | STAYC | STAYC(스테이씨) 'Teddy Bear' MV |
| S007 | We Fresh | 케플러 | `zkvIzKwzYNc` | Kep1er | Kep1er 케플러 / ‘We Fresh' M/V |
| S008 | Birthday | 레드벨벳 | `Ut1OzEVUiM4` | SMTOWN | Red Velvet 레드벨벳 'Birthday' MV |
| S010 | Giddy | 케플러 | `w9ueRzymcU0` | Kep1er | Kep1er 케플러 l 'Giddy' M/V |
| S011 | Sneakers | 있지 | `Hbb5GPxXF1w` | JYP Entertainment | ITZY “SNEAKERS” M/V @ITZY |
| S012 | Up! | 케플러 | `hr-325mclek` | Kep1er | Kep1er 케플러 l 'Up!' M/V |
| S013 | ASAP | STAYC | `NsY-9MCOIAQ` | STAYC | STAYC(스테이씨) 'ASAP' MV |
| S015 | Talk & Talk | 프로미스나인 | `BjmmvBMXbSU` | HYBE LABELS | fromis_9 (프로미스나인) 'Talk & Talk' Official MV |
| S016 | WE GO | 프로미스나인 | `HM6UpQZvbhY` | Official fromis_9 | 프로미스나인 (fromis_9) 'WE GO' M/V |
| S017 | BUTTERFLY | 우주소녀 | `ftyLwZ68LnU` | STARSHIP | [MV] 우주소녀 (WJSN) - BUTTERFLY |
| S018 | Feel Good (Secret Code) | 프로미스나인 | `jLmJhjCzOTw` | Official fromis_9 | 프로미스나인 (fromis_9) 'Feel Good (SECRET CODE)' M/V |
| S019 | Ice Cream | 블랙핑크 | `vRXZj0DzXIA` | BLACKPINK | BLACKPINK - 'Ice Cream (with Selena Gomez)' M/V |
| S020 | So Bad | STAYC | `gMe1c4UegBY` | STAYC | STAYC(스테이씨) 'SO BAD' MV |
| S022 | %% (응응) | 에이핑크 | `v5daqkRvJDE` | Apink (에이핑크) | Apink 에이핑크 %%(응응) Music Video Official |
| S023 | DALLA DALLA (달라달라) | 있지 | `pNfTK39k55U` | JYP Entertainment | ITZY "달라달라(DALLA DALLA)" M/V @ITZY |
| S024 | 짐살라빔 (Zimzalabim) | 레드벨벳 | `YBnGBb1wg98` | SMTOWN | Red Velvet 레드벨벳 '짐살라빔 (Zimzalabim)' MV |
| S025 | Hi High | 이달의 소녀 | `23R1aiS95Ak` | DanalEntertainment | [MV] 이달의 소녀 - '+ +' - HI High |
| S026 | Power Up | 레드벨벳 | `aiHSVQy9xN8` | SMTOWN | Red Velvet 레드벨벳 'Power Up' MV |
| S027 | Yes I Am | 마마무 | `hTMlLDAclTI` | MAMAMOO | [MV] 마마무(MAMAMOO) - '나로 말할 것 같으면(Yes I am)' |
| S028 | 뿜뿜 (BBoom BBoom) | 모모랜드 | `JQGRg8XBnB4` | 1theK (원더케이) | [MV] MOMOLAND (모모랜드) _ BBoom BBoom (뿜뿜) |
| S049 | CRAZY | 르세라핌 | `n6B5gQXlB-0` | HYBE LABELS | LE SSERAFIM (르세라핌) 'CRAZY' OFFICIAL MV |
| S050 | HEYA | IVE | `07EzMbVH3QE` | STARSHIP | IVE 아이브 '해야 (HEYA)' MV |
| S051 | Super Lady | 여자아이들 | `6f3RzjXPQwA` | i-dle (아이들) | (여자)아이들((G)I-DLE) - 'Super Lady' Official Music Video |
| S052 | Supernatural | NewJeans | `ZncbtRo7RXs` | HYBE LABELS | NewJeans (뉴진스) ‘Supernatural’ Official MV (Part.1) |
| S053 | Supernova | aespa | `phuiiNCxRMg` | SMTOWN | aespa 에스파 'Supernova' MV |
| S054 | Whiplash | aespa | `jWQx2f-CErU` | SMTOWN | aespa 에스파 'Whiplash' MV |
| S055 | 클락션 (Klaxon) | 여자아이들 | `rTKqSmX9XhQ` | i-dle (아이들) | (여자)아이들((G)I-DLE) - '클락션 (Klaxon)' Official Music Video |
| S056 | Baddie | IVE | `Da4P2uT4mVc` | STARSHIP | IVE 아이브 'Baddie' MV |
| S057 | Beautiful Monster | STAYC | `juQvizeZJFM` | STAYC | STAYC(스테이씨) 'BEAUTIFUL MONSTER' MV |
| S058 | Bubble | STAYC | `3-ptVHZZdBg` | STAYC | STAYC(스테이씨) 'Bubble' MV |
| S059 | Drama | aespa | `D8VEhcPeSlc` | SMTOWN | aespa 에스파 'Drama' MV |
| S060 | ETA | NewJeans | `jOTfBlKSQYY` | HYBE LABELS | NewJeans (뉴진스) 'ETA' Official MV |
| S061 | Get Up | NewJeans | `nJDMAjwxthM` | HYBE LABELS | NewJeans (뉴진스) 'Cool With You' & 'Get Up' Official MV (side B) |
| S062 | I AM | IVE | `6ZUIwj3FgUY` | STARSHIP | IVE 아이브 'I AM' MV |
| S063 | Spicy | aespa | `Os_heh8vPfs` | SMTOWN | aespa 에스파 'Spicy' MV |
| S064 | Stay This Way | 프로미스나인 | `JC6budcACNE` | HYBE LABELS | fromis_9 (프로미스나인) 'Stay This Way' Official MV |
| S065 | UNFORGIVEN | 르세라핌 | `UBURTj20HXI` | HYBE LABELS | LE SSERAFIM (르세라핌) 'UNFORGIVEN (feat. Nile Rodgers)' OFFICIAL M/V |
| S066 | 여름이 들려 (Summer Comes) | 오마이걸 | `9iOj8RLAeDA` | 소니뮤직코리아 Sony Music Korea | 오마이걸 (OH MY GIRL) - '여름이 들려 (Summer Comes)' Official Music Video |
| S067 | ANTIFRAGILE | 르세라핌 | `pyf8cbqyfPs` | HYBE LABELS | LE SSERAFIM (르세라핌) 'ANTIFRAGILE' OFFICIAL M/V |
| S075 | Alcohol-Free | 트와이스 | `XA2YEHn-A8Q` | JYP Entertainment | TWICE "Alcohol-Free" M/V |
| S080 | 치맛바람 (Chi Mat Ba Ram) | 브레이브걸스 | `e70PkoJhQYM` | Brave Entertainment | 브레이브걸스(Brave Girls) - 치맛바람 (Chi Mat Ba Ram) MV |
| S113 | Bubble Gum | NewJeans | `ft70sAYrFyY` | HYBE LABELS | NewJeans (뉴진스) 'Bubble Gum' Official MV |
| S114 | Off The Record | IVE | `_ApV7Lm87cg` | STARSHIP | IVE 아이브 'Off The Record' MV |
| S115 | Perfect Night | 르세라핌 | `hLvWy2b857I` | HYBE LABELS | LE SSERAFIM (르세라핌) 'Perfect Night' OFFICIAL M/V with OVERWATCH 2 |
| S116 | Super Shy | NewJeans | `ArmDp-zijuc` | HYBE LABELS | NewJeans (뉴진스) 'Super Shy' Official MV |
| S117 | Attention | NewJeans | `js1CtxSY38I` | HYBE LABELS | NewJeans (뉴진스) 'Attention' Official MV |
| S118 | DM | 프로미스나인 | `4gXmClk8rKI` | HYBE LABELS | fromis_9 (프로미스나인) 'DM' Official MV |
| S119 | Dreams Come True | aespa | `H69tJmsgd9I` | SMTOWN | [STATION] aespa 에스파 'Dreams Come True' MV |
| S121 | LOVE DIVE | IVE | `Y8JFxS1HlDo` | STARSHIP | IVE 아이브 'LOVE DIVE' MV |
| S122 | ELEVEN | IVE | `--FmExEAsM8` | STARSHIP | IVE 아이브 'ELEVEN' MV |
| S123 | Stereotype (색안경) | STAYC | `Xmxcnf2v_gs` | STAYC | STAYC(스테이씨) '색안경 (STEREOTYPE)' MV |
| S124 | The Feels | 트와이스 | `f5_wn8mexmM` | JYP Entertainment | TWICE "The Feels" M/V |
| S126 | 이루리 (As You Wish) | 우주소녀 | `Q93dY2qeMeU` | 1theK (원더케이) | [MV] WJSN(우주소녀) _ As you Wish(이루리) |
| S127 | What is Love? | 트와이스 | `i0p1bmr0EmE` | JYP Entertainment | TWICE "What is Love?" M/V |
| S130 | 위아래 (Up & Down) | EXID | `hfXZ6ydgZyo` | EXID_OFFICIAL | [EXID(이엑스아이디)] '위아래' (UP&DOWN) MV |
| S132 | Cool With You | NewJeans | `zsYSSVoQnP4` | HYBE LABELS | NewJeans (뉴진스) 'Cool With You' Official MV (side A) |
| S133 | Ditto | NewJeans | `pSUydWEqKwE` | HYBE LABELS | NewJeans (뉴진스) 'Ditto' Official MV (side A) |
| S134 | Lovesick Girls | 블랙핑크 | `dyRsYk0LyA8` | BLACKPINK | BLACKPINK - 'Lovesick Girls' M/V |
| S135 | Feel Special | 트와이스 | `3ymwOvzhwHs` | JYP Entertainment | TWICE "Feel Special" M/V |
| S136 | Bad Boy | 레드벨벳 | `J_CFBjAyPWE` | SMTOWN | Red Velvet 레드벨벳 'Bad Boy' MV |
| S169 | Butter | 방탄소년단 | `WMweEpGlu_U` | HYBE LABELS | BTS (방탄소년단) 'Butter' Official MV |
| S178 | Left & Right | 세븐틴 | `HdZdxocqzq4` | HYBE LABELS | SEVENTEEN (세븐틴) 'Left & Right' Official MV |
| S188 | Everybody | 샤이니 | `hKbNV-4b_g8` | SMTOWN | SHINee 샤이니 'Everybody' MV |
| S190 | Sherlock (셜록) | 샤이니 | `8kyG5tTZ1iE` | SMTOWN | SHINee 샤이니 'Sherlock•셜록 (Clue + Note)' MV |
| S192 | Love 119 | RIIZE | `0TAAUWHo4Ec` | SMTOWN | RIIZE 라이즈 'Love 119' MV |
| S195 | One and Only | 보이넥스트도어 | `jizAb-SLvtM` | HYBE LABELS | BOYNEXTDOOR (보이넥스트도어) 'One and Only' Official MV |
| S196 | Sugar Rush Ride | 투모로우바이투게더 | `P9tKTxbgdkk` | HYBE LABELS | TXT (투모로우바이투게더) 'Sugar Rush Ride' Official MV |
| S197 | Sweet Venom | 엔하이픈 | `qedonJosQ3g` | HYBE LABELS | ENHYPEN (엔하이픈) 'Sweet Venom' Official MV |
| S199 | Ready to love | 세븐틴 | `yCvSR4lSqTg` | HYBE LABELS | SEVENTEEN (세븐틴) 'Ready to love' Official MV |
| S200 | WHISPER | 더보이즈 | `Pg2tKXBMIVw` | 1theK (원더케이) | [MV] THE BOYZ(더보이즈) _ WHISPER |
| S202 | Calling You | 하이라이트 | `b6l0x9xxk4k` | 1theK (원더케이) | [MV] Highlight(하이라이트) _ CALLING YOU |
| S204 | 빛나리 (Shine) | 펜타곤 | `z4dH6hEMuwk` | PENTAGON 펜타곤 (Official YouTube Channel) | PENTAGON(펜타곤) - '빛나리(Shine)' Official Music Video |
| S205 | 사랑을 했다 (Love Scenario) | 아이콘 | `vecSVX1QYbQ` | iKON | iKON - ‘사랑을 했다(LOVE SCENARIO)’ M/V |
| S207 | 으르렁 (Growl) | EXO | `I3dezFzsNss` | SMTOWN | EXO 엑소 '으르렁 (Growl)' MV (Korean Ver.) |
| S208 | LO$ER=LO♡ER | 투모로우바이투게더 | `JzODRUBBXpc` | HYBE LABELS | TXT (투모로우바이투게더) 'LO$ER=LO♡ER' Official MV |
| S209 | Daisy | 펜타곤 | `W7ZIz4w9Edo` | PENTAGON 펜타곤 (Official YouTube Channel) | 펜타곤(PENTAGON) - '데이지(Daisy)' Official Music Video |
| S210 | Good Guy | SF9 | `ur4dLy0ozRQ` | 1theK (원더케이) | [MV] SF9 _ Good Guy |
| S211 | Howling | 빅톤 | `x0sVxTmLnh0` | 1theK (원더케이) | [MV] VICTON(빅톤) _ Howling |
| S212 | You Calling My Name (니가 부르는 나의 이름) | 갓세븐 | `xQI9oZEY-B0` | JYP Entertainment | GOT7 "니가 부르는 나의 이름(You Calling My Name)" M/V |
| S213 | Love Shot | EXO | `pSudEWBAYRE` | SMTOWN | EXO 엑소 'Love Shot' MV |
| S214 | Shoot Out | 몬스타엑스 | `MS10Zz49FHE` | STARSHIP | MONSTA X 몬스타엑스  'Shoot Out' MV |
| S228 | XOXO | 전소미 | `H8kqPkEXP_E` | THEBLACKLABEL | JEON SOMI (전소미) - 'XOXO' M/V |
| S238 | INVU | 태연 | `AbZH7XWDW_k` | SMTOWN | TAEYEON 태연 'INVU' MV |
| S239 | 에피소드 | 이무진 | `gH1rVdXUlpo` | 1theK (원더케이) | [MV] LEE MU JIN(이무진) _ Episode(에피소드) |
| S240 | Bambi | 백현 | `8M3WUaeIbOk` | SMTOWN | BAEKHYUN 백현 'Bambi' MV |
| S241 | Like Water | 웬디 | `-Ih5UArd4zk` | SMTOWN | WENDY 웬디 'Like Water' MV |
| S263 | 주인공 (Heroine) | 선미 | `F4qfN5UeFvQ` | 1theK (원더케이) | [MV] SUNMI (선미) _ Heroine (주인공) |
| S264 | 비도 오고 그래서 | 헤이즈 | `afxLaQiLu-o` | Stone Music Entertainment | 헤이즈 (Heize) - 비도 오고 그래서 (You, Clouds, Rain) (Feat. 신용재 (Shin Yong Jae)) MV |
| S265 | Rain | 태연 | `eHir_vB1RUI` | SMTOWN | TAEYEON 태연 'Rain' MV |
| S266 | 비 | 폴킴 | `Cm08bRic7Jk` | Paul Kim - Topic | 비 |
| S267 | 푸르던 | 아이유 | `TRTquokWSCw` | 1theK (원더케이) | [Special Clip] IU(아이유) _ The shower(푸르던) [ENG SUB] |
| S268 | 비가 내린다 | 차은주 | `kYwAJCSonLg` | Cha Eun Joo - Topic | 비가 내린다 |
| S269 | Rain | 김예림 | `qlMXZvY-_cM` | 미스틱스토리 MYSTIC STORY | 김예림 Lim Kim - Rain (Official MV) |
| S271 | 장마 | 정인 | `zznSn57U_7U` | Jung In - Topic | Raniny Season (Feat. YOUNG JUN of Brown Eyed Soul) (장마 (Feat. 영준 of Brown Eyed Soul)) |
| S300 | 비가 와 | 소유, 백현 | `1Q8J5nghxiM` | 1theK (원더케이) | [MV] SOYOU(소유), BAEKHYUN(백현) _ Rain(비가와) |
