// 旅遊拼圖 Travel Puzzle 主程式 (v2.10)
// 支援「手札拍立得旅程大廳」、「完整規劃模式」、「隨身行程檢視＋記帳模式」與「三層快取省流量架構」

const APP_VERSION = 'v2.10';
const STORAGE_KEY = 'travel_puzzle_jp_state_v1';
const SAVED_TRIPS_KEY = 'travel_puzzle_saved_trips_v2';
const GMAPS_TTL_CACHE_KEY = 'travel_puzzle_gmaps_ttl_cache_v1';
const GMAPS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 本機快取效期 30 天
const CONFIG_KEY = 'travel_puzzle_jp_config_v1';
const LEGACY_CONFIG_KEYS = ['travel_puzzle_config', 'jp_travel_config_v1', 'travelPuzzleConfig', 'travel_puzzle_api_keys', 'travel_puzzle_settings', 'tp_config_v1'];
const DEFAULT_SYNC_CODE = 'JP-GPVMP6';

const REGIONS_META = [
    { id: 'kansai', name: '關西地區', desc: '滋賀・京都・大阪・兵庫・奈良・和歌山', defaultHotel: '東橫INN 大阪難波西', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Fushimiinari-taisha%2C_gehaiden-1.jpg/960px-Fushimiinari-taisha%2C_gehaiden-1.jpg', weatherTip: '12月關西白天約 8–12°C，早晚偏冷建議洋蔥式穿搭；雨天可優先安排地下街或京都車站室內景點。' },
    { id: 'kanto', name: '關東地區', desc: '茨城・栃木・群馬・埼玉・千葉・東京・神奈川', defaultHotel: '東橫INN 東京站新大橋前', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Kiyomizu-dera%2C_Kyoto%2C_November_2016_-02.jpg/960px-Kiyomizu-dera%2C_Kyoto%2C_November_2016_-02.jpg', weatherTip: '12月東京晴朗乾燥約 6–13°C，風大建議攜帶防風外套與護唇膏。' },
    { id: 'hokkaido', name: '北海道', desc: '札幌・小樽・函館・富良野・美瑛與登別溫泉', defaultHotel: 'JR Inn 札幌駅南口', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg', weatherTip: '冬季零下積雪路面易滑，務必穿著防滑防水雪靴與發熱衣。' },
    { id: 'tohoku', name: '東北地區', desc: '青森・岩手・秋田・宮城・山形・福島', defaultHotel: '東橫INN 仙台站西口中央', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg', weatherTip: '東北山區冬季降雪豐沛，搭乘地方 JR 線路請預留班次緩衝。' },
    { id: 'hokuriku', name: '北陸地區', desc: '新潟・富山・石川（金澤／能登）・福井', defaultHotel: 'Via Inn 金澤（JR金澤站直結）', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg', weatherTip: '北陸冬季多雨雪且濕冷，建議攜帶折疊傘與防水鞋款。' },
    { id: 'chubu', name: '中部地區', desc: '長野・山梨・靜岡・岐阜・愛知・三重', defaultHotel: '東橫INN 名古屋站新幹線口', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg', weatherTip: '中部山區（高山／白川鄉）氣溫較低，市區名古屋晴朗乾爽。' },
    { id: 'sanin', name: '山陰地區', desc: '鳥取縣（砂丘／柯南小鎮）・島根縣（出雲大社／松江城）', defaultHotel: 'Dormy Inn 出雲', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Fushimiinari-taisha%2C_gehaiden-1.jpg/960px-Fushimiinari-taisha%2C_gehaiden-1.jpg', weatherTip: '日本海側冬季雲量較多偶有陣雪，建議備妥雨具與保暖衣物。' },
    { id: 'sanyo', name: '山陽地區', desc: '岡山縣（倉敷）・廣島縣（宮島）・山口縣（下關／角島）', defaultHotel: 'Via Inn 廣島新幹線口', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg', weatherTip: '瀨戶內海沿岸晴天率高、氣候溫和，非常適合鐵道跳島漫遊。' },
    { id: 'shikoku', name: '四國地區', desc: '香川・德島・愛媛・高知', defaultHotel: 'JR Clement Inn 高松', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg', weatherTip: '四國瀨戶內側溫暖少雨，適合搭配 JR 四國周遊券慢活巡禮。' },
    { id: 'kyushu', name: '九州地區', desc: '福岡・佐賀・長崎・大分・熊本・宮崎・鹿兒島', defaultHotel: '東橫INN 博多口站前', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/%E6%9D%B1%E5%A4%A7%E5%AF%BA_%E5%A4%A7%E4%BB%8F%E6%AE%BF%EF%BC%882024%E5%B9%B4%EF%BC%89.jpg/960px-%E6%9D%B1%E5%A4%A7%E5%AF%BA_%E5%A4%A7%E4%BB%8F%E6%AE%BF%EF%BC%882024%E5%B9%B4%EF%BC%89.jpg', weatherTip: '北九州冬季海風較強約 7–13°C，阿蘇山區氣溫更低需注意保暖。' },
    { id: 'okinawa', name: '沖繩地區', desc: '沖繩本島（那霸／美國村／美麗海水族館）與離島', defaultHotel: '東橫INN 那霸旭橋站前', coverFallback: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/KOBE_PORT_TOWER_001.jpg/960px-KOBE_PORT_TOWER_001.jpg', weatherTip: '沖繩冬季約 17–21°C 舒適宜人，海邊風大建議帶件薄風衣。' }
];

const DEFAULT_JR_PASSES = [
    { id: 'jr-kansai-area-3', name: 'JR 關西地區鐵路周遊券 (3日)', priceJpy: 5800, days: 3, regions: ['kansai'], airportCovered: true },
    { id: 'jr-kansai-wide-5', name: 'JR 關西廣域鐵路周遊券 (5日)', priceJpy: 12000, days: 5, regions: ['kansai', 'sanyo', 'sanin'], airportCovered: true },
    { id: 'jr-haruka-oneway', name: 'JR 關西機場特快 HARUKA 車票 (單程)', priceJpy: 1800, days: 1, regions: ['kansai'], airportCovered: true },
    { id: 'jr-tokyo-wide-3', name: 'JR 東京廣域周遊券 (3日)', priceJpy: 15000, days: 3, regions: ['kanto'], airportCovered: true },
    { id: 'jr-whole-japan-7', name: 'JR 全日本鐵路通票 (7日普通車)', priceJpy: 50000, days: 7, regions: ['kansai', 'kanto', 'hokkaido', 'kyushu', 'hokuriku', 'chubu', 'tohoku', 'sanyo', 'sanin', 'shikoku'], airportCovered: true }
];

const DEFAULT_FLIGHTS_DB = {
    AK176: { airline: 'AirAsia 亞洲航空', airport: '關西國際機場 (KIX)', terminal: 'T1', time: '19:30', aircraft: 'A321neo', region: 'kansai' },
    AK177: { airline: 'AirAsia 亞洲航空', airport: '關西國際機場 (KIX)', terminal: 'T1', time: '20:45', aircraft: 'A321neo', region: 'kansai' }
};

const CORE_HUB_STATIONS = [
    { name: '関西国際空港', aliases: ['關西國際機場', '關西機場', 'KIX'], lat: 34.4347, lng: 135.2440 },
    { name: '新大阪', aliases: ['新大阪駅', '新大阪東口'], lat: 34.7335, lng: 135.5003 },
    { name: '大阪', aliases: ['梅田', '大阪駅'], lat: 34.7025, lng: 135.4959 },
    { name: '難波', aliases: ['なんば', '道頓堀', '心齋橋', '大阪難波'], lat: 34.6669, lng: 135.5003 },
    { name: '天王寺', aliases: ['阿倍野'], lat: 34.6476, lng: 135.5133 },
    { name: '京都', aliases: ['京都車站', '京都駅'], lat: 34.9858, lng: 135.7588 },
    { name: '祇園四条', aliases: ['清水寺', '二年坂', '祇園', '河原町'], lat: 35.0037, lng: 135.7720 },
    { name: '嵯峨嵐山', aliases: ['嵐山', '渡月橋'], lat: 35.0185, lng: 135.6812 },
    { name: '稲荷', aliases: ['伏見稻荷'], lat: 34.9671, lng: 135.7727 },
    { name: '三ノ宮', aliases: ['神戶', '三宮', '美利堅公園', '布引香草園'], lat: 34.6947, lng: 135.1955 },
    { name: '奈良', aliases: ['奈良公園', '東大寺'], lat: 34.6810, lng: 135.8190 },
    { name: '宇治', aliases: ['平等院'], lat: 34.8906, lng: 135.8008 }
];

let userConfig = {
    gmapsKey: '',
    geminiKey: '',
    githubToken: '',
    githubUser: 'JHANSIANGJYUN',
    githubRepo: 'travel-puzzle',
    cloudDbUrl: 'https://raw.githubusercontent.com/JHANSIANGJYUN/travel-puzzle/main/db.json',
    syncCode: 'JP-GPVMP6'
};

let cloudData = {
    updatedAt: '',
    jrPasses: [...DEFAULT_JR_PASSES],
    flights: { ...DEFAULT_FLIGHTS_DB },
    events: [],
    stations: [...CORE_HUB_STATIONS]
};

const DEFAULT_APP_STATE = {
    tripCode: 'JP-GPVMP6',
    tripTitle: '京阪冬季光影四日遊',
    tripAuthor: '旅人手札',
    coverUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Fushimiinari-taisha%2C_gehaiden-1.jpg/960px-Fushimiinari-taisha%2C_gehaiden-1.jpg',
    startDate: '2026-12-18',
    endDate: '2026-12-21',
    travelers: 2,
    region: 'kansai',
    extraRegions: [],
    outboundFlight: { code: 'AK176', ...DEFAULT_FLIGHTS_DB.AK176 },
    inboundFlight: { code: 'AK177', ...DEFAULT_FLIGHTS_DB.AK177 },
    drivingMode: false,
    rentalCost: 32000,
    tollFuelCost: 8500,
    useJrPass: true,
    jrPassId: 'jr-kansai-area-3',
    jrPassStartDay: 2,
    useSecondJrPass: false,
    jrPassId2: 'jr-haruka-oneway',
    jrPassStartDay2: 1,
    activeDay: 1,
    timelineViewMode: 'single',
    dayStartTimes: { 1: '20:15', 2: '09:00', 3: '09:00', 4: '09:30' },
    dayHotels: { 1: '東橫INN 大阪難波西', 2: '東橫INN 新大阪東口', 3: '東橫INN 新大阪東口' },
    dropLuggageFirst: { 1: false, 2: true, 3: false },
    activitiesByDay: {
        1: [{ id: 'act-1', title: '道頓堀＆心齋橋晚餐逛街（固力果跑跑人）', tag: '美食逛街', duration: 90, note: '深夜一蘭拉麵或章魚燒宵夜' }],
        2: [{ id: 'act-2', title: '大阪光之饗宴・御堂筋彩燈大道', tag: '光影花火', duration: 90, note: '傍晚點燈後散步拍照最美' }],
        3: [
            { id: 'act-3', title: '清水寺＆二年坂三年坂散策', tag: '經典景點', duration: 150, note: '沿途品嚐抹茶甜點' },
            { id: 'act-4', title: '伏見稻荷大社・千本鳥居', tag: '傳統祭典', duration: 120, note: 'JR奈良線直達' }
        ],
        4: [{ id: 'act-6', title: '黑門市場＆難波最後伴手禮採買', tag: '美食逛街', duration: 120, note: '17:30前出發前往關西機場' }]
    },
    manualTransitMinutes: {},
    routeCache: {},
    trashBin: [],
    trashDrawerOpen: false,
    jpyRate: 0.215,
    fixedExpenses: [{ id: 'fx-1', type: '機票費用', item: '來回機票（2人含行李）', currency: 'TWD', amount: 16800 }],
    expensesByDay: { 1: [{ id: 'ex-1', category: '🍜 美食餐飲', item: '道頓堀章魚燒＆拉麵', amountJpy: 3200 }] },
    recFilter: 'all',
    customRecItems: [],
    expenseSelectedDay: 1
};

let appState = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
let savedTripsList = [];
// 'hub' = 拍立得手札大廳 | 'view' = 點卡片進入（固定基本資訊，專注第2大區行程與記帳） | 'edit' = 完整新增/編輯模式
let currentViewScreen = 'hub';
let lastRouteSnapshot = null;
const photoCache = {};
const googleTopSpotsCache = {};
const googleTopSpotsLoading = {};
const pendingPhotoQueries = {};
const pendingLocationQueries = {};

// =========================================================
// 本機 TTL 持久化快取層（降低 Google Maps Places / Routes 呼叫）
// =========================================================
let persistentGmapsCache = {
    places: {},   // { "京都": { lat, lng, ts } }
    photos: {},   // { "清水寺": { photoName, ts } } -> 僅存不含 Key 的資源路徑
    topSpots: {}  // { "kansai": { items, ts } }
};

function loadPersistentGmapsCache() {
    try {
        const raw = JSON.parse(localStorage.getItem(GMAPS_TTL_CACHE_KEY) || '{}');
        const now = Date.now();
        if (raw.places && typeof raw.places === 'object') {
            Object.entries(raw.places).forEach(([k, v]) => {
                if (v && (now - (v.ts || 0)) < GMAPS_CACHE_TTL_MS) persistentGmapsCache.places[k] = v;
            });
        }
        if (raw.photos && typeof raw.photos === 'object') {
            Object.entries(raw.photos).forEach(([k, v]) => {
                if (v && (now - (v.ts || 0)) < GMAPS_CACHE_TTL_MS) {
                    persistentGmapsCache.photos[k] = v;
                    if (v.photoName && userConfig.gmapsKey) {
                        photoCache[k] = `https://places.googleapis.com/v1/${v.photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`;
                    } else if (v.photoName === '') {
                        photoCache[k] = '';
                    }
                }
            });
        }
        if (raw.topSpots && typeof raw.topSpots === 'object') {
            Object.entries(raw.topSpots).forEach(([regId, v]) => {
                if (v && Array.isArray(v.items) && (now - (v.ts || 0)) < GMAPS_CACHE_TTL_MS) {
                    persistentGmapsCache.topSpots[regId] = v;
                    googleTopSpotsCache[regId] = v.items.map(it => ({
                        ...it,
                        photoUrl: it.photoName && userConfig.gmapsKey
                            ? `https://places.googleapis.com/v1/${it.photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`
                            : (it.photoUrl || '')
                    }));
                }
            });
        }
    } catch (e) {}
}

function savePersistentGmapsCache() {
    try {
        localStorage.setItem(GMAPS_TTL_CACHE_KEY, JSON.stringify(persistentGmapsCache));
    } catch (e) {}
}

function updateGmapsCacheStatsBadge() {
    const el = document.getElementById('gmaps-cache-stats-text');
    if (!el) return;
    const pCount = Object.keys(persistentGmapsCache.places || {}).length;
    const imgCount = Object.keys(persistentGmapsCache.photos || {}).length;
    const rCount = Object.keys(appState.routeCache || {}).length;
    el.textContent = `已快取 ${pCount} 座標・${imgCount} 照片・${rCount} 路線（30 天內免重打 API）`;
}

function clearGmapsLocalCache() {
    persistentGmapsCache = { places: {}, photos: {}, topSpots: {} };
    appState.routeCache = {};
    Object.keys(photoCache).forEach(k => delete photoCache[k]);
    Object.keys(googleTopSpotsCache).forEach(k => delete googleTopSpotsCache[k]);
    try { localStorage.removeItem(GMAPS_TTL_CACHE_KEY); } catch (e) {}
    saveState();
    updateGmapsCacheStatsBadge();
    renderAll();
}

function handleTravelerCountChange(val) {
    appState.travelers = Math.max(1, Number(val) || 2);
    if (appState.travelers < 3) appState.drivingMode = false;
    saveState();
    renderAll();
}

function toggleDrivingMode(checked) {
    appState.drivingMode = Boolean(checked);
    appState.routeCache = {};
    saveState();
    renderAll();
}

function handleRentalCostChange() {
    appState.rentalCost = Math.max(0, Number(document.getElementById('rental-car-cost')?.value || 0));
    appState.tollFuelCost = Math.max(0, Number(document.getElementById('rental-toll-fuel')?.value || 0));
    saveState();
    renderAll();
}

function toggleJrPass(checked) {
    appState.useJrPass = Boolean(checked);
    saveState();
    renderAll();
}

function toggleSecondJrPass(checked) {
    appState.useSecondJrPass = Boolean(checked);
    saveState();
    renderAll();
}

function handleJrPassConfigChange() {
    appState.jrPassId = document.getElementById('jr-pass-select')?.value || appState.jrPassId;
    appState.jrPassStartDay = Number(document.getElementById('jr-pass-start-day')?.value || 1);
    appState.jrPassId2 = document.getElementById('jr-pass-select-2')?.value || appState.jrPassId2;
    appState.jrPassStartDay2 = Number(document.getElementById('jr-pass-start-day-2')?.value || 1);
    saveState();
    renderAll();
}

function updateDayStartTime(val) {
    if (!val) return;
    appState.dayStartTimes[appState.activeDay || 1] = val;
    saveState();
    renderTimeline();
}

function saveDayHotel(val) {
    const d = appState.activeDay || 1;
    appState.dayHotels[d] = String(val || '').trim();
    saveState();
    renderAll();
}

function toggleDropLuggageFirst(checked) {
    const d = appState.activeDay || 1;
    appState.dropLuggageFirst[d] = Boolean(checked);
    saveState();
    renderTimeline();
}

function handleManualDaySwap() {
    const d1 = appState.activeDay || 1;
    const d2 = Number(document.getElementById('swap-target-day')?.value || 0);
    if (!d2 || d1 === d2) return;
    const tmp = appState.activitiesByDay[d1] || [];
    appState.activitiesByDay[d1] = appState.activitiesByDay[d2] || [];
    appState.activitiesByDay[d2] = tmp;
    saveState();
    renderAll();
}

function updateJpyRate(val) {
    const num = Number(val);
    if (num > 0) {
        appState.jpyRate = num;
        saveState();
        renderExpenseSummary();
    }
}

function selectRegion(regionId) {
    if (!REGIONS_META.some(r => r.id === regionId)) return;
    appState.region = regionId;
    appState.extraRegions = (appState.extraRegions || []).filter(r => r !== regionId);
    const meta = REGIONS_META.find(r => r.id === regionId);
    if (meta && !appState.dayHotels[1]) appState.dayHotels[1] = meta.defaultHotel;
    saveState();
    renderAll();
}

function toggleExtraRegion(regionId) {
    if (regionId === appState.region) return;
    const list = new Set(appState.extraRegions || []);
    if (list.has(regionId)) list.delete(regionId);
    else list.add(regionId);
    appState.extraRegions = Array.from(list);
    saveState();
    renderAll();
}

function renderRegionMapAndButtons() {
    const activeReg = appState.region || 'kansai';
    const extras = new Set(appState.extraRegions || []);
    const meta = REGIONS_META.find(r => r.id === activeReg) || REGIONS_META[0];

    const descEl = document.getElementById('region-desc-text');
    if (descEl) descEl.textContent = meta.desc;

    const BASE_REGION_COLORS = {
        hokkaido: '#7BA3C7', tohoku: '#8BB3D6', kanto: '#B6D0E8',
        hokuriku: '#C78A52', chubu: '#D6A168', kansai: '#DFCA68',
        sanin: '#CE8FA0', sanyo: '#BC7488', shikoku: '#DFD88A',
        kyushu: '#C97B8E', okinawa: '#E07A5F'
    };

    document.querySelectorAll('#external-japan-svg-host [data-map-region]').forEach(shape => {
        const rid = shape.getAttribute('data-map-region');
        const isMain = rid === activeReg;
        const isExtra = extras.has(rid);
        const fill = isMain ? '#D94E34' : (isExtra ? '#4A7C59' : (BASE_REGION_COLORS[rid] || '#94A3B8'));
        shape.style.fill = fill;
        shape.setAttribute('fill', fill);
        shape.style.filter = isMain ? 'drop-shadow(0 0 6px rgba(217,78,52,0.75))' : (isExtra ? 'drop-shadow(0 0 5px rgba(74,124,89,0.65))' : 'none');
    });

    const selectorEl = document.getElementById('region-selector');
    if (selectorEl) {
        selectorEl.innerHTML = REGIONS_META.map(r => {
            const active = r.id === activeReg;
            return `<button type="button" onclick="selectRegion('${r.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${active ? 'bg-vermilion text-white shadow-2xs' : 'bg-washi hover:bg-stone-200 text-stone-700'}">${r.name}</button>`;
        }).join('');
    }

    const multiEl = document.getElementById('multi-region-container');
    if (multiEl) {
        multiEl.innerHTML = REGIONS_META.filter(r => r.id !== activeReg).map(r => {
            const checked = extras.has(r.id);
            return `<button type="button" onclick="toggleExtraRegion('${r.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${checked ? 'bg-matcha text-white border-matcha' : 'bg-white hover:bg-emerald-50 text-stone-600 border-stone-200'}">${checked ? '✓ ' : '+ '}${r.name}</button>`;
        }).join('');
    }
}

async function lookupFlights() {
    const outCode = (document.getElementById('outbound-flight-input')?.value || '').trim().toUpperCase();
    const inCode = (document.getElementById('inbound-flight-input')?.value || '').trim().toUpperCase();
    const db = cloudData.flights || DEFAULT_FLIGHTS_DB;

    if (outCode) {
        if (db[outCode]) {
            appState.outboundFlight = { code: outCode, ...db[outCode] };
            appState.dayStartTimes[1] = formatMinutesToClock(parseClockToMinutes(db[outCode].time) + 45);
        } else {
            appState.outboundFlight = { code: outCode, airline: '自訂航班', airport: '日本入境機場', terminal: 'T1', time: '12:00', aircraft: '' };
        }
    }
    if (inCode) {
        if (db[inCode]) {
            appState.inboundFlight = { code: inCode, ...db[inCode] };
        } else {
            appState.inboundFlight = { code: inCode, airline: '自訂航班', airport: '日本離境機場', terminal: 'T1', time: '18:00', aircraft: '' };
        }
    }
    saveState();
    renderAll();
}

function renderFlightBanner() {
    const banner = document.getElementById('flight-result-banner');
    if (!banner) return;
    const out = appState.outboundFlight || { code: 'AK176', ...DEFAULT_FLIGHTS_DB.AK176 };
    const inc = appState.inboundFlight || { code: 'AK177', ...DEFAULT_FLIGHTS_DB.AK177 };
    banner.innerHTML = `
        <div class="bg-white px-3 py-2 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
            <span>🛫 <strong>去程 ${out.code}</strong>（${out.airline || ''}）</span>
            <span class="font-mono font-bold text-indigoJp">${out.airport} ${out.time} 抵達</span>
        </div>
        <div class="bg-white px-3 py-2 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
            <span>🛬 <strong>回程 ${inc.code}</strong>（${inc.airline || ''}）</span>
            <span class="font-mono font-bold text-vermilion">${inc.airport} ${inc.time} 起飛</span>
        </div>
    `;
}

function isPassActiveOnDay(dayNum) {
    if (!appState.useJrPass || appState.drivingMode) return false;
    const passes = cloudData.jrPasses || DEFAULT_JR_PASSES;
    const p1 = passes.find(p => p.id === appState.jrPassId);
    const s1 = Number(appState.jrPassStartDay || 1);
    const active1 = p1 && dayNum >= s1 && dayNum < s1 + (p1.days || 1);
    const p2 = appState.useSecondJrPass ? passes.find(p => p.id === appState.jrPassId2) : null;
    const s2 = Number(appState.jrPassStartDay2 || 1);
    const active2 = p2 && dayNum >= s2 && dayNum < s2 + (p2.days || 1);
    return Boolean(active1 || active2);
}

function renderJrPassAndDrivingSection() {
    const travelers = Number(appState.travelers || 2);
    const totalDays = getTotalDays();
    const driveToggle = document.getElementById('driving-mode-toggle');
    const driveInputs = document.getElementById('driving-cost-inputs');
    const driveBox = document.getElementById('driving-vs-jr-box');
    const lockHint = document.getElementById('driving-lock-hint');

    if (driveToggle) {
        driveToggle.disabled = travelers < 3;
        if (travelers < 3 && appState.drivingMode) appState.drivingMode = false;
        driveToggle.checked = !!appState.drivingMode;
    }
    if (lockHint) {
        lockHint.textContent = travelers >= 3
            ? `✅ 目前 ${travelers} 人同行已解鎖自駕模式，可切換比較租車與 PASS 總花費`
            : `🔒 需 3 人以上同行才會解鎖自駕模式（目前 ${travelers} 人）`;
    }
    if (driveInputs) {
        driveInputs.classList.toggle('hidden', !appState.drivingMode);
        driveInputs.classList.toggle('grid', !!appState.drivingMode);
    }

    const useJrCheck = document.getElementById('use-jr-pass');
    const jrPanel = document.getElementById('jr-pass-config-panel');
    if (useJrCheck) useJrCheck.checked = !!appState.useJrPass;
    if (jrPanel) jrPanel.classList.toggle('hidden', !appState.useJrPass || appState.drivingMode);

    const passes = cloudData.jrPasses || DEFAULT_JR_PASSES;
    const sel1 = document.getElementById('jr-pass-select');
    const sel2 = document.getElementById('jr-pass-select-2');
    const day1Sel = document.getElementById('jr-pass-start-day');
    const day2Sel = document.getElementById('jr-pass-start-day-2');

    const passOptions = passes.map(p => `<option value="${p.id}">${p.name} - ¥${p.priceJpy.toLocaleString()}</option>`).join('');
    const dayOptions = Array.from({ length: totalDays }, (_, i) => i + 1).map(d => `<option value="${d}">Day ${d} 啟用</option>`).join('');

    if (sel1) { sel1.innerHTML = passOptions; sel1.value = appState.jrPassId; }
    if (sel2) { sel2.innerHTML = passOptions; sel2.value = appState.jrPassId2; }
    if (day1Sel) { day1Sel.innerHTML = dayOptions; day1Sel.value = String(appState.jrPassStartDay || 1); }
    if (day2Sel) { day2Sel.innerHTML = dayOptions; day2Sel.value = String(appState.jrPassStartDay2 || 1); }

    const secCheck = document.getElementById('use-second-jr-pass');
    const secBox = document.getElementById('second-jr-pass-box');
    if (secCheck) secCheck.checked = !!appState.useSecondJrPass;
    if (secBox) {
        secBox.classList.toggle('hidden', !appState.useSecondJrPass);
        secBox.classList.toggle('grid', !!appState.useSecondJrPass);
    }

    const p1 = passes.find(p => p.id === appState.jrPassId) || passes[0];
    const p2 = appState.useSecondJrPass ? passes.find(p => p.id === appState.jrPassId2) : null;
    const totalPassJpy = ((p1?.priceJpy || 0) + (p2?.priceJpy || 0)) * travelers;

    const activeDays = [];
    for (let d = 1; d <= totalDays; d++) {
        if (isPassActiveOnDay(d)) activeDays.push(`Day ${d}`);
    }
    const bannerEl = document.getElementById('jr-pass-active-days-banner');
    if (bannerEl) {
        bannerEl.textContent = activeDays.length
            ? `📅 生效日：${activeDays.join('、')}（全員 ${travelers} 人票券總計 ¥${totalPassJpy.toLocaleString()}）`
            : '⚠️ 目前設定天數未涵蓋任何行程日';
    }

    const compEl = document.getElementById('jr-cost-comparison-box');
    if (compEl) {
        compEl.innerHTML = `<strong>票券試算：</strong>每人 ¥${((p1?.priceJpy || 0) + (p2?.priceJpy || 0)).toLocaleString()}，${travelers} 人共 <strong>¥${totalPassJpy.toLocaleString()}</strong>（時間軸於生效日優先排入 JR 特急／新快速路線）。`;
    }

    if (driveBox) {
        driveBox.classList.toggle('hidden', !appState.drivingMode);
        const driveTotal = Number(appState.rentalCost || 0) + Number(appState.tollFuelCost || 0);
        driveBox.innerHTML = `🚗 <strong>自駕總計 ¥${driveTotal.toLocaleString()}</strong>（人均 ¥${Math.round(driveTotal / travelers).toLocaleString()}） vs 全員 JR PASS ¥${totalPassJpy.toLocaleString()}`;
    }
}

// =========================================================
// 距離、詳細轉乘建議、預估車資與 JR PASS 折抵計算
// =========================================================
function findStationCoord(placeName) {
    const clean = String(placeName || '').trim();
    if (!clean) return null;
    const stations = [...(cloudData.stations || []), ...CORE_HUB_STATIONS];
    for (const st of stations) {
        if (clean.includes(st.name) || st.name.includes(clean)) return st;
        if (Array.isArray(st.aliases) && st.aliases.some(a => clean.includes(a))) return st;
    }
    return null;
}

function calcHaversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildSmartFareAndRouteInfo(fromPlace, toPlace, railKm, mins, passActive, isDrive) {
    if (isDrive) {
        const toll = railKm > 15 ? Math.round((railKm * 28) / 10) * 10 : 0;
        return {
            modeBadge: `🚗 自駕導航直達最快（約 ${Math.round(railKm)} km）`,
            detailText: `自駕點對點直達約 ${mins} 分（省去車站轉乘與步行）`,
            fareText: toll > 0 ? `預估過路費約 ¥${toll.toLocaleString()}（自駕模式）` : '市區一般道路免過路費（自駕模式）',
            jrCovered: false
        };
    }

    const f = String(fromPlace || '');
    const t = String(toPlace || '');
    const pair = `${f}|${t}`;

    if (/關西|KIX/.test(pair) && /難波|心齋橋|道頓堀/.test(pair)) {
        return {
            modeBadge: '🚆 南海電鐵特急 Rapi:t / 空港急行直達最快',
            detailText: `南海空港線一班車直達難波加兩端步行約 ${mins} 分（若改搭 JR 需在天王寺/新今宮轉乘約 ${mins + 12} 分）`,
            fareText: passActive
                ? '原價車資 ¥970（南海電鐵需自付／若改搭 JR 關空快速可用 PASS 折抵）'
                : '原價車資 ¥970（南海空港急行／特急 Rapi:t ¥1,490）',
            jrCovered: false
        };
    }

    if (/關西|KIX/.test(pair) && /新大阪|京都|天王寺/.test(pair)) {
        return {
            modeBadge: '🚄 JR 特急 HARUKA 直達最快',
            detailText: `JR 關西機場特快 HARUKA 直達加兩端步行約 ${mins} 分`,
            fareText: passActive ? '原價車資 ¥2,200（持 JR PASS 可全額折抵）' : '原價車資 ¥2,200（單買車票）',
            jrCovered: true
        };
    }

    if (/難波|心齋橋|道頓堀/.test(pair) && /新大阪|梅田|大阪/.test(pair)) {
        return {
            modeBadge: '🚇 地鐵御堂筋線直達最快（亦可搭 JR 轉乘）',
            detailText: `地鐵一班車直達加兩端步行約 ${mins} 分（若改搭 JR 轉乘約需 ${mins + 8} 分）`,
            fareText: passActive
                ? '原價車資 ¥290（地鐵需自付／若改搭 JR 轉乘可用 PASS）'
                : '原價車資 ¥290（ICOCA / 地鐵單程票）',
            jrCovered: false
        };
    }

    if (/新大阪|大阪/.test(pair) && /三ノ宮|神戶|元町|布引香草園/.test(pair)) {
        return {
            modeBadge: '🚄 JR 神戶線新快速直達',
            detailText: `JR 新快速直達神戶三宮/元町，含兩端步行約 ${mins} 分`,
            fareText: passActive ? '原價車資 ¥420（持 JR PASS 可全額折抵）' : '原價車資 ¥420（單買車票）',
            jrCovered: true
        };
    }

    if (/新大阪|大阪/.test(pair) && /京都|稲荷|伏見|嵐山/.test(pair)) {
        return {
            modeBadge: '🚄 JR 京都線新快速直達最快',
            detailText: `JR 新快速直達京都車站（轉乘奈良線/嵯峨野線），含兩端步行約 ${mins} 分`,
            fareText: passActive ? '原價車資 ¥580（持 JR PASS 可全額折抵）' : '原價車資 ¥580（單買車票）',
            jrCovered: true
        };
    }

    if (railKm < 2.2) {
        return {
            modeBadge: '🚶 步行散策直達最快',
            detailText: `沿途步行前往約 ${mins} 分（距離約 ${railKm.toFixed(1)} km）`,
            fareText: '步行免費 ¥0',
            jrCovered: false
        };
    }

    if (railKm <= 16) {
        const estFare = Math.max(210, Math.round((190 + railKm * 14) / 10) * 10);
        return {
            modeBadge: passActive ? '🚃 JR 在來線／地鐵轉乘' : '🚇 地鐵／私鐵直達最快',
            detailText: `市區電車轉乘含兩端進出站步行約 ${mins} 分（約 ${railKm.toFixed(1)} km）`,
            fareText: passActive
                ? `原價車資 ¥${estFare}（JR 路段可用 PASS 折抵／私鐵地鐵需自付）`
                : `原價車資 ¥${estFare}（IC 卡／單程票）`,
            jrCovered: passActive
        };
    }

    const estJrFare = Math.max(420, Math.round((240 + railKm * 16.5) / 10) * 10);
    return {
        modeBadge: passActive ? `🚄 JR 新快速／特急直達（約 ${Math.round(railKm)} km）` : `🚆 鐵道新快速／特急（約 ${Math.round(railKm)} km）`,
        detailText: `搭乘 JR 幹線列車含兩端步行轉乘約 ${mins} 分`,
        fareText: passActive
            ? `原價車資 ¥${estJrFare.toLocaleString()}（持 JR PASS 可全額折抵）`
            : `原價車資 ¥${estJrFare.toLocaleString()}（單買車票）`,
        jrCovered: true
    };
}

function estimateTransitSegment(fromPlace, toPlace, dayNum) {
    const manualKey = `${dayNum}|${fromPlace}|${toPlace}`;
    const passActive = isPassActiveOnDay(dayNum);
    const isDrive = Boolean(appState.drivingMode);

    if (!fromPlace || !toPlace || fromPlace === toPlace) {
        return {
            minutes: Number(appState.manualTransitMinutes[manualKey] || 10),
            modeBadge: '🚶 步行／站內轉乘',
            detailText: '同區域短距離步行移動約 10 分',
            fareText: '步行免費 ¥0'
        };
    }

    const cacheKey = `${isDrive ? 'DRIVE' : 'TRANSIT'}|${fromPlace}|${toPlace}`;
    if (appState.routeCache && appState.routeCache[cacheKey]) {
        const cached = appState.routeCache[cacheKey];
        const finalMins = Number(appState.manualTransitMinutes[manualKey] || cached.minutes);
        return {
            minutes: finalMins,
            modeBadge: cached.modeBadge || '🚆 大眾運輸路線',
            detailText: cached.detailText || `含兩端步行轉乘約 ${finalMins} 分`,
            fareText: cached.fareText || (passActive ? '持 JR PASS 依路線折抵' : '依實際搭乘路線計費')
        };
    }

    if (userConfig.gmapsKey && !window._pendingRoutes?.[cacheKey]) {
        window._pendingRoutes = window._pendingRoutes || {};
        window._pendingRoutes[cacheKey] = true;
        fetchGoogleRouteEstimate(fromPlace, toPlace, cacheKey);
    }

    const s1 = findStationCoord(fromPlace);
    const s2 = findStationCoord(toPlace);
    let railKm = 12;
    let calcMins = isDrive ? 32 : 38;

    if (s1 && s2) {
        railKm = s1.name === s2.name ? 1.2 : calcHaversineKm(s1.lat, s1.lng, s2.lat, s2.lng) * 1.22;
        const doorBuffer = (fromPlace.trim() !== s1.name ? 11 : 0) + (toPlace.trim() !== s2.name ? 11 : 0);
        if (isDrive) {
            calcMins = Math.max(15, Math.round((railKm / 42) * 60 + 10));
        } else if (railKm < 2.2) {
            calcMins = Math.max(10, Math.round(railKm * 13));
        } else if (railKm <= 18) {
            calcMins = Math.max(20, Math.round((railKm / 28) * 60 + 5 + doorBuffer));
        } else {
            const speed = railKm > 120 ? 175 : 95;
            calcMins = Math.max(28, Math.round((railKm / speed) * 60 + 10 + doorBuffer));
        }
    }

    const finalMins = Number(appState.manualTransitMinutes[manualKey] || calcMins);
    const info = buildSmartFareAndRouteInfo(fromPlace, toPlace, railKm, finalMins, passActive, isDrive);
    return {
        minutes: finalMins,
        modeBadge: info.modeBadge,
        detailText: info.detailText,
        fareText: info.fareText
    };
}

async function resolvePlaceLocation(apiKey, placeQuery) {
    const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.location,places.displayName'
        },
        body: JSON.stringify({ textQuery: `${placeQuery} 日本`, maxResultCount: 1 })
    });
    const data = await resp.json();
    const loc = data?.places?.[0]?.location;
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        return { latLng: { latitude: loc.latitude, longitude: loc.longitude } };
    }
    return { address: `${placeQuery} 日本` };
}

async function computeSmartGoogleRoute(apiKey, fromPlace, toPlace, isDrive) {
    const [originLoc, destLoc] = await Promise.all([
        resolvePlaceLocation(apiKey, fromPlace),
        resolvePlaceLocation(apiKey, toPlace)
    ]);

    const tomorrow = new Date(Date.now() + 86400000);
    const yyyy = tomorrow.getUTCFullYear();
    const mm = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getUTCDate()).padStart(2, '0');
    const daytimeDeparture = `${yyyy}-${mm}-${dd}T01:00:00Z`;

    const bodyPayload = {
        origin: { location: originLoc },
        destination: { location: destLoc },
        travelMode: isDrive ? 'DRIVE' : 'TRANSIT',
        languageCode: 'zh-TW'
    };
    if (!isDrive) bodyPayload.departureTime = daytimeDeparture;

    const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails'
        },
        body: JSON.stringify(bodyPayload)
    });
    const data = await resp.json();
    if (!resp.ok && data?.error?.message) throw new Error(data.error.message);
    if (data?.routes?.[0]?.duration) return { route: data.routes[0], fallbackFromDrive: false };

    if (!isDrive) {
        const driveResp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
            },
            body: JSON.stringify({
                origin: { location: originLoc },
                destination: { location: destLoc },
                travelMode: 'DRIVE',
                languageCode: 'zh-TW'
            })
        });
        const driveData = await driveResp.json();
        if (driveData?.routes?.[0]?.duration) return { route: driveData.routes[0], fallbackFromDrive: true };
    }
    return null;
}

async function fetchGoogleRouteEstimate(fromPlace, toPlace, cacheKey) {
    try {
        const isDrive = Boolean(appState.drivingMode);
        const passActive = isPassActiveOnDay(appState.activeDay || 1);
        const result = await computeSmartGoogleRoute(userConfig.gmapsKey, fromPlace, toPlace, isDrive);
        if (!result || !result.route?.duration) return;

        let mins = Math.max(4, Math.round(parseInt(result.route.duration, 10) / 60));
        const distMeters = Number(result.route.distanceMeters || 0);
        const railKm = distMeters > 0 ? distMeters / 1000 : 12;
        if (result.fallbackFromDrive) mins = Math.max(15, Math.round(mins * 1.15 + 14));

        const baseInfo = buildSmartFareAndRouteInfo(fromPlace, toPlace, railKm, mins, passActive, isDrive);
        const steps = result.route.legs?.[0]?.steps || [];
        const lines = [];
        let hasJr = false;
        let hasSubwayOrPrivate = false;

        steps.forEach(s => {
            const td = s.transitDetails;
            if (td) {
                const lineName = td.transitLine?.nameShort || td.transitLine?.name || '';
                const agency = td.transitLine?.agencies?.[0]?.name || '';
                if (/JR|ＪＲ/.test(`${lineName} ${agency}`)) hasJr = true;
                else if (lineName) hasSubwayOrPrivate = true;
                if (lineName) lines.push(lineName);
            }
        });

        let modeBadge = baseInfo.modeBadge;
        let detailText = baseInfo.detailText;
        let fareText = baseInfo.fareText;

        if (!isDrive && lines.length > 0) {
            const uniqueLines = Array.from(new Set(lines)).join(' ➔ ');
            modeBadge = `${hasJr ? '🚄' : '🚇'} 搭乘 ${uniqueLines} 最快`;
            detailText = `Google Maps 實測轉乘加兩端步行約 ${mins} 分（距離 ${railKm.toFixed(1)} km）`;
            const estFare = Math.max(210, Math.round((190 + railKm * 15) / 10) * 10);
            if (passActive && hasJr && !hasSubwayOrPrivate) {
                fareText = `原價車資約 ¥${estFare.toLocaleString()}（持 JR PASS 可全額折抵）`;
            } else if (passActive && hasJr && hasSubwayOrPrivate) {
                fareText = `原價車資約 ¥${estFare.toLocaleString()}（JR 段可用 PASS／地鐵私鐵段需自付）`;
            } else if (passActive && !hasJr) {
                fareText = `原價車資約 ¥${estFare.toLocaleString()}（地鐵／私鐵需自付／若改搭 JR 轉乘可用 PASS）`;
            } else {
                fareText = `原價車資約 ¥${estFare.toLocaleString()}（IC 卡／單買車票）`;
            }
        const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (savedState && typeof savedState === 'object') {
            mergeAppStateSafely(savedState);
        }
        loadPersistentGmapsCache();
        loadSavedTripsRegistry();
    } catch (e) {}
}
async function resolvePlaceLocation(apiKey, placeQuery) {
    const cleanKey = String(placeQuery || '').trim();
    const cached = persistentGmapsCache.places[cleanKey];
    if (cached && (Date.now() - cached.ts) < GMAPS_CACHE_TTL_MS && typeof cached.lat === 'number') {
        return { latLng: { latitude: cached.lat, longitude: cached.lng } };
    }

    if (pendingLocationQueries[cleanKey]) {
        return pendingLocationQueries[cleanKey];
    }

    pendingLocationQueries[cleanKey] = (async () => {
        try {
            const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.location,places.displayName'
                },
                body: JSON.stringify({ textQuery: `${cleanKey} 日本`, maxResultCount: 1 })
            });
            const data = await resp.json();
            const loc = data?.places?.[0]?.location;
            if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                persistentGmapsCache.places[cleanKey] = { lat: loc.latitude, lng: loc.longitude, ts: Date.now() };
                savePersistentGmapsCache();
                updateGmapsCacheStatsBadge();
                return { latLng: { latitude: loc.latitude, longitude: loc.longitude } };
            }
            return { address: `${cleanKey} 日本` };
        } finally {
            delete pendingLocationQueries[cleanKey];
        }
    })();

    return pendingLocationQueries[cleanKey];
}
        });
        cursorMins += 20;
        currentLoc = todayHotel;
    }

    const acts = appState.activitiesByDay[dayNum] || [];
    acts.forEach((act, idx) => {
        const tr = estimateTransitSegment(currentLoc, act.title, dayNum);
        cursorMins += tr.minutes;
        segments.push({
            type: 'activity',
            actIndex: idx,
            id: act.id,
            placeQuery: act.title,
            title: act.title,
            tag: act.tag || '景點',
            note: act.note || '',
            arriveTime: formatMinutesToClock(cursorMins),
            duration: Number(act.duration || 90),
            transit: { ...tr, from: currentLoc, to: act.title }
        });
        cursorMins += Number(act.duration || 90);
        currentLoc = act.title;
    });

    if (dayNum === totalDays) {
        const depAirport = appState.inboundFlight?.airport || '關西國際機場 (KIX)';
        const tr = estimateTransitSegment(currentLoc, depAirport, dayNum);
        cursorMins += tr.minutes;
        segments.push({
            type: 'anchor',
            placeQuery: depAirport,
            title: `🛫 前往離境機場：${depAirport}（班機 ${appState.inboundFlight?.time || '20:45'} 起飛）`,
            arriveTime: formatMinutesToClock(cursorMins),
            duration: 0,
            transit: { ...tr, from: currentLoc, to: depAirport }
        });
    } else if (todayHotel) {
        const tr = estimateTransitSegment(currentLoc, todayHotel, dayNum);
        cursorMins += tr.minutes;
        segments.push({
            type: 'anchor',
            placeQuery: todayHotel,
            title: `🏨 返回今晚住宿：${todayHotel}`,
            arriveTime: formatMinutesToClock(cursorMins),
            duration: 0,
            transit: { ...tr, from: currentLoc, to: todayHotel }
        });
    }

    return segments;
}

// =========================================================
// 智慧順排
// =========================================================
function scoreSlotFit(item, arrivalMins) {
    const text = `${item.title || ''} ${item.tag || ''} ${item.note || ''}`;
    const isNight = /(點燈|燈飾|夜景|展望台|花燈|光雕|光之|聖誕樹|星光|屋台)/.test(text);
    const isFood = /(美食|拉麵|牛排|海鮮|燒肉|市場|壽司|烏龍麵|章魚燒|晚餐|午餐)/.test(text);
    const isDayOnly = /(寺|神社|城|美術館|博物館|動物園|水族館|兼六園|栗林公園|香草園)/.test(text) && !isNight;

    let penalty = 0;
    if (isNight && arrivalMins < 17 * 60) penalty += (17 * 60 - arrivalMins) * 1.4;
    if (isDayOnly && arrivalMins > 16 * 60 + 30) penalty += (arrivalMins - (16 * 60 + 30)) * 1.2;
    if (isFood && !isNight) {
        const inLunch = arrivalMins >= 11 * 60 && arrivalMins <= 14 * 60;
        const inDinner = arrivalMins >= 17 * 60 && arrivalMins <= 20 * 60 + 30;
        if (!inLunch && !inDinner) penalty += 45;
    }
    return penalty;
}

function optimizeActiveDayRoute() {
    const d = appState.activeDay || 1;
    const list = [...(appState.activitiesByDay[d] || [])];
    if (list.length < 2) return;

    lastRouteSnapshot = { day: d, list: list.map(x => ({ ...x })) };
    const totalDays = getTotalDays();
    const startOrigin = d === 1
        ? (appState.outboundFlight?.airport || '關西國際機場 (KIX)')
        : (appState.dayHotels[d - 1] || appState.dayHotels[1] || '住宿飯店');
    const endAnchor = d === totalDays
        ? (appState.inboundFlight?.airport || '關西國際機場 (KIX)')
        : (appState.dayHotels[d] || startOrigin);
    const startMins = parseClockToMinutes(appState.dayStartTimes[d] || '09:30');

    function evaluateOrder(perm) {
        let curLoc = startOrigin;
        let curTime = startMins;
        let totalScore = 0;
        for (const item of perm) {
            const tr = estimateTransitSegment(curLoc, item.title, d);
            curTime += tr.minutes;
            totalScore += tr.minutes + scoreSlotFit(item, curTime);
            curTime += Number(item.duration || 90);
            curLoc = item.title;
        }
        if (endAnchor) totalScore += estimateTransitSegment(curLoc, endAnchor, d).minutes;
        return totalScore;
    }

    let bestPerm = list;
    let bestScore = evaluateOrder(list);

    if (list.length <= 7) {
        const used = Array(list.length).fill(false);
        const curr = [];
        function dfs() {
            if (curr.length === list.length) {
                const sc = evaluateOrder(curr);
                if (sc < bestScore) {
                    bestScore = sc;
                    bestPerm = curr.map(x => ({ ...x }));
                }
                return;
            }
            for (let i = 0; i < list.length; i++) {
                if (used[i]) continue;
                used[i] = true;
                curr.push(list[i]);
                dfs();
                curr.pop();
                used[i] = false;
            }
        }
        dfs();
    }

    appState.activitiesByDay[d] = bestPerm;
    document.getElementById('undo-optimize-btn')?.classList.remove('hidden');
    saveState();
    renderAll();
}

function undoLastRouteOptimization() {
    if (!lastRouteSnapshot) return;
    appState.activitiesByDay[lastRouteSnapshot.day] = lastRouteSnapshot.list;
    appState.activeDay = lastRouteSnapshot.day;
    lastRouteSnapshot = null;
    document.getElementById('undo-optimize-btn')?.classList.add('hidden');
    saveState();
    renderAll();
}

// =========================================================
// 時間軸渲染（大尺寸實景圖卡片 ＋ 三層詳細交通車資卡片）
// =========================================================
function setTimelineViewMode(mode) {
    appState.timelineViewMode = mode;
    const isSingle = mode === 'single';
    document.getElementById('single-day-detail-section')?.classList.toggle('hidden', !isSingle);
    document.getElementById('overview-board-section')?.classList.toggle('hidden', isSingle);

    const sBtn = document.getElementById('view-mode-single-btn');
    const oBtn = document.getElementById('view-mode-overview-btn');
    if (sBtn && oBtn) {
        sBtn.className = isSingle
            ? 'px-3 py-1 rounded-lg bg-indigoJp text-white shadow-2xs transition-all cursor-pointer'
            : 'px-3 py-1 rounded-lg text-stone-600 hover:text-indigoJp transition-all cursor-pointer';
        oBtn.className = !isSingle
            ? 'px-3 py-1 rounded-lg bg-indigoJp text-white shadow-2xs transition-all cursor-pointer'
            : 'px-3 py-1 rounded-lg text-stone-600 hover:text-indigoJp transition-all cursor-pointer';
    }
    if (!isSingle) renderOverviewPuzzleBoard();
}

function switchActiveDay(dayNum) {
    appState.activeDay = dayNum;
    saveState();
    renderAll();
}

function renderDayTabs() {
    const totalDays = getTotalDays();
    if (appState.activeDay > totalDays) appState.activeDay = totalDays;
    const d = appState.activeDay || 1;

    const optBtn = document.getElementById('optimize-route-btn');
    if (optBtn) optBtn.textContent = `✨ 智慧順排 Day ${d}`;

    const passBadge = document.getElementById('active-day-pass-badge');
    if (passBadge) {
        const active = isPassActiveOnDay(d);
        passBadge.textContent = appState.drivingMode
            ? '🚗 自駕導航日'
            : (active ? '🚄 JR PASS 生效日' : '🎫 單買車票／IC卡日');
        passBadge.className = active
            ? 'text-xs font-bold px-2.5 py-1 rounded-full bg-matcha/15 text-matcha'
            : 'text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600';
    }

    const tabsEl = document.getElementById('day-tabs-container');
    if (tabsEl) {
        tabsEl.innerHTML = Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const isActive = day === d;
            const count = (appState.activitiesByDay[day] || []).length;
            return `
                <button type="button" onclick="switchActiveDay(${day})" class="shrink-0 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-indigoJp text-white border-indigoJp shadow-xs' : 'bg-washi hover:bg-stone-100 text-stone-700 border-stone-200'}">
                    Day ${day}・${getDateLabelForDay(day)} <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'}">${count}</span>
                </button>
            `;
        }).join('');
    }

    const startInput = document.getElementById('day-start-time');
    const hotelDayNum = document.getElementById('hotel-day-num');
    const hotelInput = document.getElementById('day-hotel-input');
    const hotelBox = document.getElementById('hotel-setting-box');
    const dropBox = document.getElementById('drop-luggage-box');
    const dropCheck = document.getElementById('drop-luggage-checkbox');
    const swapSel = document.getElementById('swap-target-day');

    if (startInput) startInput.value = appState.dayStartTimes[d] || '09:30';
    if (hotelDayNum) hotelDayNum.textContent = String(d);
    if (hotelInput) hotelInput.value = appState.dayHotels[d] || '';
    if (hotelBox) hotelBox.classList.toggle('opacity-50', d === totalDays);
    if (dropBox) dropBox.classList.toggle('hidden', d === totalDays);
    if (dropCheck) dropCheck.checked = !!appState.dropLuggageFirst[d];
    if (swapSel) {
        swapSel.innerHTML = Array.from({ length: totalDays }, (_, i) => i + 1)
            .filter(x => x !== d)
            .map(x => `<option value="${x}">與 Day ${x} 對調</option>`).join('');
    }

    const weatherEl = document.getElementById('weather-countdown-panel');
    if (weatherEl) {
        const meta = REGIONS_META.find(r => r.id === appState.region) || REGIONS_META[0];
        weatherEl.innerHTML = `🌤️ <strong>${meta.name}季節與穿著提醒：</strong>${meta.weatherTip}`;
    }
}

function updateManualTransit(dayNum, fromPlace, toPlace, mins) {
    const val = Math.max(1, Number(mins) || 15);
    appState.manualTransitMinutes[`${dayNum}|${fromPlace}|${toPlace}`] = val;
    saveState();
    renderTimeline();
}

function updateActivityDuration(dayNum, idx, mins) {
    const act = (appState.activitiesByDay[dayNum] || [])[idx];
    if (!act) return;
    act.duration = Math.max(15, Number(mins) || 60);
    saveState();
    renderTimeline();
}

function removeActivityToTrash(dayNum, idx) {
    const list = appState.activitiesByDay[dayNum] || [];
    const [removed] = list.splice(idx, 1);
    if (removed) {
        appState.trashBin.unshift({ ...removed, originalDay: dayNum });
        saveState();
        renderAll();
    }
}

function moveActivityOrder(dayNum, idx, delta) {
    const list = appState.activitiesByDay[dayNum] || [];
    const target = idx + delta;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    saveState();
    renderAll();
}

function renderTimeline() {
    const container = document.getElementById('puzzle-timeline-container');
    if (!container) return;
    const d = appState.activeDay || 1;
    const segments = buildDaySegments(d);

    container.innerHTML = segments.map((seg, segIdx) => {
        const transitHtml = seg.transit ? `
            <div class="ml-8 sm:ml-11 my-2.5 bg-washi/95 border border-stone-200/90 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100/90 text-emerald-950 border border-emerald-200/80">${seg.transit.modeBadge}</span>
                        <span class="text-xs sm:text-sm font-bold text-sumi">${seg.transit.from} <span class="text-stone-400">➔</span> ${seg.transit.to}</span>
                    </div>
                    <a href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(seg.transit.from)}&destination=${encodeURIComponent(seg.transit.to)}&travelmode=${appState.drivingMode ? 'driving' : 'transit'}" target="_blank" rel="noopener" class="shrink-0 bg-white hover:bg-indigoJp text-indigoJp hover:text-white border border-stone-300 text-xs font-bold px-3 py-1 rounded-xl transition-colors">Google Maps ↗</a>
                </div>
                <p class="text-xs text-stone-600 leading-relaxed">${seg.transit.detailText}</p>
                <div class="pt-1.5 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div class="inline-flex items-center gap-1.5 text-stone-600">
                        <span>約</span>
                        <input type="number" min="1" max="600" value="${seg.transit.minutes}"
                            onchange="updateManualTransit(${d}, '${seg.transit.from.replace(/'/g, "\\'")}', '${seg.transit.to.replace(/'/g, "\\'")}', this.value)"
                            class="w-16 bg-white border border-stone-300 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-indigoJp">
                        <span>分鐘</span>
                    </div>
                    <span class="font-bold text-indigoJp">${seg.transit.fareText}</span>
                </div>
            </div>
        ` : '';

        if (seg.type === 'anchor' || seg.type === 'luggage') {
            const anchorBgId = `tl-anchor-bg-${d}-${segIdx}`;
            const qName = seg.placeQuery || seg.title.replace(/^[^：]+：/, '').replace(/（.*$/, '').trim();
            const anchorBg = photoCache[qName] || '';
            if (userConfig.gmapsKey && photoCache[qName] === undefined) {
                fetchPlacePhotoForCard(qName, anchorBgId);
            }
            return `
                ${transitHtml}
                <div class="relative z-10 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl ${anchorBg ? 'min-h-[104px] px-5 py-4' : 'min-h-[68px] px-4 py-3'} overflow-hidden">
                    <div class="${anchorBg ? '' : 'hidden'} pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0">
                        <div id="${anchorBgId}" class="absolute inset-y-0 right-0 w-[64%] bg-cover bg-center opacity-85 transition-opacity duration-500" style="${anchorBg ? `background-image:url('${anchorBg}');` : ''} -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 35%, black 100%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 35%, black 100%);"></div>
                        <div class="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/75 to-transparent"></div>
                    </div>
                    <span class="relative z-10 font-mono font-bold text-xs text-indigoJp bg-white/95 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 shadow-2xs">${seg.arriveTime}</span>
                    <span class="relative z-10 text-sm sm:text-base font-bold text-slate-800">${seg.title}</span>
                </div>
            `;
        }

        const tlBgId = `tl-card-bg-${d}-${segIdx}`;
        const dbMatch = (cloudData.events || []).find(ev => ev.title === seg.title);
        const initialBg = photoCache[seg.title] || dbMatch?.photoUrl || '';
        if (userConfig.gmapsKey && photoCache[seg.title] === undefined) {
            fetchPlacePhotoForCard(seg.title, tlBgId);
        }

        return `
            ${transitHtml}
            <div data-act-id="${seg.id}" class="puzzle-card relative z-10 bg-white border-2 border-indigoJp/20 hover:border-vermilion/60 rounded-2xl ${initialBg ? 'min-h-[116px] p-5' : 'min-h-[84px] p-4'} shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
                <div class="${initialBg ? '' : 'hidden'} pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0">
                    <div id="${tlBgId}" class="absolute inset-y-0 right-0 w-[68%] sm:w-[64%] bg-cover bg-center opacity-90 transition-opacity duration-500" style="${initialBg ? `background-image:url('${initialBg}');` : ''} -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 32%, black 100%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 32%, black 100%);"></div>
                    <div class="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-transparent"></div>
                </div>

                <div class="relative z-10 flex items-start gap-3.5">
                    <span class="font-mono font-bold text-xs text-white bg-vermilion px-3 py-1.5 rounded-lg shrink-0 mt-0.5 shadow-2xs">${seg.arriveTime}</span>
                    <div class="space-y-1.5">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sakura text-vermilion">${seg.tag}</span>
                            <h4 class="font-serif font-bold text-base sm:text-lg text-indigoJp">${seg.title}</h4>
                        </div>
                        ${seg.note ? `<p class="text-xs sm:text-sm text-stone-600">${seg.note}</p>` : ''}
                    </div>
                </div>
                <div class="relative z-10 flex items-center gap-1.5 self-end sm:self-center shrink-0 bg-white/85 backdrop-blur-2xs px-2.5 py-1.5 rounded-xl border border-stone-200/80 shadow-2xs">
                    <label class="inline-flex items-center gap-1 text-xs text-stone-600 px-1.5 py-0.5">
                        <span>停留</span>
                        <input type="number" min="15" step="15" value="${seg.duration}" onchange="updateActivityDuration(${d}, ${seg.actIndex}, this.value)" class="w-14 bg-white border border-stone-300 rounded-lg px-1.5 py-0.5 text-center font-mono font-bold text-indigoJp">
                        <span>分</span>
                    </label>
                    <button type="button" onclick="moveActivityOrder(${d}, ${seg.actIndex}, -1)" title="上移" class="px-2 py-1 rounded-lg bg-washi hover:bg-stone-200 text-xs font-bold text-stone-600 cursor-pointer">↑</button>
                    <button type="button" onclick="moveActivityOrder(${d}, ${seg.actIndex}, 1)" title="下移" class="px-2 py-1 rounded-lg bg-washi hover:bg-stone-200 text-xs font-bold text-stone-600 cursor-pointer">↓</button>
                    <button type="button" onclick="removeActivityToTrash(${d}, ${seg.actIndex})" title="拆下放進回收桶" class="px-2 py-1 rounded-lg bg-red-50 hover:bg-vermilion text-vermilion hover:text-white text-xs font-bold transition-colors cursor-pointer">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function addRecommendedFromCard(idx) {
    const sel = document.getElementById(`rec-day-select-${idx}`);
    const targetDay = sel ? Number(sel.value) : (appState.activeDay || 1);
    const item = (window._currentRecItems || [])[idx];
    if (!item) return;

    const cardEl = document.getElementById(`rec-puzzle-card-${idx}`);
    if (cardEl) cardEl.classList.add('puzzle-leaving');

    setTimeout(() => {
        if (!appState.activitiesByDay[targetDay]) appState.activitiesByDay[targetDay] = [];
        const newId = 'act-' + Date.now();
        appState.activitiesByDay[targetDay].push({
            id: newId,
            title: item.title,
            tag: item.tag || '經典景點',
            duration: item.duration || 90,
            note: item.note || ''
        });
        appState.activeDay = targetDay;
        saveState();
        renderAll();
    }, 380);
}

// =========================================================
// 全行程總覽看板：FLIP 無抖動平滑擠開讓位拖曳系統
// =========================================================
let draggedPuzzleInfo = null;
let previewDropTarget = null;
let lastFlipMoveTs = 0;

function handlePuzzleDragStart(e, dayNum, idx) {
    const item = (appState.activitiesByDay[dayNum] || [])[idx];
    draggedPuzzleInfo = { dayNum, idx, id: item?.id || `drag-${dayNum}-${idx}`, item };
    previewDropTarget = { targetDay: dayNum, targetIdx: idx };
    lastFlipMoveTs = 0;

    if (e && e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', draggedPuzzleInfo.id); } catch (_) {}
    }

    requestAnimationFrame(() => {
        const draggingEl = document.querySelector(`[data-overview-id="${draggedPuzzleInfo.id}"]`);
        if (draggingEl) {
            draggingEl.style.opacity = '0.35';
            draggingEl.style.borderStyle = 'dashed';
        }
    });
}

function handlePuzzleDragEnd() {
    draggedPuzzleInfo = null;
    previewDropTarget = null;
    renderOverviewPuzzleBoard();
}

function handlePuzzleDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function handlePuzzleDragLeave(e) {}

function applyFlipReorder(nextDay, nextIdx) {
    if (!draggedPuzzleInfo) return;
    if (previewDropTarget && previewDropTarget.targetDay === nextDay && previewDropTarget.targetIdx === nextIdx) return;

    const now = performance.now();
    if (now - lastFlipMoveTs < 110) return;
    lastFlipMoveTs = now;

    const oldRects = new Map();
    document.querySelectorAll('[data-overview-id]').forEach(el => {
        oldRects.set(el.getAttribute('data-overview-id'), el.getBoundingClientRect());
    });

    previewDropTarget = { targetDay: nextDay, targetIdx: nextIdx };
    renderOverviewPuzzleBoard();

    requestAnimationFrame(() => {
        document.querySelectorAll('[data-overview-id]').forEach(el => {
            const id = el.getAttribute('data-overview-id');
            const prev = oldRects.get(id);
            if (!prev) return;
            const curr = el.getBoundingClientRect();
            const dy = prev.top - curr.top;
            const dx = prev.left - curr.left;
            if (Math.abs(dy) > 1 || Math.abs(dx) > 1) {
                el.style.transition = 'none';
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                requestAnimationFrame(() => {
                    el.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
                    el.style.transform = '';
                });
            }
        });
    });
}

function handleOverviewCardDragOver(e, targetDay, slotIdx) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPuzzleInfo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / (rect.height || 1);

    if (relY > 0.28 && relY < 0.72) return;
    const insertIdx = relY >= 0.5 ? slotIdx + 1 : slotIdx;
    applyFlipReorder(targetDay, insertIdx);
}

function handleOverviewColumnDragOver(e, targetDay, listLen) {
    e.preventDefault();
    if (!draggedPuzzleInfo) return;
    const listWrap = e.currentTarget.querySelector('[data-overview-list]');
    if (listWrap) {
        const cards = listWrap.querySelectorAll('[data-overview-id]');
        if (cards.length > 0) {
            const lastRect = cards[cards.length - 1].getBoundingClientRect();
            if (e.clientY <= lastRect.bottom + 4) return;
        }
    }
    applyFlipReorder(targetDay, listLen);
}

function handlePuzzleDropToDay(e, fallbackDay) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPuzzleInfo) return;

    const { dayNum, idx } = draggedPuzzleInfo;
    const destDay = previewDropTarget ? previewDropTarget.targetDay : fallbackDay;
    const destIdx = previewDropTarget ? previewDropTarget.targetIdx : null;

    draggedPuzzleInfo = null;
    previewDropTarget = null;

    const srcList = appState.activitiesByDay[dayNum] || [];
    const [item] = srcList.splice(idx, 1);
    if (item) {
        if (!appState.activitiesByDay[destDay]) appState.activitiesByDay[destDay] = [];
        if (typeof destIdx === 'number' && destIdx >= 0) {
            const boundedIdx = Math.min(appState.activitiesByDay[destDay].length, destIdx);
            appState.activitiesByDay[destDay].splice(boundedIdx, 0, item);
        } else {
            appState.activitiesByDay[destDay].push(item);
        }
        saveState();
        renderAll();
    }
}

function handlePuzzleDropToDelete(e) {
    e.preventDefault();
    if (!draggedPuzzleInfo) return;
    const { dayNum, idx } = draggedPuzzleInfo;
    draggedPuzzleInfo = null;
    previewDropTarget = null;
    removeActivityToTrash(dayNum, idx);
}

function renderOverviewPuzzleBoard() {
    const grid = document.getElementById('overview-puzzle-grid');
    if (!grid) return;
    const totalDays = getTotalDays();

    grid.innerHTML = Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
        const rawActs = appState.activitiesByDay[d] || [];
        let displayActs = rawActs.map((a, origIdx) => ({ ...a, origIdx, isPreviewSlot: false }));

        if (draggedPuzzleInfo && previewDropTarget) {
            if (draggedPuzzleInfo.dayNum === d) {
                displayActs = displayActs.filter(x => x.origIdx !== draggedPuzzleInfo.idx);
            }
            if (previewDropTarget.targetDay === d && draggedPuzzleInfo.item) {
                const insertPos = Math.min(displayActs.length, Math.max(0, previewDropTarget.targetIdx));
                displayActs.splice(insertPos, 0, {
                    ...draggedPuzzleInfo.item,
                    origIdx: draggedPuzzleInfo.idx,
                    isPreviewSlot: true
                });
            }
        }

        const startAnchor = d === 1
            ? `🛬 抵達出發：${appState.outboundFlight?.airport || '關西國際機場 (KIX)'}`
            : `🏨 飯店出發：${appState.dayHotels[d - 1] || appState.dayHotels[1] || '住宿飯店'}`;
        const endAnchor = d === totalDays
            ? `🛫 離境起飛：${appState.inboundFlight?.airport || '關西國際機場 (KIX)'}`
            : `🏨 今晚住宿：${appState.dayHotels[d] || appState.dayHotels[1] || '住宿飯店'}`;

        return `
            <div ondragover="handleOverviewColumnDragOver(event, ${d}, ${displayActs.length})"
                 ondrop="handlePuzzleDropToDay(event, ${d})"
                 class="bg-washi border border-stone-200 rounded-2xl p-3 space-y-2 min-h-[230px] flex flex-col justify-between">
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between border-b border-stone-200 pb-1.5">
                        <span class="text-xs font-bold text-indigoJp">Day ${d}・${getDateLabelForDay(d)}</span>
                        <button type="button" onclick="switchActiveDay(${d}); setTimelineViewMode('single');" class="text-[11px] font-bold text-vermilion underline cursor-pointer">詳情</button>
                    </div>
                    <div class="bg-slate-100/90 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 truncate" title="${startAnchor}">
                        ${startAnchor}
                    </div>
                    <div data-overview-list="${d}" class="space-y-1.5">
                        ${displayActs.map((a, slotIdx) => {
                            if (a.isPreviewSlot) {
                                return `
                                    <div data-overview-id="${a.id}"
                                         class="pointer-events-none rounded-xl border-2 border-dashed border-vermilion bg-vermilion/10 p-2.5 text-xs flex items-center justify-between gap-2 shadow-inner">
                                        <div class="min-w-0 flex-1">
                                            <div class="font-bold text-vermilion truncate">🧩 ${a.title}</div>
                                            <div class="text-[10px] text-vermilion/80 mt-0.5">放開左鍵即嵌入此位置</div>
                                        </div>
                                        <span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-vermilion text-white">預留空位</span>
                                    </div>
                                `;
                            }
                            return `
                                <div data-overview-id="${a.id}"
                                     draggable="true"
                                     ondragstart="handlePuzzleDragStart(event, ${d}, ${a.origIdx})"
                                     ondragend="handlePuzzleDragEnd()"
                                     ondragover="handleOverviewCardDragOver(event, ${d}, ${slotIdx})"
                                     ondrop="handlePuzzleDropToDay(event, ${d})"
                                     class="bg-white border border-stone-200 hover:border-vermilion/60 rounded-xl p-2.5 text-xs shadow-2xs cursor-grab active:cursor-grabbing flex items-center justify-between gap-1.5 select-none">
                                    <div class="min-w-0 flex-1">
                                        <div class="font-bold text-indigoJp leading-snug">${a.title}</div>
                                        <div class="text-[10px] text-stone-400 mt-0.5">${a.tag || '景點'}・${a.duration || 90} 分</div>
                                    </div>
                                    <div class="flex flex-col gap-0.5 shrink-0">
                                        <button type="button" onclick="event.stopPropagation(); moveActivityOrder(${d}, ${a.origIdx}, -1)" ${a.origIdx === 0 ? 'disabled' : ''} title="上移順序" class="px-1.5 py-0.5 rounded bg-washi hover:bg-stone-200 disabled:opacity-30 text-[10px] font-bold text-stone-600 cursor-pointer">↑</button>
                                        <button type="button" onclick="event.stopPropagation(); moveActivityOrder(${d}, ${a.origIdx}, 1)" ${a.origIdx === rawActs.length - 1 ? 'disabled' : ''} title="下移順序" class="px-1.5 py-0.5 rounded bg-washi hover:bg-stone-200 disabled:opacity-30 text-[10px] font-bold text-stone-600 cursor-pointer">↓</button>
                                    </div>
                                </div>
                            `;
                        }).join('') || '<div class="text-[11px] text-stone-400 text-center py-4 border border-dashed border-stone-200 rounded-xl">可拖曳拼圖至此天</div>'}
                    </div>
                </div>
                <div class="bg-slate-100/90 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 truncate mt-1.5" title="${endAnchor}">
                    ${endAnchor}
                </div>
            </div>
        `;
    }).join('');
}

function toggleTrashBinDrawer() {
    appState.trashDrawerOpen = !appState.trashDrawerOpen;
    renderTrashBinUI();
}
function restoreFromTrashBin(idx) {
    const [item] = (appState.trashBin || []).splice(idx, 1);
    if (!item) return;
    const d = appState.activeDay || item.originalDay || 1;
    if (!appState.activitiesByDay[d]) appState.activitiesByDay[d] = [];
    appState.activitiesByDay[d].push({ id: item.id || ('act-' + Date.now()), title: item.title, tag: item.tag, duration: item.duration, note: item.note });
    saveState();
    renderAll();
}
function emptyPuzzleTrashBin() {
    appState.trashBin = [];
    saveState();
    renderTrashBinUI();
}
function renderTrashBinUI() {
    const bar = document.getElementById('puzzle-trash-bin-bar');
    const countBadge = document.getElementById('trash-bin-count-badge');
    const listEl = document.getElementById('puzzle-trash-bin-list');
    const bin = appState.trashBin || [];
    if (bar) bar.classList.toggle('hidden', bin.length === 0);
    if (countBadge) countBadge.textContent = `${bin.length} 塊`;
    if (listEl) {
        listEl.classList.toggle('hidden', !appState.trashDrawerOpen);
        listEl.innerHTML = bin.map((item, idx) => `
            <div class="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200 text-xs">
                <span class="truncate font-bold text-stone-700 mr-2">${item.title}</span>
                <button type="button" onclick="restoreFromTrashBin(${idx})" class="shrink-0 text-[11px] font-bold text-matcha hover:underline cursor-pointer">↩️ 放回 Day ${appState.activeDay}</button>
            </div>
        `).join('');
    }
}

// =========================================================
// 區塊三：推薦拼圖庫（直連 db.json 與 Google Places）
// =========================================================
function setRecFilter(filter) {
    appState.recFilter = filter;
    ['all', 'event', 'spot'].forEach(f => {
        const btn = document.getElementById(`rec-filter-${f}`);
        if (btn) {
            btn.className = f === filter
                ? 'px-3 py-1 rounded-full text-xs font-bold bg-indigoJp text-white cursor-pointer'
                : 'px-3 py-1 rounded-full text-xs font-bold bg-washi text-stone-600 hover:text-indigoJp border border-stone-200 cursor-pointer';
        }
    });
    loadBuiltinRecommendations();
}

async function fetchPlacePhotoForCard(queryTitle, domId) {
    if (!userConfig.gmapsKey || photoCache[queryTitle] !== undefined) return;
    photoCache[queryTitle] = '';
    try {
        const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': userConfig.gmapsKey,
                'X-Goog-FieldMask': 'places.photos'
            },
            body: JSON.stringify({ textQuery: `${queryTitle} 日本` })
        });
        const data = await resp.json();
        const photoName = data?.places?.[0]?.photos?.[0]?.name;
        if (photoName) {
            const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`;
            photoCache[queryTitle] = photoUrl;
            const el = document.getElementById(domId);
        appState.routeCache = appState.routeCache || {};
        appState.routeCache[cacheKey] = { minutes: mins, modeBadge, detailText, fareText, ts: Date.now() };
        saveState();
        updateGmapsCacheStatsBadge();
        renderTimeline();
    } catch (e) {}
}
async function fetchPlacePhotoForCard(queryTitle, domId) {
    const cleanTitle = String(queryTitle || '').trim();
    if (!cleanTitle || !userConfig.gmapsKey || photoCache[cleanTitle] !== undefined || pendingPhotoQueries[cleanTitle]) return;

    const cachedPhoto = persistentGmapsCache.photos[cleanTitle];
    if (cachedPhoto && (Date.now() - cachedPhoto.ts) < GMAPS_CACHE_TTL_MS) {
        const url = cachedPhoto.photoName
            ? `https://places.googleapis.com/v1/${cachedPhoto.photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`
            : '';
        photoCache[cleanTitle] = url;
        if (url) {
            const el = document.getElementById(domId);
            if (el) {
                el.style.backgroundImage = `url('${url}')`;
                el.parentElement?.classList.remove('hidden');
            }
        }
        return;
    }

    pendingPhotoQueries[cleanTitle] = true;
    photoCache[cleanTitle] = '';
    try {
        const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': userConfig.gmapsKey,
                'X-Goog-FieldMask': 'places.photos'
            },
            body: JSON.stringify({ textQuery: `${cleanTitle} 日本`, maxResultCount: 1 })
        });
        const data = await resp.json();
        const photoName = data?.places?.[0]?.photos?.[0]?.name || '';
        persistentGmapsCache.photos[cleanTitle] = { photoName, ts: Date.now() };
        savePersistentGmapsCache();
        updateGmapsCacheStatsBadge();

        if (photoName) {
            const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`;
            photoCache[cleanTitle] = photoUrl;
            const el = document.getElementById(domId);
            if (el) {
                el.style.backgroundImage = `url('${photoUrl}')`;
                el.parentElement?.classList.remove('hidden');
            }
        }
    } catch (e) {
    } finally {
        delete pendingPhotoQueries[cleanTitle];
    }
}

function loadBuiltinRecommendations() {
    if (currentViewScreen !== 'edit') return;
    const grid = document.getElementById('recommendations-grid');
    if (!grid) return;

    const targetRegs = new Set([appState.region, ...(appState.extraRegions || [])]);
    const tripMonth = Number((appState.startDate || '2026-12-18').split('-')[1]) || 12;
    const totalDays = getTotalDays();

    // 主流按需載入策略：僅讀取本機已快取的 4★+ 景點，不於切換地區時自動重打 Google Maps API
    const googleFetchedItems = [];
    targetRegs.forEach(regId => {
        if (Array.isArray(googleTopSpotsCache[regId])) googleFetchedItems.push(...googleTopSpotsCache[regId]);
    });

    const allItems = [
        ...(appState.customRecItems || []),
        ...(cloudData.events || []),
        ...googleFetchedItems
    ];

    const addedTitles = new Set();
    Object.values(appState.activitiesByDay || {}).forEach(dayList => {
        (dayList || []).forEach(act => {
            if (act && act.title) addedTitles.add(String(act.title).trim());
        });
    });

    const seen = new Set();
    const filtered = [];
    for (const item of allItems) {
        if (addedTitles.has(String(item.title || '').trim())) continue;
        if (!targetRegs.has(item.region) && item.region !== 'custom') continue;
        if (appState.recFilter !== 'all' && item.type !== appState.recFilter) continue;
        const key = `${item.region}::${item.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        filtered.push(item);
    }

    filtered.sort((a, b) => {
        const aSeason = (a.months || []).includes(tripMonth) ? 1 : 0;
        const bSeason = (b.months || []).includes(tripMonth) ? 1 : 0;
        return bSeason - aSeason;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-stone-400 bg-washi rounded-2xl border border-dashed border-stone-200">目前此篩選條件下的景點已全數加入行程，或正在載入 db.json 資料...</div>`;
        window._currentRecItems = [];
        return;
    }

    const dayOptionsHtml = Array.from({ length: totalDays }, (_, i) => i + 1)
        .map(d => `<option value="${d}" ${d === appState.activeDay ? 'selected' : ''}>Day ${d} (${getDateLabelForDay(d)})</option>`).join('');

    grid.innerHTML = filtered.map((item, idx) => {
        const isSeasonal = (item.months || []).includes(tripMonth) && (item.months || []).length < 12;
        const regName = REGIONS_META.find(r => r.id === item.region)?.name || '精選推薦';
        const periodLabel = item.periodText || (Array.isArray(item.months) && item.months.length < 12 ? `${item.months.join('・')}月限定` : '四季皆宜');
        const locText = item.location || `${regName}・建議停留 ${item.duration || 90} 分鐘`;
        const ratingBadge = item.rating
            ? `<span class="inline-flex items-center gap-0.5 font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">⭐ ${Number(item.rating).toFixed(1)}${item.userRatingCount ? ` (${item.userRatingCount.toLocaleString()})` : ''}</span>`
            : '';
        const cardId = `rec-puzzle-card-${idx}`;
        const bgImgId = `rec-puzzle-bg-${idx}`;
        const initialBg = photoCache[item.title] || item.photoUrl || '';

        return `
            <div id="${cardId}" class="jigsaw-tile relative bg-white rounded-2xl border-2 ${isSeasonal ? 'border-[#E8B84B]' : 'border-stone-200'} p-4 flex flex-col justify-between gap-3.5 shadow-xs overflow-visible">
                <span aria-hidden="true" class="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 ${isSeasonal ? 'border-[#E8B84B]' : 'border-stone-200'} z-20"></span>
                <span aria-hidden="true" class="pointer-events-none absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5] border-l-2 ${isSeasonal ? 'border-[#E8B84B]' : 'border-stone-200'} z-20"></span>

                <div class="${initialBg ? '' : 'hidden'} pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0">
                    <div id="${bgImgId}" class="absolute inset-y-0 right-0 w-[72%] bg-cover bg-center opacity-80 transition-opacity duration-500" style="${initialBg ? `background-image:url('${initialBg}');` : ''} -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 38%, black 100%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 38%, black 100%);"></div>
                    <div class="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-transparent"></div>
                </div>

                <div class="relative z-10 space-y-2 pr-2">
                    <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
                        ${isSeasonal ? `<span class="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full bg-[#E69D1E] text-white shadow-2xs">🔥 當季限定</span>` : `<span class="inline-flex items-center font-bold px-2.5 py-0.5 rounded-full bg-indigoJp/10 text-indigoJp">${regName}</span>`}
                        <span class="font-bold px-2.5 py-0.5 rounded-full bg-[#FBEAE8] text-[#B84A39]">${item.tag || '經典景點'}</span>
                        ${ratingBadge}
                        <span class="font-medium text-stone-600">${periodLabel}</span>
                    </div>

                    <h4 class="font-serif font-bold text-[16px] sm:text-[17px] text-[#1F2937] leading-snug tracking-tight">${item.title}</h4>

                    <div class="flex items-center gap-1 text-xs font-medium text-stone-600">
                        <span class="text-vermilion shrink-0">📍</span>
                        <span class="truncate">${locText}</span>
                    </div>

                    <p class="text-xs text-stone-600 leading-relaxed line-clamp-2">${item.note || '人氣必訪行程拼圖，可自由調整停留時間'}</p>
                </div>

                <div class="relative z-10 pt-2.5 border-t border-dashed border-stone-200 flex items-center justify-between gap-2">
                    <select id="rec-day-select-${idx}" aria-label="選擇嵌入天數" class="flex-1 min-w-0 bg-white/95 hover:bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-bold text-[#1F2937] cursor-pointer focus:outline-none focus:border-indigoJp">
                        ${dayOptionsHtml}
                    </select>
                    <button type="button" onclick="addRecommendedFromCard(${idx})" class="shrink-0 bg-[#D14836] hover:bg-[#B83928] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer">
                        ＋ 嵌入拼圖
                    </button>
                </div>
            </div>
        `;
    }).join('');
    window._currentRecItems = filtered;
}

async function fetchGoogleTopRatedSpots(forceRefresh = false, targetRegionId = null) {
    const regId = targetRegionId || appState.region || 'kansai';
    if (!userConfig.gmapsKey) {
        if (forceRefresh) openApiKeyModal();
        return;
    }

    const cachedEntry = persistentGmapsCache.topSpots[regId];
    if (!forceRefresh && cachedEntry && (Date.now() - cachedEntry.ts) < GMAPS_CACHE_TTL_MS) {
        googleTopSpotsCache[regId] = cachedEntry.items.map(it => ({
            ...it,
            photoUrl: it.photoName
                ? `https://places.googleapis.com/v1/${it.photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`
                : (it.photoUrl || '')
        }));
        loadBuiltinRecommendations();
        return;
    }
    if (googleTopSpotsLoading[regId]) return;
    googleTopSpotsLoading[regId] = true;

    const btn = document.getElementById('rec-refresh-gmaps-btn');
    if (btn && forceRefresh) btn.textContent = '⏳ 搜尋 4★+ 景點中...';

    const meta = REGIONS_META.find(r => r.id === regId) || REGIONS_META[0];
    const queries = [
        `${meta.desc.split('・')[0]} 必去 觀光景點 神社 夜景`,
        `${meta.desc.split('・')[0]} 必吃 名店 美食街`
    ];

    try {
        const collected = [];
        for (let qi = 0; qi < queries.length; qi++) {
            const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': userConfig.gmapsKey,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.editorialSummary'
                },
                body: JSON.stringify({ textQuery: queries[qi], minRating: 4.0, languageCode: 'zh-TW', maxResultCount: 8 })
            });
            const data = await resp.json();
            const places = Array.isArray(data?.places) ? data.places : [];
            places.forEach((p, idx) => {
                const rating = Number(p.rating || 0);
                const title = p.displayName?.text || '';
                if (!title || rating < 4.0) return;
                const photoName = p.photos?.[0]?.name || '';
                const photoUrl = photoName ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}` : '';
                if (photoName) {
                    photoCache[title] = photoUrl;
                    persistentGmapsCache.photos[title] = { photoName, ts: Date.now() };
                }
                collected.push({
                    id: `gmaps-${regId}-${qi}-${idx}-${title}`,
                    region: regId,
                    type: 'spot',
                    months: [1,2,3,4,5,6,7,8,9,10,11,12],
                    tag: qi === 1 ? '4★+ 美食' : '4★+ 名勝',
                    periodText: 'Google 高分推薦',
                    rating,
                    userRatingCount: Number(p.userRatingCount || 0),
                    location: (p.formattedAddress || '').replace(/^日本、?/, ''),
                    title,
                    duration: 90,
                    note: p.editorialSummary?.text || `Google Maps 評價 ${rating.toFixed(1)} 星人氣推薦地點`,
                    photoName,
                    photoUrl
                });
            });
        }
        googleTopSpotsCache[regId] = collected;
        persistentGmapsCache.topSpots[regId] = {
            ts: Date.now(),
            items: collected.map(({ photoUrl, ...rest }) => rest)
        };
        savePersistentGmapsCache();
        updateGmapsCacheStatsBadge();
        loadBuiltinRecommendations();
    } catch (e) {
    } finally {
        googleTopSpotsLoading[regId] = false;
        if (btn) btn.textContent = '⭐ 探索 4★+ 熱門';
    }
}

// =========================================================
// 記帳本、搜尋、彈窗與雲端同步
// =========================================================
function addFixedExpenseRecord() {
    const type = document.getElementById('fixed-expense-type')?.value || '機票費用';
    const item = (document.getElementById('fixed-expense-item')?.value || '').trim();
    const currency = document.getElementById('fixed-expense-currency')?.value || 'TWD';
    const amount = Number(document.getElementById('fixed-expense-amount')?.value || 0);
    if (!item || amount <= 0) return;
    appState.fixedExpenses.push({ id: 'fx-' + Date.now(), type, item, currency, amount });
    document.getElementById('fixed-expense-item').value = '';
    document.getElementById('fixed-expense-amount').value = '';
    saveState();
    renderExpenseSummary();
}

function removeFixedExpense(id) {
    appState.fixedExpenses = (appState.fixedExpenses || []).filter(f => f.id !== id);
    saveState();
    renderExpenseSummary();
}

function addExpenseRecord() {
    const selDay = Number(document.getElementById('expense-day-select')?.value || 0);
    const day = selDay || appState.expenseSelectedDay || appState.activeDay || 1;
    appState.expenseSelectedDay = day;
    const category = document.getElementById('expense-category')?.value || '🍜 美食餐飲';
    const item = (document.getElementById('expense-item-name')?.value || '').trim();
    const amountJpy = Number(document.getElementById('expense-amount-jpy')?.value || 0);
    if (!item || amountJpy <= 0) return;
    if (!appState.expensesByDay[day]) appState.expensesByDay[day] = [];
    appState.expensesByDay[day].push({ id: 'ex-' + Date.now(), category, item, amountJpy });
    document.getElementById('expense-item-name').value = '';
    document.getElementById('expense-amount-jpy').value = '';
    saveState();
    renderExpenseSummary();
}

function handleExpenseDaySelectChange(val) {
    appState.expenseSelectedDay = Math.max(1, Number(val) || 1);
    saveState();
    renderExpenseSummary();
}

function removeDayExpense(day, id) {
    appState.expensesByDay[day] = (appState.expensesByDay[day] || []).filter(e => e.id !== id);
    saveState();
    renderExpenseSummary();
}

function renderExpenseSummary() {
    const totalDays = getTotalDays();
    let day = Number(appState.expenseSelectedDay || appState.activeDay || 1);
    if (day > totalDays) day = totalDays;
    appState.expenseSelectedDay = day;
    const rate = Number(appState.jpyRate || 0.215);
    const travelers = Number(appState.travelers || 2);

    const daySelectEl = document.getElementById('expense-day-select');
    const dayTitle = document.getElementById('expense-day-list-title');
    if (daySelectEl) {
        daySelectEl.innerHTML = Array.from({ length: totalDays }, (_, i) => i + 1)
            .map(d => `<option value="${d}" ${d === day ? 'selected' : ''}>Day ${d} 開銷</option>`).join('');
    }
    if (dayTitle) dayTitle.textContent = `Day ${day}（${getDateLabelForDay(day)}）消費明細`;

    const fixedListEl = document.getElementById('fixed-expense-list');
    let fixedTwdTotal = 0;
    let fixedJpyTotal = 0;
    if (fixedListEl) {
        fixedListEl.innerHTML = (appState.fixedExpenses || []).map(f => {
            const twd = f.currency === 'TWD' ? f.amount : Math.round(f.amount * rate);
            fixedTwdTotal += twd;
            if (f.currency === 'JPY') fixedJpyTotal += f.amount;
            return `
                <div class="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-stone-200 text-xs">
                    <span><strong>${f.type}</strong>・${f.item}</span>
                    <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-indigoJp">${f.currency === 'TWD' ? 'NT$' : '¥'}${f.amount.toLocaleString()}</span>
                        <button type="button" onclick="removeFixedExpense('${f.id}')" class="text-stone-400 hover:text-vermilion font-bold cursor-pointer">✕</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    const dayRecords = appState.expensesByDay[day] || [];
    const dayJpy = dayRecords.reduce((sum, r) => sum + Number(r.amountJpy || 0), 0);
    const subEl = document.getElementById('expense-day-subtotal');
    if (subEl) subEl.textContent = `¥${dayJpy.toLocaleString()} (約 NT$${Math.round(dayJpy * rate).toLocaleString()})`;

    const recListEl = document.getElementById('expense-day-records-list');
    if (recListEl) {
        recListEl.innerHTML = dayRecords.length ? dayRecords.map(r => `
            <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs">
                <span>${r.category} ${r.item}</span>
                <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-vermilion">¥${r.amountJpy.toLocaleString()}</span>
                    <button type="button" onclick="removeDayExpense(${day}, '${r.id}')" class="text-stone-400 hover:text-vermilion font-bold cursor-pointer">✕</button>
                </div>
            </div>
        `).join('') : '<div class="text-xs text-stone-400 py-3 text-center">尚無消費紀錄</div>';
    }

    let allDaysJpy = 0;
    Object.values(appState.expensesByDay || {}).forEach(arr => {
        (arr || []).forEach(r => { allDaysJpy += Number(r.amountJpy || 0); });
    });

    const passes = cloudData.jrPasses || DEFAULT_JR_PASSES;
    const p1 = passes.find(p => p.id === appState.jrPassId);
    const p2 = appState.useSecondJrPass ? passes.find(p => p.id === appState.jrPassId2) : null;
    const transportJpy = appState.drivingMode
        ? (Number(appState.rentalCost || 0) + Number(appState.tollFuelCost || 0))
        : (appState.useJrPass ? ((p1?.priceJpy || 0) + (p2?.priceJpy || 0)) * travelers : 0);

    const totalJpy = allDaysJpy + transportJpy + fixedJpyTotal;
    const grandTwd = fixedTwdTotal + Math.round((allDaysJpy + transportJpy) * rate);

    const bdEl = document.getElementById('expense-trip-breakdown');
    if (bdEl) {
        bdEl.innerHTML = `
            <div class="flex justify-between"><span>✈️🏨 機票與住宿：</span><span>NT$${fixedTwdTotal.toLocaleString()}</span></div>
            <div class="flex justify-between"><span>🚄🚗 PASS／租車費：</span><span>¥${transportJpy.toLocaleString()}</span></div>
            <div class="flex justify-between"><span>🍜🛍️ 每日當地開銷：</span><span>¥${allDaysJpy.toLocaleString()}</span></div>
        `;
    }
    const gtTwdEl = document.getElementById('expense-grand-total-twd');
    const gtJpyEl = document.getElementById('expense-grand-total-jpy');
    const ppEl = document.getElementById('expense-per-person-badge');
    if (gtTwdEl) gtTwdEl.textContent = `NT$${grandTwd.toLocaleString()}`;
    if (gtJpyEl) gtJpyEl.textContent = `含當地日圓 ¥${totalJpy.toLocaleString()}`;
    if (ppEl) ppEl.textContent = `每人均攤約 NT$${Math.round(grandTwd / travelers).toLocaleString()}`;
}

async function searchCustomPlaceOrQuickAdd() {
    const input = document.getElementById('spot-search-input');
    const val = (input?.value || '').trim();
    if (!val) return;
    input.value = '';

    let rating = 0;
    let userRatingCount = 0;
    let photoUrl = '';
    let locationText = `${REGIONS_META.find(r => r.id === appState.region)?.name || '日本'}・自訂搜尋地點`;
    let noteText = '使用者自訂搜尋加入的行程拼圖，可選擇天數嵌入。';

    if (userConfig.gmapsKey) {
        try {
            const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': userConfig.gmapsKey,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.editorialSummary'
                },
                body: JSON.stringify({ textQuery: `${val} 日本`, languageCode: 'zh-TW', maxResultCount: 1 })
            });
            const data = await resp.json();
            const p = data?.places?.[0];
            if (p) {
                rating = Number(p.rating || 0);
                userRatingCount = Number(p.userRatingCount || 0);
                if (p.formattedAddress) locationText = p.formattedAddress.replace(/^日本、?/, '');
                if (p.editorialSummary?.text) noteText = p.editorialSummary.text;
                const photoName = p.photos?.[0]?.name || '';
                if (photoName) {
                    photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`;
                    photoCache[val] = photoUrl;
                    persistentGmapsCache.photos[val] = { photoName, ts: Date.now() };
                    savePersistentGmapsCache();
                    updateGmapsCacheStatsBadge();
                }
            }
        } catch (e) {}
    }

    appState.customRecItems.unshift({
        id: 'custom-rec-' + Date.now(),
        region: appState.region,
        type: 'spot',
        months: [1,2,3,4,5,6,7,8,9,10,11,12],
        tag: rating >= 4.0 ? '4★+ 搜尋' : '自訂搜尋',
        periodText: '即時加入',
        rating,
        userRatingCount,
        location: locationText,
        title: val,
        duration: 90,
        note: noteText,
        photoUrl
    });
    saveState();
    loadBuiltinRecommendations();
}

function openCustomPieceModal() { document.getElementById('custom-piece-modal')?.classList.remove('hidden'); }
function closeCustomPieceModal() { document.getElementById('custom-piece-modal')?.classList.add('hidden'); }
function submitCustomPiece() {
    const title = (document.getElementById('custom-piece-title')?.value || '').trim();
    if (!title) return;
    const tag = document.getElementById('custom-piece-tag')?.value || '經典景點';
    const duration = Math.max(15, Number(document.getElementById('custom-piece-duration')?.value || 90));
    const note = (document.getElementById('custom-piece-note')?.value || '').trim();
    const d = appState.activeDay || 1;
    if (!appState.activitiesByDay[d]) appState.activitiesByDay[d] = [];
    appState.activitiesByDay[d].push({ id: 'act-' + Date.now(), title, tag, duration, note });
    document.getElementById('custom-piece-title').value = '';
    document.getElementById('custom-piece-note').value = '';
    closeCustomPieceModal();
    saveState();
    renderAll();
}

function openExportModal() {
    const totalDays = getTotalDays();
    const lines = [`【${appState.tripTitle || '旅遊拼圖 Travel Puzzle 行程手札'}】`, `分享代碼：${appState.tripCode || userConfig.syncCode}`, `出發日期：${appState.startDate} ～ ${appState.endDate}（${totalDays}天，${appState.travelers}人）`, ``];
    for (let d = 1; d <= totalDays; d++) {
        lines.push(`=== Day ${d} (${getDateLabelForDay(d)}) ===`);
        const nodes = buildDaySegments(d);
        nodes.forEach(n => {
            if (n.transit) lines.push(`   ↳ ${n.transit.modeBadge}（約 ${n.transit.minutes} 分｜${n.transit.fareText}）`);
            lines.push(`${n.arriveTime} ${n.title}`);
        });
        lines.push('');
    }
    const area = document.getElementById('export-text-area');
    if (area) area.value = lines.join('\n');
    document.getElementById('export-modal')?.classList.remove('hidden');
}
function closeExportModal() { document.getElementById('export-modal')?.classList.add('hidden'); }
function copyExportText() {
    const area = document.getElementById('export-text-area');
    if (area) { area.select(); navigator.clipboard?.writeText(area.value); }
}

function openApiKeyModal() {
    document.getElementById('modal-gmaps-key').value = userConfig.gmapsKey || '';
    document.getElementById('modal-gemini-key').value = userConfig.geminiKey || '';
    document.getElementById('modal-github-token').value = userConfig.githubToken || '';
    document.getElementById('modal-github-user').value = userConfig.githubUser || 'JHANSIANGJYUN';
    document.getElementById('modal-github-repo').value = userConfig.githubRepo || 'travel-puzzle';
    document.getElementById('modal-cloud-db-url').value = userConfig.cloudDbUrl || `https://raw.githubusercontent.com/${userConfig.githubUser || 'JHANSIANGJYUN'}/${userConfig.githubRepo || 'travel-puzzle'}/main/db.json`;
    document.getElementById('modal-sync-code-input').value = appState.tripCode || userConfig.syncCode || DEFAULT_SYNC_CODE;
    const statusLine = document.getElementById('github-sync-status-line');
    if (statusLine) {
        statusLine.textContent = userConfig.githubToken
            ? `🟢 GitHub 雙向同步已就緒 (${appState.tripCode || userConfig.syncCode || DEFAULT_SYNC_CODE})`
            : `🟡 僅唯讀模式（填入 GitHub Token 即可上傳同步）`;
    }
    document.getElementById('gmaps-test-result')?.classList.add('hidden');
    document.getElementById('gemini-test-result')?.classList.add('hidden');
    updateGmapsCacheStatsBadge();
    document.getElementById('api-key-modal')?.classList.remove('hidden');
}
function closeApiKeyModal() { document.getElementById('api-key-modal')?.classList.add('hidden'); }

async function testGoogleMapsApiKey() {
    const key = (document.getElementById('modal-gmaps-key')?.value || '').trim();
    const resEl = document.getElementById('gmaps-test-result');
    const btn = document.getElementById('btn-test-gmaps');
    if (!resEl) return;
    resEl.classList.remove('hidden');
    if (!key) {
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900';
        resEl.textContent = '⚠️ 請先輸入 Google Maps API Key 再測試';
        return;
    }
    if (btn) btn.textContent = '⏳ 測試中...';
    resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700';
    resEl.textContent = '正在實測新版 Routes API 與 Places API (New) 連線...';
    try {
        const result = await computeSmartGoogleRoute(key, '東橫INN 大阪難波西', '東橫INN 新大阪東口', false);
        if (!result || !result.route?.duration) throw new Error('查無路線資料，請確認金鑰權限');
        let mins = Math.round(parseInt(result.route.duration, 10) / 60);
        if (result.fallbackFromDrive) mins = Math.round(mins * 1.15 + 14);
        userConfig.gmapsKey = key;
        appState.routeCache = {};
        saveConfig();
        saveState();
        renderTimeline();
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900';
        resEl.textContent = `✅ Google Maps 連線成功（實測約 ${mins} 分鐘）！已自動重算時間軸。`;
    } catch (err) {
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-800';
        resEl.textContent = `❌ ${err.message}`;
    } finally {
        if (btn) btn.textContent = '🧪 測試連線';
    }
}

async function testGeminiApiKey() {
    const key = (document.getElementById('modal-gemini-key')?.value || '').trim();
    const resEl = document.getElementById('gemini-test-result');
    const btn = document.getElementById('btn-test-gemini');
    if (!resEl) return;
    resEl.classList.remove('hidden');
    if (!key) {
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900';
        resEl.textContent = '⚠️ 請先輸入 Gemini API Key 再測試';
        return;
    }
    if (btn) btn.textContent = '⏳ 測試中...';
    resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700';
    resEl.textContent = '正在連線測試 Gemini API...';
    try {
        const candidateModels = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
        let okModel = '';
        let lastErr = '無法連線 Gemini';
        for (const model of candidateModels) {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: '請只回覆 OK 兩個字' }] }] })
            });
            const data = await resp.json();
            if (resp.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) { okModel = model; break; }
            lastErr = data?.error?.message || `HTTP ${resp.status}`;
            if (resp.status === 400 || resp.status === 401 || resp.status === 403) break;
        }
        if (!okModel) throw new Error(lastErr);
        userConfig.geminiKey = key;
        saveConfig();
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900';
        resEl.textContent = `✅ Gemini API 連線成功（${okModel}）！已自動儲存。`;
    } catch (err) {
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-800';
        resEl.textContent = `❌ Gemini 測試失敗：${err.message}`;
    } finally {
        if (btn) btn.textContent = '🧪 測試連線';
    }
}

function updateCloudUrlPreview() {
    const u = (document.getElementById('modal-github-user')?.value || '').trim();
    const r = (document.getElementById('modal-github-repo')?.value || '').trim();
    const urlInput = document.getElementById('modal-cloud-db-url');
    if (u && r && urlInput) urlInput.value = `https://raw.githubusercontent.com/${u}/${r}/main/db.json`;
}
function copySyncCodeText() {
    const code = (document.getElementById('modal-sync-code-input')?.value || '').trim().toUpperCase();
    if (code) navigator.clipboard?.writeText(code);
}
function applySyncCodeFromModal() {
    const code = (document.getElementById('modal-sync-code-input')?.value || '').trim().toUpperCase();
    if (code) {
        userConfig.syncCode = code;
        appState.tripCode = code;
        saveConfig();
        const lbl = document.getElementById('header-sync-code-label');
        if (lbl) lbl.textContent = code;
    }
}

async function pushTripToGitHub(silent = false) {
    if (!silent) saveApiAndCloudSettings(false);
    const statusLine = document.getElementById('github-sync-status-line');
    const token = (userConfig.githubToken || '').trim();
    const owner = (userConfig.githubUser || 'JHANSIANGJYUN').trim();
    const repo = (userConfig.githubRepo || 'travel-puzzle').trim();
    const code = (appState.tripCode || userConfig.syncCode || 'JP-GPVMP6').trim().toUpperCase();
    if (!token) {
        if (statusLine) statusLine.textContent = '⚠️ 請先填入 GitHub Personal Access Token 再上傳';
        return false;
    }
    if (statusLine) statusLine.textContent = '⏳ 正在上傳行程至 GitHub 雲端...';
    const path = `trips/${code}.json`;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    try {
        let sha = undefined;
        const getResp = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
        if (getResp.ok) { const existing = await getResp.json(); sha = existing.sha; }
        const payloadObj = { updatedAt: new Date().toISOString(), syncCode: code, appState };
        const base64Content = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj, null, 2))));
        const putResp = await fetch(apiUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Sync travel puzzle trip ${code}`, content: base64Content, ...(sha ? { sha } : {}) })
        });
        if (!putResp.ok) throw new Error(`HTTP ${putResp.status}`);
        if (statusLine) statusLine.textContent = `✅ 已成功上傳至 GitHub (${code})！`;
        const hdrBadge = document.getElementById('cloud-sync-header-badge');
        if (hdrBadge) hdrBadge.textContent = `・☁️ ${code} 已同步`;
        return true;
    } catch (err) {
        if (statusLine) statusLine.textContent = `❌ 上傳失敗：${err.message}`;
        return false;
    }
}

async function pullTripFromGitHub(silent = false) {
    if (!silent) saveApiAndCloudSettings(false);
    const statusLine = document.getElementById('github-sync-status-line');
    const owner = (userConfig.githubUser || 'JHANSIANGJYUN').trim();
    const repo = (userConfig.githubRepo || 'travel-puzzle').trim();
    const code = (userConfig.syncCode || 'JP-GPVMP6').trim().toUpperCase();
    if (statusLine) statusLine.textContent = `⏳ 正在從 GitHub 讀取 ${code}...`;

    const candidatePaths = [`trips/${code}.json`, `sync/${code}.json`, `data/${code}.json`, `${code}.json`];
    async function tryFetchPath(filePath) {
        if (userConfig.githubToken) {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
            const resp = await fetch(apiUrl, { headers: { Authorization: `Bearer ${userConfig.githubToken}`, Accept: 'application/vnd.github+json' } });
            if (resp.ok) {
                const fileMeta = await resp.json();
                return JSON.parse(decodeURIComponent(escape(atob(fileMeta.content.replace(/\n/g, '')))));
            }
        }
        for (const branch of ['main', 'master']) {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?t=${Date.now()}`;
            const resp = await fetch(rawUrl, { cache: 'no-store' });
            if (resp.ok) return await resp.json();
        }
        return null;
    }

    try {
        let data = null;
        for (const p of candidatePaths) {
            data = await tryFetchPath(p);
            if (data) break;
        }
        if (!data || typeof data !== 'object') throw new Error(`找不到代碼 ${code} 的雲端行程檔`);
        const loadedState = data.appState || data.state || data.trip || (data.activitiesByDay ? data : null);
        if (!loadedState) throw new Error('雲端檔案格式無法辨識');
        mergeAppStateSafely(loadedState);
        appState.tripCode = code;
        saveState();
        if (currentViewScreen === 'hub') renderTripsHub();
        else renderAll();
        if (statusLine) statusLine.textContent = `✅ 已成功載入雲端行程 (${code})！`;
        const hdrBadge = document.getElementById('cloud-sync-header-badge');
        if (hdrBadge) hdrBadge.textContent = `・☁️ ${code} 已載入`;
        return true;
    } catch (err) {
        if (statusLine) statusLine.textContent = `⚠️ 讀取失敗：${err.message}`;
        return false;
    }
}

function saveApiAndCloudSettings(shouldClose = true) {
    userConfig.gmapsKey = (document.getElementById('modal-gmaps-key')?.value || '').trim();
    userConfig.geminiKey = (document.getElementById('modal-gemini-key')?.value || '').trim();
    userConfig.githubToken = (document.getElementById('modal-github-token')?.value || '').trim();
    userConfig.githubUser = (document.getElementById('modal-github-user')?.value || 'JHANSIANGJYUN').trim();
    userConfig.githubRepo = (document.getElementById('modal-github-repo')?.value || 'travel-puzzle').trim();
    userConfig.cloudDbUrl = (document.getElementById('modal-cloud-db-url')?.value || '').trim();
    applySyncCodeFromModal();
    saveConfig();
    if (shouldClose) { closeApiKeyModal(); syncCloudDatabase(); }
}

function copyShareSetupLink() {
    saveApiAndCloudSettings(false);
    const compactPayload = {
        c: appState.tripCode || userConfig.syncCode || DEFAULT_SYNC_CODE,
        p: userConfig.githubToken || '',
        m: userConfig.gmapsKey || '',
        g: userConfig.geminiKey || '',
        d: userConfig.cloudDbUrl || ''
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(compactPayload)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#setup=${encoded}`;
    navigator.clipboard?.writeText(shareUrl);
    const statusLine = document.getElementById('github-sync-status-line');
    if (statusLine) statusLine.textContent = '🔗 已複製一鍵自動設定連結！貼到手機打開即可免重打金鑰';
}

// =========================================================
// 統一渲染管線 renderAll() 與雙保險啟動器
// =========================================================
function renderAll() {
    const verBadge = document.getElementById('app-version-badge');
    if (verBadge) verBadge.textContent = APP_VERSION;

    const titleIn = document.getElementById('trip-title-input');
    const authorIn = document.getElementById('trip-author-input');
    const coverIn = document.getElementById('trip-cover-input');
    if (titleIn) titleIn.value = appState.tripTitle || '';
    if (authorIn) authorIn.value = appState.tripAuthor || '';
    if (coverIn) coverIn.value = appState.coverUrl || '';

    const sInput = document.getElementById('start-date');
    const eInput = document.getElementById('end-date');
    const tInput = document.getElementById('traveler-count');
    const rInput = document.getElementById('jpy-rate-input');
    const outInput = document.getElementById('outbound-flight-input');
    const inInput = document.getElementById('inbound-flight-input');
    const syncLabel = document.getElementById('header-sync-code-label');

    if (sInput) sInput.value = appState.startDate;
    if (eInput) eInput.value = appState.endDate;
    if (tInput) tInput.value = String(appState.travelers || 2);
    if (rInput) rInput.value = appState.jpyRate || 0.215;
    if (outInput && appState.outboundFlight?.code) outInput.value = appState.outboundFlight.code;
    if (inInput && appState.inboundFlight?.code) inInput.value = appState.inboundFlight.code;
    if (syncLabel) syncLabel.textContent = appState.tripCode || userConfig.syncCode || DEFAULT_SYNC_CODE;

    const days = getTotalDays();
    const badge = document.getElementById('trip-days-badge');
    if (badge) badge.textContent = `${days} 天 ${Math.max(0, days - 1)} 夜`;

    renderFixedSummaryBar();
    renderRegionMapAndButtons();
    renderFlightBanner();
    renderJrPassAndDrivingSection();
    renderDayTabs();
    renderTimeline();
    renderOverviewPuzzleBoard();
    renderTrashBinUI();
    renderExpenseSummary();
    loadBuiltinRecommendations();
}

function bootTravelPuzzleApp() {
    loadSavedData();
    if (appState.routeCache) {
        Object.keys(appState.routeCache).forEach(k => {
            if (!appState.routeCache[k]?.modeBadge || (appState.routeCache[k]?.modeLabel || '').includes('門到門路線')) {
                delete appState.routeCache[k];
            }
        });
    }
    switchWorkspaceMode('hub');
    syncCloudDatabase();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTravelPuzzleApp);
} else {
    bootTravelPuzzleApp();
}
