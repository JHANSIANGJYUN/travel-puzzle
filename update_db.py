import os, json, datetime, urllib.request, urllib.error

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("找不到 GEMINI_API_KEY，請確認 GitHub Secrets 中已新增該名稱！")

# 基礎台日熱門航班資料庫（作為每日核實與擴充的基準）
BASE_FLIGHTS = {
    "AK176": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "14:30", "aircraft": "A330-300", "region": "kansai"},
    "AK177": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "15:45", "aircraft": "A330-300", "region": "kansai"},
    "D7378": {"airline": "AirAsia X 亞航長程", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "22:05", "aircraft": "A330-300", "region": "kansai"},
    "D7379": {"airline": "AirAsia X 亞航長程", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "23:25", "aircraft": "A330-300", "region": "kansai"},
    "IT210": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "10:05", "aircraft": "A320neo", "region": "kansai"},
    "IT211": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:15", "aircraft": "A320neo", "region": "kansai"},
    "IT212": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "18:05", "aircraft": "A320", "region": "kansai"},
    "IT213": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:05", "aircraft": "A320", "region": "kansai"},
    "MM24": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "13:15", "aircraft": "A320neo", "region": "kansai"},
    "MM27": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "15:55", "aircraft": "A320neo", "region": "kansai"},
    "JX820": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:10", "aircraft": "A330-900neo", "region": "kansai"},
    "JX821": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:20", "aircraft": "A330-900neo", "region": "kansai"},
    "BR132": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:55", "aircraft": "B787-10", "region": "kansai"},
    "BR131": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:55", "aircraft": "B787-10", "region": "kansai"},
    "CI156": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:40", "aircraft": "A350-900", "region": "kansai"},
    "CI157": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:50", "aircraft": "A350-900", "region": "kansai"},
    "IT200": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "10:35", "aircraft": "A320neo", "region": "kanto"},
    "IT201": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "11:50", "aircraft": "A320neo", "region": "kanto"},
    "JX800": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "12:30", "aircraft": "A350-900", "region": "kanto"},
    "JX801": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "13:40", "aircraft": "A350-900", "region": "kanto"},
    "BR198": {"airline": "長榮航空 EVA Air", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "12:55", "aircraft": "B787-10", "region": "kanto"},
    "BR197": {"airline": "長榮航空 EVA Air", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "14:00", "aircraft": "B787-10", "region": "kanto"},
    "TR898": {"airline": "酷航 Scoot", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "10:45", "aircraft": "B787-9", "region": "kanto"},
    "TR899": {"airline": "酷航 Scoot", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "11:45", "aircraft": "B787-9", "region": "kanto"},
    "IT234": {"airline": "台灣虎航 Tigerair", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "11:25", "aircraft": "A320", "region": "hokkaido"},
    "IT235": {"airline": "台灣虎航 Tigerair", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "12:25", "aircraft": "A320", "region": "hokkaido"},
    "BR116": {"airline": "長榮航空 EVA Air", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "14:05", "aircraft": "B787-10", "region": "hokkaido"},
    "BR115": {"airline": "長榮航空 EVA Air", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "15:20", "aircraft": "B787-10", "region": "hokkaido"},
    "IT240": {"airline": "台灣虎航 Tigerair", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "10:00", "aircraft": "A320neo", "region": "kyushu"},
    "IT241": {"airline": "台灣虎航 Tigerair", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "10:55", "aircraft": "A320neo", "region": "kyushu"},
    "JX840": {"airline": "星宇航空 STARLUX", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "13:45", "aircraft": "A321neo", "region": "kyushu"},
    "JX841": {"airline": "星宇航空 STARLUX", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "14:45", "aircraft": "A321neo", "region": "kyushu"},
    "IT206": {"airline": "台灣虎航 Tigerair", "airport": "中部國際機場 (NGO)", "terminal": "T1", "time": "12:50", "aircraft": "A320", "region": "chubu"},
    "IT207": {"airline": "台灣虎航 Tigerair", "airport": "中部國際機場 (NGO)", "terminal": "T1", "time": "13:45", "aircraft": "A320", "region": "chubu"},
    "IT254": {"airline": "台灣虎航 Tigerair", "airport": "仙台機場 (SDJ)", "terminal": "航廈", "time": "18:10", "aircraft": "A320", "region": "tohoku"},
    "IT255": {"airline": "台灣虎航 Tigerair", "airport": "仙台機場 (SDJ)", "terminal": "航廈", "time": "19:00", "aircraft": "A320", "region": "tohoku"},
    "IT214": {"airline": "台灣虎航 Tigerair", "airport": "岡山桃太郎機場 (OKJ)", "terminal": "航廈", "time": "14:35", "aircraft": "A320", "region": "sanyo"},
    "IT215": {"airline": "台灣虎航 Tigerair", "airport": "岡山桃太郎機場 (OKJ)", "terminal": "航廈", "time": "15:25", "aircraft": "A320", "region": "sanyo"}
}

prompt = f"""你是一位日本旅遊與台日航空時刻資料庫維護專家。請執行以下兩項任務並嚴格只回傳純 JSON（不要任何 markdown 標記）：
1. 檢查並更新以下台日熱門航班時刻表（若時刻有微調請修正為最新常態時刻，並額外補充 6 班近期熱門台日航班如星宇/虎航/長榮/華航飛熊本、高松、函館、沖繩或東京羽田的航班）：
{json.dumps(BASE_FLIGHTS, ensure_ascii=False)}

2. 針對日本 7 大旅遊地區（kansai 關西、kanto 關東、hokkaido 北海道、kyushu 九州、chubu 中部北陸、tohoku 東北、sanyo 山陽山陰四國），列出 14 個近期或當季真實存在的限定祭典、夜間點燈或周邊順遊景點。category 只能從「周邊順遊」、「傳統祭典」、「光影花火」、「賞花紅葉」、「季節美食」中選一。

回傳 JSON 格式：
{{
  "flights": {{
    "AK176": {{ "airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "14:30", "aircraft": "A330-300", "region": "kansai" }}
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

scheme = "https"
host = "generativelanguage.googleapis.com"
models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3-flash-preview"]
raw_text = ""
last_err = ""

for m in models:
    url = f"{scheme}://{host}/v1beta/models/{m}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 0}
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"成功使用模型 {m} 核實航班與更新景點！")
            break
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        last_err = f"模型 {m} HTTP {e.code}: {err_body}"
        print(last_err)
    except Exception as e:
        last_err = f"模型 {m} 錯誤: {e}"
        print(last_err)

if not raw_text:
    raise RuntimeError(f"所有 Gemini 模型皆呼叫失敗，最後錯誤：{last_err}")

fence = chr(96) * 3
if raw_text.startswith(fence):
    raw_text = raw_text.split("\n", 1)[-1]
if raw_text.endswith(fence):
    raw_text = raw_text.rsplit(fence, 1)[0]

parsed = json.loads(raw_text.strip())

# 合併基礎航班與 AI 核實擴充後的航班（確保原本 38 班不遺失）
merged_flights = dict(BASE_FLIGHTS)
if isinstance(parsed.get("flights"), dict):
    for code, info in parsed["flights"].items():
        if isinstance(info, dict) and info.get("time") and info.get("airport"):
            merged_flights[code.upper().strip()] = info

tw_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%Y-%m-%d %H:%M")
output = {
    "updated_at": tw_time,
    "flights": merged_flights,
    "events": parsed.get("events", [])
}

with open("db.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"成功寫入 {len(merged_flights)} 班台日航班與 {len(output['events'])} 筆活動到 db.json！")
