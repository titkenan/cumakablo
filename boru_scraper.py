#!/usr/bin/env python3
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

URL = "https://boru-pc-tv.vercel.app/"

def start_driver():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--start-maximized")
    options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})
    
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver

def extract_channel_name(url):
    known = {
        'trt1': 'TRT 1', 'trt2': 'TRT 2', 'trthaber': 'TRT Haber', 'trtspor': 'TRT Spor', 'trtcocuk': 'TRT Çocuk',
        'trtturk': 'TRT Türk', 'atv': 'ATV', 'kanald': 'Kanal D', 'startv': 'Star TV', 'star': 'Star TV',
        'showtv': 'Show TV', 'show': 'Show TV', 'fox': 'FOX', 'tv8': 'TV8', 'kanal7': 'Kanal 7',
        'beyaztv': 'Beyaz TV', 'teve2': 'Teve2', 'a2': 'A2', 'ahaber': 'A Haber', 'aspor': 'A Spor',
        'ntv': 'NTV', 'cnnturk': 'CNN Türk', 'haberturk': 'Habertürk', 'bloomberg': 'Bloomberg HT',
        'tgrt': 'TGRT Haber', '24tv': '24 TV', 'ulketv': 'Ülke TV', 'halktv': 'Halk TV', 'flash': 'Flash TV',
        '360tv': '360 TV', 'benguturk': 'BengüTürk', 'dmax': 'DMAX', 'ekoltv': 'Ekol TV', 'lalegul': 'Lalegül TV',
        'now': 'NOW (Fox)', 'tv100': 'TV100', 'ulusalkanal': 'Ulusal Kanal', 'tvnet': 'TVNET', 'vavtv': 'Vav TV'
    }
    
    url_lower = url.lower()
    for key, name in known.items():
        if key in url_lower:
            return name
    
    # URL'den son anlamlı kısmı al
    parts = [p for p in url.split('/') if p and '.' not in p and len(p) > 3]
    if parts:
        clean = parts[-1].replace('_stream', '').replace('stream', '').replace('-', ' ').title()
        if clean not in ['Index', 'Tracks', 'Mono', 'Ts']:
            return clean
    
    return None  # Geçersizse None döndür

def main():
    driver = start_driver()
    try:
        driver.get(URL)
        time.sleep(8)

        channels = {}
        start_time = time.time()

        while time.time() - start_time < 140:  # 2 dakika 20 saniye garanti
            logs = driver.get_log("performance")
            
            for log in logs:
                try:
                    msg = json.loads(log["message"])["message"]
                    if msg["method"] == "Network.requestWillBeSent":
                        url = msg["params"]["request"]["url"]
                        if ".m3u8" in url and "master" not in url and "chunklist" not in url:
                            name = extract_channel_name(url)
                            if name and name not in channels:  # Duplicat ve geçersizleri engelle
                                channels[name] = url
                                print(f"✓ {name}")
                except:
                    continue
            
            # Sayfa kaydırıp yeni kanalları yükle
            driver.execute_script("window.scrollBy(0, 1000);")
            time.sleep(1.2)
            driver.execute_script("window.scrollBy(0, -500);")
            time.sleep(0.8)

        # Sonuçları sıralı ve temiz kaydet
        final_channels = sorted(channels.items())
        
        data = {
            "update_time": time.strftime("%Y-%m-%d %H:%M"),
            "source": "boru-pc-tv.vercel.app",
            "total": len(final_channels),
            "channels": [{"name": name, "url": url} for name, url in final_channels]
        }

        with open("channels.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        with open("boru_channels.m3u", "w", encoding="utf-8") as f:
            f.write("#EXTM3U\n")
            for name, url in final_channels:
                f.write(f"#EXTINF:-1 tvg-name=\"{name}\" tvg-logo=\"\" group-title=\"Boru TV\",{name}\n")
                f.write(f"{url}\n\n")

        print(f"\nTAMAMLANDI! {len(final_channels)} kanal kaydedildi.")
        print("→ channels.json")
        print("→ boru_channels.m3u")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
