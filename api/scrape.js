import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60,
};

const KNOWN_CHANNELS = {
  'trt1': 'TRT 1', 'trt2': 'TRT 2', 'trthaber': 'TRT Haber', 
  'atv': 'ATV', 'kanald': 'Kanal D', 'startv': 'Star TV', 
  'showtv': 'Show TV', 'tv8': 'TV8', 'kanal7': 'Kanal 7',
  'beyaztv': 'Beyaz TV', 'teve2': 'Teve2', 'a2': 'A2', 
  'ahaber': 'A Haber', 'ntv': 'NTV', 'cnnturk': 'CNN Türk',
  'haberturk': 'Habertürk', '24tv': '24 TV', 'ulketv': 'Ülke TV',
  '360tv': '360 TV', 'tgrthaber': 'TGRT Haber'
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let browser = null;

  try {
    console.log('🚀 Puppeteer başlatılıyor...');

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // User agent ayarla
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );

    // Network isteklerini dinle
    const m3u8Links = new Map();

    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('.m3u8') && !url.includes('master')) {
        const channelName = extractChannelName(url);
        
        if (channelName && !m3u8Links.has(channelName)) {
          m3u8Links.set(channelName, url);
          console.log(`✅ ${channelName}`);
        }
      }
    });

    console.log('📡 Boru TV açılıyor...');
    await page.goto('https://boru-pc-tv.vercel.app/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Sayfayı kaydır (lazy loading için)
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await new Promise(r => setTimeout(r, 800));
    }

    // Biraz daha bekle
    await new Promise(r => setTimeout(r, 5000));

    await browser.close();

    const channels = Array.from(m3u8Links.entries()).map(([name, url]) => ({
      name,
      url
    }));

    console.log(`✅ ${channels.length} kanal bulundu`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      total: channels.length,
      channels: channels.sort((a, b) => a.name.localeCompare(b.name))
    });

  } catch (error) {
    console.error('❌ Hata:', error);
    
    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function extractChannelName(url) {
  const urlLower = url.toLowerCase();
  
  for (const [key, name] of Object.entries(KNOWN_CHANNELS)) {
    if (urlLower.includes(key)) {
      return name;
    }
  }
  
  // URL'den tahmin et
  const parts = url.split('/');
  for (const part of parts.reverse()) {
    if (part.includes('_stream') || part.includes('stream')) {
      return part
        .replace('_stream', '')
        .replace('stream', '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  
  return null;
}
