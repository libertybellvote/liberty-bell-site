// Collects free public evidence for The Bell's nine-signal model.
// Collection and editorial inference are deliberately separate. A missing
// source is recorded as missing and never converted to a neutral score.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'site-data.json');
const CONFIG_PATH = path.join(ROOT, 'model-config.json');
const OUTPUT_PATH = path.join(ROOT, 'evidence-ledger.json');
const now = new Date().toISOString();

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'user-agent': 'LibertyBellVote/2.0 (+https://libertybell.vote)', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

async function safeSource(name, family, factor, url, collector) {
  try {
    const evidence = await collector();
    return { name, family, factor, url, status: 'current', retrievedAt: now, evidence };
  } catch (error) {
    return { name, family, factor, url, status: 'unavailable', retrievedAt: now, error: String(error.message || error).slice(0, 180) };
  }
}

async function collectKalshi() {
  const url = 'https://api.elections.kalshi.com/trade-api/v2/markets?limit=100&status=open';
  const json = await (await request(url)).json();
  const markets = (json.markets || []).filter(m => /2028|president|presidential/i.test(`${m.title || ''} ${m.subtitle || ''} ${m.event_ticker || ''}`));
  if (!markets.length) throw new Error('No open 2028 presidential market was returned');
  return markets.slice(0, 30).map(m => ({
    ticker: m.ticker,
    title: m.title,
    yesBid: m.yes_bid,
    yesAsk: m.yes_ask,
    lastPrice: m.last_price,
    volume: m.volume
  }));
}

async function collectBls() {
  const year = new Date().getUTCFullYear();
  const body = JSON.stringify({ seriesid: ['CUUR0000SA0', 'LNS14000000'], startyear: String(year - 1), endyear: String(year) });
  const json = await (await request('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body
  })).json();
  if (json.status !== 'REQUEST_SUCCEEDED') throw new Error(json.message?.join(' ') || 'BLS request failed');
  return (json.Results?.series || []).map(series => ({
    seriesId: series.seriesID,
    observations: (series.data || []).filter(item => /^M\d\d$/.test(item.period)).slice(0, 14).map(item => ({ year: item.year, period: item.period, value: Number(item.value) }))
  }));
}

function decodeXml(value) {
  return String(value || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

async function collectFeed(url) {
  const xml = await (await request(url)).text();
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 30).map(match => {
    const item = match[0];
    const read = tag => decodeXml(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
    return { title: read('title'), link: read('link'), publishedAt: read('pubDate') };
  }).filter(item => item.title);
  if (!items.length) throw new Error('No readable feed items');
  return items;
}

async function collectRcp() {
  const url = 'https://www.realclearpolling.com/latest-polls/2028';
  const html = await (await request(url)).text();
  if (/enable JS|captcha-delivery|captcha/i.test(html)) throw new Error('RCP browser challenge blocked unattended retrieval');
  const text = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/2028/.test(text)) throw new Error('No readable 2028 polling data');
  return { pageTitle: 'Latest Polls: 2028', excerpt: text.slice(0, 800) };
}

function factorSummary(config, sources) {
  const factors = {};
  for (const [key, definition] of Object.entries(config.factors)) {
    const matching = sources.filter(source => source.factor === key);
    factors[key] = {
      label: definition.label,
      weight: definition.weight,
      status: matching.some(source => source.status === 'current') ? 'evidence-collected' : 'missing',
      sourceCount: matching.filter(source => source.status === 'current').length,
      score: null,
      note: matching.length ? 'Evidence collected for review. No automatic inference was made.' : 'No reliable free structured source is configured yet.'
    };
  }
  return factors;
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const sources = await Promise.all([
    safeSource('Kalshi', 'prediction-markets', 'bettingMarkets', 'https://kalshi.com', collectKalshi),
    safeSource('U.S. Bureau of Labor Statistics', 'government-economic-data', 'economicBackdrop', 'https://www.bls.gov/developers/', collectBls),
    safeSource('RealClearPolling', 'polling-aggregator', 'polling', 'https://www.realclearpolling.com/latest-polls/2028', collectRcp),
    safeSource('VoteHub', 'election-analysis', 'polling', 'https://votehub.com/feed/', () => collectFeed('https://votehub.com/feed/')),
    safeSource('Decision Desk HQ', 'election-analysis', 'momentum', 'https://decisiondeskhq.com/feed/', () => collectFeed('https://decisiondeskhq.com/feed/'))
  ]);
  const factors = factorSummary(config, sources);
  // Polymarket is updated by run-model-session.js and remains separately labeled.
  factors.bettingMarkets.status = data.marketMeta?.retrievedAt ? 'evidence-collected' : factors.bettingMarkets.status;
  factors.bettingMarkets.sourceCount += data.marketMeta?.retrievedAt ? 1 : 0;
  const currentFactors = Object.values(factors).filter(factor => factor.status === 'evidence-collected').length;
  const sourceFamilies = new Set(sources.filter(source => source.status === 'current').map(source => source.family)).size + (data.marketMeta?.retrievedAt ? 1 : 0);
  const output = {
    updatedAt: now,
    modelVersion: config.version,
    callStatus: 'awaiting-model-score',
    coverage: { currentFactors, requiredFactors: config.minimumCurrentFactors, sourceFamilies, requiredSourceFamilies: config.minimumSourceFamilies },
    safeguards: config.rules,
    sources: [
      { name: 'Polymarket', family: 'prediction-markets', factor: 'bettingMarkets', url: 'https://polymarket.com', status: data.marketMeta?.retrievedAt ? 'current' : 'missing', retrievedAt: data.marketMeta?.retrievedAt || null, evidence: data.marketMeta || null },
      ...sources
    ],
    factors
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`Evidence collected from ${output.sources.filter(source => source.status === 'current').length} sources. Awaiting Bell Model score.`);
}

main().catch(error => { console.error('Evidence collection failed:', error.message); process.exit(1); });
