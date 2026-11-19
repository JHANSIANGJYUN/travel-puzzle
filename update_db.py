import datetime
import json
import os
import re
import time
import urllib.error
import urllib.request


def log(msg: str) -> None:
    print(msg, flush=True)


BASE_JR_PASSES = [
    {"id": "jr-kansai-1", "name": "JR 關西地區鐵路周遊券 (1日)", "price": 2800, "days": 1, "regions": ["kansai"]},
    {"id": "jr-kansai-2", "name": "JR 關西地區鐵路周遊券 (2日)", "price": 4800, "days": 2, "regions": ["kansai"]},
    {"id": "jr-kansai-3", "name": "JR 關西地區鐵路周遊券 (3日)", "price": 5800, "days": 3, "regions": ["kansai"]},
    {"id": "jr-kansai-4", "name": "JR 關西地區鐵路周遊券 (4日)", "price": 7000, "days": 4, "regions": ["kansai"]},
    {"id": "jr-kansai-wide-5", "name": "JR 關西廣域鐵路周遊券 (5日)", "price": 12000, "days": 5, "regions": ["kansai", "sanyo"]},
    {"id": "jr-kansai-hiroshima-5", "name": "JR 關西＆廣島地區鐵路周遊券 (5日)", "price": 17000, "days": 5, "regions": ["kansai", "sanyo"]},
    {"id": "jr-kansai-hokuriku-7", "name": "JR 關西＆北陸地區鐵路周遊券 (7日)", "price": 19000, "days": 7, "regions": ["kansai", "chubu"]},
    {"id": "jr-sanyo-sanin-7", "name": "JR 山陽＆山陰地區鐵路周遊券 (7日)", "price": 23000, "days": 7, "regions": ["kansai", "sanyo"]},
    {"id": "jr-tokyo-wide-3", "name": "JR 東京廣域周遊券 (3日)", "price": 15000, "days": 3, "regions": ["kanto"]},
    {"id": "jr-east-tohoku-5", "name": "JR 東日本鐵路周遊券・東北地區 (5日)", "price": 30000, "days": 5, "regions": ["kanto", "tohoku"]},
    {"id": "jr-east-nagano-niigata-5", "name": "JR 東日本鐵路周遊券・長野新潟 (5日)", "price": 27000, "days": 5, "regions": ["kanto", "chubu"]},
    {"id": "jr-hokkaido-5", "name": "JR 北海道鐵路周遊券 (5日)", "price": 20000, "days": 5, "regions": ["hokkaido"]},
    {"id": "jr-hokkaido-7", "name": "JR 北海道鐵路周遊券 (7日)", "price": 26000, "days": 7, "regions": ["hokkaido"]},
    {"id": "jr-kyushu-north-3", "name": "JR 九州鐵路周遊券・北部九州 (3日)", "price": 12000, "days": 3, "regions": ["kyushu"]},
    {"id": "jr-kyushu-all-5", "name": "JR 九州鐵路周遊券・全九州 (5日)", "price": 22000, "days": 5, "regions": ["kyushu"]},
    {"id": "jr-takayama-hokuriku-5", "name": "JR 高山＆北陸地區周遊券 (5日)", "price": 19800, "days": 5, "regions": ["kansai", "chubu"]},
    {"id": "jr-all-japan-7", "name": "全日本鐵路通票 JR PASS (7日)", "price": 50000, "days": 7, "regions": ["all"]},
]

BASE_FLIGHTS = {
    # ================= 關西 Kansai (KIX) =================
    "AK176": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:30", "aircraft": "A321neo", "region": "kansai"},
    "AK177": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "20:45", "aircraft": "A321neo", "region": "kansai"},
    "IT252": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "14:55", "aircraft": "A320neo", "region": "kansai"},
    "IT253": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "15:55", "aircraft": "A320neo", "region": "kansai"},
    "IT284": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "18:20", "aircraft": "A320neo", "region": "kansai"},
    "IT285": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "19:20", "aircraft": "A320neo", "region": "kansai"},
    "MM27": {"airline": "樂桃航空 Peach Aviation", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "17:15", "aircraft": "A320neo", "region": "kansai"},
    "MM28": {"airline": "樂桃航空 Peach Aviation", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "18:15", "aircraft": "A320neo", "region": "kansai"},
    "MM24": {"airline": "樂桃航空 Peach Aviation", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "11:30", "aircraft": "A320neo", "region": "kansai"},
    "MM23": {"airline": "樂桃航空 Peach Aviation", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "10:15", "aircraft": "A320neo", "region": "kansai"},
    "BR132": {"airline": "長榮航空 EVA Air", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "12:15", "aircraft": "A321-200", "region": "kansai"},
    "BR178": {"airline": "長榮航空 EVA Air", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "18:05", "aircraft": "B787-9", "region": "kansai"},
    "BR130": {"airline": "長榮航空 EVA Air", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "15:10", "aircraft": "A321-200", "region": "kansai"},
    "CI156": {"airline": "中華航空 China Airlines", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "11:55", "aircraft": "A321neo", "region": "kansai"},
    "CI172": {"airline": "中華航空 China Airlines", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "17:45", "aircraft": "A350-900", "region": "kansai"},
    "CI158": {"airline": "中華航空 China Airlines", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "14:35", "aircraft": "A321neo", "region": "kansai"},
    "JX820": {"airline": "星宇航空 STARLUX Airlines", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "12:20", "aircraft": "A321neo", "region": "kansai"},
    "JX822": {"airline": "星宇航空 STARLUX Airlines", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "16:40", "aircraft": "A321neo", "region": "kansai"},
    "TR820": {"airline": "酷航 Scoot", "airport": "大阪關西機場 (KIX)", "terminal": "T1", "time": "10:50", "aircraft": "B787-8", "region": "kansai"},

    # ================= 關東 Kanto (NRT / HND) =================
    "IT200": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "10:10", "aircraft": "A320neo", "region": "kanto"},
    "IT202": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "13:15", "aircraft": "A320neo", "region": "kanto"},
    "IT210": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "10:40", "aircraft": "A320neo", "region": "kanto"},
    "IT211": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "11:40", "aircraft": "A320neo", "region": "kanto"},
    "MM622": {"airline": "樂桃航空 Peach Aviation", "airport": "東京成田機場 (NRT)", "terminal": "T1", "time": "11:25", "aircraft": "A320neo", "region": "kanto"},
    "BR196": {"airline": "長榮航空 EVA Air", "airport": "東京成田機場 (NRT)", "terminal": "T1", "time": "12:50", "aircraft": "B787-9", "region": "kanto"},
    "BR184": {"airline": "長榮航空 EVA Air", "airport": "東京成田機場 (NRT)", "terminal": "T1", "time": "19:15", "aircraft": "B787-10", "region": "kanto"},
    "CI100": {"airline": "中華航空 China Airlines", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "12:55", "aircraft": "A350-900", "region": "kanto"},
    "CI106": {"airline": "中華航空 China Airlines", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "17:30", "aircraft": "A330-300", "region": "kanto"},
    "JX800": {"airline": "星宇航空 STARLUX Airlines", "airport": "東京成田機場 (NRT)", "terminal": "T1", "time": "12:45", "aircraft": "A350-900", "region": "kanto"},
    "JX802": {"airline": "星宇航空 STARLUX Airlines", "airport": "東京成田機場 (NRT)", "terminal": "T1", "time": "16:10", "aircraft": "A330-900neo", "region": "kanto"},
    "TR898": {"airline": "酷航 Scoot", "airport": "東京成田機場 (NRT)", "terminal": "T1", "time": "10:55", "aircraft": "B787-8", "region": "kanto"},
    "BR190": {"airline": "長榮航空 EVA Air", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "20:30", "aircraft": "B787-10", "region": "kanto"},
    "BR192": {"airline": "長榮航空 EVA Air", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "10:55", "aircraft": "B787-9", "region": "kanto"},
    "CI220": {"airline": "中華航空 China Airlines", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "12:35", "aircraft": "A321neo", "region": "kanto"},
    "CI222": {"airline": "中華航空 China Airlines", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "18:20", "aircraft": "A321neo", "region": "kanto"},
    "JX860": {"airline": "星宇航空 STARLUX Airlines", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "12:15", "aircraft": "A321neo", "region": "kanto"},
    "NH852": {"airline": "全日空 ANA", "airport": "東京羽田機場 (HND)", "terminal": "T2", "time": "17:05", "aircraft": "B787-8", "region": "kanto"},
    "JL98": {"airline": "日本航空 JAL", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "13:10", "aircraft": "B787-8", "region": "kanto"},

    # ================= 北海道 Hokkaido (CTS / HKD / AKJ) =================
    "BR116": {"airline": "長榮航空 EVA Air", "airport": "札幌新千歲機場 (CTS)", "terminal": "I", "time": "14:40", "aircraft": "B787-9", "region": "hokkaido"},
    "CI130": {"airline": "中華航空 China Airlines", "airport": "札幌新千歲機場 (CTS)", "terminal": "I", "time": "13:20", "aircraft": "A321neo", "region": "hokkaido"},
    "JX850": {"airline": "星宇航空 STARLUX Airlines", "airport": "札幌新千歲機場 (CTS)", "terminal": "I", "time": "14:10", "aircraft": "A321neo", "region": "hokkaido"},
    "IT234": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "函館機場 (HKD)", "terminal": "I", "time": "10:15", "aircraft": "A320neo", "region": "hokkaido"},
    "IT236": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "旭川機場 (AKJ)", "terminal": "I", "time": "12:00", "aircraft": "A320neo", "region": "hokkaido"},

    # ================= 九州 Kyushu (FUK / KMJ / KOJ / KMI / HSG) =================
    "CI110": {"airline": "中華航空 China Airlines", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "10:05", "aircraft": "A321neo", "region": "kyushu"},
    "CI116": {"airline": "中華航空 China Airlines", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "16:25", "aircraft": "A321neo", "region": "kyushu"},
    "BR106": {"airline": "長榮航空 EVA Air", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "11:20", "aircraft": "A321-200", "region": "kyushu"},
    "JX840": {"airline": "星宇航空 STARLUX Airlines", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "11:45", "aircraft": "A321neo", "region": "kyushu"},
    "JX842": {"airline": "星宇航空 STARLUX Airlines", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "17:10", "aircraft": "A321neo", "region": "kyushu"},
    "IT240": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "10:30", "aircraft": "A320neo", "region": "kyushu"},
    "MM58": {"airline": "樂桃航空 Peach Aviation", "airport": "福岡機場 (FUK)", "terminal": "I", "time": "14:45", "aircraft": "A320neo", "region": "kyushu"},
    "JX832": {"airline": "星宇航空 STARLUX Airlines", "airport": "熊本機場 (KMJ)", "terminal": "I", "time": "13:15", "aircraft": "A321neo", "region": "kyushu"},
    "IT746": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "熊本機場 (KMJ)", "terminal": "I", "time": "10:50", "aircraft": "A320neo", "region": "kyushu"},
    "CI118": {"airline": "中華航空 China Airlines", "airport": "鹿兒島機場 (KOJ)", "terminal": "I", "time": "11:15", "aircraft": "A321neo", "region": "kyushu"},
    "IT744": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "宮崎機場 (KMI)", "terminal": "I", "time": "12:40", "aircraft": "A320neo", "region": "kyushu"},
    "IT246": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "佐賀機場 (HSG)", "terminal": "I", "time": "11:00", "aircraft": "A320neo", "region": "kyushu"},

    # ================= 中部・北陸 Chubu / Hokuriku (NGO / KMQ / TOY / KIJ) =================
    "JX836": {"airline": "星宇航空 STARLUX Airlines", "airport": "名古屋中部國際機場 (NGO)", "terminal": "T1", "time": "12:10", "aircraft": "A321neo", "region": "chubu"},
    "CI150": {"airline": "中華航空 China Airlines", "airport": "名古屋中部國際機場 (NGO)", "terminal": "T1", "time": "10:45", "aircraft": "A321neo", "region": "chubu"},
    "BR150": {"airline": "長榮航空 EVA Air", "airport": "名古屋中部國際機場 (NGO)", "terminal": "T1", "time": "11:30", "aircraft": "A321-200", "region": "chubu"},
    "IT206": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "名古屋中部國際機場 (NGO)", "terminal": "T2", "time": "10:25", "aircraft": "A320neo", "region": "chubu"},
    "IT256": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "小松機場 (KMQ)", "terminal": "I", "time": "11:05", "aircraft": "A320neo", "region": "chubu"},
    "BR158": {"airline": "長榮航空 EVA Air", "airport": "小松機場 (KMQ)", "terminal": "I", "time": "10:00", "aircraft": "A321-200", "region": "chubu"},
    "CI170": {"airline": "中華航空 China Airlines", "airport": "富山機場 (TOY)", "terminal": "I", "time": "11:40", "aircraft": "A321neo", "region": "chubu"},
    "IT728": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "新潟機場 (KIJ)", "terminal": "I", "time": "16:05", "aircraft": "A320neo", "region": "chubu"},

    # ================= 東北 Tohoku (SDJ / HNA / AXT) =================
    "BR118": {"airline": "長榮航空 EVA Air", "airport": "仙台機場 (SDJ)", "terminal": "I", "time": "14:25", "aircraft": "A321-200", "region": "tohoku"},
    "IT254": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "仙台機場 (SDJ)", "terminal": "I", "time": "18:10", "aircraft": "A320neo", "region": "tohoku"},
    "IT258": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "花卷機場 (HNA)", "terminal": "I", "time": "14:50", "aircraft": "A320neo", "region": "tohoku"},
    "IT257": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "秋田機場 (AXT)", "terminal": "I", "time": "15:30", "aircraft": "A320neo", "region": "tohoku"},

    # ================= 山陽・山陰・四國 Sanyo / Sanin / Shikoku (OKJ / TAK / HIJ) =================
    "IT214": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "岡山桃太郎機場 (OKJ)", "terminal": "I", "time": "17:20", "aircraft": "A320neo", "region": "sanyo"},
    "CI278": {"airline": "中華航空 China Airlines", "airport": "高松機場 (TAK)", "terminal": "I", "time": "10:20", "aircraft": "A321neo", "region": "sanyo"},
    "JX300": {"airline": "星宇航空 STARLUX Airlines", "airport": "高松機場 (TAK)", "terminal": "I", "time": "10:40", "aircraft": "A321neo", "region": "sanyo"},
    "CI112": {"airline": "中華航空 China Airlines", "airport": "廣島機場 (HIJ)", "terminal": "I", "time": "11:50", "aircraft": "A321neo", "region": "sanyo"},

    # ================= 沖繩 Okinawa (OKA) =================
    "BR112": {"airline": "長榮航空 EVA Air", "airport": "沖繩那霸機場 (OKA)", "terminal": "I", "time": "10:35", "aircraft": "A321-200", "region": "okinawa"},
    "BR186": {"airline": "長榮航空 EVA Air", "airport": "沖繩那霸機場 (OKA)", "terminal": "I", "time": "17:50", "aircraft": "A321-200", "region": "okinawa"},
    "CI120": {"airline": "中華航空 China Airlines", "airport": "沖繩那霸機場 (OKA)", "terminal": "I", "time": "09:50", "aircraft": "A321neo", "region": "okinawa"},
    "CI122": {"airline": "中華航空 China Airlines", "airport": "沖繩那霸機場 (OKA)", "terminal": "I", "time": "16:35", "aircraft": "A321neo", "region": "okinawa"},
    "IT230": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "沖繩那霸機場 (OKA)", "terminal": "I", "time": "09:15", "aircraft": "A320neo", "region": "okinawa"},
    "IT232": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "沖繩那霸機場 (OKA)", "terminal": "I", "time": "15:45", "aircraft": "A320neo", "region": "okinawa"},
    "MM922": {"airline": "樂桃航空 Peach Aviation", "airport": "沖繩那霸機場 (OKA)", "terminal": "I", "time": "11:10", "aircraft": "A320neo", "region": "okinawa"},
}


def normalize_time(raw_time: str) -> tuple[str, bool]:
    if not isinstance(raw_time, str):
        return "12:00", False
    s = raw_time.strip()
    m = re.match(r"^(\d{1,2}):(\d{2})$", s)
    if not m:
        return "12:00", False
    hh, mm = int(m.group(1)), int(m.group(2))
    if 0 <= hh <= 23 and 0 <= mm <= 59:
        return f"{hh:02d}:{mm:02d}", True
    return "12:00", False


def validate_flight_entry(flight_no: str, entry: dict, source: str, checked_at: str) -> tuple[dict, list[str]]:
    warnings = []
    clean_no = flight_no.strip().upper()
    if not isinstance(entry, dict):
        entry = {}

    airline = str(entry.get("airline") or "").strip()
    if not airline:
        airline = "待確認航空公司"
        warnings.append(f"{clean_no}: 缺少 airline，已填入預設值")

    airport = str(entry.get("airport") or "").strip()
    if not airport:
        airport = "日本機場"
        warnings.append(f"{clean_no}: 缺少 airport，已填入預設值")

    terminal = str(entry.get("terminal") or "").strip() or "T1"

    norm_time, time_ok = normalize_time(str(entry.get("time") or ""))
    if not time_ok:
        warnings.append(f"{clean_no}: 時間 '{entry.get('time')}' 格式異常，已重設為 {norm_time}")

    aircraft = str(entry.get("aircraft") or "").strip()
    if not aircraft:
        aircraft = "A320neo"
        warnings.append(f"{clean_no}: 缺少 aircraft，已填入預設值")

    region = str(entry.get("region") or "kansai").strip()

    validated = {
        "airline": airline,
        "airport": airport,
        "terminal": terminal,
        "time": norm_time,
        "aircraft": aircraft,
        "region": region,
        "source": source,
        "verified_at": checked_at,
    }
    return validated, warnings


def diff_flights(old_flights: dict, new_flights: dict) -> tuple[list[dict], list[str]]:
    changes = []
    added = []
    tracked_fields = ["time", "airport", "terminal", "aircraft", "airline"]

    for flight_no, new_item in sorted(new_flights.items()):
        if flight_no not in old_flights:
            added.append(flight_no)
            continue
        old_item = old_flights[flight_no]
        field_diffs = {}
        for field in tracked_fields:
            old_val = str(old_item.get(field) or "")
            new_val = str(new_item.get(field) or "")
            if old_val != new_val:
                field_diffs[field] = {"from": old_val, "to": new_val}
        if field_diffs:
            changes.append({
                "flight_no": flight_no,
                "diffs": field_diffs,
            })

    return changes, added


def load_existing_db(path: str = "db.json") -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def call_gemini_delta(api_key: str, prompt: str, models: list[str], timeout_sec: int = 25) -> tuple[dict | None, str, str]:
    scheme = "https"
    host = "generativelanguage.googleapis.com"
    fence = chr(96) * 3
    last_err = ""

    payload_bytes = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }).encode("utf-8")

    for model_name in models:
        url = f"{scheme}://{host}/v1beta/models/{model_name}:generateContent?key={api_key}"
        log(f"→ 呼叫模型 {model_name} (逾時 {timeout_sec}s)...")
        req = urllib.request.Request(
            url,
            data=payload_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if raw_text.startswith(fence):
                    raw_text = raw_text.split("\n", 1)[-1]
                if raw_text.endswith(fence):
                    raw_text = raw_text.rsplit(fence, 1)[0]
                parsed = json.loads(raw_text.strip())
                if isinstance(parsed, dict):
                    return parsed, model_name, ""
                last_err = f"模型 {model_name} 回傳非 JSON 物件"
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")[:180]
            last_err = f"模型 {model_name} HTTP {e.code}: {err_body}"
            log(f"  ✗ {last_err}")
        except Exception as e:
            last_err = f"模型 {model_name} 錯誤: {e}"
            log(f"  ✗ {last_err}")

    return None, "", last_err


def main() -> None:
    log("=== 開始執行 update_db.py（增量輕量模式） ===")
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("找不到 GEMINI_API_KEY，請確認 GitHub Secrets 中已新增該名稱！")

    tw_now = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    tw_time = tw_now.strftime("%Y-%m-%d %H:%M")
    checked_date = tw_now.strftime("%Y-%m-%d")

    existing_db = load_existing_db("db.json")
    prev_flights_raw = existing_db.get("flights") if isinstance(existing_db.get("flights"), dict) else {}
    prev_flights_clean = {
        k.strip().upper(): v
        for k, v in prev_flights_raw.items()
        if isinstance(k, str) and isinstance(v, dict)
    }

    baseline_seed = {}
    for k, v in BASE_FLIGHTS.items():
        baseline_seed[k] = dict(v)
    for k, v in prev_flights_clean.items():
        baseline_seed[k] = dict(v)

    # 合併既有 JR PASS 與基礎 17 種 JR PASS
    jr_map = {item["id"]: dict(item) for item in BASE_JR_PASSES}
    prev_jr = existing_db.get("jr_passes")
    if isinstance(prev_jr, list):
        for item in prev_jr:
            if isinstance(item, dict) and item.get("id"):
                jr_map[item["id"]] = dict(item)

    # 精簡摘錄航班清單供增量核對（避免 Prompt 過長）
    flight_summary_lines = [
        f"{k}: {v.get('airline')} {v.get('airport')} {v.get('terminal')} {v.get('time')} ({v.get('aircraft')})"
        for k, v in sorted(baseline_seed.items())
    ]

    prompt = f"""你是台日航線與日本旅遊資料核對助手。今天是台灣時間 {tw_time}。
為了快速回應，請只輸出「有變動或新增的項目」以及「當季精選活動」，嚴格回傳純 JSON（不要 markdown）：

1. 檢查以下台日航班清單，**只列出與最新班表不同的修正航班，以及補充 2～4 班熱門台日直飛新航班**（沒有變動的航班不要重複輸出）：
{chr(10).join(flight_summary_lines)}

2. 針對日本 7 大地區（kansai, kanto, hokkaido, kyushu, chubu, tohoku, sanyo），每個地區列出 2 筆（共 14 筆）當季限定祭典、點燈或順遊景點。

回傳 JSON 格式：
{{
  "updated_flights": {{
    "航班號": {{
      "airline": "航空公司",
      "airport": "機場名稱 (代碼)",
      "terminal": "T1",
      "time": "HH:MM",
      "aircraft": "機型",
      "region": "kansai"
    }}
  }},
  "events": [
    {{
      "id": "cloud-1",
      "region": "kansai",
      "months": [11, 12, 1],
      "category": "光影花火",
      "title": "活動名稱",
      "location": "地點與最近車站",
      "dateLabel": "舉辦月份",
      "duration": 90,
      "isIndoor": false,
      "desc": "40字內亮點說明"
    }}
  ]
}}"""

    models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3-flash-preview"]
    parsed, used_model, last_err = call_gemini_delta(api_key, prompt, models, timeout_sec=25)

    ai_flights = {}
    events = []
    fallback_used = False

    if parsed is not None:
        log(f"✓ 成功使用模型 {used_model} 取得增量核對結果！")
        ai_flights = parsed.get("updated_flights") if isinstance(parsed.get("updated_flights"), dict) else {}
        events = parsed.get("events") if isinstance(parsed.get("events"), list) else []
    else:
        fallback_used = True
        log(f"⚠️ Gemini 暫時無法回應，啟用本地基準保底寫入。最後錯誤：{last_err}")
        prev_events = existing_db.get("events")
        if isinstance(prev_events, list):
            events = prev_events

    merged_candidates = dict(baseline_seed)
    for k, v in ai_flights.items():
        if isinstance(k, str) and k.strip():
            merged_candidates[k.strip().upper()] = v

    validated_flights = {}
    all_warnings = []
    ai_keys_upper = {str(x).strip().upper() for x in ai_flights.keys()}
    for flight_no, raw_entry in sorted(merged_candidates.items()):
        source_tag = "gemini_verified" if flight_no in ai_keys_upper else "base_seed"
        clean_entry, warns = validate_flight_entry(flight_no, raw_entry, source_tag, checked_date)
        validated_flights[flight_no] = clean_entry
        all_warnings.extend(warns)

    changes, added = diff_flights(prev_flights_clean, validated_flights)
    jr_passes_list = list(jr_map.values())

    output = {
        "updated_at": tw_time,
        "jr_passes": jr_passes_list,
        "flights": validated_flights,
        "events": events,
        "flight_audit": {
            "checked_at": tw_time,
            "model_used": used_model if not fallback_used else "fallback_seed",
            "fallback_used": fallback_used,
            "total_flights": len(validated_flights),
            "total_jr_passes": len(jr_passes_list),
            "added_count": len(added),
            "changed_count": len(changes),
            "warning_count": len(all_warnings),
            "added_flights": added,
            "changed_flights": changes,
            "warnings": all_warnings,
        },
    }

    with open("db.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log("\n================ 資料庫更新與核對摘要 ================")
    log(f"核對時間：{tw_time}｜模式：{'保底寫入 (AI逾時/過載)' if fallback_used else f'增量核對 ({used_model})'}")
    log(f"JR PASS 總數：{len(jr_passes_list)} 種｜航班總數：{len(validated_flights)} 班｜新增：{len(added)} 班｜變動：{len(changes)} 班")
    if added:
        log(f"新增航班：{', '.join(added)}")
    if changes:
        log("變動明細：")
        for item in changes:
            detail_parts = [
                f"{field}: {diff['from']} -> {diff['to']}"
                for field, diff in item["diffs"].items()
            ]
            log(f"  - {item['flight_no']} ({', '.join(detail_parts)})")
    else:
        log("變動明細：與前次紀錄相比無欄位變更。")
    log(f"成功寫入 {len(jr_passes_list)} 種 JR PASS、{len(events)} 筆活動與 {len(validated_flights)} 筆航班至 db.json")
    log("======================================================\n")


if __name__ == "__main__":
    main()
