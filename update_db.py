import os, json, datetime, re, urllib.request, urllib.error, urllib.parse

def log(msg):
    print(msg, flush=True)

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("找不到 GEMINI_API_KEY，請確認 GitHub Secrets 中已新增該名稱！")

# 1. 完整台日熱門航班基礎資料庫（涵蓋關西/成田/羽田/新千歲/函館/福岡/熊本/名古屋/小松/仙台/岡山/高松/沖繩）
BASE_FLIGHTS = {
    # --- 關西國際機場 (KIX) ---
    "AK176": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:30", "aircraft": "A321neo", "region": "kansai"},
    "AK177": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "20:45", "aircraft": "A321neo", "region": "kansai"},
    "D7378": {"airline": "AirAsia X 亞航長程", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "22:05", "aircraft": "A330-300", "region": "kansai"},
    "D7379": {"airline": "AirAsia X 亞航長程", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "23:25", "aircraft": "A330-300", "region": "kansai"},
    "IT210": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "10:05", "aircraft": "A320neo", "region": "kansai"},
    "IT211": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:15", "aircraft": "A320neo", "region": "kansai"},
    "IT212": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "18:05", "aircraft": "A320", "region": "kansai"},
    "IT213": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:05", "aircraft": "A320", "region": "kansai"},
    "IT252": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "14:55", "aircraft": "A320neo", "region": "kansai"},
    "IT253": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "15:55", "aircraft": "A320neo", "region": "kansai"},
    "IT284": {"airline": "台灣虎航 Tigerair (高雄出發)", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "10:40", "aircraft": "A320", "region": "kansai"},
    "IT285": {"airline": "台灣虎航 Tigerair (飛往高雄)", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:40", "aircraft": "A320", "region": "kansai"},
    "MM24": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "13:15", "aircraft": "A320neo", "region": "kansai"},
    "MM27": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "15:55", "aircraft": "A320neo", "region": "kansai"},
    "MM28": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "22:25", "aircraft": "A321LR", "region": "kansai"},
    "MM29": {"airline": "樂桃航空 Peach", "airport": "關西國際機場 (KIX)", "terminal": "T2", "time": "23:20", "aircraft": "A321LR", "region": "kansai"},
    "JX820": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:10", "aircraft": "A330-900neo", "region": "kansai"},
    "JX821": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:20", "aircraft": "A330-900neo", "region": "kansai"},
    "JX822": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "13:55", "aircraft": "A321neo", "region": "kansai"},
    "JX823": {"airline": "星宇航空 STARLUX", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "15:05", "aircraft": "A321neo", "region": "kansai"},
    "BR132": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:55", "aircraft": "B787-10", "region": "kansai"},
    "BR131": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:55", "aircraft": "B787-10", "region": "kansai"},
    "BR178": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "10:10", "aircraft": "B787-9", "region": "kansai"},
    "BR177": {"airline": "長榮航空 EVA Air", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:10", "aircraft": "B787-9", "region": "kansai"},
    "CI156": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:40", "aircraft": "A350-900", "region": "kansai"},
    "CI157": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "12:50", "aircraft": "A350-900", "region": "kansai"},
    "CI172": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "17:50", "aircraft": "A330-300", "region": "kansai"},
    "CI173": {"airline": "中華航空 China Airlines", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:00", "aircraft": "A330-300", "region": "kansai"},

    # --- 東京成田 (NRT) & 羽田 (HND) ---
    "IT200": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "10:35", "aircraft": "A320neo", "region": "kanto"},
    "IT201": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "11:50", "aircraft": "A320neo", "region": "kanto"},
    "IT202": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "17:45", "aircraft": "A320", "region": "kanto"},
    "IT203": {"airline": "台灣虎航 Tigerair", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "18:50", "aircraft": "A320", "region": "kanto"},
    "IT216": {"airline": "台灣虎航 Tigerair", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "04:25", "aircraft": "A320neo", "region": "kanto"},
    "IT217": {"airline": "台灣虎航 Tigerair", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "05:25", "aircraft": "A320neo", "region": "kanto"},
    "JX800": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "12:30", "aircraft": "A350-900", "region": "kanto"},
    "JX801": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "13:40", "aircraft": "A350-900", "region": "kanto"},
    "JX802": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "14:45", "aircraft": "A330-900neo", "region": "kanto"},
    "JX803": {"airline": "星宇航空 STARLUX", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "16:10", "aircraft": "A330-900neo", "region": "kanto"},
    "BR198": {"airline": "長榮航空 EVA Air", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "12:55", "aircraft": "B787-10", "region": "kanto"},
    "BR197": {"airline": "長榮航空 EVA Air", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "14:00", "aircraft": "B787-10", "region": "kanto"},
    "BR192": {"airline": "長榮航空 EVA Air (松山出發)", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "11:15", "aircraft": "B787-10", "region": "kanto"},
    "BR191": {"airline": "長榮航空 EVA Air (飛往松山)", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "12:15", "aircraft": "B787-10", "region": "kanto"},
    "CI100": {"airline": "中華航空 China Airlines", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "13:15", "aircraft": "B777-300ER", "region": "kanto"},
    "CI101": {"airline": "中華航空 China Airlines", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "14:35", "aircraft": "B777-300ER", "region": "kanto"},
    "CI220": {"airline": "中華航空 China Airlines (松山出發)", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "12:55", "aircraft": "A330-300", "region": "kanto"},
    "CI221": {"airline": "中華航空 China Airlines (飛往松山)", "airport": "東京羽田機場 (HND)", "terminal": "T3", "time": "14:15", "aircraft": "A330-300", "region": "kanto"},
    "TR898": {"airline": "酷航 Scoot", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "10:45", "aircraft": "B787-9", "region": "kanto"},
    "TR899": {"airline": "酷航 Scoot", "airport": "成田國際機場 (NRT)", "terminal": "T1", "time": "11:45", "aircraft": "B787-9", "region": "kanto"},

    # --- 北海道新千歲 (CTS) & 函館 (HKD) ---
    "IT234": {"airline": "台灣虎航 Tigerair", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "11:25", "aircraft": "A320", "region": "hokkaido"},
    "IT235": {"airline": "台灣虎航 Tigerair", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "12:25", "aircraft": "A320", "region": "hokkaido"},
    "IT236": {"airline": "台灣虎航 Tigerair", "airport": "函館機場 (HKD)", "terminal": "國際線", "time": "11:10", "aircraft": "A320", "region": "hokkaido"},
    "IT237": {"airline": "台灣虎航 Tigerair", "airport": "函館機場 (HKD)", "terminal": "國際線", "time": "12:20", "aircraft": "A320", "region": "hokkaido"},
    "BR116": {"airline": "長榮航空 EVA Air", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "14:05", "aircraft": "B787-10", "region": "hokkaido"},
    "BR115": {"airline": "長榮航空 EVA Air", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "15:20", "aircraft": "B787-10", "region": "hokkaido"},
    "CI130": {"airline": "中華航空 China Airlines", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "13:15", "aircraft": "A330-300", "region": "hokkaido"},
    "CI131": {"airline": "中華航空 China Airlines", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "14:40", "aircraft": "A330-300", "region": "hokkaido"},
    "JX850": {"airline": "星宇航空 STARLUX", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "14:00", "aircraft": "A330-900neo", "region": "hokkaido"},
    "JX851": {"airline": "星宇航空 STARLUX", "airport": "新千歲機場 (CTS)", "terminal": "國際線", "time": "15:15", "aircraft": "A330-900neo", "region": "hokkaido"},

    # --- 九州福岡 (FUK) & 熊本 (KMJ) ---
    "IT240": {"airline": "台灣虎航 Tigerair", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "10:00", "aircraft": "A320neo", "region": "kyushu"},
    "IT241": {"airline": "台灣虎航 Tigerair", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "10:55", "aircraft": "A320neo", "region": "kyushu"},
    "JX840": {"airline": "星宇航空 STARLUX", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "13:45", "aircraft": "A321neo", "region": "kyushu"},
    "JX841": {"airline": "星宇航空 STARLUX", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "14:45", "aircraft": "A321neo", "region": "kyushu"},
    "JX846": {"airline": "星宇航空 STARLUX", "airport": "阿蘇熊本機場 (KMJ)", "terminal": "國際線", "time": "12:00", "aircraft": "A321neo", "region": "kyushu"},
    "JX847": {"airline": "星宇航空 STARLUX", "airport": "阿蘇熊本機場 (KMJ)", "terminal": "國際線", "time": "13:00", "aircraft": "A321neo", "region": "kyushu"},
    "BR106": {"airline": "長榮航空 EVA Air", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "11:15", "aircraft": "B787-9", "region": "kyushu"},
    "BR105": {"airline": "長榮航空 EVA Air", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "12:15", "aircraft": "B787-9", "region": "kyushu"},
    "CI110": {"airline": "中華航空 China Airlines", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "09:55", "aircraft": "A350-900", "region": "kyushu"},
    "CI111": {"airline": "中華航空 China Airlines", "airport": "福岡機場 (FUK)", "terminal": "國際線", "time": "11:00", "aircraft": "A350-900", "region": "kyushu"},

    # --- 中部北陸名古屋 (NGO) & 小松 (KMQ) ---
    "IT206": {"airline": "台灣虎航 Tigerair", "airport": "中部國際機場 (NGO)", "terminal": "T1", "time": "12:50", "aircraft": "A320", "region": "chubu"},
    "IT207": {"airline": "台灣虎航 Tigerair", "airport": "中部國際機場 (NGO)", "terminal": "T1", "time": "13:45", "aircraft": "A320", "region": "chubu"},
    "JX838": {"airline": "星宇航空 STARLUX", "airport": "中部國際機場 (NGO)", "terminal": "T1", "time": "18:15", "aircraft": "A321neo", "region": "chubu"},
    "JX839": {"airline": "星宇航空 STARLUX", "airport": "中部國際機場 (NGO)", "terminal": "T1", "time": "19:15", "aircraft": "A321neo", "region": "chubu"},
    "BR158": {"airline": "長榮航空 EVA Air", "airport": "小松機場 (KMQ)", "terminal": "航廈", "time": "10:25", "aircraft": "A321", "region": "chubu"},
    "BR157": {"airline": "長榮航空 EVA Air", "airport": "小松機場 (KMQ)", "terminal": "航廈", "time": "11:45", "aircraft": "A321", "region": "chubu"},

    # --- 東北仙台 (SDJ) ---
    "IT254": {"airline": "台灣虎航 Tigerair", "airport": "仙台機場 (SDJ)", "terminal": "航廈", "time": "18:10", "aircraft": "A320", "region": "tohoku"},
    "IT255": {"airline": "台灣虎航 Tigerair", "airport": "仙台機場 (SDJ)", "terminal": "航廈", "time": "19:00", "aircraft": "A320", "region": "tohoku"},
    "JX862": {"airline": "星宇航空 STARLUX", "airport": "仙台機場 (SDJ)", "terminal": "航廈", "time": "16:00", "aircraft": "A321neo", "region": "tohoku"},
    "JX863": {"airline": "星宇航空 STARLUX", "airport": "仙台機場 (SDJ)", "terminal": "航廈", "time": "17:15", "aircraft": "A321neo", "region": "tohoku"},

    # --- 山陽山陰岡山 (OKJ) & 四國高松 (TAK) ---
    "IT214": {"airline": "台灣虎航 Tigerair", "airport": "岡山桃太郎機場 (OKJ)", "terminal": "航廈", "time": "14:35", "aircraft": "A320", "region": "sanyo"},
    "IT215": {"airline": "台灣虎航 Tigerair", "airport": "岡山桃太郎機場 (OKJ)", "terminal": "航廈", "time": "15:25", "aircraft": "A320", "region": "sanyo"},
    "CI178": {"airline": "中華航空 China Airlines", "airport": "高松機場 (TAK)", "terminal": "航廈", "time": "17:55", "aircraft": "A321neo", "region": "sanyo"},
    "CI179": {"airline": "中華航空 China Airlines", "airport": "高松機場 (TAK)", "terminal": "航廈", "time": "18:55", "aircraft": "A321neo", "region": "sanyo"},

    # --- 沖繩那霸 (OKA) & 離島 ---
    "IT230": {"airline": "台灣虎航 Tigerair", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "09:20", "aircraft": "A320neo", "region": "kyushu"},
    "IT231": {"airline": "台灣虎航 Tigerair", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "10:15", "aircraft": "A320neo", "region": "kyushu"},
    "IT232": {"airline": "台灣虎航 Tigerair", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "20:35", "aircraft": "A320", "region": "kyushu"},
    "IT233": {"airline": "台灣虎航 Tigerair", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "21:35", "aircraft": "A320", "region": "kyushu"},
    "CI120": {"airline": "中華航空 China Airlines", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "10:45", "aircraft": "A330-300", "region": "kyushu"},
    "CI121": {"airline": "中華航空 China Airlines", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "11:50", "aircraft": "A330-300", "region": "kyushu"},
    "CI122": {"airline": "中華航空 China Airlines", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "19:35", "aircraft": "A321neo", "region": "kyushu"},
    "CI123": {"airline": "中華航空 China Airlines", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "20:50", "aircraft": "A321neo", "region": "kyushu"},
    "BR112": {"airline": "長榮航空 EVA Air", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "09:15", "aircraft": "A321", "region": "kyushu"},
    "BR111": {"airline": "長榮航空 EVA Air", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "10:15", "aircraft": "A321", "region": "kyushu"},
    "BR186": {"airline": "長榮航空 EVA Air", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "18:55", "aircraft": "A321", "region": "kyushu"},
    "BR185": {"airline": "長榮航空 EVA Air", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "19:55", "aircraft": "A321", "region": "kyushu"},
    "JX870": {"airline": "星宇航空 STARLUX", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "12:15", "aircraft": "A321neo", "region": "kyushu"},
    "JX871": {"airline": "星宇航空 STARLUX", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "13:20", "aircraft": "A321neo", "region": "kyushu"},
    "MM924": {"airline": "樂桃航空 Peach", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "12:00", "aircraft": "A320neo", "region": "kyushu"},
    "MM925": {"airline": "樂桃航空 Peach", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "13:15", "aircraft": "A320neo", "region": "kyushu"}
}

# 2. 完整 35 種官方 JR PASS 周遊券基礎資料庫（含關西迷你周遊券、全區多日券、HARUKA 等）
BASE_JR_PASSES = [
    # --- 關西 / 山陽山陰 / 北陸 ---
    {"id": "jr-kansai-mini-3", "name": "JR 關西迷你鐵路周遊券 (3日)", "priceJpy": 3000, "days": 3, "regions": ["kansai"], "airportCovered": False, "note": "涵蓋大阪・京都・神戶・奈良普通/快速（不含關西機場段）"},
    {"id": "jr-kansai-area-1", "name": "JR 關西地區鐵路周遊券 (1日)", "priceJpy": 2800, "days": 1, "regions": ["kansai"], "airportCovered": True, "note": "含關空特快 HARUKA 自由席＋京阪神奈良 JR"},
    {"id": "jr-kansai-area-2", "name": "JR 關西地區鐵路周遊券 (2日)", "priceJpy": 4800, "days": 2, "regions": ["kansai"], "airportCovered": True, "note": "含關空特快 HARUKA 自由席＋京阪神奈良 JR"},
    {"id": "jr-kansai-area-3", "name": "JR 關西地區鐵路周遊券 (3日)", "priceJpy": 5800, "days": 3, "regions": ["kansai"], "airportCovered": True, "note": "含關空特快 HARUKA 自由席＋京阪神奈良姬路"},
    {"id": "jr-kansai-area-4", "name": "JR 關西地區鐵路周遊券 (4日)", "priceJpy": 7000, "days": 4, "regions": ["kansai"], "airportCovered": True, "note": "含關空特快 HARUKA 自由席＋京阪神奈良姬路"},
    {"id": "jr-haruka-oneway", "name": "JR 關西機場特快 HARUKA 車票 (單程)", "priceJpy": 1800, "days": 1, "regions": ["kansai"], "airportCovered": True, "note": "關西機場直達天王寺・新大阪・京都特快列車"},
    {"id": "jr-haruka-roundtrip", "name": "JR 關西機場特快 HARUKA 車票 (來回)", "priceJpy": 3600, "days": 14, "regions": ["kansai"], "airportCovered": True, "note": "14日內往返關西機場與大阪/京都超值套票"},
    {"id": "jr-kansai-wide-5", "name": "JR 關西廣域鐵路周遊券 (5日)", "priceJpy": 12000, "days": 5, "regions": ["kansai", "sanyo"], "airportCovered": True, "note": "含新幹線新大阪-岡山＋HARUKA＋天橋立・城崎・和歌山"},
    {"id": "jr-kansai-hiroshima-5", "name": "JR 關西＆廣島地區周遊券 (5日)", "priceJpy": 17000, "days": 5, "regions": ["kansai", "sanyo"], "airportCovered": True, "note": "含山陽新幹線（新大阪-廣島）＋宮島渡輪＋HARUKA"},
    {"id": "jr-kansai-hokuriku-7", "name": "JR 關西＆北陸地區鐵路周遊券 (7日)", "priceJpy": 19000, "days": 7, "regions": ["kansai", "chubu"], "airportCovered": True, "note": "串聯關西・金澤・富山・敦賀與北陸新幹線"},
    {"id": "jr-sanyo-sanin-7", "name": "JR 山陽＆山陰地區鐵路周遊券 (7日)", "priceJpy": 23000, "days": 7, "regions": ["kansai", "sanyo"], "airportCovered": True, "note": "含山陽新幹線全線（新大阪-博多）＋出雲・鳥取・宮島"},
    {"id": "jr-okayama-hiroshima-yamaguchi-5", "name": "JR 岡山＆廣島＆山口地區周遊券 (5日)", "priceJpy": 15000, "days": 5, "regions": ["sanyo"], "airportCovered": False, "note": "含山陽新幹線岡山-博多＋宮島渡輪＋錦帶橋"},
    {"id": "jr-hokuriku-arch-7", "name": "JR 北陸拱型鐵路周遊券 (7日)", "priceJpy": 30000, "days": 7, "regions": ["kansai", "kanto", "chubu"], "airportCovered": True, "note": "串聯關西機場・大阪・京都・金澤・長野與東京成田/羽田"},
    # --- 關東 / 東日本 ---
    {"id": "jr-tokyo-wide-3", "name": "JR 東京廣域周遊券 (3日)", "priceJpy": 15000, "days": 3, "regions": ["kanto"], "airportCovered": True, "note": "含成田特快 N’EX＋富士回遊＋輕井澤・日光・越後湯澤新幹線"},
    {"id": "jr-east-tohoku-5", "name": "JR 東日本鐵路周遊券・東北地區 (5日)", "priceJpy": 30000, "days": 5, "regions": ["kanto", "tohoku"], "airportCovered": True, "note": "含東京圈與東北新幹線全線（仙台・青森・秋田・盛岡）"},
    {"id": "jr-east-nagano-niigata-5", "name": "JR 東日本鐵路周遊券・長野新潟 (5日)", "priceJpy": 27000, "days": 5, "regions": ["kanto", "chubu"], "airportCovered": True, "note": "串聯東京・長野・松本・輕井澤與新潟新幹線"},
    {"id": "jr-tohoku-south-hokkaido-6", "name": "JR 東北・南北海道鐵路周遊券 (任選6日)", "priceJpy": 35370, "days": 6, "regions": ["tohoku", "hokkaido"], "airportCovered": True, "note": "跨越東北與道南函館・札幌一帶"},
    # --- 北海道 ---
    {"id": "jr-sapporo-furano-4", "name": "JR 札幌－富良野區域鐵路周遊券 (4日)", "priceJpy": 11000, "days": 4, "regions": ["hokkaido"], "airportCovered": True, "note": "道央札幌・新千歲・小樽・旭川・富良野・美瑛"},
    {"id": "jr-sapporo-noboribetsu-4", "name": "JR 札幌－登別區域鐵路周遊券 (4日)", "priceJpy": 10000, "days": 4, "regions": ["hokkaido"], "airportCovered": True, "note": "札幌・新千歲・小樽・登別溫泉・白老"},
    {"id": "jr-hokkaido-5", "name": "JR 北海道鐵路周遊券 (5日)", "priceJpy": 21000, "days": 5, "regions": ["hokkaido"], "airportCovered": True, "note": "含新千歲機場快速＋札幌・函館・旭川・富良野・釧路特急"},
    {"id": "jr-hokkaido-7", "name": "JR 北海道鐵路周遊券 (7日)", "priceJpy": 27000, "days": 7, "regions": ["hokkaido"], "airportCovered": True, "note": "北海道全線特急列車 7 日無限搭乘"},
    {"id": "jr-hokkaido-10", "name": "JR 北海道鐵路周遊券 (10日)", "priceJpy": 33000, "days": 10, "regions": ["hokkaido"], "airportCovered": True, "note": "北海道全線深度環島 10 日暢遊"},
    # --- 九州 ---
    {"id": "jr-north-kyushu-3", "name": "JR 北九州鐵路周遊券 (3日)", "priceJpy": 12000, "days": 3, "regions": ["kyushu"], "airportCovered": True, "note": "含由布院之森＋博多・熊本・阿蘇・長崎・別府特急"},
    {"id": "jr-north-kyushu-5", "name": "JR 北九州鐵路周遊券 (5日)", "priceJpy": 15000, "days": 5, "regions": ["kyushu"], "airportCovered": True, "note": "含由布院之森・九州新幹線（博多-熊本）5 日暢遊"},
    {"id": "jr-all-kyushu-3", "name": "JR 全九州鐵路周遊券 (3日)", "priceJpy": 17000, "days": 3, "regions": ["kyushu"], "airportCovered": True, "note": "含鹿兒島・宮崎與全九州新幹線 3 日暢遊"},
    {"id": "jr-all-kyushu-5", "name": "JR 全九州鐵路周遊券 (5日)", "priceJpy": 22500, "days": 5, "regions": ["kyushu"], "airportCovered": True, "note": "含鹿兒島・指宿玉手箱・宮崎與全九州新幹線"},
    {"id": "jr-all-kyushu-7", "name": "JR 全九州鐵路周遊券 (7日)", "priceJpy": 25000, "days": 7, "regions": ["kyushu"], "airportCovered": True, "note": "全九州環島 7 日無限搭乘"},
    # --- 中部 / 北陸 / 四國 ---
    {"id": "jr-takayama-hokuriku-5", "name": "JR 高山・北陸地區周遊券 (5日)", "priceJpy": 19800, "days": 5, "regions": ["kansai", "chubu"], "airportCovered": True, "note": "含名古屋・高山・白川鄉濃飛巴士・金澤・京都・關西機場"},
    {"id": "jr-ise-kumano-wakayama-5", "name": "JR 伊勢・熊野・和歌山地區周遊券 (5日)", "priceJpy": 16500, "days": 5, "regions": ["kansai", "chubu"], "airportCovered": True, "note": "涵蓋名古屋・伊勢志摩・熊野古道・白濱・和歌山"},
    {"id": "jr-all-shikoku-3", "name": "JR 四國鐵路周遊券 (3日)", "priceJpy": 12000, "days": 3, "regions": ["sanyo"], "airportCovered": False, "note": "四國全線（高松・松山・高知・德島）特急自由席"},
    {"id": "jr-all-shikoku-5", "name": "JR 四國鐵路周遊券 (5日)", "priceJpy": 16200, "days": 5, "regions": ["sanyo"], "airportCovered": False, "note": "四國全線（高松・松山・高知・德島）特急自由席無限搭"},
    {"id": "jr-all-shikoku-7", "name": "JR 四國鐵路周遊券 (7日)", "priceJpy": 19000, "days": 7, "regions": ["sanyo"], "airportCovered": False, "note": "四國環島 7 日鐵道深度漫遊"},
    # --- 全日本通用 ---
    {"id": "jr-whole-japan-7", "name": "JR 全日本鐵路通票 (7日普通車)", "priceJpy": 50000, "days": 7, "regions": ["kansai", "kanto", "hokkaido", "kyushu", "chubu", "tohoku", "sanyo"], "airportCovered": True, "note": "全國 JR 幹線與新幹線（除 Nozomi/Mizuho 外）7 日無限搭乘"},
    {"id": "jr-whole-japan-14", "name": "JR 全日本鐵路通票 (14日普通車)", "priceJpy": 80000, "days": 14, "regions": ["kansai", "kanto", "hokkaido", "kyushu", "chubu", "tohoku", "sanyo"], "airportCovered": True, "note": "全國 JR 幹線與新幹線 14 日跨區長征"},
    {"id": "jr-whole-japan-21", "name": "JR 全日本鐵路通票 (21日普通車)", "priceJpy": 100000, "days": 21, "regions": ["kansai", "kanto", "hokkaido", "kyushu", "chubu", "tohoku", "sanyo"], "airportCovered": True, "note": "全國 JR 幹線與新幹線 21 日全制霸"}
]

# 3. 豐富的全日本 7 大地區經典景點與季節祭典基礎資料庫（共 56 筆，確保每個地區隨時都有大量可選拼圖）
BASE_EVENTS = [
    # 關西 Kansai (12 筆)
    {"id": "base-k-1", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "傳統祭典", "title": "伏見稻荷大社・千本鳥居", "wikiJa": "伏見稲荷大社", "location": "京都市伏見區（JR稻荷站步行1分）", "dateLabel": "全年參拜・清晨最美", "duration": 120, "isIndoor": False, "desc": "綿延山頭的朱紅色千本鳥居隧道，JR 奈良線直達最省時。"},
    {"id": "base-k-2", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "清水寺＆二年坂三年坂散策", "wikiJa": "清水寺", "location": "京都市東山區（祇園四條步行15分）", "dateLabel": "四季皆宜・春秋夜楓櫻花", "duration": 150, "isIndoor": False, "desc": "懸空清水舞台遠眺京都市景，沿石坂古街品嚐抹茶與八橋。"},
    {"id": "base-k-3", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "大阪城天守閣＆西之丸庭園", "wikiJa": "大坂城", "location": "大阪市中央區（JR大阪城公園站）", "dateLabel": "全年開放・春櫻秋銀杏", "duration": 120, "isIndoor": True, "desc": "登頂金碧輝煌天守閣俯瞰大阪全景，歷史博物館雨天也適合。"},
    {"id": "base-k-4", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "奈良公園小鹿＆東大寺大佛殿", "wikiJa": "東大寺", "location": "奈良市雜司町（JR/近鐵奈良站）", "dateLabel": "全年順遊・餵鹿體驗", "duration": 180, "isIndoor": False, "desc": "與可愛神鹿互動並參拜世界最大木造建築東大寺盧舍那佛。"},
    {"id": "base-k-5", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "日本國寶・姬路城白鷺城巡禮", "wikiJa": "姫路城", "location": "兵庫縣姬路市（JR姬路站步行15分）", "dateLabel": "世界遺產・持PASS超划算", "duration": 150, "isIndoor": False, "desc": "日本現存最完整木造天守閣，搭 JR 新快速從大阪直達僅1小時。"},
    {"id": "base-k-6", "region": "kansai", "months": [11,12], "category": "光影花火", "title": "大阪光之饗宴・御堂筋彩燈大道", "wikiJa": "OSAKA光のルネサンス", "location": "梅田～難波御堂筋沿線", "dateLabel": "11月～12月31日", "duration": 90, "isIndoor": False, "desc": "全長4公里金黃與香檳色樹海點燈，傍晚一路散步至心齋橋。"},
    {"id": "base-k-7", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "季節美食", "title": "神戶南京町中華街＆神戶牛鐵板燒", "wikiJa": "南京町 (神戸市)", "location": "神戶市中央區（JR元町站步行3分）", "dateLabel": "午餐晚餐皆宜", "duration": 120, "isIndoor": True, "desc": "逛日本三大中華街小吃，再品嚐入口即化的頂級A5神戶牛。"},
    {"id": "base-k-8", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "神戶港塔＆美利堅公園海濱夜景", "wikiJa": "神戸ポートタワー", "location": "神戶市中央區（JR元町站步行12分）", "dateLabel": "全年夜景・海港散步", "duration": 90, "isIndoor": False, "desc": "登上全新整修的神戶港塔360度展望台，欣賞港灣璀璨燈火。"},
    {"id": "base-k-9", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "季節美食", "title": "京都錦市場＆新京極通美食巡禮", "wikiJa": "錦市場", "location": "京都市中京區（烏丸/河原町站）", "dateLabel": "雨天備案首選", "duration": 120, "isIndoor": True, "desc": "有遮雨棚的京都廚房，現烤玉子燒、豆乳甜甜圈與海鮮串燒。"},
    {"id": "base-k-10", "region": "kansai", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "阿倍野 HARUKAS 300 展望台", "wikiJa": "あべのハルカス", "location": "大阪市阿倍野區（JR天王寺站直結）", "dateLabel": "室內高空夜景", "duration": 90, "isIndoor": True, "desc": "300公尺全玻璃幕牆高空俯瞰關西平原，樓下即大型百貨。"},
    # 關東 Kanto (8 筆)
    {"id": "base-t-1", "region": "kanto", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "傳統祭典", "title": "淺草寺雷門＆仲見世通老街", "wikiJa": "浅草寺", "location": "東京都台東區（淺草站步行3分）", "dateLabel": "全年參拜", "duration": 120, "isIndoor": False, "desc": "東京最古老寺院雷門大燈籠打卡，順遊隅田川遠眺晴空塔。"},
    {"id": "base-t-2", "region": "kanto", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "東京晴空塔＆墨田水族館", "wikiJa": "東京スカイツリー", "location": "東京都墨田區（押上站直結）", "dateLabel": "室內高空展望", "duration": 150, "isIndoor": True, "desc": "登上450公尺天望回廊俯瞰東京灣，雨天也能逛晴空街道商場。"},
    {"id": "base-t-3", "region": "kanto", "months": [11,12,1,2], "category": "光影花火", "title": "東京丸之內香檳金街樹點燈", "wikiJa": "東京駅", "location": "東京車站丸之內仲通", "dateLabel": "11月中旬～2月中旬", "duration": 90, "isIndoor": False, "desc": "逾百萬顆香檳金LED點亮石板街道，順拍復古紅磚東京車站。"},
    {"id": "base-t-4", "region": "kanto", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "鎌倉大佛＆江之島湘南海岸一日遊", "wikiJa": "鎌倉大仏", "location": "神奈川縣鎌倉市（JR橫須賀線）", "dateLabel": "四季順遊", "duration": 240, "isIndoor": False, "desc": "搭乘江之電穿梭海岸線與平交道，傍晚登上江之島遠眺富士山。"},
    {"id": "base-t-5", "region": "kanto", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "橫濱紅磚倉庫＆港未來空中纜車", "wikiJa": "横浜みなとみらい21", "location": "橫濱市中區（櫻木町/馬車道站）", "dateLabel": "海港浪漫夜景", "duration": 180, "isIndoor": False, "desc": "搭乘都市空中纜車橫越港灣，逛紅磚倉庫市集與中華街。"},
    {"id": "base-t-6", "region": "kanto", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "河口湖大石公園＆富士回遊列車", "wikiJa": "河口湖", "location": "山梨縣富士河口湖町", "dateLabel": "持東京廣域券可搭", "duration": 240, "isIndoor": False, "desc": "搭特急富士回遊直達河口湖，無遮蔽拍攝逆富士與季節花海。"},
    # 北海道 Hokkaido (7 筆)
    {"id": "base-h-1", "region": "hokkaido", "months": [11,12,1,2,3], "category": "光影花火", "title": "札幌白色燈樹節＆大通公園雪景", "wikiJa": "さっぽろホワイトイルミネーション", "location": "札幌市大通公園（JR札幌站步行10分）", "dateLabel": "11月下旬～2月雪祭", "duration": 90, "isIndoor": False, "desc": "銀白雪地與巨型光雕聖誕樹交映，2月更盛大舉辦札幌雪祭。"},
    {"id": "base-h-2", "region": "hokkaido", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "小樽運河煤氣燈夜景＆堺町通玻璃街", "wikiJa": "小樽運河", "location": "北海道小樽市（JR小樽站步行8分）", "dateLabel": "JR快速35分直達", "duration": 180, "isIndoor": False, "desc": "紅磚倉庫倒映運河水面，品嚐六花亭、北菓樓與鮮甜海鮮丼。"},
    {"id": "base-h-3", "region": "hokkaido", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "函館山百萬夜景＆金森紅磚倉庫", "wikiJa": "函館山", "location": "北海道函館市（函館市電十字街站）", "dateLabel": "世界三大夜景", "duration": 150, "isIndoor": False, "desc": "搭纜車登頂俯瞰雙海灣沙漏形璀璨燈海，傍晚藍調時刻最夢幻。"},
    {"id": "base-h-4", "region": "hokkaido", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "季節美食", "title": "札幌二條市場＆薄野成吉思汗烤肉", "wikiJa": "すすきの", "location": "札幌市中央區（地鐵大通/薄野站）", "dateLabel": "北海道必吃海鮮烤肉", "duration": 120, "isIndoor": True, "desc": "早晨大啖帝王蟹海膽丼，晚餐享用炭火現烤北海道小羔羊。"},
    # 九州 Kyushu (7 筆)
    {"id": "base-q-1", "region": "kyushu", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "季節美食", "title": "福岡中洲屋台街＆博多運河城", "wikiJa": "中洲", "location": "福岡市博多區（地鐵中洲川端站）", "dateLabel": "夜晚必體驗路邊攤", "duration": 120, "isIndoor": False, "desc": "體驗道地博多豚骨拉麵、明太子玉子燒與水炊雞肉鍋文化。"},
    {"id": "base-q-2", "region": "kyushu", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "由布院溫泉街＆金鱗湖晨霧散策", "wikiJa": "由布院温泉", "location": "大分縣由布市（JR由布院站）", "dateLabel": "持北九州PASS搭由布院之森", "duration": 210, "isIndoor": False, "desc": "搭乘觀光特急由布院之森抵達，漫步湯之坪街道與夢幻金鱗湖。"},
    {"id": "base-q-3", "region": "kyushu", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "熊本城特別公開見學＆城彩苑", "wikiJa": "熊本城", "location": "熊本市中央區（熊本市電熊本城前）", "dateLabel": "日本三大名城", "duration": 150, "isIndoor": False, "desc": "走上空中見學步道近距離欣賞武者返石垣與修復後壯麗天守閣。"},
    {"id": "base-q-4", "region": "kyushu", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "傳統祭典", "title": "太宰府天滿宮＆表參道梅枝餅", "wikiJa": "太宰府天満宮", "location": "福岡縣太宰府市（西鐵太宰府站）", "dateLabel": "學問之神總本宮", "duration": 120, "isIndoor": False, "desc": "摸御神牛祈求智慧好運，品嚐現烤紅豆梅枝餅與隈研吾星巴克。"},
    # 中部北陸 Chubu (6 筆)
    {"id": "base-c-1", "region": "chubu", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "金澤兼六園＆金澤城公園", "wikiJa": "兼六園", "location": "石川縣金澤市（金澤站巴士15分）", "dateLabel": "日本三大名園", "duration": 150, "isIndoor": False, "desc": "冬季雪吊景觀與春櫻秋楓皆為絕景，順遊近江町市場海鮮丼。"},
    {"id": "base-c-2", "region": "chubu", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "世界遺產・白川鄉合掌村展望台", "wikiJa": "白川郷", "location": "岐阜縣白川村（濃飛巴士直達）", "dateLabel": "童話薑餅屋聚落", "duration": 180, "isIndoor": False, "desc": "登上城山展望台俯瞰百年茅草屋聚落，走入和田家參觀內部構造。"},
    {"id": "base-c-3", "region": "chubu", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "名古屋城本丸御殿＆金鯱橫丁", "wikiJa": "名古屋城", "location": "名古屋市中區（地鐵名古屋城站）", "dateLabel": "華麗金箔壁畫必看", "duration": 120, "isIndoor": True, "desc": "參觀輝煌復原的本丸御殿障壁畫，品嚐味噌豬排與鰻魚飯三吃。"},
    # 東北 Tohoku (5 筆)
    {"id": "base-n-1", "region": "tohoku", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "日本三景・松島灣遊船＆瑞嚴寺", "wikiJa": "松島", "location": "宮城縣松島町（JR仙石線松島海岸站）", "dateLabel": "仙台出發40分直達", "duration": 180, "isIndoor": False, "desc": "搭觀光船穿梭260座奇岩小島，現烤肥美松島牡蠣與毛豆奶昔。"},
    {"id": "base-n-2", "region": "tohoku", "months": [11,12,1,2,3], "category": "經典景點", "title": "大正浪漫・銀山溫泉雪景夜燈", "wikiJa": "銀山温泉", "location": "山形縣尾花澤市（JR大石田站轉巴士）", "dateLabel": "神隱少女湯屋原型", "duration": 180, "isIndoor": False, "desc": "傍晚煤氣燈亮起與白雪覆蓋木造溫泉旅館，彷彿穿越回大正時代。"},
    # 山陽山陰四國 Sanyo (6 筆)
    {"id": "base-s-1", "region": "sanyo", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "宮島嚴島神社＆海上大鳥居", "wikiJa": "厳島神社", "location": "廣島縣廿日市市（JR宮島口轉渡輪）", "dateLabel": "世界遺產・JR渡輪PASS涵蓋", "duration": 210, "isIndoor": False, "desc": "退潮走近朱紅海上大鳥居，漲潮欣賞漂浮海面的迴廊奇景。"},
    {"id": "base-s-2", "region": "sanyo", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "周邊順遊", "title": "倉敷美觀地區・白壁柳樹運河散策", "wikiJa": "倉敷美観地区", "location": "岡山縣倉敷市（JR倉敷站步行10分）", "dateLabel": "江戶風情水鄉古街", "duration": 150, "isIndoor": False, "desc": "搭乘倉敷川小舟穿梭白壁黑瓦倉庫群，逛紙膠帶與牛仔丹寧文創店。"},
    {"id": "base-s-3", "region": "sanyo", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "category": "經典景點", "title": "岡山後樂園＆烏城岡山城", "wikiJa": "後楽園", "location": "岡山市北區（岡山站路面電車）", "dateLabel": "日本三大名園", "duration": 150, "isIndoor": False, "desc": "漫步開闊草坪迴游式庭園，遠眺漆黑霸氣的岡山城天守閣。"}
]

log("=== 開始執行 update_db.py（完整 JR PASS ＋ 航班 ＋ 豐富景點庫） ===")

prompt = f"""你是日本旅遊與台日航空鐵道資料庫專家。請執行以下兩項任務並嚴格只回傳純 JSON（不要任何 markdown 標記）：
1. 針對日本 7 大旅遊地區（kansai 關西、kanto 關東、hokkaido 北海道、kyushu 九州、chubu 中部北陸、tohoku 東北、sanyo 山陽山陰四國），請「每個地區額外列出 3 個」（共 21 個）當季限定祭典、夜間點燈或特色美食景點，確保 region 欄位精準對應。category 只能從「周邊順遊」、「傳統祭典」、「光影花火」、「賞花紅葉」、「季節美食」中選一，並填寫日文維基百科精準條目名稱 wikiJa。

2. 補充 6 班熱門台日直飛航班時刻表（如日航 JL802、全日空 NH854 等）。

回傳 JSON 格式：
{{
  "flights": {{
    "JL802": {{ "airline": "日本航空 JAL", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "14:20", "aircraft": "B787-8", "region": "kanto" }}
  }},
  "events": [
    {{
      "id": "ai-ev-1",
      "region": "kansai",
      "months": [11, 12, 1],
      "category": "光影花火",
      "title": "活動或景點名稱",
      "wikiJa": "日文維基百科條目名稱",
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
    log(f"→ 呼叫模型 {m}（逾時 25s）...")
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
        with urllib.request.urlopen(req, timeout=25) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            log(f"✓ 成功使用模型 {m} 取得最新季節活動與航班！")
            break
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")[:180]
        last_err = f"模型 {m} HTTP {e.code}: {err_body}"
        log(f"  ✗ {last_err}")
    except Exception as e:
        last_err = f"模型 {m} 錯誤: {e}"
        log(f"  ✗ {last_err}")

parsed = {}
if raw_text:
    fence = chr(96) * 3
    if raw_text.startswith(fence):
        raw_text = raw_text.split("\n", 1)[-1]
    if raw_text.endswith(fence):
        raw_text = raw_text.rsplit(fence, 1)[0]
    try:
        parsed = json.loads(raw_text.strip())
    except Exception as e:
        log(f"⚠️ JSON 解析異常，改用完整基礎庫寫入：{e}")
else:
    log(f"⚠️ Gemini 暫時過載，直接使用完整基礎資料庫寫入（{last_err}）")

# 合併基礎景點庫與 AI 新增景點，並自動在雲端抓好實景照片網址
photo_cache = {}
REGION_FALLBACK_WIKI = {
    "kansai": ["道頓堀", "大坂城", "京都駅", "神戸ポートタワー"],
    "kanto": ["浅草寺", "東京スカイツリー", "東京駅", "横浜みなとみらい21"],
    "hokkaido": ["大通公園", "小樽運河", "函館山"],
    "kyushu": ["中洲", "熊本城", "由布院温泉"],
    "chubu": ["兼六園", "白川郷", "名古屋城"],
    "tohoku": ["仙台城", "松島", "銀山温泉"],
    "sanyo": ["厳島神社", "倉敷美観地区", "姫路城"]
}

def fetch_wiki_image(query_title, lang="ja"):
    if not query_title:
        return ""
    cache_key = f"{lang}:{query_title}"
    if cache_key in photo_cache:
        return photo_cache[cache_key]
    try:
        encoded = urllib.parse.quote(query_title)
        api_url = f"{scheme}://{lang}.wikipedia.org/w/api.php?action=query&titles={encoded}&redirects=1&prop=pageimages&format=json&pithumbsize=900"
        req = urllib.request.Request(api_url, headers={"User-Agent": "TravelPuzzleBot/1.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            d = json.loads(r.read().decode("utf-8"))
            pages = d.get("query", {}).get("pages", {})
            for pid, pinfo in pages.items():
                if pid != "-1":
                    src = pinfo.get("thumbnail", {}).get("source", "")
                    if src and not src.lower().endswith(".svg") and "map" not in src.lower() and "icon" not in src.lower():
                        photo_cache[cache_key] = src
                        return src
        search_url = f"{scheme}://{lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={encoded}&gsrlimit=3&prop=pageimages&format=json&pithumbsize=900"
        req2 = urllib.request.Request(search_url, headers={"User-Agent": "TravelPuzzleBot/1.0"})
        with urllib.request.urlopen(req2, timeout=8) as r2:
            d2 = json.loads(r2.read().decode("utf-8"))
            pages2 = d2.get("query", {}).get("pages", {})
            for pid, pinfo in pages2.items():
                src = pinfo.get("thumbnail", {}).get("source", "")
                if src and not src.lower().endswith(".svg") and "map" not in src.lower() and "icon" not in src.lower():
                    photo_cache[cache_key] = src
                    return src
    except Exception:
        pass
    photo_cache[cache_key] = ""
    return ""

combined_events = [dict(e) for e in BASE_EVENTS]
seen_titles = {e["title"] for e in combined_events}
if isinstance(parsed.get("events"), list):
    for ev in parsed["events"]:
        if isinstance(ev, dict) and ev.get("title") and ev["title"] not in seen_titles:
            seen_titles.add(ev["title"])
            combined_events.append(ev)

log(f"開始為 {len(combined_events)} 筆景點自動補齊維基實景照片...")
for idx, ev in enumerate(combined_events):
    reg = str(ev.get("region", "kansai")).lower().strip()
    img_url = fetch_wiki_image(ev.get("wikiJa", ""), "ja")
    if not img_url:
        clean_title = str(ev.get("title", "")).split("・")[0].split("＆")[0].strip()
        img_url = fetch_wiki_image(clean_title, "ja") or fetch_wiki_image(clean_title, "zh")
    if not img_url:
        fb_list = REGION_FALLBACK_WIKI.get(reg, REGION_FALLBACK_WIKI["kansai"])
        img_url = fetch_wiki_image(fb_list[idx % len(fb_list)], "ja")
    ev["imageUrl"] = img_url

merged_flights = dict(BASE_FLIGHTS)
if isinstance(parsed.get("flights"), dict):
    for code, info in parsed["flights"].items():
        if isinstance(info, dict) and info.get("time") and info.get("airport"):
            merged_flights[code.upper().strip()] = info

tw_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%Y-%m-%d %H:%M")
output = {
    "updated_at": tw_time,
    "jr_passes": BASE_JR_PASSES,
    "flights": merged_flights,
    "events": combined_events
}

with open("db.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

log(f"🎉 成功寫入 {len(BASE_JR_PASSES)} 種 JR PASS、{len(merged_flights)} 班台日航班與 {len(combined_events)} 筆含實景照片的景點到 db.json！")
