// Refresh national 2028 primary polling from Wikipedia's public aggregation
// tables. Candidates absent from the aggregate are unlisted, never scored zero.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'site-data.json');
const PAGES = {
  democratic: 'Nationwide_opinion_polling_for_the_2028_Democratic_Party_presidential_primaries',
  republican: 'Nationwide_opinion_polling_for_the_2028_Republican_Party_presidential_primaries'
};

function decode(value) {
  return String(value || '').replace(/<sup\b[\s\S]*?<\/sup>/gi, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}
const cells = row => [...row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(match => decode(match[1]));
const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function percent(value) {
  const matches = [...String(value || '').matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  return matches.length ? Number(matches.at(-1)[1]) : null;
}

function parseAggregation(html) {
  const start = html.indexOf('id="Polling_aggregation"');
  if (start < 0) throw new Error('Polling aggregation section missing');
  const table = html.slice(start).match(/<table\b[\s\S]*?<\/table>/i)?.[0];
  if (!table) throw new Error('Polling aggregation table missing');
  const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(match => match[0]);
  const headers = cells(rows[0]);
  const aggregate = cells(rows.find(row => /\bAggregate\b/i.test(decode(row))) || '');
  if (!aggregate.length) throw new Error('Aggregate row missing');
  const candidates = headers.slice(2, -2);
  const values = aggregate.slice(1, 1 + candidates.length);
  const averages = Object.fromEntries(candidates.map((name, index) => [name, percent(values[index])]).filter(([, value]) => value != null));
  const sources = rows.slice(1).map(row => cells(row)[0]).filter(name => name && !/^aggregate$/i.test(name));
  return { averages, sources };
}

async function fetchParty(party, page) {
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/html/${page}`, { headers: { 'user-agent': 'TheBell/3.0 (+https://thebell.vote)' } });
  if (!response.ok) throw new Error(`${party}: HTTP ${response.status}`);
  return { ...parseAggregation(await response.text()), url: `https://en.wikipedia.org/wiki/${page}`, retrievedAt: new Date().toISOString() };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const results = await Promise.all(Object.entries(PAGES).map(async ([party, page]) => [party, await fetchParty(party, page)]));
  data.pollingMeta = { source: 'Wikipedia national polling aggregation', retrievedAt: new Date().toISOString(), parties: {} };
  for (const [party, result] of results) {
    const byName = new Map(Object.entries(result.averages).map(([name, value]) => [clean(name), value]));
    for (const candidate of data.field[party] || []) {
      const value = byName.get(clean(candidate.name));
      candidate.pollAvg = Number.isFinite(value) ? value : null;
      candidate.pollingStatus = Number.isFinite(value) ? 'listed' : 'not-listed';
    }
    data.pollingMeta.parties[party] = { url: result.url, retrievedAt: result.retrievedAt, underlyingAggregators: result.sources, averages: result.averages };
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Polling refreshed: ${Object.keys(results[0][1].averages).length} Democratic and ${Object.keys(results[1][1].averages).length} Republican candidates listed.`);
}
main().catch(error => { console.error('Polling refresh failed:', error.message); process.exit(1); });
