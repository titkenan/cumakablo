export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800'); // 30 dakika cache
  
  try {
    // Scraper'ı çağır
    const baseUrl = `https://${req.headers.host}`;
    const scrapeResponse = await fetch(`${baseUrl}/api/scrape`);
    const data = await scrapeResponse.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    // M3U formatı mı JSON mu?
    const format = req.query.format || 'json';

    if (format === 'm3u') {
      let m3u = '#EXTM3U\n\n';
      
      data.channels.forEach(ch => {
        m3u += `#EXTINF:-1 tvg-name="${ch.name}" group-title="Cuma Kablo",${ch.name}\n`;
        m3u += `${ch.url}\n\n`;
      });

      res.setHeader('Content-Type', 'audio/x-mpegurl');
      return res.status(200).send(m3u);
    }

    // JSON formatı
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
