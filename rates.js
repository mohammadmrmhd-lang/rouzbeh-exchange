export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const SOURCES = [
    { name: 'pmex.uk (parsomash)', url: 'https://pmex.uk/fa' },
    { name: 'javanexchange.com', url: 'https://javanexchange.com/' },
    { name: 'sarafi.london', url: 'https://www.sarafi.london/' },
    { name: 'sarafi.uk', url: 'https://sarafi.uk/pound' },
    { name: 'kchange.co.uk (karimaghaei)', url: 'https://kchange.co.uk/' },
  ];

  async function fetchSource(source) {
    const prompt = `You are a precise data extractor. Search the web for current GBP to Iranian Toman exchange rates from this specific source: ${source.url}

Extract GBP (British Pound) rates to Iranian Toman (تومان).
Look for BOTH:
1. "حواله" or "حساب به حساب" (wire transfer) rates
2. "نقدی" or "نقد" (cash) rates

Return ONLY valid JSON, no explanation, no markdown:
{"havaleh_buy": NUMBER_OR_NULL, "havaleh_sell": NUMBER_OR_NULL, "naqdi_buy": NUMBER_OR_NULL, "naqdi_sell": NUMBER_OR_NULL}

Rules:
- Numbers must be in Toman (e.g. 213000 not 213,000)
- If only one rate type exists, fill the other with null
- If a field shows "Call" or is missing, use null
- Never guess — only return confirmed numbers from this source`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const texts = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    try {
      const m = texts.match(/\{[\s\S]*?\}/);
      if (m) {
        const p = JSON.parse(m[0]);
        return {
          name: source.name,
          status: 'ok',
          hvBuy: p.havaleh_buy || null,
          hvSell: p.havaleh_sell || null,
          nqBuy: p.naqdi_buy || null,
          nqSell: p.naqdi_sell || null,
        };
      }
    } catch (e) {}

    return { name: source.name, status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null };
  }

  try {
    const results = await Promise.all(SOURCES.map(fetchSource));
    const ok = results.filter(r => r.status === 'ok');
    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    const summary = {
      avgHvBuy: avg(ok.filter(r => r.hvBuy).map(r => r.hvBuy)),
      avgHvSell: avg(ok.filter(r => r.hvSell).map(r => r.hvSell)),
      avgNqBuy: avg(ok.filter(r => r.nqBuy).map(r => r.nqBuy)),
      avgNqSell: avg(ok.filter(r => r.nqSell).map(r => r.nqSell)),
      sourcesOk: ok.length,
      sourcesTotal: SOURCES.length,
      updatedAt: new Date().toISOString(),
    };

    res.status(200).json({ summary, sources: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
