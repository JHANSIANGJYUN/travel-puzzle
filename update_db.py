import os, json, datetime, urllib.request, urllib.error

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("找不到 GEMINI_API_KEY，請確認 GitHub Settings -> Secrets and variables -> Actions 中已新增該名稱！")

prompt = """請針對日本熱門旅遊地區（kansai 關西、kanto 關東、hokkaido 北海道、kyushu 九州、chubu 中部北陸、tohoku 東北、sanyo 山陽山陰四國），列出 14 個近期或當季真實存在的限定祭典、夜間點燈或周邊順遊景點。
嚴格只回傳純 JSON（不要任何 markdown 標記）：
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

models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"]
raw_text = ""
last_err = ""

for m in models:
    url = f"[https://generativelanguage.googleapis.com/v1beta/models/](https://generativelanguage.googleapis.com/v1beta/models/){m}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"成功使用模型 {m} 取得資料！")
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

tw_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%Y-%m-%d %H:%M")
output = {
    "updated_at": tw_time,
    "flights": parsed.get("flights", {}),
    "events": parsed.get("events", [])
}

with open("db.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"成功寫入 {len(output['events'])} 筆資料到 db.json！")
