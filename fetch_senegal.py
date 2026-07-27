import urllib.request
import urllib.parse
import re
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://duckduckgo.com/?q=" + urllib.parse.quote("Senegal national football team logo crest png") + "&t=h_&iar=images&iax=images&ia=images"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        html = response.read().decode()
        vqd_match = re.search(r"vqd=([\d-]+)", html)
        if vqd_match:
            vqd = vqd_match.group(1)
            query = "Senegal national football team logo crest png"
            api_url = f"https://duckduckgo.com/i.js?q={urllib.parse.quote(query)}&o=json&vqd={vqd}"
            api_req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(api_req, context=ctx) as api_res:
                data = json.loads(api_res.read().decode())
                for item in data["results"][:3]:
                    print("Found Image URL:", item["image"])
                    try:
                        img_req = urllib.request.Request(item["image"], headers={"User-Agent": "Mozilla/5.0"})
                        img_res = urllib.request.urlopen(img_req, context=ctx)
                        with open("public/senegal.png", "wb") as f:
                            f.write(img_res.read())
                        print("Downloaded successfully!")
                        break
                    except Exception as e:
                        print("Download failed for this image:", e)
except Exception as e:
    print("Error:", e)
