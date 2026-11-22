// 旅遊拼圖 Travel Puzzle 主程式 (v1.45)
// 直接讀取倉庫內 db.json（無需額外 data.js）與 japan.svg

const APP_VERSION = 'v1.47';
const STORAGE_KEY = 'travel_puzzle_jp_state_v1';
const CONFIG_KEY = 'travel_puzzle_jp_config_v1';
const LEGACY_CONFIG_KEYS = ['travel_puzzle_config', 'jp_travel_config_v1', 'travelPuzzleConfig', 'travel_puzzle_api_keys', 'travel_puzzle_settings', 'tp_config_v1'];
const DEFAULT_SYNC_CODE = 'JP-GPVMP6';

// 11 大分區基礎詮釋資料（飯店預設值與季節提醒）
const REGIONS_META = [
    { id: 'kansai', name: '關西地區', desc: '滋賀・京都・大阪・兵庫・奈良・和歌山', defaultHotel: '東橫INN 大阪難波西', weatherTip: '12月關西白天約 8–12°C，早晚偏冷建議洋蔥式穿搭；雨天可優先安排地下街或京都車站室內景點。' },
    { id: 'kanto', name: '關東地區', desc: '茨城・栃木・群馬・埼玉・千葉・東京・神奈川', defaultHotel: '東橫INN 東京站新大橋前', weatherTip: '12月東京晴朗乾燥約 6–13°C，風大建議攜帶防風外套與護唇膏。' },
    { id: 'hokkaido', name: '北海道', desc: '札幌・小樽・函館・富良野・美瑛與登別溫泉', defaultHotel: 'JR Inn 札幌駅南口', weatherTip: '冬季零下積雪路面易滑，務必穿著防滑防水雪靴與發熱衣。' },
    { id: 'tohoku', name: '東北地區', desc: '青森・岩手・秋田・宮城・山形・福島', defaultHotel: '東橫INN 仙台站西口中央', weatherTip: '東北山區冬季降雪豐沛，搭乘地方 JR 線路請預留班次緩衝。' },
    { id: 'hokuriku', name: '北陸地區', desc: '新潟・富山・石川（金澤／能登）・福井', defaultHotel: 'Via Inn 金澤（JR金澤站直結）', weatherTip: '北陸冬季多雨雪且濕冷，建議攜帶折疊傘與防水鞋款。' },
    { id: 'chubu', name: '中部地區', desc: '長野・山梨・靜岡・岐阜・愛知・三重', defaultHotel: '東橫INN 名古屋站新幹線口', weatherTip: '中部山區（高山／白川鄉）氣溫較低，市區名古屋晴朗乾爽。' },
    { id: 'sanin', name: '山陰地區', desc: '鳥取縣（砂丘／柯南小鎮）・島根縣（出雲大社／松江城）', defaultHotel: 'Dormy Inn 出雲', weatherTip: '日本海側冬季雲量較多偶有陣雪，建議備妥雨具與保暖衣物。' },
    { id: 'sanyo', name: '山陽地區', desc: '岡山縣（倉敷）・廣島縣（宮島）・山口縣（下關／角島）', defaultHotel: 'Via Inn 廣島新幹線口', weatherTip: '瀨戶內海沿岸晴天率高、氣候溫和，非常適合鐵道跳島漫遊。' },
    { id: 'shikoku', name: '四國地區', desc: '香川・德島・愛媛・高知', defaultHotel: 'JR Clement Inn 高松', weatherTip: '四國瀨戶內側溫暖少雨，適合搭配 JR 四國周遊券慢活巡禮。' },
    { id: 'kyushu', name: '九州地區', desc: '福岡・佐賀・長崎・大分・熊本・宮崎・鹿兒島', defaultHotel: '東橫INN 博多口站前', weatherTip: '北九州冬季海風較強約 7–13°C，阿蘇山區氣溫更低需注意保暖。' },
    { id: 'okinawa', name: '沖繩地區', desc: '沖繩本島（那霸／美國村／美麗海水族館）與離島', defaultHotel: '東橫INN 那霸旭橋站前', weatherTip: '沖繩冬季約 17–21°C 舒適宜人，海邊風大建議帶件薄風衣。' }
];

// 離線或 db.json 尚未載入前的最小必要保底資料
const MINIMAL_FALLBACK_PASSES = [
    { id: 'jr-kansai-area-3', name: 'JR 關西地區鐵路周遊券 (3日)', priceJpy: 5800, days: 3, regions: ['kansai'], airportCovered: true },
    { id: 'jr-kansai-wide-5', name: 'JR 關西廣域鐵路周遊券 (5日)', priceJpy: 12000, days: 5, regions: ['kansai', 'sanyo', 'sanin'], airportCovered: true },
    { id: 'jr-tokyo-wide-3', name: 'JR 東京廣域周遊券 (3日)', priceJpy: 15000, days: 3, regions: ['kanto'], airportCovered: true },
    { id: 'jr-whole-japan-7', name: 'JR 全日本鐵路通票 (7日普通車)', priceJpy: 50000, days: 7, regions: ['kansai', 'kanto', 'hokkaido', 'kyushu', 'chubu', 'tohoku', 'sanyo', 'sanin', 'shikoku'], airportCovered: true }
];

const MINIMAL_FALLBACK_FLIGHTS = {
    AK176: { airline: 'AirAsia 亞洲航空', airport: '關西國際機場 (KIX)', terminal: 'T1', time: '19:30', aircraft: 'A321neo', region: 'kansai' },
    AK177: { airline: 'AirAsia 亞洲航空', airport: '關西國際機場 (KIX)', terminal: 'T1', time: '20:45', aircraft: 'A321neo', region: 'kansai' }
};

let userConfig = {
    gmapsKey: '',
    geminiKey: '',
    githubToken: '',
    githubUser: 'JHANSIANGJYUN',
    githubRepo: 'travel-puzzle',
    cloudDbUrl: 'https://raw.githubusercontent.com/JHANSIANGJYUN/travel-puzzle/main/db.json',
    syncCode: 'JP-GPVMP6'
};

// 直接對應你 db.json 結構的動態資料庫容器
let cloudData = {
    updatedAt: '',
    jrPasses: [...MINIMAL_FALLBACK_PASSES],
    flights: { ...MINIMAL_FALLBACK_FLIGHTS },
    events: [],
    stations: []
};

const DEFAULT_APP_STATE = {
    startDate: '2026-12-18',
    endDate: '2026-12-21',
    travelers: 2,
    region: 'kansai',
    extraRegions: [],
    outboundFlight: { code: 'AK176', ...MINIMAL_FALLBACK_FLIGHTS.AK176 },
    inboundFlight: { code: 'AK177', ...MINIMAL_FALLBACK_FLIGHTS.AK177 },
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
        1: [
            { id: 'act-1', title: '道頓堀＆心齋橋晚餐逛街（固力果跑跑人）', tag: '美食逛街', duration: 90, note: '深夜一蘭拉麵或章魚燒宵夜' }
        ],
        2: [
            { id: 'act-2', title: '大阪光之饗宴・御堂筋彩燈大道', tag: '光影花火', duration: 90, note: '傍晚點燈後散步拍照最美' }
        ],
        3: [
            { id: 'act-3', title: '清水寺＆二年坂三年坂散策', tag: '經典景點', duration: 150, note: '沿途品嚐抹茶甜點' },
            { id: 'act-4', title: '伏見稻荷大社・千本鳥居', tag: '傳統祭典', duration: 120, note: 'JR 奈良線直達最省時' }
        ],
        4: [
            { id: 'act-6', title: '黑門市場＆難波最後伴手禮採買', tag: '季節美食', duration: 120, note: '17:30前出發前往關西機場' }
        ]
    },
    manualTransitMinutes: {},
    routeCache: {},
    trashBin: [],
    trashDrawerOpen: false,
    jpyRate: 0.215,
    fixedExpenses: [
        { id: 'fx-1', type: '機票費用', item: '來回機票（2人含行李）', currency: 'TWD', amount: 16800 }
    ],
    expensesByDay: {
        1: [{ id: 'ex-1', category: '🍜 美食餐飲', item: '道頓堀章魚燒＆拉麵', amountJpy: 3200 }]
    },
    recFilter: 'all',
    customRecItems: [],
    expenseSelectedDay: 1
};

let appState = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
let lastRouteSnapshot = null;
let lastInsertedActId = null;
const photoCache = {};
const googleTopSpotsCache = {};
const googleTopSpotsLoading = {};

// =========================================================
// 健康檢查與防呆驗證
// =========================================================
function showHealthWarning(msg) {
    const el = document.getElementById('health-check-banner');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function normalizeDbEventItem(raw) {
    if (!raw || typeof raw !== 'object' || !raw.title) return null;
    const cat = String(raw.category || raw.tag || '經典景點').trim();
    const inferredType = raw.type
        ? raw.type
        : (/(祭典|光影|花火|賞花|紅葉|點燈)/.test(cat) ? 'event' : 'spot');
    const months = Array.isArray(raw.months) && raw.months.length
        ? raw.months.map(Number)
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return {
        id: raw.id || `db-ev-${raw.title}`,
        region: String(raw.region || 'kansai').toLowerCase(),
        type: inferredType,
        months,
        tag: cat,
        periodText: raw.dateLabel || raw.periodText || (months.length < 12 ? `${months.join('・')}月限定` : '全年皆宜'),
        location: raw.location || '',
        title: String(raw.title).trim(),
        wikiJa: raw.wikiJa || '',
        duration: Number(raw.duration || 90),
        isIndoor: Boolean(raw.isIndoor),
        note: raw.desc || raw.note || '',
        photoUrl: raw.imageUrl || raw.photoUrl || ''
    };
}

// =========================================================
// 自動讀取同目錄或 GitHub 倉庫的 japan.svg（47 都道府縣 11 分區著色）
// =========================================================
const PREF_TO_REGION_11 = [
    'hokkaido',
    'tohoku','tohoku','tohoku','tohoku','tohoku','tohoku',
    'kanto','kanto','kanto','kanto','kanto','kanto','kanto',
    'hokuriku','hokuriku','hokuriku','hokuriku',
    'chubu','chubu','chubu','chubu','chubu','chubu',
    'kansai','kansai','kansai','kansai','kansai','kansai',
    'sanin','sanin',
    'sanyo','sanyo','sanyo',
    'shikoku','shikoku','shikoku','shikoku',
    'kyushu','kyushu','kyushu','kyushu','kyushu','kyushu','kyushu',
    'okinawa'
];

function classifySvgNodeToRegion(el, idx, totalCount, svgBox) {
    const rawAttr = `${el.id || ''} ${el.getAttribute('class') || ''} ${el.getAttribute('data-name') || ''} ${el.getAttribute('title') || ''}`.toLowerCase();
    if (/hokkaido|北海道/.test(rawAttr)) return 'hokkaido';
    if (/aomori|iwate|miyagi|akita|yamagata|fukushima|東北/.test(rawAttr)) return 'tohoku';
    if (/ibaraki|tochigi|gunma|saitama|chiba|tokyo|kanagawa|關東|関東/.test(rawAttr)) return 'kanto';
    if (/niigata|toyama|ishikawa|fukui|北陸/.test(rawAttr)) return 'hokuriku';
    if (/yamanashi|nagano|gifu|shizuoka|aichi|mie|中部/.test(rawAttr)) return 'chubu';
    if (/shiga|kyoto|osaka|hyogo|nara|wakayama|關西|関西|近畿/.test(rawAttr)) return 'kansai';
    if (/tottori|shimane|山陰/.test(rawAttr)) return 'sanin';
    if (/okayama|hiroshima|yamaguchi|山陽/.test(rawAttr)) return 'sanyo';
    if (/tokushima|kagawa|ehime|kochi|四國|四国/.test(rawAttr)) return 'shikoku';
    if (/fukuoka|saga|nagasaki|kumamoto|oita|miyazaki|kagoshima|九州/.test(rawAttr)) return 'kyushu';
    if (/okinawa|沖繩|沖縄/.test(rawAttr)) return 'okinawa';

    const jisMatch = rawAttr.match(/(?:pref|jp|p)[-_]?0?([1-9]|[1-3][0-9]|4[0-7])(?:\D|$)/);
    if (jisMatch) return PREF_TO_REGION_11[Number(jisMatch[1]) - 1] || 'kansai';
    if (totalCount === 47 && idx < 47) return PREF_TO_REGION_11[idx];

    try {
        const bb = el.getBBox();
        const nx = (bb.x + bb.width / 2 - svgBox.x) / (svgBox.width || 1);
        const ny = (bb.y + bb.height / 2 - svgBox.y) / (svgBox.height || 1);
        if (nx < 0.24 && ny > 0.72) return 'okinawa';
        if (nx > 0.72 && ny < 0.26) return 'hokkaido';
        if (nx > 0.64 && ny >= 0.26 && ny < 0.51) return 'tohoku';
        if (nx > 0.59 && ny >= 0.51 && ny < 0.65) return 'kanto';
        if (nx >= 0.48 && nx <= 0.64 && ny >= 0.45 && ny < 0.56) return 'hokuriku';
        if (nx >= 0.47 && nx <= 0.60 && ny >= 0.56 && ny < 0.69) return 'chubu';
        if (nx >= 0.37 && nx < 0.48 && ny >= 0.57 && ny < 0.72) return 'kansai';
        if (nx >= 0.23 && nx < 0.38 && ny >= 0.56 && ny < 0.635) return 'sanin';
        if (nx >= 0.22 && nx < 0.37 && ny >= 0.635 && ny < 0.69) return 'sanyo';
        if (nx >= 0.28 && nx < 0.40 && ny >= 0.69 && ny < 0.76) return 'shikoku';
        return 'kyushu';
    } catch (e) {
        return 'kansai';
    }
}

async function tryLoadExternalJapanSvg() {
    const host = document.getElementById('external-japan-svg-host');
    if (!host) return;

    const owner = (userConfig.githubUser || 'JHANSIANGJYUN').trim();
    const repo = (userConfig.githubRepo || 'travel-puzzle').trim();
    const candidateUrls = [
        `./japan.svg?t=${Date.now()}`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/japan.svg?t=${Date.now()}`
    ];

    for (const url of candidateUrls) {
        try {
            const resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) continue;
            const svgText = await resp.text();
            if (!svgText.includes('<svg')) continue;

            host.innerHTML = svgText;
            const extSvg = host.querySelector('svg');
            if (!extSvg) continue;

            const origW = parseFloat(extSvg.getAttribute('width')) || 437.33;
            const origH = parseFloat(extSvg.getAttribute('height')) || 516.02;
            extSvg.classList.add('w-full', 'h-full');
            extSvg.removeAttribute('width');
            extSvg.removeAttribute('height');
            extSvg.setAttribute('viewBox', '68 -4 378 396');

            const ns = 'http://www.w3.org/2000/svg';
            const insetRect = document.createElementNS(ns, 'rect');
            insetRect.setAttribute('x', '78');
            insetRect.setAttribute('y', '14');
            insetRect.setAttribute('width', '175');
            insetRect.setAttribute('height', '132');
            insetRect.setAttribute('rx', '16');
            insetRect.setAttribute('fill', 'rgba(255,255,255,0.92)');
            insetRect.setAttribute('stroke', '#94A3B8');
            insetRect.setAttribute('stroke-width', '1.3');
            insetRect.setAttribute('stroke-dasharray', '4 3');
            extSvg.insertBefore(insetRect, extSvg.firstChild);

            const insetText = document.createElementNS(ns, 'text');
            insetText.setAttribute('x', '165');
            insetText.setAttribute('y', '136');
            insetText.setAttribute('text-anchor', 'middle');
            insetText.setAttribute('font-size', '12');
            insetText.setAttribute('fill', '#334155');
            insetText.setAttribute('font-weight', 'bold');
            insetText.textContent = '沖繩列島';
            extSvg.insertBefore(insetText, insetRect.nextSibling);

            const vb = { x: 0, y: 0, width: origW, height: origH };
            const shapes = Array.from(extSvg.querySelectorAll('path, polygon'));
            shapes.forEach((shape, idx) => {
                const parentReg = shape.closest('[data-map-region]');
                const regId = parentReg
                    ? parentReg.getAttribute('data-map-region')
                    : classifySvgNodeToRegion(shape, idx, shapes.length, vb);
                shape.setAttribute('data-map-region', regId);
                shape.style.cursor = 'pointer';
                shape.style.transition = 'fill 0.2s ease, filter 0.2s ease';
                shape.setAttribute('stroke', '#FFFFFF');
                shape.setAttribute('stroke-width', '0.75');

                if (shape.id === 'JP-47' || regId === 'okinawa') {
                    shape.setAttribute('transform', 'translate(68, -622) scale(1.55)');
                }
                shape.addEventListener('click', () => selectRegion(regId));
            });

            renderRegionMapAndButtons();
            return;
        } catch (e) {}
    }
    host.innerHTML = '<div class="text-xs text-stone-500">⚠️ 無法載入 japan.svg，請確認檔案已上傳至倉庫根目錄或使用上方區域按鈕切換</div>';
}

// =========================================================
// 表單與互動事件處理器
// =========================================================
function handleDateRangeChange(changedSide) {
    const sEl = document.getElementById('start-date');
    const eEl = document.getElementById('end-date');
    if (!sEl || !eEl) return;
    if (sEl.value) appState.startDate = sEl.value;
    if (eEl.value) appState.endDate = eEl.value;
    if (appState.endDate < appState.startDate) {
        if (changedSide === 'start') {
            appState.endDate = appState.startDate;
            eEl.value = appState.endDate;
        } else {
            appState.startDate = appState.endDate;
            sEl.value = appState.startDate;
        }
    }
    saveState();
    renderAll();
}

function handleTravelerCountChange(val) {
    appState.travelers = Math.max(1, Number(val) || 2);
    saveState();
    renderAll();
}

function toggleDrivingMode(checked) {
    appState.drivingMode = Boolean(checked);
    saveState();
    renderAll();
}

function handleRentalCostChange() {
    appState.rentalCost = Math.max(0, Number(document.getElementById('rental-car-cost')?.value || 0));
    appState.tollFuelCost = Math.max(0, Number(document.getElementById('rental-toll-fuel')?.value || 0));
    saveState();
    renderJrPassAndDrivingSection();
    renderExpenseSummary();
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
    const d = appState.activeDay || 1;
    appState.dayStartTimes[d] = val || '09:30';
    saveState();
    renderTimeline();
}

function saveDayHotel(val) {
    const d = appState.activeDay || 1;
    const totalDays = getTotalDays();
    const clean = String(val || '').trim();
    for (let day = d; day < totalDays; day++) {
        appState.dayHotels[day] = clean;
    }
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
    const r = Number(val);
    if (r > 0) {
        appState.jpyRate = r;
        saveState();
        renderExpenseSummary();
    }
}

// =========================================================
// 基礎時間、日期與資料持久化工具（含 Schema 防呆合併）
// =========================================================
function parseClockToMinutes(clockStr) {
    const m = String(clockStr || '09:00').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 540;
    return Math.min(23, Math.max(0, Number(m[1]))) * 60 + Math.min(59, Math.max(0, Number(m[2])));
}

function applyConfigObjectWithAliases(rawObj) {
    if (!rawObj || typeof rawObj !== 'object') return;
    if (rawObj.c) userConfig.syncCode = String(rawObj.c).trim().toUpperCase();
    if (rawObj.p) userConfig.githubToken = String(rawObj.p).trim();
    if (rawObj.m) userConfig.gmapsKey = String(rawObj.m).trim();
    if (rawObj.g) userConfig.geminiKey = String(rawObj.g).trim();
    if (rawObj.d) userConfig.cloudDbUrl = String(rawObj.d).trim();

    if (rawObj.syncCode) userConfig.syncCode = String(rawObj.syncCode).trim().toUpperCase();
    if (rawObj.githubToken) userConfig.githubToken = String(rawObj.githubToken).trim();
    if (rawObj.gmapsKey) userConfig.gmapsKey = String(rawObj.gmapsKey).trim();
    if (rawObj.geminiKey) userConfig.geminiKey = String(rawObj.geminiKey).trim();
    if (rawObj.cloudDbUrl) userConfig.cloudDbUrl = String(rawObj.cloudDbUrl).trim();
    if (rawObj.githubUser) userConfig.githubUser = String(rawObj.githubUser).trim();
    if (rawObj.githubRepo) userConfig.githubRepo = String(rawObj.githubRepo).trim();
}

function formatMinutesToClock(totalMins) {
    const normalized = ((Math.round(totalMins) % 1440) + 1440) % 1440;
    const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
    const mm = String(normalized % 60).padStart(2, '0');
    return `${hh}:${mm}`;
}

function getTotalDays() {
    const s = new Date((appState.startDate || '2026-12-18') + 'T00:00:00');
    const e = new Date((appState.endDate || '2026-12-21') + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 4;
    const diff = Math.round((e - s) / 86400000) + 1;
    return Math.min(14, Math.max(1, diff));
}

function getDateLabelForDay(dayNum) {
    const base = new Date((appState.startDate || '2026-12-18') + 'T00:00:00');
    if (isNaN(base.getTime())) return `Day ${dayNum}`;
    base.setDate(base.getDate() + (dayNum - 1));
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${base.getMonth() + 1}/${base.getDate()} (${weekdays[base.getDay()]})`;
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        const statusEl = document.getElementById('auto-save-status');
        if (statusEl) statusEl.textContent = `☁️ 已儲存 (${new Date().toTimeString().slice(0, 5)})`;
    } catch (e) {}
}

function saveConfig() {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(userConfig));
        if (userConfig.gmapsKey) localStorage.setItem('gmaps_api_key', userConfig.gmapsKey);
        if (userConfig.geminiKey) localStorage.setItem('gemini_api_key', userConfig.geminiKey);
        if (userConfig.githubToken) localStorage.setItem('github_token', userConfig.githubToken);
        if (userConfig.syncCode) localStorage.setItem('sync_code', userConfig.syncCode);
    } catch (e) {}
}

function mergeAppStateSafely(rawState) {
    if (!rawState || typeof rawState !== 'object') return;
    const base = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
    appState = {
        ...base,
        ...rawState,
        activitiesByDay: (rawState.activitiesByDay && typeof rawState.activitiesByDay === 'object') ? rawState.activitiesByDay : base.activitiesByDay,
        expensesByDay: (rawState.expensesByDay && typeof rawState.expensesByDay === 'object') ? rawState.expensesByDay : base.expensesByDay,
        fixedExpenses: Array.isArray(rawState.fixedExpenses) ? rawState.fixedExpenses : base.fixedExpenses,
        trashBin: Array.isArray(rawState.trashBin) ? rawState.trashBin : [],
        extraRegions: Array.isArray(rawState.extraRegions) ? rawState.extraRegions : [],
        customRecItems: Array.isArray(rawState.customRecItems) ? rawState.customRecItems : [],
        dayStartTimes: (rawState.dayStartTimes && typeof rawState.dayStartTimes === 'object') ? rawState.dayStartTimes : base.dayStartTimes,
        dayHotels: (rawState.dayHotels && typeof rawState.dayHotels === 'object') ? rawState.dayHotels : base.dayHotels,
        dropLuggageFirst: (rawState.dropLuggageFirst && typeof rawState.dropLuggageFirst === 'object') ? rawState.dropLuggageFirst : base.dropLuggageFirst,
        manualTransitMinutes: (rawState.manualTransitMinutes && typeof rawState.manualTransitMinutes === 'object') ? rawState.manualTransitMinutes : {},
        routeCache: (rawState.routeCache && typeof rawState.routeCache === 'object') ? rawState.routeCache : {}
    };
}

function loadSavedData() {
    try {
        const hash = window.location.hash || '';
        if (hash.startsWith('#setup=')) {
            const encodedPart = decodeURIComponent(hash.slice(7));
            let rawStr = '';
            try {
                rawStr = decodeURIComponent(atob(encodedPart));
            } catch (_) {
                rawStr = atob(encodedPart);
            }
            const parsedSetup = JSON.parse(rawStr);
            applyConfigObjectWithAliases(parsedSetup);
            saveConfig();
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        for (const legacyKey of LEGACY_CONFIG_KEYS) {
            const legacyRaw = localStorage.getItem(legacyKey);
            if (legacyRaw) applyConfigObjectWithAliases(JSON.parse(legacyRaw));
        }

        const savedCfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
        applyConfigObjectWithAliases(savedCfg);

        if (!userConfig.gmapsKey) {
            userConfig.gmapsKey = localStorage.getItem('gmaps_api_key') || localStorage.getItem('google_maps_api_key') || localStorage.getItem('googleMapsApiKey') || '';
        }
        if (!userConfig.geminiKey) {
            userConfig.geminiKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('geminiApiKey') || '';
        }
        if (!userConfig.githubToken) {
            userConfig.githubToken = localStorage.getItem('github_token') || localStorage.getItem('gh_token') || localStorage.getItem('githubToken') || '';
        }
        if (!userConfig.syncCode) {
            userConfig.syncCode = localStorage.getItem('sync_code') || localStorage.getItem('device_sync_code') || DEFAULT_SYNC_CODE;
        }
        if (!userConfig.githubUser) userConfig.githubUser = 'JHANSIANGJYUN';
        if (!userConfig.githubRepo) userConfig.githubRepo = 'travel-puzzle';
        if (!userConfig.cloudDbUrl) {
            userConfig.cloudDbUrl = `https://raw.githubusercontent.com/${userConfig.githubUser}/${userConfig.githubRepo}/main/db.json`;
        }
        saveConfig();

        const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (savedState && typeof savedState === 'object') {
            mergeAppStateSafely(savedState);
        }
    } catch (e) {}
}

// =========================================================
// 直接從 db.json 讀取完整資料（雙路徑：優先同層 ./db.json，備援 GitHub Raw）
// =========================================================
async function syncCloudDatabase() {
    const badge = document.getElementById('cloud-db-version-badge');
    const modalStatus = document.getElementById('modal-cloud-db-status');
    const candidateUrls = [
        `./db.json?t=${Date.now()}`,
        userConfig.cloudDbUrl ? `${userConfig.cloudDbUrl}${userConfig.cloudDbUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : ''
    ].filter(Boolean);

    for (const url of candidateUrls) {
        try {
            const resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) continue;
            const data = await resp.json();
            if (!data || typeof data !== 'object') continue;

            if (Array.isArray(data.jrPasses) && data.jrPasses.length) {
                cloudData.jrPasses = data.jrPasses;
            }
            if (data.flights && typeof data.flights === 'object') {
                cloudData.flights = { ...MINIMAL_FALLBACK_FLIGHTS, ...data.flights };
            }
            if (Array.isArray(data.events)) {
                cloudData.events = data.events.map(normalizeDbEventItem).filter(Boolean);
            }
            if (Array.isArray(data.stations)) {
                cloudData.stations = data.stations.filter(s => s && s.name && typeof s.lat === 'number' && typeof s.lng === 'number');
            }
            cloudData.updatedAt = data.updatedAt || '';

            const shortDate = cloudData.updatedAt ? cloudData.updatedAt.slice(0, 10) : '已連線';
            if (badge) badge.textContent = `🌐 db.json (${shortDate})`;
            if (modalStatus) modalStatus.textContent = `🟢 已同步 (${cloudData.updatedAt || '最新'}｜共 ${cloudData.events.length} 筆景點)`;
            renderAll();
            return;
        } catch (e) {}
    }
    if (badge) badge.textContent = '🌐 db.json 離線保底';
    if (modalStatus) modalStatus.textContent = '🟡 無法連線 db.json，目前使用內建保底資料';
}

// =========================================================
// 日本互動地圖、航班、JR PASS 與自駕試算渲染
// =========================================================
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
        hokkaido: '#7BA3C7',
        tohoku: '#8BB3D6',
        kanto: '#B6D0E8',
        hokuriku: '#C78A52',
        chubu: '#D6A168',
        kansai: '#DFCA68',
        sanin: '#CE8FA0',
        sanyo: '#BC7488',
        shikoku: '#DFD88A',
        kyushu: '#C97B8E',
        okinawa: '#E07A5F'
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
    const db = cloudData.flights || MINIMAL_FALLBACK_FLIGHTS;

    if (outCode) {
        if (db[outCode]) {
            appState.outboundFlight = { code: outCode, ...db[outCode] };
            const arrMins = parseClockToMinutes(db[outCode].time) + 45;
            appState.dayStartTimes[1] = formatMinutesToClock(arrMins);
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
    const out = appState.outboundFlight || { code: 'AK176', ...MINIMAL_FALLBACK_FLIGHTS.AK176 };
    const inc = appState.inboundFlight || { code: 'AK177', ...MINIMAL_FALLBACK_FLIGHTS.AK177 };
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
    const passes = cloudData.jrPasses || MINIMAL_FALLBACK_PASSES;
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

    const passes = cloudData.jrPasses || MINIMAL_FALLBACK_PASSES;
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
// 距離與移動時間估算（直接讀取 db.json 的 stations 座標與路線）
// =========================================================
const STATION_ALIASES = {
    '関西国際空港': ['關西國際機場', '關西機場', 'KIX'],
    '新大阪': ['新大阪駅', '新大阪東口'],
    '大阪': ['梅田', '大阪駅'],
    '難波': ['なんば', '道頓堀', '心齋橋', '大阪難波'],
    '天王寺': ['阿倍野'],
    '京都': ['京都車站', '京都駅'],
    '祇園四条': ['清水寺', '二年坂', '祇園', '河原町'],
    '嵯峨嵐山': ['嵐山', '渡月橋'],
    '稲荷': ['伏見稻荷'],
    '三ノ宮': ['神戶', '三宮', '美利堅公園', '南京町'],
    '姫路': ['姬路'],
    '奈良': ['奈良公園', '東大寺'],
    '宇治': ['平等院'],
    '成田空港': ['成田國際機場', 'NRT'],
    '羽田空港': ['羽田機場', 'HND'],
    '東京': ['東京車站', '丸之內'],
    '渋谷': ['澀谷', '原宿', '明治神宮'],
    '浅草': ['淺草', '雷門'],
    '押上': ['晴空塔'],
    '新千歳空港': ['新千歲機場', 'CTS'],
    '札幌': ['大通公園', '狸小路'],
    '小樽': ['小樽運河'],
    '博多': ['福岡', 'FUK', '天神', '中洲'],
    '由布院': ['湯布院', '金鱗湖'],
    '那覇空港': ['那霸', 'OKA', '國際通'],
    '金沢': ['金澤', '兼六園'],
    '仙台': ['定禪寺通'],
    '広島': ['廣島', '宮島'],
    '高松': ['栗林公園']
};

function findStationCoord(placeName) {
    const clean = String(placeName || '').trim();
    if (!clean) return null;
    const stations = cloudData.stations || [];
    for (const st of stations) {
        if (clean.includes(st.name) || st.name.includes(clean)) return st;
        const aliases = STATION_ALIASES[st.name] || [];
        if (aliases.some(a => clean.includes(a))) return st;
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

function estimateTransitSegment(fromPlace, toPlace, dayNum) {
    const key = `${dayNum}|${fromPlace}|${toPlace}`;
    const passActive = isPassActiveOnDay(dayNum);

    function buildPassFareNote(fareJpy, jrEligible, jrAltText = '') {
        if (appState.drivingMode) return `預估油資＋過路費約 ¥${fareJpy.toLocaleString()}`;
        if (jrEligible === 'full') {
            return passActive
                ? `原價車資 ¥${fareJpy.toLocaleString()}（持 JR PASS 可全額折抵）`
                : `預估車資 ¥${fareJpy.toLocaleString()}（JR 路線・未啟用 PASS 需購票）`;
        }
        if (jrEligible === 'alt') {
            return passActive
                ? `原價車資 ¥${fareJpy.toLocaleString()}（${jrAltText || '地鐵需自付／若改搭 JR 轉乘可用 PASS'}）`
                : `預估車資 ¥${fareJpy.toLocaleString()}（私鐵／地鐵路線）`;
        }
        return `預估車資 ¥${fareJpy.toLocaleString()}（非 JR 路線・需使用 IC 卡自付）`;
    }

    if (appState.manualTransitMinutes[key]) {
        const m = Number(appState.manualTransitMinutes[key]);
        return {
            minutes: m,
            modeBadge: appState.drivingMode ? '🚗 自駕導航（手動微調）' : '🚆 大眾運輸（手動微調）',
            detailDesc: `已手動微調移動時間為 ${m} 分鐘`,
            fareText: buildPassFareNote(320, 'full'),
            fareJpy: 320,
            jrCovered: true,
            isManual: true
        };
    }

    if (!fromPlace || !toPlace || fromPlace === toPlace) {
        return {
            minutes: 10,
            modeBadge: '🚶 步行／站內轉乘',
            detailDesc: '同區域步行或站內轉乘約 10 分',
            fareText: '免費步行（¥0）',
            fareJpy: 0,
            jrCovered: true,
            isManual: false
        };
    }

    const cacheKey = `${appState.drivingMode ? 'DRIVE' : 'TRANSIT'}|${fromPlace}|${toPlace}`;
    if (appState.routeCache && appState.routeCache[cacheKey] && appState.routeCache[cacheKey].modeBadge) {
        const cached = appState.routeCache[cacheKey];
        return {
            minutes: cached.minutes,
            modeBadge: cached.modeBadge,
            detailDesc: cached.detailDesc,
            fareText: buildPassFareNote(cached.fareJpy || 320, cached.jrEligible || 'full', cached.jrAltText || ''),
            fareJpy: cached.fareJpy || 320,
            jrCovered: cached.jrEligible === 'full',
            isManual: false
        };
    }

    if (userConfig.gmapsKey && !window._pendingRoutes?.[cacheKey]) {
        window._pendingRoutes = window._pendingRoutes || {};
        window._pendingRoutes[cacheKey] = true;
        fetchGoogleRouteEstimate(fromPlace, toPlace, cacheKey);
    }

    const s1 = findStationCoord(fromPlace);
    const s2 = findStationCoord(toPlace);
    const hasDoorWalk1 = s1 && fromPlace.trim() !== s1.name && !fromPlace.includes('機場') && !fromPlace.includes('空港');
    const hasDoorWalk2 = s2 && toPlace.trim() !== s2.name && !toPlace.includes('機場') && !toPlace.includes('空港');
    const doorBufferMins = (hasDoorWalk1 ? 11 : 0) + (hasDoorWalk2 ? 11 : 0);

    if (s1 && s2) {
        if (s1.name === s2.name) {
            return {
                minutes: 14,
                modeBadge: appState.drivingMode ? '🚗 市區短程移動' : '🚶 步行散策直達',
                detailDesc: '同商圈步行即可抵達，加計進出站約 14 分',
                fareText: '免費步行（¥0）',
                fareJpy: 0,
                jrCovered: true,
                isManual: false
            };
        }
        const pair = `${s1.name}->${s2.name}`;
        const revPair = `${s2.name}->${s1.name}`;
        const railKm = calcHaversineKm(s1.lat, s1.lng, s2.lat, s2.lng) * 1.22;

        if (appState.drivingMode) {
            const mins = Math.max(18, Math.round((railKm / 42) * 60 + 12));
            const toll = Math.max(300, Math.round(railKm * 28));
            return {
                minutes: mins,
                modeBadge: `🚗 高速／市區自駕導航（約 ${Math.round(railKm)} km）`,
                detailDesc: `自駕含停車步行約 ${mins} 分`,
                fareText: buildPassFareNote(toll, 'none'),
                fareJpy: toll,
                jrCovered: false,
                isManual: false
            };
        }

        if (pair === '難波->新大阪' || revPair === '難波->新大阪') {
            return {
                minutes: 40,
                modeBadge: '🚇 地鐵御堂筋線直達最快（亦可搭 JR 轉乘）',
                detailDesc: '地鐵一班車直達加兩端步行約 40 分（若改搭 JR 轉乘約需 48 分）',
                fareText: buildPassFareNote(290, 'alt', '地鐵需自付／若改搭 JR 轉乘可用 PASS'),
                fareJpy: 290,
                jrCovered: false,
                isManual: false
            };
        }
        if (pair === '新大阪->三ノ宮' || revPair === '新大阪->三ノ宮' || pair === '大阪->三ノ宮' || revPair === '大阪->三ノ宮') {
            const m = pair.includes('新大阪') ? 48 : 42;
            return {
                minutes: m,
                modeBadge: '🚄 JR 神戶線新快速直達最快',
                detailDesc: `JR 新快速直達神戶三宮／元町，含兩端步行約 ${m} 分`,
                fareText: buildPassFareNote(420, 'full'),
                fareJpy: 420,
                jrCovered: true,
                isManual: false
            };
        }
        if (pair === '関西国際空港->難波' || revPair === '関西国際空港->難波') {
            return {
                minutes: 56,
                modeBadge: '🚆 南海電鐵空港急行直達最快（亦可搭 JR 轉乘）',
                detailDesc: '南海電鐵直達難波站加步行約 56 分（若持 JR PASS 搭 JR 至今宮／難波約 68 分）',
                fareText: buildPassFareNote(970, 'alt', '南海電鐵需自付／若改搭 JR 路線可用 PASS'),
                fareJpy: 970,
                jrCovered: false,
                isManual: false
            };
        }
        if (pair === '関西国際空港->新大阪' || revPair === '関西国際空港->新大阪' || pair === '関西国際空港->京都' || revPair === '関西国際空港->京都') {
            const isKyoto = pair.includes('京都');
            const m = isKyoto ? 92 : 64;
            const fare = isKyoto ? 3110 : 2590;
            return {
                minutes: m,
                modeBadge: `🚄 JR 特急 HARUKA 直達最快`,
                detailDesc: `關西機場特快 HARUKA 一班車直達${isKyoto ? '京都' : '新大阪'}，含兩端步行約 ${m} 分`,
                fareText: buildPassFareNote(fare, 'full'),
                fareJpy: fare,
                jrCovered: true,
                isManual: false
            };
        }
        if (pair === '新大阪->京都' || revPair === '新大阪->京都' || pair === '大阪->京都' || revPair === '大阪->京都') {
            const m = pair.includes('新大阪') ? 44 : 49;
            return {
                minutes: m,
                modeBadge: '🚄 JR 京都線新快速直達最快',
                detailDesc: `JR 新快速直達京都站，含兩端步行約 ${m} 分（比私鐵更省時）`,
                fareText: buildPassFareNote(580, 'full'),
                fareJpy: 580,
                jrCovered: true,
                isManual: false
            };
        }

        if (railKm < 2.5) {
            const m = Math.max(12, Math.round(railKm * 13));
            return {
                minutes: m,
                modeBadge: '🚶 步行移動最順路',
                detailDesc: `距離僅約 ${railKm.toFixed(1)} km，步行約 ${m} 分即可抵達`,
                fareText: '免費步行（¥0）',
                fareJpy: 0,
                jrCovered: true,
                isManual: false
            };
        }
        if (railKm <= 18) {
            const rideMins = Math.round((railKm / 28) * 60 + 5);
            const totalMins = Math.max(20, rideMins + doorBufferMins);
            const fare = Math.max(210, Math.round(railKm * 22 / 10) * 10);
            const lineHint = s2.line ? `（${s2.line.split('・')[0]}）` : '';
            return {
                minutes: totalMins,
                modeBadge: passActive ? `🚃 JR 在來線直達${lineHint}` : `🚇 地鐵／私鐵直達最快${lineHint}`,
                detailDesc: `乘車加兩端車站步行轉乘約 ${totalMins} 分（約 ${railKm.toFixed(1)} km）`,
                fareText: buildPassFareNote(fare, passActive ? 'full' : 'alt', '地鐵私鐵需自付／搭 JR 路線可用 PASS'),
                fareJpy: fare,
                jrCovered: passActive,
                isManual: false
            };
        }
        const speed = railKm > 120 ? 175 : 95;
        const mins = Math.max(28, Math.round((railKm / speed) * 60 + 10 + doorBufferMins));
        const fare = Math.max(580, Math.round(railKm * 24 / 10) * 10);
        return {
            minutes: mins,
            modeBadge: `🚄 JR 特急／新快速直達最快`,
            detailDesc: `JR 幹線快速移動約 ${Math.round(railKm)} km，含兩端步行約 ${mins} 分`,
            fareText: buildPassFareNote(fare, 'full'),
            fareJpy: fare,
            jrCovered: true,
            isManual: false
        };
    }

    return {
        minutes: appState.drivingMode ? 35 : 38,
        modeBadge: appState.drivingMode ? '🚗 自駕導航移動' : (passActive ? '🚆 JR／地鐵轉乘最快' : '🚇 地鐵／巴士轉乘最快'),
        detailDesc: '含車站進出步行與轉乘等待約 38 分',
        fareText: buildPassFareNote(320, passActive ? 'full' : 'alt'),
        fareJpy: 320,
        jrCovered: passActive,
        isManual: false
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

    const primaryMode = isDrive ? 'DRIVE' : 'TRANSIT';
    const bodyPayload = {
        origin: { location: originLoc },
        destination: { location: destLoc },
        travelMode: primaryMode,
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
        const walkResp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
            },
            body: JSON.stringify({
                origin: { location: originLoc },
                destination: { location: destLoc },
                travelMode: 'WALK',
                languageCode: 'zh-TW'
            })
        });
        const walkData = await walkResp.json();
        const walkDist = Number(walkData?.routes?.[0]?.distanceMeters || 99999);
        if (walkData?.routes?.[0]?.duration && walkDist <= 1800) {
            return { route: walkData.routes[0], fallbackFromDrive: false, isWalkOnly: true };
        }

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
        if (driveData?.routes?.[0]?.duration) {
            return { route: driveData.routes[0], fallbackFromDrive: true };
        }
    }
    return null;
}

async function fetchGoogleRouteEstimate(fromPlace, toPlace, cacheKey) {
    try {
        const isDrive = appState.drivingMode;
        const result = await computeSmartGoogleRoute(userConfig.gmapsKey, fromPlace, toPlace, isDrive);
        if (!result || !result.route?.duration) return;

        let mins = Math.max(4, Math.round(parseInt(result.route.duration, 10) / 60));
        const distMeters = Number(result.route.distanceMeters || 0);
        if (result.fallbackFromDrive) mins = Math.max(15, Math.round(mins * 1.15 + 14));
        const km = distMeters ? `（${(distMeters / 1000).toFixed(1)} km）` : '';
        const steps = result.route.legs?.[0]?.steps || [];
        const transitDetailsList = [];
        let walkMinsTotal = 0;

        steps.forEach(s => {
            if (s.travelMode === 'WALK' && s.staticDuration) {
                walkMinsTotal += Math.round(parseInt(s.staticDuration, 10) / 60);
            }
            const td = s.transitDetails;
            if (td) {
                const lineName = td.transitLine?.nameShort || td.transitLine?.name || '';
                const headsign = td.headsign ? `（往${td.headsign}）` : '';
                const stopExit = td.arrivalStop?.name ? `至 ${td.arrivalStop.name}` : '';
                if (lineName) transitDetailsList.push(`${lineName}${headsign}${stopExit}`);
            }
        });

        let lineText = '';
        let detailDesc = '';
        let jrEligible = 'full';
        let jrAltText = '';
        const estimatedFareJpy = Math.max(200, Math.round((distMeters / 1000) * 23 / 10) * 10);

        if (isDrive) {
            lineText = `🚗 Google Maps 自駕導航最快${km}`;
            detailDesc = `自駕行車時間約 ${mins} 分`;
            jrEligible = 'none';
        } else if (result.isWalkOnly || (steps.length > 0 && transitDetailsList.length === 0 && distMeters <= 1600)) {
            lineText = `🚶 步行前往最順路${km}`;
            detailDesc = `短距離步行約 ${mins} 分即可直達`;
            jrEligible = 'full';
        } else if (transitDetailsList.length > 0) {
            const uniqueLines = Array.from(new Set(transitDetailsList));
            const hasJr = uniqueLines.some(l => /JR|新快速|はるか|HARUKA|新幹線/i.test(l));
            const hasSubwayOrPrivate = uniqueLines.some(l => /線|メトロ|地鐵|南海|阪急|阪神|京阪|近鐵|私鐵/i.test(l) && !/JR/i.test(l));
            const walkNote = walkMinsTotal > 0 ? `，含兩端步行約 ${walkMinsTotal} 分` : '';
            lineText = `${hasJr ? '🚄' : '🚇'} 搭乘 ${uniqueLines[0]} 最快`;
            detailDesc = `${uniqueLines.join(' ➔ ')}${walkNote}，約 ${mins} 分`;
            if (hasJr && !hasSubwayOrPrivate) {
                jrEligible = 'full';
            } else if (!hasJr && hasSubwayOrPrivate) {
                jrEligible = 'alt';
                jrAltText = '私鐵／地鐵需自付（若改搭 JR 路線可用 PASS）';
            } else {
                jrEligible = 'alt';
                jrAltText = 'JR 區段可用 PASS／私鐵地鐵區段需自付';
            }
        } else {
            lineText = `🚃 電車／巴士轉乘最快${km}`;
            detailDesc = `大眾運輸含步行轉乘約 ${mins} 分`;
            jrEligible = 'alt';
        }

        appState.routeCache = appState.routeCache || {};
        appState.routeCache[cacheKey] = {
            minutes: mins,
            modeBadge: lineText,
            detailDesc,
            fareJpy: (result.isWalkOnly || distMeters <= 1600) ? 0 : estimatedFareJpy,
            jrEligible,
            jrAltText
        };
        saveState();
        renderTimeline();
    } catch (e) {}
}

function buildDaySegments(dayNum) {
    const totalDays = getTotalDays();
    const startClock = appState.dayStartTimes[dayNum] || '09:30';
    let cursorMins = parseClockToMinutes(startClock);
    const segments = [];

    const startOrigin = dayNum === 1
        ? (appState.outboundFlight?.airport || '關西國際機場 (KIX)')
        : (appState.dayHotels[dayNum - 1] || appState.dayHotels[1] || '住宿飯店');

    segments.push({
        type: 'anchor',
        placeQuery: startOrigin,
        title: dayNum === 1 ? `🛬 抵達出發：${startOrigin}` : `🏨 飯店出發：${startOrigin}`,
        arriveTime: formatMinutesToClock(cursorMins),
        duration: 0,
        transit: null
    });

    let currentLoc = startOrigin;
    const todayHotel = appState.dayHotels[dayNum] || '';
    if (dayNum < totalDays && appState.dropLuggageFirst[dayNum] && todayHotel && todayHotel !== currentLoc) {
        const tr = estimateTransitSegment(currentLoc, todayHotel, dayNum);
        cursorMins += tr.minutes;
        segments.push({
            type: 'luggage',
            placeQuery: todayHotel,
            title: `🧳 先去飯店寄放行李：${todayHotel}`,
            arriveTime: formatMinutesToClock(cursorMins),
            duration: 20,
            transit: { ...tr, from: currentLoc, to: todayHotel }
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
// 單日智慧順排
// =========================================================
function scoreSlotFit(item, arrivalMins) {
    const text = `${item.title || ''} ${item.tag || ''} ${item.note || ''}`;
    const isNight = /(點燈|燈飾|夜景|展望台|花燈|光雕|光之|聖誕樹|星光|屋台)/.test(text);
    const isFood = /(美食|拉麵|牛排|海鮮|燒肉|市場|壽司|烏龍麵|章魚燒|晚餐|午餐)/.test(text);
    const isDayOnly = /(寺|神社|城|美術館|博物館|動物園|水族館|兼六園|栗林公園)/.test(text) && !isNight;

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
// 單日時間軸、全行程總覽看板與回收桶渲染
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
            <div class="ml-8 sm:ml-11 my-2 bg-washi/95 border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 space-y-2 shadow-2xs">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${seg.transit.jrCovered ? 'bg-emerald-100/90 text-emerald-950' : 'bg-sky-100/90 text-indigoJp'}">
                            ${seg.transit.modeBadge}
                        </span>
                        <span class="text-xs sm:text-sm font-bold text-sumi">${seg.transit.from} ➔ ${seg.transit.to}</span>
                    </div>
                    <a href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(seg.transit.from)}&destination=${encodeURIComponent(seg.transit.to)}&travelmode=${appState.drivingMode ? 'driving' : 'transit'}" target="_blank" rel="noopener" class="shrink-0 px-3 py-1 rounded-xl bg-white hover:bg-indigoJp text-indigoJp hover:text-white border border-stone-300 text-xs font-bold transition-colors">Google Maps ↗</a>
                </div>
                <p class="text-xs text-stone-600">${seg.transit.detailDesc}</p>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div class="inline-flex items-center gap-1.5 text-stone-700 font-medium">
                        <span>約</span>
                        <input type="number" min="1" max="600" value="${seg.transit.minutes}"
                            onchange="updateManualTransit(${d}, '${seg.transit.from.replace(/'/g, "\\'")}', '${seg.transit.to.replace(/'/g, "\\'")}', this.value)"
                            class="w-16 bg-white border border-stone-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-indigoJp">
                        <span>分鐘</span>
                    </div>
                    <span class="font-bold ${seg.transit.jrCovered ? 'text-matcha' : 'text-indigoJp'}">${seg.transit.fareText}</span>
                </div>
            </div>
        ` : '';

        if (seg.type === 'anchor' || seg.type === 'luggage') {
            const anchorBgId = `tl-anchor-bg-${d}-${segIdx}`;
            const qName = seg.placeQuery || seg.title.replace(/^[^：]+：/, '').replace(/（.*$/, '').trim();
            const realAnchorBg = photoCache[qName] || '';
            if (userConfig.gmapsKey && photoCache[qName] === undefined) {
                fetchPlacePhotoForCard(qName, anchorBgId);
            }
            return `
                ${transitHtml}
                <div class="relative z-10 flex items-center gap-3.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 sm:px-5 ${realAnchorBg ? 'min-h-[104px] py-5' : 'min-h-[64px] py-3.5'} overflow-hidden">
                    <div class="${realAnchorBg ? '' : 'hidden'} pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0">
                        <div id="${anchorBgId}" class="absolute inset-y-0 right-0 w-[62%] bg-cover bg-center opacity-90 transition-opacity duration-500" style="${realAnchorBg ? `background-image:url('${realAnchorBg}');` : ''} -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 32%, black 100%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 32%, black 100%);"></div>
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
        const isJustInserted = lastInsertedActId && seg.id === lastInsertedActId;

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
    lastInsertedActId = null;
}

function addRecommendedFromCard(idx) {
    const sel = document.getElementById(`rec-day-select-${idx}`);
    const targetDay = sel ? Number(sel.value) : (appState.activeDay || 1);
    const item = (window._currentRecItems || [])[idx];
    if (!item) return;

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
}

let draggedPuzzleInfo = null;
function handlePuzzleDragStart(dayNum, idx) { draggedPuzzleInfo = { dayNum, idx }; }
function handlePuzzleDragOver(e) { e.preventDefault(); }
function handlePuzzleDragLeave(e) {}
function handlePuzzleDropToDay(e, targetDay, targetIdx = null) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPuzzleInfo) return;
    const { dayNum, idx } = draggedPuzzleInfo;
    draggedPuzzleInfo = null;
    const srcList = appState.activitiesByDay[dayNum] || [];
    const [item] = srcList.splice(idx, 1);
    if (item) {
        if (!appState.activitiesByDay[targetDay]) appState.activitiesByDay[targetDay] = [];
        if (typeof targetIdx === 'number' && targetIdx >= 0) {
            const adjustedIdx = (dayNum === targetDay && idx < targetIdx) ? Math.max(0, targetIdx - 1) : targetIdx;
            appState.activitiesByDay[targetDay].splice(adjustedIdx, 0, item);
        } else {
            appState.activitiesByDay[targetDay].push(item);
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
    removeActivityToTrash(dayNum, idx);
}

function renderOverviewPuzzleBoard() {
    const grid = document.getElementById('overview-puzzle-grid');
    if (!grid) return;
    const totalDays = getTotalDays();
    grid.innerHTML = Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
        const acts = appState.activitiesByDay[d] || [];
        const startAnchor = d === 1
            ? `🛬 抵達出發：${appState.outboundFlight?.airport || '關西國際機場 (KIX)'}`
            : `🏨 飯店出發：${appState.dayHotels[d - 1] || appState.dayHotels[1] || '住宿飯店'}`;
        const endAnchor = d === totalDays
            ? `🛫 離境起飛：${appState.inboundFlight?.airport || '關西國際機場 (KIX)'}`
            : `🏨 今晚住宿：${appState.dayHotels[d] || appState.dayHotels[1] || '住宿飯店'}`;

        return `
            <div ondragover="handlePuzzleDragOver(event)" ondrop="handlePuzzleDropToDay(event, ${d})" class="bg-washi border border-stone-200 rounded-2xl p-3 space-y-2 min-h-[220px] flex flex-col justify-between">
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between border-b border-stone-200 pb-1.5">
                        <span class="text-xs font-bold text-indigoJp">Day ${d}・${getDateLabelForDay(d)}</span>
                        <button type="button" onclick="switchActiveDay(${d}); setTimelineViewMode('single');" class="text-[11px] font-bold text-vermilion underline cursor-pointer">詳情</button>
                    </div>
                    <div class="bg-slate-100/90 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 truncate" title="${startAnchor}">
                        ${startAnchor}
                    </div>
                    <div class="space-y-1.5">
                        ${acts.map((a, idx) => `
                            <div draggable="true"
                                 ondragstart="handlePuzzleDragStart(${d}, ${idx})"
                                 ondragover="handlePuzzleDragOver(event)"
                                 ondrop="handlePuzzleDropToDay(event, ${d}, ${idx})"
                                 class="bg-white border border-stone-200 hover:border-vermilion/60 rounded-xl p-2.5 text-xs shadow-2xs cursor-grab active:cursor-grabbing flex items-center justify-between gap-1.5">
                                <div class="min-w-0 flex-1">
                                    <div class="font-bold text-indigoJp leading-snug">${a.title}</div>
                                    <div class="text-[10px] text-stone-400 mt-0.5">${a.tag || '景點'}・${a.duration || 90} 分</div>
                                </div>
                                <div class="flex flex-col gap-0.5 shrink-0">
                                    <button type="button" onclick="event.stopPropagation(); moveActivityOrder(${d}, ${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="上移順序" class="px-1.5 py-0.5 rounded bg-washi hover:bg-stone-200 disabled:opacity-30 text-[10px] font-bold text-stone-600 cursor-pointer">↑</button>
                                    <button type="button" onclick="event.stopPropagation(); moveActivityOrder(${d}, ${idx}, 1)" ${idx === acts.length - 1 ? 'disabled' : ''} title="下移順序" class="px-1.5 py-0.5 rounded bg-washi hover:bg-stone-200 disabled:opacity-30 text-[10px] font-bold text-stone-600 cursor-pointer">↓</button>
                                </div>
                            </div>
                        `).join('') || '<div class="text-[11px] text-stone-400 text-center py-4 border border-dashed border-stone-200 rounded-xl">可拖曳拼圖至此天</div>'}
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
// 區塊三：立體拼圖推薦卡片渲染（直接讀取 db.json 的 events 與 Wikimedia imageUrl）
// =========================================================
const FALLBACK_SCENE_PHOTOS = {
    event: [
        'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=640&q=80',
        'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=640&q=80',
        'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=640&q=80'
    ],
    food: [
        'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=640&q=80',
        'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=640&q=80'
    ],
    spot: [
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=640&q=80',
        'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=640&q=80',
        'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=640&q=80'
    ]
};

function getGuaranteedFallbackPhoto(item, idx) {
    if (item.photoUrl) return item.photoUrl;
    const text = `${item.title || ''} ${item.tag || ''}`;
    let pool = FALLBACK_SCENE_PHOTOS.spot;
    if (item.type === 'event' || /(點燈|燈飾|花火|祭|光雕|夜景|聖誕)/.test(text)) {
        pool = FALLBACK_SCENE_PHOTOS.event;
    } else if (/(美食|拉麵|市場|海鮮|燒肉|牛排|逛街)/.test(text)) {
        pool = FALLBACK_SCENE_PHOTOS.food;
    }
    const hash = Math.abs(Array.from(item.title || '').reduce((acc, ch) => acc + ch.charCodeAt(0), idx));
    return pool[hash % pool.length];
}

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
            const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${userConfig.gmapsKey}`;
            photoCache[queryTitle] = photoUrl;
            const el = document.getElementById(domId);
            if (el) {
                el.style.backgroundImage = `url('${photoUrl}')`;
                if (el.parentElement) el.parentElement.classList.remove('hidden');
                const card = el.parentElement?.parentElement;
                if (card) card.classList.add('min-h-[108px]');
            }
        }
    } catch (e) {}
}

function loadBuiltinRecommendations() {
    const grid = document.getElementById('recommendations-grid');
    if (!grid) return;

    const targetRegs = new Set([appState.region, ...(appState.extraRegions || [])]);
    const tripMonth = Number((appState.startDate || '2026-12-18').split('-')[1]) || 12;
    const totalDays = getTotalDays();

    if (userConfig.gmapsKey) {
        targetRegs.forEach(regId => {
            if (!googleTopSpotsCache[regId] && !googleTopSpotsLoading[regId]) {
                fetchGoogleTopRatedSpots(false, regId);
            }
        });
    }

    const googleFetchedItems = [];
    targetRegs.forEach(regId => {
        if (Array.isArray(googleTopSpotsCache[regId])) {
            googleFetchedItems.push(...googleTopSpotsCache[regId]);
        }
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
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-stone-500 bg-washi rounded-2xl border border-dashed border-stone-300">目前此區域正在等待 db.json 載入，或可使用上方搜尋列加入想去的日本景點！</div>`;
        window._currentRecItems = [];
        return;
    }

    const dayOptionsHtml = Array.from({ length: totalDays }, (_, i) => i + 1)
        .map(d => `<option value="${d}" ${d === appState.activeDay ? 'selected' : ''}>Day ${d} (${getDateLabelForDay(d)})</option>`).join('');

    grid.innerHTML = filtered.map((item, idx) => {
        const isSeasonal = (item.months || []).includes(tripMonth) && (item.months || []).length < 12;
        const regName = REGIONS_META.find(r => r.id === item.region)?.name || '精選推薦';
        const periodLabel = item.periodText || '全年皆宜';
        const locText = item.location || `${regName}・建議停留 ${item.duration || 90} 分鐘`;
        const ratingBadge = item.rating
            ? `<span class="inline-flex items-center gap-0.5 font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">⭐ ${Number(item.rating).toFixed(1)}${item.userRatingCount ? ` (${item.userRatingCount.toLocaleString()})` : ''}</span>`
            : '';
        const indoorBadge = item.isIndoor
            ? `<span class="font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">☔ 雨天備案</span>`
            : '';
        const cardId = `rec-puzzle-card-${idx}`;
        const bgImgId = `rec-puzzle-bg-${idx}`;
        const initialBg = photoCache[item.title] || getGuaranteedFallbackPhoto(item, idx);

        if (userConfig.gmapsKey && !item.photoUrl && photoCache[item.title] === undefined) {
            fetchPlacePhotoForCard(item.title, bgImgId);
        }

        return `
            <div id="${cardId}" class="jigsaw-tile relative bg-white rounded-2xl border-2 ${isSeasonal ? 'border-[#E8B84B]' : 'border-stone-200'} p-4 flex flex-col justify-between gap-3.5 shadow-xs overflow-visible">
                <span aria-hidden="true" class="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 ${isSeasonal ? 'border-[#E8B84B]' : 'border-stone-200'} z-20"></span>
                <span aria-hidden="true" class="pointer-events-none absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5] border-l-2 ${isSeasonal ? 'border-[#E8B84B]' : 'border-stone-200'} z-20"></span>

                <div class="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0">
                    <div id="${bgImgId}" class="absolute inset-y-0 right-0 w-[72%] bg-cover bg-center opacity-80 transition-opacity duration-500" style="background-image:url('${initialBg}'); -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 38%, black 100%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 38%, black 100%);"></div>
                    <div class="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-transparent"></div>
                </div>

                <div class="relative z-10 space-y-2 pr-2">
                    <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
                        ${isSeasonal ? `<span class="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full bg-[#E69D1E] text-white shadow-2xs">🔥 當季限定</span>` : `<span class="inline-flex items-center font-bold px-2.5 py-0.5 rounded-full bg-indigoJp/10 text-indigoJp">${regName}</span>`}
                        <span class="font-bold px-2.5 py-0.5 rounded-full bg-[#FBEAE8] text-[#B84A39]">${item.tag || '經典景點'}</span>
                        ${indoorBadge}
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
    if (!forceRefresh && (googleTopSpotsCache[regId] || googleTopSpotsLoading[regId])) return;
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
                body: JSON.stringify({
                    textQuery: queries[qi],
                    minRating: 4.0,
                    languageCode: 'zh-TW',
                    maxResultCount: 8
                })
            });
            const data = await resp.json();
            const places = Array.isArray(data?.places) ? data.places : [];
            places.forEach((p, idx) => {
                const rating = Number(p.rating || 0);
                const title = p.displayName?.text || '';
                if (!title || rating < 4.0) return;
                const photoName = p.photos?.[0]?.name;
                const photoUrl = photoName
                    ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`
                    : '';
                if (photoUrl) photoCache[title] = photoUrl;
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
                    photoUrl
                });
            });
        }
        googleTopSpotsCache[regId] = collected;
        loadBuiltinRecommendations();
    } catch (e) {
    } finally {
        googleTopSpotsLoading[regId] = false;
        if (btn) btn.textContent = '⭐ 探索 4★+ 熱門';
    }
}

// =========================================================
// 旅遊記帳本邏輯
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
    const day = Math.max(1, Number(val) || 1);
    appState.expenseSelectedDay = day;
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

    const passes = cloudData.jrPasses || MINIMAL_FALLBACK_PASSES;
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

// =========================================================
// 自訂搜尋、彈窗與跨裝置 GitHub 同步
// =========================================================
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
                const photoName = p.photos?.[0]?.name;
                if (photoName) {
                    photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${userConfig.gmapsKey}`;
                    photoCache[val] = photoUrl;
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
    const tag = document.getElementById('custom-piece-tag')?.value || '景點';
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
    const lines = [`【旅遊拼圖 Travel Puzzle 行程手札】`, `出發日期：${appState.startDate} ～ ${appState.endDate}（${totalDays}天，${appState.travelers}人）`, ``];
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
    if (area) {
        area.select();
        document.execCommand('copy');
    }
}

function openApiKeyModal() {
    document.getElementById('modal-gmaps-key').value = userConfig.gmapsKey || '';
    document.getElementById('modal-gemini-key').value = userConfig.geminiKey || '';
    document.getElementById('modal-github-token').value = userConfig.githubToken || '';
    document.getElementById('modal-github-user').value = userConfig.githubUser || 'JHANSIANGJYUN';
    document.getElementById('modal-github-repo').value = userConfig.githubRepo || 'travel-puzzle';
    document.getElementById('modal-cloud-db-url').value = userConfig.cloudDbUrl || `https://raw.githubusercontent.com/${userConfig.githubUser || 'JHANSIANGJYUN'}/${userConfig.githubRepo || 'travel-puzzle'}/main/db.json`;
    document.getElementById('modal-sync-code-input').value = userConfig.syncCode || DEFAULT_SYNC_CODE;
    const statusLine = document.getElementById('github-sync-status-line');
    if (statusLine) {
        statusLine.textContent = userConfig.githubToken
            ? `🟢 GitHub 雙向同步已就緒 (${userConfig.syncCode || DEFAULT_SYNC_CODE})`
            : `🟡 僅唯讀模式（填入 GitHub Token 即可上傳同步）`;
    }
    document.getElementById('gmaps-test-result')?.classList.add('hidden');
    document.getElementById('gemini-test-result')?.classList.add('hidden');
    document.getElementById('api-key-modal')?.classList.remove('hidden');
}

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
        resEl.textContent = `✅ Google Maps 連線成功（難波西 ➔ 新大阪東口 實測約 ${mins} 分鐘）！已自動重算時間軸。`;
    } catch (err) {
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-800';
        resEl.textContent = `❌ ${err.message}`;
    } finally {
        if (btn) btn.textContent = '🧪 測試連線';
    }
}

async function callGeminiWithAutoModel(apiKey, promptText) {
    const candidateModels = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
    let lastErr = '無法連線 Gemini';
    for (const model of candidateModels) {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await resp.json();
        if (resp.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { model, text: data.candidates[0].content.parts[0].text };
        }
        lastErr = data?.error?.message || `HTTP ${resp.status}`;
        if (resp.status === 400 || resp.status === 401 || resp.status === 403) break;
    }
    throw new Error(lastErr);
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
    resEl.textContent = '正在連線測試 Gemini 模型...';
    try {
        const { model } = await callGeminiWithAutoModel(key, '請只回覆 OK 兩個字');
        userConfig.geminiKey = key;
        saveConfig();
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900';
        resEl.textContent = `✅ Gemini API 連線成功（使用模型：${model}）！已自動儲存。`;
    } catch (err) {
        resEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-800';
        resEl.textContent = `❌ Gemini 測試失敗：${err.message}`;
    } finally {
        if (btn) btn.textContent = '🧪 測試連線';
    }
}

function closeApiKeyModal() { document.getElementById('api-key-modal')?.classList.add('hidden'); }
function updateCloudUrlPreview() {
    const u = (document.getElementById('modal-github-user')?.value || '').trim();
    const r = (document.getElementById('modal-github-repo')?.value || '').trim();
    const urlInput = document.getElementById('modal-cloud-db-url');
    if (u && r && urlInput) urlInput.value = `https://raw.githubusercontent.com/${u}/${r}/main/db.json`;
}
function copySyncCodeText() {
    const codeEl = document.getElementById('modal-sync-code-input');
    if (codeEl && codeEl.value.trim()) {
        codeEl.select();
        document.execCommand('copy');
    }
}
function applySyncCodeFromModal() {
    const code = (document.getElementById('modal-sync-code-input')?.value || '').trim().toUpperCase();
    if (code) {
        userConfig.syncCode = code;
        saveConfig();
        const lbl = document.getElementById('header-sync-code-label');
        if (lbl) lbl.textContent = code;
    }
}

async function pushTripToGitHub() {
    saveApiAndCloudSettings(false);
    const statusLine = document.getElementById('github-sync-status-line');
    const token = (userConfig.githubToken || '').trim();
    const owner = (userConfig.githubUser || 'JHANSIANGJYUN').trim();
    const repo = (userConfig.githubRepo || 'travel-puzzle').trim();
    const code = (userConfig.syncCode || 'JP-GPVMP6').trim().toUpperCase();
    if (!token) {
        if (statusLine) statusLine.textContent = '⚠️ 請先填入 GitHub Personal Access Token 再上傳';
        return;
    }
    if (statusLine) statusLine.textContent = '⏳ 正在上傳行程至 GitHub 雲端...';
    const path = `trips/${code}.json`;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    try {
        let sha = undefined;
        const getResp = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
        if (getResp.ok) {
            const existing = await getResp.json();
            sha = existing.sha;
        }
        const payloadObj = { updatedAt: new Date().toISOString(), syncCode: code, appState };
        const base64Content = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj, null, 2))));
        const putResp = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Sync travel puzzle trip ${code}`,
                content: base64Content,
                ...(sha ? { sha } : {})
            })
        });
        if (!putResp.ok) throw new Error(`HTTP ${putResp.status}`);
        if (statusLine) statusLine.textContent = `✅ 已成功上傳至 GitHub (${code})！手機輸入同代碼即可讀取`;
        const hdrBadge = document.getElementById('cloud-sync-header-badge');
        if (hdrBadge) hdrBadge.textContent = `・☁️ ${code} 已同步`;
    } catch (err) {
        if (statusLine) statusLine.textContent = `❌ 上傳失敗：請確認 Token 具備 repo 寫入權限 (${err.message})`;
    }
}

async function pullTripFromGitHub() {
    saveApiAndCloudSettings(false);
    const statusLine = document.getElementById('github-sync-status-line');
    const owner = (userConfig.githubUser || 'JHANSIANGJYUN').trim();
    const repo = (userConfig.githubRepo || 'travel-puzzle').trim();
    const code = (userConfig.syncCode || 'JP-GPVMP6').trim().toUpperCase();
    if (statusLine) statusLine.textContent = `⏳ 正在從 GitHub 搜尋並讀取 ${code}...`;

    const candidatePaths = [`trips/${code}.json`, `sync/${code}.json`, `data/${code}.json`, `${code}.json`];

    async function tryFetchPath(filePath) {
        if (userConfig.githubToken) {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
            const resp = await fetch(apiUrl, { headers: { Authorization: `Bearer ${userConfig.githubToken}`, Accept: 'application/vnd.github+json' } });
            if (resp.ok) {
                const fileMeta = await resp.json();
                const decodedStr = decodeURIComponent(escape(atob(fileMeta.content.replace(/\n/g, ''))));
                return JSON.parse(decodedStr);
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
        if (!data || typeof data !== 'object') throw new Error(`在 ${owner}/${repo} 找不到代碼 ${code} 的雲端行程檔`);
        const loadedState = data.appState || data.state || data.trip || (data.activitiesByDay ? data : null);
        if (!loadedState) throw new Error('雲端檔案格式無法辨識');

        mergeAppStateSafely(loadedState);
        if (data.config && typeof data.config === 'object') {
            Object.assign(userConfig, data.config);
            saveConfig();
        }
        saveState();
        renderAll();
        if (statusLine) statusLine.textContent = `✅ 已成功載入雲端行程 (${code})！`;
        const hdrBadge = document.getElementById('cloud-sync-header-badge');
        if (hdrBadge) hdrBadge.textContent = `・☁️ ${code} 已載入`;
    } catch (err) {
        if (statusLine) statusLine.textContent = `⚠️ 讀取失敗：${err.message}`;
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
    if (shouldClose) {
        closeApiKeyModal();
        syncCloudDatabase();
        renderAll();
    }
}

function copyShareSetupLink() {
    saveApiAndCloudSettings(false);
    const compactPayload = {
        c: userConfig.syncCode || DEFAULT_SYNC_CODE,
        p: userConfig.githubToken || '',
        m: userConfig.gmapsKey || '',
        g: userConfig.geminiKey || '',
        d: userConfig.cloudDbUrl || ''
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(compactPayload)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#setup=${encoded}`;
    const tempInput = document.createElement('input');
    tempInput.value = shareUrl;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    const statusLine = document.getElementById('github-sync-status-line');
    if (statusLine) statusLine.textContent = '🔗 已複製一鍵自動設定連結！貼到手機打開即可免重打金鑰';
}

function openResetConfirmModal() { document.getElementById('reset-confirm-modal')?.classList.remove('hidden'); }
function closeResetConfirmModal() { document.getElementById('reset-confirm-modal')?.classList.add('hidden'); }
function confirmResetTrip() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
}

// =========================================================
// 統一渲染管線 renderAll()
// =========================================================
function renderAll() {
    if (!Array.isArray(REGIONS_META) || REGIONS_META.length === 0) {
        showHealthWarning('⚠️ app.js 分區設定異常，請檢查最近修改的括號或逗號。');
        return;
    }

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
    if (syncLabel && userConfig.syncCode) syncLabel.textContent = userConfig.syncCode;

    const days = getTotalDays();
    const badge = document.getElementById('trip-days-badge');
    if (badge) badge.textContent = `${days} 天 ${Math.max(0, days - 1)} 夜`;

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

document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    if (appState.routeCache) {
        Object.keys(appState.routeCache).forEach(k => {
            if (!appState.routeCache[k]?.modeBadge || (appState.routeCache[k]?.modeLabel || '').includes('門到門路線')) {
                delete appState.routeCache[k];
            }
        });
    }
    renderAll();
    tryLoadExternalJapanSvg();
    syncCloudDatabase();
});
