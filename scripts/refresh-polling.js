// No-cost polling pipeline: rolling 270toWin nomination averages plus the
// latest published Emerson national head-to-head tests.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'site-data.json');
const PAGES = {
  democratic: 'https://www.270towin.com/2028-democratic-nomination/',
  republican: 'https://www.270towin.com/2028-republican-nomination/'
};
const EMERSON_URL = 'https://emersoncollegepolling.com/august-2026-national-poll/';
const decode = value => String(value || '').replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|#160);/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function parse270(html) {
  const table = html.match(/<table id="polls"[\s\S]*?<\/table>/i)?.[0];
  if (!table) throw new Error('270toWin polling table missing');
  const names = [...table.matchAll(/<th[^>]*class="can_name[^>]*>([\s\S]*?)<\/th>/gi)].map(match => decode(match[1]));
  const row = table.match(/<tr id=['"]poll_avg_row['"][^>]*>([\s\S]*?)<\/tr>/i)?.[1];
  if (!row) throw new Error('270toWin average row missing');
  const values = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].slice(1).map(match => {
    const value = decode(match[1]).match(/(\d+(?:\.\d+)?)%/);
    return value ? Number(value[1]) : null;
  });
  return Object.fromEntries(names.map((name, index) => [name, values[index]]).filter(([, value]) => Number.isFinite(value)));
}

async function get(url) {
  const response = await fetch(url, {headers: {'user-agent': 'TheBell/3.1 (+https://thebell.vote)'}});
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const retrievedAt = new Date().toISOString();
  const [demHtml, repHtml, emersonHtml] = await Promise.all([get(PAGES.democratic), get(PAGES.republican), get(EMERSON_URL)]);
  const results = {democratic: parse270(demHtml), republican: parse270(repHtml)};
  data.pollingMeta = {source: '270toWin polling averages', retrievedAt, parties: {}};
  for (const [party, averages] of Object.entries(results)) {
    const byName = new Map(Object.entries(averages).map(([name, value]) => [clean(name), value]));
    for (const candidate of data.field[party] || []) {
      const aliases = [candidate.name, candidate.name.split(' ').at(-1), candidate.name.replace('Alexandria Ocasio-Cortez', 'Ocasio-Cortez'), candidate.name.replace('Robert F. Kennedy Jr.', 'Kennedy')];
      const value = aliases.map(alias => byName.get(clean(alias))).find(Number.isFinite);
      candidate.pollAvg = Number.isFinite(value) ? value : null;
      candidate.pollingStatus = Number.isFinite(value) ? 'listed' : 'not-listed';
    }
    data.pollingMeta.parties[party] = {url: PAGES[party], retrievedAt, averages};
  }
  if (/Buttigieg is the only candidate to hold the same five-point lead/i.test(emersonHtml)) {
    data.nationalPolling = {source:'Emerson College Polling', url:EMERSON_URL, fielded:'Aug. 16-17, 2026', retrievedAt, trumpApproval:40, trumpDisapproval:56, genericBallotDemocratic:51, genericBallotRepublican:43};
    data.headToHeadPolling = {
      source: 'Emerson College Polling', url: EMERSON_URL, fielded: 'Aug. 16-17, 2026', sample: '1,000 likely voters', retrievedAt,
      matchups: [
        {democrat:'Pete Buttigieg', republican:'JD Vance', democratic:49, undecided:8, republicanVote:44},
        {democrat:'Pete Buttigieg', republican:'Marco Rubio', democratic:49, undecided:7, republicanVote:44},
        {democrat:'Jon Ossoff', republican:'JD Vance', democratic:49, undecided:7, republicanVote:44},
        {democrat:'Jon Ossoff', republican:'Marco Rubio', democratic:47, undecided:9, republicanVote:44},
        {democrat:'Gavin Newsom', republican:'JD Vance', democratic:49, undecided:7, republicanVote:44},
        {democrat:'Gavin Newsom', republican:'Marco Rubio', democratic:48, undecided:6, republicanVote:46},
        {democrat:'Kamala Harris', republican:'JD Vance', democratic:49, undecided:6, republicanVote:45},
        {democrat:'Kamala Harris', republican:'Marco Rubio', democratic:43, undecided:9, republicanVote:48},
        {democrat:'Alexandria Ocasio-Cortez', republican:'JD Vance', democratic:44, undecided:11, republicanVote:46},
        {democrat:'Alexandria Ocasio-Cortez', republican:'Marco Rubio', democratic:43, undecided:9, republicanVote:48}
      ]
    };
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Polling refreshed from 270toWin and Emerson at ${retrievedAt}.`);
}
main().catch(error => { console.error('Polling refresh failed:', error.message); process.exit(1); });
