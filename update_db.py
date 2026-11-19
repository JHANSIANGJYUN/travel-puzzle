import os, json, datetime, urllib.request

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

prompt = """請針對日本熱門旅遊地區（kansai 關西、kanto 關東、hokkaido 北海道、kyushu 九州、chubu 中部北陸、tohoku 東北、sanyo 山陽山陰四國），列出 14 個近期或當季真實存在的限定祭典、夜間點燈或周邊順遊景點。
嚴格只回傳純 JSON（無 markdown 標記）：
{
  "events": [
    {
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
    }
  ]
}"""

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={API_KEY}"
req = urllib.request.Request(
    url,
    data=json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(req, timeout=60) as resp:
    res_data = json.loads(resp.read().decode("utf-8"))

raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
clean_json = raw_text.replace("
```json", "").replace("```", "").strip()
parsed = json.loads(clean_json)

tw_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%Y-%m-%d %H:%M")
output = {
    "updated_at": tw_time,
    "flights": parsed.get("flights", {}),
    "events": parsed.get("events", [])
}

with open("db.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
