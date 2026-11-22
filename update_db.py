import os
import re
import json
import urllib.request
from datetime import datetime, timezone, timedelta

DB_FILE = "db.json"

# 26 種日本主流 JR PASS 票券基線（每年可隨 Gemini 核實自動更新最新日圓售價）
DEFAULT_JR_PASSES = [
    {"id": "jr-kansai-mini-3", "name": "JR 關西迷你鐵路周遊券 (3日)", "priceJpy": 3000, "days": 3, "regions": ["kansai"], "airportCovered": False},
    {"id": "jr-kansai-area-1", "name": "JR 關西地區鐵路周遊券 (1日)", "priceJpy": 2800, "days": 1, "regions": ["kansai"], "airportCovered": True},
    {"id": "jr-kansai-area-2", "name": "JR 關西地區鐵路周遊券 (2日)", "priceJpy": 4800, "days": 2, "regions": ["kansai"], "airportCovered": True},
    {"id": "jr-kansai-area-3", "name": "JR 關西地區鐵路周遊券 (3日)", "priceJpy": 5800, "days": 3, "regions": ["kansai"], "airportCovered": True},
    {"id": "jr-kansai-area-4", "name": "JR 關西地區鐵路周遊券 (4日)", "priceJpy": 7000, "days": 4, "regions": ["kansai"], "airportCovered": True},
    {"id": "jr-haruka-oneway", "name": "JR 關西機場特快 HARUKA 車票 (單程)", "priceJpy": 1800, "days": 1, "regions": ["kansai"], "airportCovered": True},
    {"id": "jr-haruka-roundtrip", "name": "JR 關西機場特快 HARUKA 車票 (來回)", "priceJpy": 3600, "days": 14, "regions": ["kansai"], "airportCovered": True},
    {"id": "jr-kansai-wide-5", "name": "JR 關西廣域鐵路周遊券 (5日)", "priceJpy": 12000, "days": 5, "regions": ["kansai", "sanyo", "sanin"], "airportCovered": True},
    {"id": "jr-kansai-hiroshima-5", "name": "JR 關西＆廣島地區周遊券 (5日)", "priceJpy": 17000, "days": 5, "regions": ["kansai", "sanyo"], "airportCovered": True},
    {"id": "jr-kansai-hokuriku-7", "name": "JR 關西＆北陸地區鐵路周遊券 (7日)", "priceJpy": 19000, "days": 7, "regions": ["kansai", "chubu"], "airportCovered": True},
    {"id": "jr-sanyo-sanin-7", "name": "JR 山陽＆山陰地區鐵路周遊券 (7日)", "priceJpy": 23000, "days": 7, "regions": ["kansai", "sanyo", "sanin"], "airportCovered": True},
    {"id": "jr-sanyo-sanin-northern-kyushu-7", "name": "JR 山陽＆山陰＆北部九州周遊券 (7日)", "priceJpy": 26000, "days": 7, "regions": ["kansai", "sanyo", "sanin", "kyushu"], "airportCovered": True},
    {"id": "jr-okayama-hiroshima-yamaguchi-5", "name": "JR 岡山＆廣島＆山口地區周遊券 (5日)", "priceJpy": 15000, "days": 5, "regions": ["sanyo"], "airportCovered": False},
    {"id": "jr-sanin-okayama-4", "name": "JR 山陰＆岡山地區鐵路周遊券 (4日)", "priceJpy": 6500, "days": 4, "regions": ["sanin", "sanyo"], "airportCovered": False},
    {"id": "jr-setouchi-area-7", "name": "JR 瀨戶內地區鐵路周遊券 (7日)", "priceJpy": 22000, "days": 7, "regions": ["kansai", "sanyo", "shikoku"], "airportCovered": True},
    {"id": "jr-all-shikoku-3", "name": "JR 四國鐵路周遊券 (3日)", "priceJpy": 12000, "days": 3, "regions": ["shikoku"], "airportCovered": False},
    {"id": "jr-all-shikoku-5", "name": "JR 四國鐵路周遊券 (5日)", "priceJpy": 16200, "days": 5, "regions": ["shikoku"], "airportCovered": False},
    {"id": "jr-all-shikoku-7", "name": "JR 四國鐵路周遊券 (7日)", "priceJpy": 19000, "days": 7, "regions": ["shikoku"], "airportCovered": False},
    {"id": "jr-tokyo-wide-3", "name": "JR 東京廣域周遊券 (3日)", "priceJpy": 15000, "days": 3, "regions": ["kanto"], "airportCovered": True},
    {"id": "jr-hokkaido-5", "name": "JR 北海道鐵路周遊券 (5日)", "priceJpy": 21000, "days": 5, "regions": ["hokkaido"], "airportCovered": True},
    {"id": "jr-north-kyushu-3", "name": "JR 北九州鐵路周遊券 (3日)", "priceJpy": 12000, "days": 3, "regions": ["kyushu"], "airportCovered": True},
    {"id": "jr-all-kyushu-5", "name": "JR 全九州鐵路周遊券 (5日)", "priceJpy": 22500, "days": 5, "regions": ["kyushu"], "airportCovered": True},
    {"id": "okinawa-yui-rail-2", "name": "沖繩都市單軌電車 Yui-Rail 2日券（沖繩無JR）", "priceJpy": 1400, "days": 2, "regions": ["okinawa"], "airportCovered": True},
    {"id": "jr-takayama-hokuriku-5", "name": "JR 高山・北陸地區周遊券 (5日)", "priceJpy": 19800, "days": 5, "regions": ["kansai", "chubu"], "airportCovered": True},
    {"id": "jr-east-tohoku-5", "name": "JR 東日本鐵路周遊券・東北地區 (5日)", "priceJpy": 30000, "days": 5, "regions": ["kanto", "tohoku"], "airportCovered": True},
    {"id": "jr-whole-japan-7", "name": "JR 全日本鐵路通票 (7日普通車)", "priceJpy": 50000, "days": 7, "regions": ["kansai", "kanto", "hokkaido", "kyushu", "chubu", "tohoku", "sanyo", "sanin", "shikoku"], "airportCovered": True}
]

# 台灣飛日本常見主力航班時刻庫（可自動與 Gemini 最新時刻合併更新）
DEFAULT_FLIGHTS_DB = {
    "AK176": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:30", "aircraft": "A321neo", "region": "kansai"},
    "AK177": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "20:45", "aircraft": "A321neo", "region": "kansai"},
    "IT210": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "10:15", "aircraft": "A320neo", "region": "kansai"},
    "IT211": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:15", "aircraft": "A320neo", "region": "kansai"},
    "IT212": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "18:05", "aircraft": "A320", "region": "kansai"},
    "IT213": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:05", "aircraft": "A320", "region": "kansai"},
    "MM24": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "13:15", "aircraft": "A321LR", "region": "kansai"},
    "MM27": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "15:55", "aircraft": "A321LR", "region": "kansai"},
    "JX820": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:10", "aircraft": "A330neo", "region": "kansai"},
    "JX821": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:20", "aircraft": "A330neo", "region": "kansai"},
    "BR132": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:55", "aircraft": "B787-10", "region": "kansai"},
    "BR131": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "13:10", "aircraft": "B787-10", "region": "kansai"},
    "CI156": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:35", "aircraft": "A350-900", "region": "kansai"},
    "CI157": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:50", "aircraft": "A350-900", "region": "kansai"},
    "IT200": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "10:35", "aircraft": "A320neo", "region": "kanto"},
    "IT201": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "12:00", "aircraft": "A320neo", "region": "kanto"},
    "JX800": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "12:30", "aircraft": "A350-900", "region": "kanto"},
    "JX801": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "13:40", "aircraft": "A350-900", "region": "kanto"},
    "BR198": {"airline": "長榮航空 EVA Air", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "12:55", "aircraft": "B787-10", "region": "kanto"},
    "BR197": {"airline": "長榮航空 EVA Air", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "14:00", "aircraft": "B787-10", "region": "kanto"},
    "IT234": {"airline": "台灣虎航 Tigerair", "airport": "新千歲機場 (CTS)", "terminal": "I", "time": "11:05", "aircraft": "A320neo", "region": "hokkaido"},
    "IT235": {"airline": "台灣虎航 Tigerair", "airport": "新千歲機場 (CTS)", "terminal": "I", "time": "12:05", "aircraft": "A320neo", "region": "hokkaido"},
    "IT240": {"airline": "台灣虎航 Tigerair", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "10:00", "aircraft": "A320", "region": "kyushu"},
    "IT241": {"airline": "台灣虎航 Tigerair", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "10:55", "aircraft": "A320", "region": "kyushu"},
    "IT230": {"airline": "台灣虎航 Tigerair", "airport": "那霸機場 (OKA)", "terminal": "I", "time": "09:20", "aircraft": "A320", "region": "okinawa"},
    "IT231": {"airline": "台灣虎航 Tigerair", "airport": "那霸機場 (OKA)", "terminal": "I", "time": "10:10", "aircraft": "A320", "region": "okinawa"}
}

# 日本主要觀光樞紐車站與機場精準經緯度基線（與 index.html 同步，並可由開放資料自動擴充）
CORE_HUB_STATIONS = [
    {"name": "関西国際空港", "pref": "大阪府", "line": "JR関西空港線・南海空港線", "lat": 34.4347, "lng": 135.2440},
    {"name": "新大阪", "pref": "大阪府", "line": "東海道新幹線・JR京都線・御堂筋線", "lat": 34.7335, "lng": 135.5003},
    {"name": "大阪", "pref": "大阪府", "line": "JR大阪環状線・東海道本線", "lat": 34.7025, "lng": 135.4959},
    {"name": "難波", "pref": "大阪府", "line": "御堂筋線・南海本線・近鉄難波線", "lat": 34.6669, "lng": 135.5003},
    {"name": "天王寺", "pref": "大阪府", "line": "JR大阪環状線・阪和線・御堂筋線", "lat": 34.6476, "lng": 135.5133},
    {"name": "京都", "pref": "京都府", "line": "東海道新幹線・JR京都線・烏丸線", "lat": 34.9858, "lng": 135.7588},
    {"name": "祇園四条", "pref": "京都府", "line": "京阪本線", "lat": 35.0037, "lng": 135.7720},
    {"name": "嵯峨嵐山", "pref": "京都府", "line": "JR山陰本線（嵯峨野線）", "lat": 35.0185, "lng": 135.6812},
    {"name": "稲荷", "pref": "京都府", "line": "JR奈良線", "lat": 34.9671, "lng": 135.7727},
    {"name": "三ノ宮", "pref": "兵庫県", "line": "JR神戸線・阪急神戸線・阪神本線", "lat": 34.6947, "lng": 135.1955},
    {"name": "姫路", "pref": "兵庫県", "line": "山陽新幹線・JR神戸線", "lat": 34.8276, "lng": 134.6908},
    {"name": "奈良", "pref": "奈良県", "line": "JR大和路線・奈良線", "lat": 34.6810, "lng": 135.8190},
    {"name": "宇治", "pref": "京都府", "line": "JR奈良線・京阪宇治線", "lat": 34.8906, "lng": 135.8008},
    {"name": "成田空港", "pref": "千葉県", "line": "JR成田線・京成本線", "lat": 35.7719, "lng": 140.3929},
    {"name": "羽田空港", "pref": "東京都", "line": "京急空港線・東京モノレール", "lat": 35.5494, "lng": 139.7798},
    {"name": "東京", "pref": "東京都", "line": "東海道新幹線・東北新幹線・山手線", "lat": 35.6812, "lng": 139.7671},
    {"name": "新宿", "pref": "東京都", "line": "JR山手線・中央線・小田急・京王", "lat": 35.6896, "lng": 139.7006},
    {"name": "渋谷", "pref": "東京都", "line": "JR山手線・銀座線・東急東横線", "lat": 35.6580, "lng": 139.7016},
    {"name": "上野", "pref": "東京都", "line": "東北新幹線・JR山手線・銀座線", "lat": 35.7141, "lng": 139.7774},
    {"name": "浅草", "pref": "東京都", "line": "東京メトロ銀座線・都営浅草線", "lat": 35.7118, "lng": 139.7983},
    {"name": "押上", "pref": "東京都", "line": "半蔵門線・都営浅草線・東武線", "lat": 35.7101, "lng": 139.8107},
    {"name": "新千歳空港", "pref": "北海道", "line": "JR千歳線", "lat": 42.7752, "lng": 141.6923},
    {"name": "札幌", "pref": "北海道", "line": "JR函館本線・南北線・東豊線", "lat": 43.0686, "lng": 141.3508},
    {"name": "小樽", "pref": "北海道", "line": "JR函館本線", "lat": 43.1977, "lng": 140.9937},
    {"name": "函館", "pref": "北海道", "line": "JR函館本線", "lat": 41.7737, "lng": 140.7264},
    {"name": "博多", "pref": "福岡県", "line": "山陽新幹線・九州新幹線・空港線", "lat": 33.5897, "lng": 130.4207},
    {"name": "由布院", "pref": "大分県", "line": "JR久大本線", "lat": 33.2624, "lng": 131.3550},
    {"name": "熊本", "pref": "熊本県", "line": "九州新幹線・JR鹿児島本線", "lat": 32.7900, "lng": 130.6886},
    {"name": "那覇空港", "pref": "沖縄県", "line": "沖縄都市モノレール（ゆいレール）", "lat": 26.2064, "lng": 127.6465},
    {"name": "名古屋", "pref": "愛知県", "line": "東海道新幹線・JR東海道本線・東山線", "lat": 35.1709, "lng": 136.8815},
    {"name": "金沢", "pref": "石川県", "line": "北陸新幹線・IRいしかわ鉄道", "lat": 36.5781, "lng": 136.6482},
    {"name": "仙台", "pref": "宮城県", "line": "東北新幹線・JR仙石線・南北線", "lat": 38.2601, "lng": 140.8824},
    {"name": "広島", "pref": "広島県", "line": "山陽新幹線・JR山陽本線", "lat": 34.3977, "lng": 132.4754},
    {"name": "岡山", "pref": "岡山県", "line": "山陽新幹線・JR瀬戸大橋線", "lat": 34.6665, "lng": 133.9181},
    {"name": "高松", "pref": "香川県", "line": "JR予讃線・高徳線", "lat": 34.3513, "lng": 134.0466}
]


def load_existing_db() -> dict:
    """讀取倉庫內現有的 db.json，確保累積合併而不遺失舊月份資料"""
    if not os.path.exists(DB_FILE):
        return {
            "updatedAt": "",
            "jrPasses": list(DEFAULT_JR_PASSES),
            "flights": dict(DEFAULT_FLIGHTS_DB),
            "events": [],
            "stations": list(CORE_HUB_STATIONS)
        }
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                existing_passes = data.get("jrPasses") or []
                existing_flights = data.get("flights") or {}
                existing_stations = data.get("stations") or []
                merged_flights = {**DEFAULT_FLIGHTS_DB, **existing_flights}
                return {
                    "updatedAt": data.get("updatedAt", ""),
                    "jrPasses": existing_passes if len(existing_passes) > 0 else list(DEFAULT_JR_PASSES),
                    "flights": merged_flights,
                    "events": data.get("events", []),
                    "stations": existing_stations if len(existing_stations) > 0 else list(CORE_HUB_STATIONS)
                }
    except Exception as e:
        print(f"[WARN] 讀取舊 db.json 失敗，將建立新檔: {e}")
    return {
        "updatedAt": "",
        "jrPasses": list(DEFAULT_JR_PASSES),
        "flights": dict(DEFAULT_FLIGHTS_DB),
        "events": [],
        "stations": list(CORE_HUB_STATIONS)
    }


def enrich_stations_from_open_data(existing_stations: list[dict]) -> list[dict]:
    """結合內建樞紐車站座標與日本 HeartRails Express 免費開放車站 API 擴充座標"""
    station_map = {}
    for st in CORE_HUB_STATIONS:
        if st.get("name") and isinstance(st.get("lat"), (int, float)):
            station_map[st["name"]] = dict(st)
    for st in existing_stations or []:
        if st.get("name") and isinstance(st.get("lat"), (int, float)):
            station_map[st["name"]] = dict(st)

    # 每次執行挑幾座代表性車站向 HeartRails Express 公開 API 核實／擴充最新路線資訊
    sample_queries = ["大阪", "京都", "東京", "新宿", "札幌", "博多", "名古屋", "金沢"]
    for q_name in sample_queries:
        try:
            encoded = urllib.request.quote(q_name)
            url = f"https://express.heartrails.com/api/json?method=getStations&name={encoded}"
            req = urllib.request.Request(url, headers={"User-Agent": "TravelPuzzleBot/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
                stations = payload.get("response", {}).get("station", [])
                if isinstance(stations, list) and len(stations) > 0:
                    first = stations[0]
                    lat = float(first.get("y", 0))
                    lng = float(first.get("x", 0))
                    if lat > 20 and lng > 120:
                        lines = sorted({s.get("line", "") for s in stations if s.get("line")})
                        station_map[q_name] = {
                            "name": q_name,
                            "pref": first.get("prefecture", station_map.get(q_name, {}).get("pref", "")),
                            "line": "・".join(lines[:3]),
                            "lat": round(lat, 5),
                            "lng": round(lng, 5)
                        }
        except Exception:
            pass

    return list(station_map.values())


def call_gemini_json(prompt_text: str):
    """呼叫 Gemini API 並強制解析回傳的 JSON 陣列或物件（自動相容最新 gemini-3.8-flash 模型）"""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("[INFO] 未偵測到 GEMINI_API_KEY，將略過 AI 擴充並保留現有累積資料與開放車站座標。")
        return None

    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {"temperature": 0.35, "responseMimeType": "application/json"}
    }
    for model in ("gemini-3.8-flash", "gemini-3-flash-preview", "gemini-2.5-flash"):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                text = re.sub(r"^```json\s*|\s*```$", "", text.strip())
                return json.loads(text)
        except Exception as e:
            print(f"[WARN] Gemini 模型 ({model}) 呼叫失敗，嘗試下一順位: {e}")
    return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {"temperature": 0.35, "responseMimeType": "application/json"}
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            text = re.sub(r"^```json\s*|\s*```$", "", text.strip())
            return json.loads(text)
    except Exception as e:
        print(f"[WARN] Gemini API 呼叫失敗: {e}")
        return None


def build_target_months(existing_events: list[dict], jst_now: datetime) -> list[int]:
    """決定本次要補充的月份：永遠包含當月與下個月，再自動輪替補齊全年 1～12 月最缺資料的月份"""
    curr_m = jst_now.month
    next_m = 1 if curr_m == 12 else curr_m + 1
    month_counts = {m: 0 for m in range(1, 13)}
    for ev in existing_events:
        for m in ev.get("months", []):
            if m in month_counts:
                month_counts[m] += 1

    # 找出目前活動數最少的 2 個月份一起輪替補齊，逐步達成 1～12 月全年覆蓋
    other_months = [m for m in range(1, 13) if m not in (curr_m, next_m)]
    other_months.sort(key=lambda m: month_counts[m])
    return sorted(list({curr_m, next_m, *other_months[:2]}))


def fetch_seasonal_events(target_months: list[int]) -> list[dict]:
    """請 Gemini 針對指定月份與日本 10 大分區生成結構化季節祭典、點燈與順遊景點"""
    prompt = f"""
請擔任日本資深旅遊編輯，針對日本 10 大旅遊分區（kansai, kanto, hokkaido, kyushu, okinawa, chubu, tohoku, sanyo, sanin, shikoku），
列出在月份 {target_months} 期間最值得造訪的季節限定祭典、夜間點燈、花季、花火大會或順遊名勝（每個分區請提供 2～3 筆代表性項目）。
請嚴格輸出 JSON 陣列，每筆物件格式如下：
{{
  "region": "kansai",
  "type": "event",
  "months": [12],
  "tag": "光影花火",
  "periodText": "12月冬季限定",
  "location": "具體車站或區域（如：JR京都站直結）",
  "title": "繁體中文活動或景點名稱",
  "duration": 90,
  "note": "40字內實用遊玩建議與交通提示"
}}
注意：type 僅限 "event"（季節祭典／點燈／花季）或 "spot"（常態經典名勝／美食）。
"""
    res = call_gemini_json(prompt)
    if not isinstance(res, list):
        return []

    valid_regions = {"kansai", "kanto", "hokkaido", "kyushu", "okinawa", "chubu", "tohoku", "sanyo", "sanin", "shikoku"}
    cleaned = []
    for idx, item in enumerate(res):
        if not isinstance(item, dict):
            continue
        reg = str(item.get("region", "")).strip().lower()
        title = str(item.get("title", "")).strip()
        if reg not in valid_regions or not title:
            continue
        months = [int(m) for m in item.get("months", target_months) if isinstance(m, (int, float)) and 1 <= int(m) <= 12]
        cleaned.append({
            "id": f"auto-{reg}-{idx}-{abs(hash(title)) % 100000}",
            "region": reg,
            "type": "event" if item.get("type") == "event" else "spot",
            "months": sorted(list(set(months))) or target_months,
            "tag": str(item.get("tag") or ("季節祭典" if item.get("type") == "event" else "熱門景點")),
            "periodText": str(item.get("periodText") or "季節推薦"),
            "location": str(item.get("location") or ""),
            "title": title,
            "duration": int(item.get("duration") or 90),
            "note": str(item.get("note") or "")
        })
    return cleaned


def fetch_updated_jr_passes(current_passes: list[dict]) -> list[dict]:
    """透過 Gemini 核實 26 種日本 JR PASS 最新官方日圓售價，並與基線合併"""
    pass_summary = [{"id": p["id"], "name": p["name"], "priceJpy": p["priceJpy"]} for p in current_passes]
    prompt = f"""
請核實以下日本 JR PASS 與交通周遊券截至目前的最新成人官方日圓售價（JPY），若有調漲或最新售價請更新 priceJpy 整數，若無變動請維持原價。
請嚴格輸出 JSON 陣列（格式為 [{{"id": "...", "priceJpy": 12000}}]）：
{json.dumps(pass_summary, ensure_ascii=False)}
"""
    res = call_gemini_json(prompt)
    if not isinstance(res, list):
        return current_passes

    price_map = {}
    for row in res:
        if isinstance(row, dict) and row.get("id") and isinstance(row.get("priceJpy"), (int, float)):
            p_val = int(row["priceJpy"])
            if 500 <= p_val <= 150000:
                price_map[row["id"]] = p_val

    updated = []
    for p in current_passes:
        item = dict(p)
        if item["id"] in price_map:
            item["priceJpy"] = price_map[item["id"]]
        updated.append(item)
    return updated


def fetch_updated_flights(current_flights: dict) -> dict:
    """請 Gemini 補充或核實台灣往返日本主要機場（KIX/NRT/HND/CTS/FUK/OKA）熱門航班時刻"""
    prompt = """
請提供 12 班台灣桃園/松山往返日本主要機場（KIX 關西、NRT 成田、HND 羽田、CTS 新千歲、FUK 福岡、OKA 那霸）的最新代表性定期航班時刻（含華航、長榮、星宇、虎航、樂桃、亞航）。
請嚴格輸出 JSON 物件，Key 為航班代號（大寫無空格，如 "JX820"），Value 格式如下：
{
  "JX820": {
    "airline": "星宇航空 STARLUX",
    "airport": "關西國際機場 (KIX)",
    "terminal": "T1",
    "time": "11:10",
    "aircraft": "A330neo",
    "region": "kansai"
  }
}
"""
    res = call_gemini_json(prompt)
    if not isinstance(res, dict):
        return current_flights

    merged = dict(current_flights)
    for code, info in res.items():
        clean_code = re.sub(r"[^A-Z0-9]", "", str(code).upper())
        if clean_code and isinstance(info, dict) and info.get("airport") and info.get("time"):
            merged[clean_code] = {
                "airline": str(info.get("airline") or ""),
                "airport": str(info.get("airport") or ""),
                "terminal": str(info.get("terminal") or "T1"),
                "time": str(info.get("time") or ""),
                "aircraft": str(info.get("aircraft") or ""),
                "region": str(info.get("region") or "kansai")
            }
    return merged


def merge_events_dedup(existing_events: list[dict], new_events: list[dict]) -> list[dict]:
    """依『地區 + 正規化標題』去重累積合併，保留舊月份活動並用新資料更新欄位"""
    merged_map = {}

    def make_key(ev: dict) -> str:
        reg = str(ev.get("region", "")).strip().lower()
        norm_title = re.sub(r"[\s・\-—（）()【】\[\]]+", "", str(ev.get("title", "")).lower())
        return f"{reg}::{norm_title}"

    for ev in existing_events or []:
        if ev.get("title"):
            merged_map[make_key(ev)] = dict(ev)

    for ev in new_events or []:
        if not ev.get("title"):
            continue
        k = make_key(ev)
        if k in merged_map:
            old = merged_map[k]
            combined_months = sorted(list(set((old.get("months") or []) + (ev.get("months") or []))))
            merged_map[k] = {**old, **ev, "id": old.get("id") or ev.get("id"), "months": combined_months}
        else:
            merged_map[k] = dict(ev)

    return list(merged_map.values())


def enrich_event_wikipedia_photos(events: list[dict], max_lookups: int = 25) -> list[dict]:
    """透過免費免 Key 的 Wikipedia REST API 為尚未有圖片的景點補齊 Wikimedia 縮圖，減少前端 Places API 呼叫"""
    lookups = 0
    for ev in events:
        if ev.get("imageUrl") or ev.get("photoUrl"):
            continue
        if lookups >= max_lookups:
            break
        raw_title = str(ev.get("wikiJa") or ev.get("title") or "").split("・")[0].split("（")[0].strip()
        if not raw_title:
            continue
        lookups += 1
        for lang in ("ja", "zh"):
            try:
                api_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.request.quote(raw_title)}"
                req = urllib.request.Request(api_url, headers={"User-Agent": "TravelPuzzleBot/1.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    summary = json.loads(resp.read().decode("utf-8"))
                    thumb = summary.get("thumbnail", {}).get("source", "")
                    if thumb:
                        ev["imageUrl"] = thumb
                        break
            except Exception:
                continue
    return events


def main():
    jst = timezone(timedelta(hours=9))
    now_jst = datetime.now(jst)
    print(f"=== 開始執行 Travel Puzzle 每日資料庫累積更新 ({now_jst.strftime('%Y-%m-%d %H:%M JST')}) ===")

    db = load_existing_db()
    target_months = build_target_months(db.get("events", []), now_jst)
    print(f"[INFO] 本次鎖定擴充月份: {target_months}")

    # 1. 同步開放資料樞紐車站經緯度
    stations = enrich_stations_from_open_data(db.get("stations", []))
    print(f"[OK] 車站座標庫共 {len(stations)} 站")

    # 2. 更新 JR PASS 票價與台日熱門航班庫
    jr_passes = fetch_updated_jr_passes(db.get("jrPasses", DEFAULT_JR_PASSES))
    flights = fetch_updated_flights(db.get("flights", DEFAULT_FLIGHTS_DB))
    print(f"[OK] JR PASS 共 {len(jr_passes)} 種，航班庫共 {len(flights)} 班")

    # 3. 抓取當季與輪替月份活動並累積合併，再透過 Wikipedia 免費補齊縮圖
    fetched_events = fetch_seasonal_events(target_months)
    merged_events = merge_events_dedup(db.get("events", []), fetched_events)
    merged_events = enrich_event_wikipedia_photos(merged_events, max_lookups=30)
    print(f"[OK] 活動與景點庫累積至 {len(merged_events)} 筆")

    output = {
        "updatedAt": now_jst.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "jrPasses": jr_passes,
        "flights": flights,
        "events": merged_events,
        "stations": stations
    }

    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"=== 已成功寫入 {DB_FILE}！ ===")


if __name__ == "__main__":
    main()
