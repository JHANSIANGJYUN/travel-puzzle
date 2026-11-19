import datetime
import json
import os
import re
import time
import urllib.error
import urllib.request

BASE_FLIGHTS = {
    # ================= 關西 Kansai (KIX) =================
    "AK176": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:30", "aircraft": "A321neo", "region": "kansai"},
    "AK177": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "20:45", "aircraft": "A321neo", "region": "kansai"},
    "IT210": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "10:40", "aircraft": "A320neo", "region": "kanto"},
    "IT211": {"airline": "台灣虎航 Tigerair Taiwan", "airport": "東京成田機場 (NRT)", "terminal": "T2", "time": "11:40", "aircraft": "A320neo", "region": "kanto"},
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
    """將時間字串標準化為 HH:MM，回傳 (標準化時間, 是否為合法時間)"""
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
    """檢查單筆航班欄位完整性與格式，補齊必要欄位並回傳警告清單"""
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
    """比對新舊航班資料，回傳變動明細與新增航班清單"""
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


def call_gemini_with_retry(api_key: str, prompt: str, models: list[str], max_retries_per_model: int = 3) -> tuple[dict | None, str, str]:
    """依序嘗試模型，遇到 429/503 暫時過載時自動退避重試；回傳 (parsed_dict, used_model, last_err)"""
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
        for attempt in range(1, max_retries_per_model + 1):
            req = urllib.request.Request(
                url,
                data=payload_bytes,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
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
                    break
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="ignore")
                last_err = f"模型 {model_name} (第 {attempt}/{max_retries_per_model} 次) HTTP {e.code}: {err_body}"
                print(last_err)
                if e.code in (429, 503) and attempt < max_retries_per_model:
                    sleep_sec = 2 ** attempt
                    print(f"偵測到暫時性負載 ({e.code})，等待 {sleep_sec} 秒後重試...")
                    time.sleep(sleep_sec)
                    continue
                break
            except Exception as e:
                last_err = f"模型 {model_name} (第 {attempt}/{max_retries_per_model} 次) 錯誤: {e}"
                print(last_err)
                if attempt < max_retries_per_model:
                    sleep_sec = 2 ** attempt
                    time.sleep(sleep_sec)
                    continue
                break

    return None, "", last_err


def main() -> None:
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

    prompt = f"""你是台日航線與日本旅遊資料核對助手。今天是台灣時間 {tw_time}。
請完成以下兩項工作，並嚴格只回傳純 JSON（不要任何 markdown 標記或說明文字）：

1. 針對以下台日熱門航班進行當季時刻、降落/起飛機場、航廈與機型核對，若發現與參考資料不同請修正為最新班表，並可補充 2～5 班常見台日直飛航班：
{json.dumps(baseline_seed, ensure_ascii=False, indent=2)}

2. 針對日本 7 大地區（kansai 關西、kanto 關東、hokkaido 北海道、kyushu 九州、chubu 中部北陸、tohoku 東北、sanyo 山陽山陰四國），每個地區列出 3 筆（共 21 筆）近期或當季真實存在的限定祭典、夜間點燈或周邊順遊景點。

回傳 JSON 格式如下：
{{
  "flights": {{
    "AK176": {{
      "airline": "AirAsia 亞洲航空",
      "airport": "關西國際機場 (KIX)",
      "terminal": "T1",
      "time": "19:30",
      "aircraft": "A321neo",
      "region": "kansai"
    }}
  }},
  "events": [
    {{
      "id": "cloud-1",
      "region": "kansai",
      "months": [11, 12, 1],
      "category": "光影花火",
      "title": "活動或景點名稱",
      "location": "具體地點與最近車站",
      "dateLabel": "舉辦月份或特色",
      "duration": 90,
      "isIndoor": false,
      "desc": "45字內精簡亮點與順遊建議"
    }}
  ]
}}"""

    models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3-flash-preview"]
    parsed, used_model, last_err = call_gemini_with_retry(api_key, prompt, models, max_retries_per_model=3)

    ai_flights = {}
    events = []
    fallback_used = False

    if parsed is not None:
        print(f"成功使用模型 {used_model} 取得資料！")
        ai_flights = parsed.get("flights") if isinstance(parsed.get("flights"), dict) else {}
        events = parsed.get("events") if isinstance(parsed.get("events"), list) else []
    else:
        fallback_used = True
        print(f"⚠️ 所有 Gemini 模型暫時無法回應，啟用本地基準保底寫入。最後錯誤：{last_err}")
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

    output = {
        "updated_at": tw_time,
        "flights": validated_flights,
        "events": events,
        "flight_audit": {
            "checked_at": tw_time,
            "model_used": used_model if not fallback_used else "fallback_seed",
            "fallback_used": fallback_used,
            "total_flights": len(validated_flights),
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

    print("\n================ 航班核對與變動摘要 ================")
    print(f"核對時間：{tw_time}｜模式：{'保底寫入 (503/過載)' if fallback_used else f'AI 核對 ({used_model})'}")
    print(f"航班總數：{len(validated_flights)} 班｜新增：{len(added)} 班｜變動：{len(changes)} 班｜欄位警告：{len(all_warnings)} 項")
    if added:
        print(f"新增航班：{', '.join(added)}")
    if changes:
        print("變動明細：")
        for item in changes:
            detail_parts = [
                f"{field}: {diff['from']} -> {diff['to']}"
                for field, diff in item["diffs"].items()
            ]
            print(f"  - {item['flight_no']} ({', '.join(detail_parts)})")
    else:
        print("變動明細：與前次紀錄相比無欄位變更。")
    if all_warnings:
        print("欄位檢查提醒：")
        for w in all_warnings:
            print(f"  - {w}")
    print(f"成功寫入 {len(events)} 筆活動與 {len(validated_flights)} 筆航班至 db.json")
    print("===================================================\n")


if __name__ == "__main__":
    main()
