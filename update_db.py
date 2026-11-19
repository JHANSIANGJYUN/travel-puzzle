import os, json, datetime, urllib.request, urllib.error

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("找不到 GEMINI_API_KEY，請確認 GitHub Secrets 中已新增該名稱！")

# 1. 完整台日熱門航班基礎資料庫（涵蓋關西/成田/羽田/新千歲/函館/福岡/熊本/名古屋/小松/仙台/岡山/高松/沖繩）
BASE_FLIGHTS = {
    # --- 關西國際機場 (KIX) ---
    "AK176": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "14:30", "aircraft": "A330-300", "region": "kansai"},
    "AK177": {"airline": "AirAsia 亞洲航空", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "15:45", "aircraft": "A330-300", "region": "kansai"},
    "D7378": {"airline": "AirAsia X 亞航長程", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "22:05", "aircraft": "A330-300", "region": "kansai"},
    "D7379": {"airline": "AirAsia X 亞航長程", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "23:25", "aircraft": "A330-300", "region": "kansai"},
    "IT210": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "10:05", "aircraft": "A320neo", "region": "kansai"},
    "IT211": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "11:15", "aircraft": "A320neo", "region": "kansai"},
    "IT212": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "18:05", "aircraft": "A320", "region": "kansai"},
    "IT213": {"airline": "台灣虎航 Tigerair", "airport": "關西國際機場 (KIX)", "terminal": "T1", "time": "19:05", "aircraft": "A320", "region": "kansai"},
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
    "MM925": {"airline": "樂桃航空 Peach", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "13:15", "aircraft": "A320neo", "region": "kyushu"},
    "FD230": {"airline": "泰國亞洲航空 Thai AirAsia", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "15:55", "aircraft": "A320", "region": "kyushu"},
    "FD231": {"airline": "泰國亞洲航空 Thai AirAsia", "airport": "那霸機場 (OKA)", "terminal": "國際線", "time": "16:55", "aircraft": "A320", "region": "kyushu"},

    # --- 其他日本二線直飛航點（旭川/花卷/秋田/佐賀/鹿兒島/新潟/富山） ---
    "IT238": {"airline": "台灣虎航 Tigerair", "airport": "旭川機場 (AKJ)", "terminal": "航廈", "time": "11:15", "aircraft": "A320", "region": "hokkaido"},
    "IT239": {"airline": "台灣虎航 Tigerair", "airport": "旭川機場 (AKJ)", "terminal": "航廈", "time": "12:15", "aircraft": "A320", "region": "hokkaido"},
    "IT258": {"airline": "台灣虎航 Tigerair", "airport": "岩手花卷機場 (HNA)", "terminal": "航廈", "time": "16:10", "aircraft": "A320", "region": "tohoku"},
    "IT259": {"airline": "台灣虎航 Tigerair", "airport": "岩手花卷機場 (HNA)", "terminal": "航廈", "time": "17:20", "aircraft": "A320", "region": "tohoku"},
    "IT256": {"airline": "台灣虎航 Tigerair", "airport": "秋田機場 (AXT)", "terminal": "航廈", "time": "12:40", "aircraft": "A320", "region": "tohoku"},
    "IT257": {"airline": "台灣虎航 Tigerair", "airport": "秋田機場 (AXT)", "terminal": "航廈", "time": "13:55", "aircraft": "A320", "region": "tohoku"},
    "IT246": {"airline": "台灣虎航 Tigerair", "airport": "九州佐賀機場 (HSG)", "terminal": "航廈", "time": "10:45", "aircraft": "A320", "region": "kyushu"},
    "IT247": {"airline": "台灣虎航 Tigerair", "airport": "九州佐賀機場 (HSG)", "terminal": "航廈", "time": "11:45", "aircraft": "A320", "region": "kyushu"},
    "CI118": {"airline": "中華航空 China Airlines", "airport": "鹿兒島機場 (KOJ)", "terminal": "國際線", "time": "11:10", "aircraft": "A321neo", "region": "kyushu"},
    "CI119": {"airline": "中華航空 China Airlines", "airport": "鹿兒島機場 (KOJ)", "terminal": "國際線", "time": "12:15", "aircraft": "A321neo", "region": "kyushu"},
    "IT228": {"airline": "台灣虎航 Tigerair", "airport": "新潟機場 (KIJ)", "terminal": "航廈", "time": "18:00", "aircraft": "A320", "region": "chubu"},
    "IT229": {"airline": "台灣虎航 Tigerair", "airport": "新潟機場 (KIJ)", "terminal": "航廈", "time": "19:00", "aircraft": "A320", "region": "chubu"}
}
}

# 2. 官方 JR PASS 周遊券基礎資料庫（每日自動請 Gemini 核實最新日圓售價）
BASE_JR_PASSES = [
    {"id": "jr-kansai-mini-3", "name": "JR 關西迷你周遊券 (3日)", "priceJpy": 3000, "days": 3, "regions": ["kansai"], "airportCovered": False, "note": "涵蓋大阪・京都・神戶・奈良普通/快速（不含關西機場段）"},
    {"id": "jr-kansai-area-1", "name": "JR 關西地區鐵路周遊券 (1日)", "priceJpy": 2800, "days": 1, "regions": ["kansai"], "airportCovered": True, "note": "含關空特快 HARUKA 自由席＋京阪神奈良 JR"},
    {"id": "jr-kansai-area-3", "name": "JR 關西地區鐵路周遊券 (3日)", "priceJpy": 5800, "days": 3, "regions": ["kansai"], "airportCovered": True, "note": "含關空特快 HARUKA 自由席＋京阪神奈良姬路"},
    {"id": "jr-kansai-wide-5", "name": "JR 關西廣域鐵路周遊券 (5日)", "priceJpy": 12000, "days": 5, "regions": ["kansai", "sanyo"], "airportCovered": True, "note": "含新幹線新大阪-岡山＋HARUKA＋天橋立・城崎・和歌山"},
    {"id": "jr-kansai-hiroshima-5", "name": "JR 關西＆廣島地區周遊券 (5日)", "priceJpy": 17000, "days": 5, "regions": ["kansai", "sanyo"], "airportCovered": True, "note": "含山陽新幹線（新大阪-廣島）＋宮島渡輪＋HARUKA"},
    {"id": "jr-sanyo-sanin-7", "name": "JR 山陽＆山陰地區鐵路周遊券 (7日)", "priceJpy": 23000, "days": 7, "regions": ["kansai", "sanyo"], "airportCovered": True, "note": "含山陽新幹線全線（新大阪-博多）＋出雲・鳥取・宮島"},
    {"id": "jr-hokuriku-arch-7", "name": "JR 北陸拱型鐵路周遊券 (7日)", "priceJpy": 30000, "days": 7, "regions": ["kansai", "kanto", "chubu"], "airportCovered": True, "note": "串聯關西機場・大阪・京都・金澤・長野與東京成田/羽田"},
    {"id": "jr-tokyo-wide-3", "name": "JR 東京廣域周遊券 (3日)", "priceJpy": 15000, "days": 3, "regions": ["kanto"], "airportCovered": True, "note": "含成田特快 N’EX＋富士回遊＋輕井澤・日光・越後湯澤新幹線"},
    {"id": "jr-east-tohoku-5", "name": "JR 東日本鐵路周遊券・東北地區 (5日)", "priceJpy": 30000, "days": 5, "regions": ["kanto", "tohoku"], "airportCovered": True, "note": "含東京圈與東北新幹線全線（仙台・青森・秋田・盛岡）"},
    {"id": "jr-hokkaido-5", "name": "JR 北海道鐵路周遊券 (5日)", "priceJpy": 21000, "days": 5, "regions": ["hokkaido"], "airportCovered": True, "note": "含新千歲機場快速＋札幌・函館・旭川・富良野・釧路特急"},
    {"id": "jr-hokkaido-7", "name": "JR 北海道鐵路周遊券 (7日)", "priceJpy": 27000, "days": 7, "regions": ["hokkaido"], "airportCovered": True, "note": "北海道全線特急列車 7 日無限搭乘"},
    {"id": "jr-north-kyushu-3", "name": "JR 北九州鐵路周遊券 (3日)", "priceJpy": 12000, "days": 3, "regions": ["kyushu"], "airportCovered": True, "note": "含由布院之森＋博多・熊本・阿蘇・長崎・別府特急"},
    {"id": "jr-north-kyushu-5", "name": "JR 北九州鐵路周遊券 (5日)", "priceJpy": 15000, "days": 5, "regions": ["kyushu"], "airportCovered": True, "note": "含由布院之森・九州新幹線（博多-熊本）5 日暢遊"},
    {"id": "jr-all-kyushu-5", "name": "JR 全九州鐵路周遊券 (5日)", "priceJpy": 22500, "days": 5, "regions": ["kyushu"], "airportCovered": True, "note": "含鹿兒島・指宿玉手箱・宮崎與全九州新幹線"},
    {"id": "jr-takayama-hokuriku-5", "name": "JR 高山・北陸地區周遊券 (5日)", "priceJpy": 19800, "days": 5, "regions": ["kansai", "chubu"], "airportCovered": True, "note": "含名古屋・高山・白川鄉濃飛巴士・金澤・京都・關西機場"},
    {"id": "jr-all-shikoku-5", "name": "JR 四國鐵路周遊券 (5日)", "priceJpy": 16200, "days": 5, "regions": ["sanyo"], "airportCovered": False, "note": "四國全線（高松・松山・高知・德島）特急自由席無限搭"},
    {"id": "jr-whole-japan-7", "name": "JR 全日本鐵路通票 (7日普通車)", "priceJpy": 50000, "days": 7, "regions": ["kansai", "kanto", "hokkaido", "kyushu", "chubu", "tohoku", "sanyo"], "airportCovered": True, "note": "全國 JR 幹線與新幹線（除 Nozomi/Mizuho 外）7 日無限搭乘"}
]

prompt = f"""你是一位日本旅遊與台日航空鐵道資料庫專家。請執行以下三項任務並嚴格只回傳純 JSON（不要任何 markdown 標記）：
1. 核實以下 17 種 JR PASS 周遊券的最新官方大人售價（日圓 priceJpy，若有調漲請更新）：
{json.dumps(BASE_JR_PASSES, ensure_ascii=False)}

2. 針對台日熱門航班，額外補充 10 班近期常態飛往日本（如日航 JL、全日空 NH、星宇 JX、虎航 IT、華航 CI、長榮 BR 飛東京/大阪/名古屋/九州/沖繩/東北）的航班時刻表（格式同下）。

3. 針對日本 7 大旅遊地區（kansai 關西、kanto 關東、hokkaido 北海道、kyushu 九州、chubu 中部北陸、tohoku 東北、sanyo 山陽山陰四國），請「每個地區各自列出 5 個」（共 35 個）近期或當季真實存在的限定祭典、夜間點燈或周邊順遊景點，並確保 region 欄位精準對應（例如大阪京都神戶奈良必須填 kansai）。category 只能從「周邊順遊」、「傳統祭典」、「光影花火」、「賞花紅葉」、「季節美食」中選一。

回傳 JSON 格式：
{{
  "jr_passes": [
    {{ "id": "jr-kansai-mini-3", "name": "JR 關西迷你周遊券 (3日)", "priceJpy": 3000, "days": 3, "regions": ["kansai"], "airportCovered": false, "note": "..." }}
  ],
  "flights": {{
    "JL802": {{ "airline": "日本航空 JAL", "airport": "成田國際機場 (NRT)", "terminal": "T2", "time": "14:20", "aircraft": "B787-8", "region": "kanto" }}
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
            print(f"成功使用模型 {m} 核實 JR PASS、航班與更新景點！")
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

# 合併基礎航班與 AI 擴充後的航班（確保原本 70+ 班完整保留）
merged_flights = dict(BASE_FLIGHTS)
if isinstance(parsed.get("flights"), dict):
    for code, info in parsed["flights"].items():
        if isinstance(info, dict) and info.get("time") and info.get("airport"):
            merged_flights[code.upper().strip()] = info

# 合併基礎 JR PASS 與 AI 核實的最新票價
jr_map = {p["id"]: dict(p) for p in BASE_JR_PASSES}
if isinstance(parsed.get("jr_passes"), list):
    for p in parsed["jr_passes"]:
        if isinstance(p, dict) and p.get("id") in jr_map and isinstance(p.get("priceJpy"), (int, float)) and p["priceJpy"] > 0:
            jr_map[p["id"]]["priceJpy"] = int(p["priceJpy"])
            if p.get("note"):
                jr_map[p["id"]]["note"] = p["note"]

tw_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%Y-%m-%d %H:%M")
output = {
    "updated_at": tw_time,
    "jr_passes": list(jr_map.values()),
    "flights": merged_flights,
    "events": parsed.get("events", [])
}

with open("db.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"成功寫入 {len(output['jr_passes'])} 種 JR PASS、{len(merged_flights)} 班台日航班與 {len(output['events'])} 筆活動到 db.json！")
