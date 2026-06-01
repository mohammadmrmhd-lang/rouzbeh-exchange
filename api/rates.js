export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');

  const results = [];

  // ─── 1. PMEX.UK ───────────────────────────────────────────────
  try {
    const r = await fetch('https://pmex.uk/fa', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();

    // پوند حواله
    const hvMatch = html.match(/پوند.*?حساب.*?حساب[\s\S]*?<td[^>]*>([\d,]+)<\/td>[\s\S]*?<td[^>]*>([\d,]+)<\/td>/i);
    // پوند نقدی  
    const nqMatch = html.match(/پوند.*?نقد[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/i);

    // روش ساده‌تر — همه اعداد بزرگ رو پیدا کن
    const allNums = [...html.matchAll(/(\d{3},\d{3})/g)].map(m => parseInt(m[1].replace(',', '')));
    const gbpNums = allNums.filter(n => n > 150000 && n < 400000);

    let hvBuy = null, hvSell = null;
    if (gbpNums.length >= 2) {
      hvBuy  = Math.min(...gbpNums.slice(0, 4));
      hvSell = Math.max(...gbpNums.slice(0, 4));
    }

    // دنبال نقدی بگرد
    const naqdiSection = html.match(/نقد[یي][\s\S]{0,200}?([\d]{3},[\d]{3})[\s\S]{0,100}?([\d]{3},[\d]{3})/i);
    let nqBuy = null, nqSell = null;
    if (naqdiSection) {
      const a = parseInt(naqdiSection[1].replace(',',''));
      const b = parseInt(naqdiSection[2].replace(',',''));
      if (a > 150000 && b > 150000) {
        nqBuy  = Math.min(a, b);
        nqSell = Math.max(a, b);
      }
    }

    if (hvBuy && hvSell) {
      results.push({ name: 'پارسوماش (pmex.uk)', status: 'ok', hvBuy, hvSell, nqBuy, nqSell });
    } else {
      results.push({ name: 'پارسوماش (pmex.uk)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
    }
  } catch (e) {
    results.push({ name: 'پارسوماش (pmex.uk)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
  }

  // ─── 2. SARAFI FAGHANI ────────────────────────────────────────
  try {
    const r = await fetch('https://sarafifaghani.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();
    const nums = [...html.matchAll(/(\d{3},\d{3})/g)]
      .map(m => parseInt(m[1].replace(',', '')))
      .filter(n => n > 150000 && n < 400000);

    if (nums.length >= 2) {
      results.push({
        name: 'صرافی فغانی (sarafifaghani)',
        status: 'ok',
        hvBuy: Math.min(...nums.slice(0,4)),
        hvSell: Math.max(...nums.slice(0,4)),
        nqBuy: null, nqSell: null
      });
    } else {
      results.push({ name: 'صرافی فغانی (sarafifaghani)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
    }
  } catch (e) {
    results.push({ name: 'صرافی فغانی (sarafifaghani)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
  }

  // ─── 3. KCHANGE (KARIMAGHAEI) ─────────────────────────────────
  try {
    const r = await fetch('https://kchange.co.uk/exchange-rates/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();
    // kchange GBP/IRR یا GBP به تومان
    const nums = [...html.matchAll(/(\d{3},\d{3})/g)]
      .map(m => parseInt(m[1].replace(',', '')))
      .filter(n => n > 150000 && n < 400000);

    if (nums.length >= 2) {
      results.push({
        name: 'کریم آقایی (kchange.co.uk)',
        status: 'ok',
        hvBuy: Math.min(...nums.slice(0,4)),
        hvSell: Math.max(...nums.slice(0,4)),
        nqBuy: null, nqSell: null
      });
    } else {
      results.push({ name: 'کریم آقایی (kchange.co.uk)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
    }
  } catch (e) {
    results.push({ name: 'کریم آقایی (kchange.co.uk)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
  }

  // ─── 4. SARAFI.UK ─────────────────────────────────────────────
  try {
    const r = await fetch('https://sarafi.uk/pound', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();
    const nums = [...html.matchAll(/(\d{3},\d{3})/g)]
      .map(m => parseInt(m[1].replace(',', '')))
      .filter(n => n > 150000 && n < 400000);

    if (nums.length >= 2) {
      results.push({
        name: 'صرافی انگلستان (sarafi.uk)',
        status: 'ok',
        hvBuy: Math.min(...nums.slice(0,4)),
        hvSell: Math.max(...nums.slice(0,4)),
        nqBuy: null, nqSell: null
      });
    } else {
      results.push({ name: 'صرافی انگلستان (sarafi.uk)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
    }
  } catch (e) {
    results.push({ name: 'صرافی انگلستان (sarafi.uk)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
  }

  // ─── 5. SARAFI LONDON ─────────────────────────────────────────
  try {
    const r = await fetch('https://www.sarafi.london/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();
    const nums = [...html.matchAll(/(\d{3},\d{3})/g)]
      .map(m => parseInt(m[1].replace(',', '')))
      .filter(n => n > 150000 && n < 400000);

    if (nums.length >= 2) {
      results.push({
        name: 'صرافی برتر لندن (sarafi.london)',
        status: 'ok',
        hvBuy: Math.min(...nums.slice(0,4)),
        hvSell: Math.max(...nums.slice(0,4)),
        nqBuy: null, nqSell: null
      });
    } else {
      results.push({ name: 'صرافی برتر لندن (sarafi.london)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
    }
  } catch (e) {
    results.push({ name: 'صرافی برتر لندن (sarafi.london)', status: 'err', hvBuy: null, hvSell: null, nqBuy: null, nqSell: null });
  }

  // ─── SUMMARY ──────────────────────────────────────────────────
  const ok = results.filter(r => r.status === 'ok');
  const avg = arr => arr.length ? Math.round(arr.reduce((a,b) => a+b, 0) / arr.length) : null;

  const summary = {
    avgHvBuy:  avg(ok.filter(r => r.hvBuy).map(r => r.hvBuy)),
    avgHvSell: avg(ok.filter(r => r.hvSell).map(r => r.hvSell)),
    avgNqBuy:  avg(ok.filter(r => r.nqBuy).map(r => r.nqBuy)),
    avgNqSell: avg(ok.filter(r => r.nqSell).map(r => r.nqSell)),
    sourcesOk: ok.length,
    sourcesTotal: results.length,
    updatedAt: new Date().toISOString(),
  };

  res.status(200).json({ summary, sources: results });
}
