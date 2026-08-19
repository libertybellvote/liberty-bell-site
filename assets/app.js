const $ = selector => document.querySelector(selector);
const page = document.body.dataset.page || 'forecast';
const NAV = [
  ['forecast', '/', 'Home'],
  ['candidates', '/candidates.html', 'The Field'],
  ['markets', '/market-gap.html', 'Bell vs. Markets'],
  ['map', '/map.html', 'Electoral Map'],
  ['methodology', '/methodology.html', 'How It Works'],
  ['ledger', '/ledger.html', 'Receipts']
];

function header() {
  return `<header class="masthead"><div class="shell masthead-main"><a class="brand" href="/"><span class="brand-mark"><i></i></span><span><span class="brand-name">The Bell</span><span class="brand-formal">By Liberty Bell Vote</span></span></a><div class="mast-actions"><a class="btn donate" href="https://ko-fi.com/libertybellvote" target="_blank" rel="noopener">Donate</a><button class="theme-toggle" id="theme-toggle" aria-label="Toggle night mode" title="Toggle night mode">◐</button></div></div></header><nav class="nav"><div class="shell">${NAV.map(([id, url, label]) => `<a class="${page === id ? 'active' : ''}" href="${url}">${label}</a>`).join('')}</div></nav>`;
}

function footer() {
  return `<footer><div class="shell"><div class="footer-lead"><div class="footer-lockup"><span class="brand-mark light"><i></i></span><div><div class="footer-name">The Bell</div><p>Which way will The Bell swing?</p></div></div><div class="footer-support"><p>Independent coverage of the 2028 presidential election.</p><a class="btn donate" href="https://ko-fi.com/libertybellvote" target="_blank" rel="noopener">Support The Bell</a></div></div><div class="footer-grid"><div class="footer-col"><strong>Explore</strong><a href="/">Home</a><a href="/candidates.html">The Field</a><a href="/market-gap.html">Bell vs. Markets</a><a href="/map.html">Electoral Map</a></div><div class="footer-col"><strong>Accountability</strong><a href="/methodology.html">How It Works</a><a href="/ledger.html">Receipts</a><a href="mailto:libertybellvote@gmail.com?subject=Correction">Corrections</a></div><div class="footer-col"><strong>Connect</strong><a href="https://x.com/LibertyBellVote">X / Twitter</a><a href="https://instagram.com/LibertyBellVote">Instagram</a><a href="mailto:libertybellvote@gmail.com?subject=Sponsoring%20The%20Bell">Sponsor The Bell</a><a href="mailto:libertybellvote@gmail.com">Contact</a></div></div><div class="copyright">© 2026 Liberty Bell Vote · All rights reserved · Market probabilities are not polls, guarantees, or financial advice.</div></div></footer>`;
}

$('#site-header').innerHTML = header();
$('#site-footer').innerHTML = footer();

function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('lbv-theme', dark ? 'dark' : 'light');
  $('#theme-toggle').textContent = dark ? '☀' : '◐';
}

setTheme(localStorage.getItem('lbv-theme') === 'dark' || (!localStorage.getItem('lbv-theme') && matchMedia('(prefers-color-scheme:dark)').matches));
$('#theme-toggle').onclick = () => setTheme(!document.body.classList.contains('dark'));

const fmt = number => Number(number || 0).toFixed(1) + '%';
const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const updated = iso => new Date(iso).toLocaleString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'}) + ' ET';
const shortDate = iso => new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York'});
const movement = candidate => candidate.pulseDir === 'up' ? ['▲ Rising', 'up'] : candidate.pulseDir === 'down' ? ['▼ Falling', 'down'] : ['Steady', 'flat'];
let bellAudioContext;

function playBellGong() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  bellAudioContext ||= new AudioEngine();
  const context = bellAudioContext;
  if (context.state === 'suspended') context.resume();
  const start = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(.0001, start);
  master.gain.exponentialRampToValueAtTime(.14, start + .018);
  master.gain.exponentialRampToValueAtTime(.0001, start + 2.8);
  master.connect(context.destination);
  [196, 247, 313, 392, 523].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const partial = context.createGain();
    oscillator.type = index < 2 ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(index % 2 ? 5 : -4, start);
    partial.gain.setValueAtTime(1 / (index + 1.25), start);
    partial.gain.exponentialRampToValueAtTime(.0001, start + 1.5 + index * .22);
    oscillator.connect(partial); partial.connect(master);
    oscillator.start(start); oscillator.stop(start + 2.9);
  });
}

function allCandidates(data) {
  return [...(data.field?.democratic || []), ...(data.field?.republican || []), ...(data.thirdParty || [])];
}

function partyBadge(party) {
  const key = party === 'democratic' || party === 'Democratic' ? 'd' : party === 'republican' || party === 'Republican' ? 'r' : 'i';
  return `<span class="party-badge ${key}" aria-label="${key === 'd' ? 'Democratic' : key === 'r' ? 'Republican' : 'Independent or third party'}">${key.toUpperCase()}</span>`;
}

function findCandidate(data, name) {
  const target = clean(name);
  return allCandidates(data).find(candidate => clean(candidate.name) === target || clean(candidate.name).includes(target) || target.includes(clean(candidate.name)));
}

const CLASSIFICATIONS = {
  'Alexandria Ocasio-Cortez': 'DSA / democratic socialist', 'Gavin Newsom': 'Liberal establishment',
  'Jon Ossoff': 'Center-left', 'Pete Buttigieg': 'Center-left', 'Kamala Harris': 'Liberal establishment',
  'Josh Shapiro': 'Center-left', 'Andy Beshear': 'Moderate', 'JB Pritzker': 'Liberal establishment',
  'Cory Booker': 'Liberal', 'Wes Moore': 'Center-left', 'Ro Khanna': 'Progressive', 'Mark Kelly': 'Moderate',
  'Rahm Emanuel': 'Centrist establishment', 'Gretchen Whitmer': 'Center-left', 'Stephen A. Smith': 'Moderate outsider',
  'JD Vance': 'National conservative', 'Marco Rubio': 'Conservative', 'Robert F. Kennedy Jr.': 'Populist outsider',
  'Ted Cruz': 'Movement conservative', 'Ron DeSantis': 'MAGA conservative', 'Nikki Haley': 'Establishment conservative',
  'Donald Trump': 'MAGA populist', 'Tucker Carlson': 'Right populist', 'Jill Stein': 'Green left'
};

function personName(candidate, className = '') {
  return `<span class="person-name ${className}"><img src="${candidate.photo || ''}" alt="" loading="lazy"><span>${candidate.name}</span></span>`;
}

function miniField(list) {
  return (list || []).slice(0, 5).map((candidate, index) => `<div class="field-line"><span class="field-rank">${index + 1}</span>${personName(candidate, 'field-person')}<span class="field-track"><i style="width:${Math.min(100, candidate.oddsNum * 3.3)}%"></i></span><strong>${candidate.odds}</strong></div>`).join('');
}

function renderForecast(data) {
  const call = (data.calls || []).find(item => /which party wins/i.test(item.question));
  const dem = data.libertyBellIndex.democratic;
  const rep = data.libertyBellIndex.republican;
  const margin = dem - rep;
  const abs = Math.abs(margin);
  const leader = margin >= 0 ? 'Democratic' : 'Republican';
  const partyPlural = margin >= 0 ? 'Democrats' : 'Republicans';
  const rating = abs < 5 ? 'Toss-up' : abs < 15 ? `Leans ${leader}` : `Favors ${leader}`;
  const dems = [...data.field.democratic].sort((a, b) => b.oddsNum - a.oddsNum);
  const reps = [...data.field.republican].sort((a, b) => b.oddsNum - a.oddsNum);
  const demCall = (data.calls || []).find(item => /Democratic nomination/i.test(item.question));
  const repCall = (data.calls || []).find(item => /Republican nomination/i.test(item.question));
  const watchName = data.powerRanking?.candidateName || data.powerRanking?.name;
  const watch = findCandidate(data, watchName);

  $('#dem-pct').textContent = fmt(dem);
  $('#rep-pct').textContent = fmt(rep);
  $('#dem-bar').style.width = dem + '%';
  $('#rep-bar').style.width = rep + '%';
  $('#rating').textContent = rating;
  $('#bell-direction').textContent = margin >= 0 ? 'Swinging toward Democrats' : 'Swinging toward Republicans';
  $('.bell-visual').classList.toggle('lead-dem', margin >= 0);
  $('.bell-visual').classList.toggle('lead-rep', margin < 0);
  const swingAngle = Math.max(-42, Math.min(42, margin * .42));
  const arm = $('#swing-arm');
  const stage = $('.swing-stage');
  const axisMarker = $('#bell-axis-marker');
  const axisValue = $('#bell-axis-value');
  const setAxis = (demValue, repValue) => {
    axisMarker.style.left = `${repValue}%`;
    axisValue.textContent = demValue === repValue ? '50–50' : `${Math.round(Math.max(demValue, repValue))}% ${demValue > repValue ? 'D' : 'R'}`;
  };
  arm.style.transform = `rotate(${swingAngle.toFixed(1)}deg)`;
  setAxis(dem, rep);
  arm.title = 'Drag the Bell to preview a different race. Release to return to the model.';
  const restoreForecast = () => {
    arm.classList.remove('dragging');
    axisMarker.style.transition = '';
    arm.style.transform = `rotate(${swingAngle.toFixed(1)}deg)`;
    $('#dem-pct').textContent = fmt(dem); $('#rep-pct').textContent = fmt(rep);
    $('#dem-bar').style.width = dem + '%'; $('#rep-bar').style.width = rep + '%';
    $('#rating').textContent = rating;
    $('#bell-direction').textContent = margin >= 0 ? 'Swinging toward Democrats' : 'Swinging toward Republicans';
    setAxis(dem, rep);
  };
  arm.onpointerdown = event => {
    if (event.button !== 0) return;
    arm.classList.add('dragging'); arm.setPointerCapture(event.pointerId);
    axisMarker.style.transition = 'none';
  };
  arm.onpointermove = event => {
    if (!arm.classList.contains('dragging')) return;
    const rect = stage.getBoundingClientRect();
    const previewAngle = Math.max(-42, Math.min(42, (rect.left + rect.width / 2 - event.clientX) / (rect.width / 2) * 42));
    const previewDem = Math.max(0, Math.min(100, 50 + previewAngle * (50 / 42)));
    const previewRep = 100 - previewDem;
    arm.style.transform = `rotate(${previewAngle.toFixed(1)}deg)`;
    $('#dem-pct').textContent = fmt(previewDem); $('#rep-pct').textContent = fmt(previewRep);
    $('#dem-bar').style.width = previewDem + '%'; $('#rep-bar').style.width = previewRep + '%';
    const previewMargin = Math.abs(previewDem - previewRep);
    $('#rating').textContent = previewMargin < 5 ? 'Toss-up preview' : `Preview: ${previewDem >= previewRep ? 'Democratic' : 'Republican'} edge`;
    $('#bell-direction').textContent = 'Release to return to The Bell';
    setAxis(previewDem, previewRep);
  };
  arm.onpointerup = () => { restoreForecast(); playBellGong(); };
  arm.onpointercancel = restoreForecast;
  $('#updated').textContent = updated(data.modelUpdatedAt || data.modelMeta?.updatedAt || data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.lastUpdated);
  $('#forecast-summary').textContent = call?.whyShort || 'The market has a favorite. The race does not have a winner.';
  $('#dem-mini').innerHTML = miniField(dems);
  $('#rep-mini').innerHTML = miniField(reps);
  $('#market-read').innerHTML = `The Bell currently gives <strong>${partyPlural}</strong> the edge in the 2028 presidential race. Both nomination contests remain open.`;
  $('#snapshot-party').innerHTML = margin >= 0 ? '<img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/DemDonkey.svg" alt="Democratic Party donkey">' : '<img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Republican_Disc.svg" alt="Republican Party elephant">';
  $('#snapshot-party').className = margin >= 0 ? 'd' : 'r';
  $('#snapshot-president-rating').textContent = rating;
  $('#snapshot-president-call').textContent = call?.ourCall || `${partyPlural} have the edge`;
  $('#snapshot-president-copy').textContent = call?.whyShort || `${partyPlural} lead the current Bell model.`;
  const demPick = findCandidate(data, demCall?.pickName) || dems[0];
  const repPick = findCandidate(data, repCall?.pickName) || reps[0];
  $('#snapshot-dem-call').innerHTML = personName(demPick);
  $('#snapshot-rep-call').innerHTML = personName(repPick);
  $('#snapshot-dem-rating').textContent = demCall?.ourCall || demPick.name;
  $('#snapshot-rep-rating').textContent = repCall?.ourCall || repPick.name;
  $('#snapshot-dem-copy').textContent = demCall?.whyShort || 'The Democratic nomination remains open.';
  $('#snapshot-rep-copy').textContent = repCall?.whyShort || 'The Republican nomination remains open.';
  $('#snapshot-watch-call').innerHTML = watch ? personName(watch) : `<span>${watchName || 'No clear mover'}</span>`;
  $('#snapshot-watch-label').textContent = data.powerRanking?.label || 'Watch';
  $('#snapshot-watch-rating').textContent = data.powerRanking?.headline || (watch ? `${watch.name.split(' ').at(-1)} is the name to watch` : 'No breakout yet');
  $('#snapshot-watch-copy').textContent = data.powerRanking?.reason || watch?.pulse || 'No candidate has separated from the field this week.';
}

function candidateCard(candidate, index, party) {
  const [label, cls] = movement(candidate);
  const polling = candidate.pollAvg != null ? candidate.pollAvg.toFixed(1) + '%' : 'Not listed';
  return `<article class="candidate-card compact-candidate"><div class="candidate-photo"><img src="${candidate.photo || ''}" alt="${candidate.name}" loading="lazy"><span class="standing">#${index + 1}</span>${candidate.darkHorse ? `<span class="dark-horse">Dark horse</span>` : ''}</div><div class="candidate-body"><div class="candidate-name-row"><h2>${candidate.name}</h2>${partyBadge(party)}</div><div class="role">${candidate.role || ''}</div><div class="candidate-classification">${CLASSIFICATIONS[candidate.name] || 'Unclassified'}</div><div class="candidate-metrics"><div class="candidate-metric"><strong>${candidate.odds || 'N/A'}</strong><span>Market price</span></div><div class="candidate-metric"><strong class="${candidate.pollAvg == null ? 'metric-missing' : ''}">${polling}</strong><span>Polling</span></div><div class="candidate-metric"><strong class="pulse ${cls}">${label}</strong><span>Move</span></div></div><p class="candidate-watch"><span>${candidate.darkHorse || 'Watch'}</span>${candidate.darkHorse ? candidate.ourTake : candidate.fragility || candidate.weakness || 'The campaign case is still developing.'}</p></div></article>`;
}

function renderCandidates(data) {
  const draw = party => {
    const list = [...(party === 'democratic' ? data.field.democratic : party === 'republican' ? data.field.republican : data.thirdParty || [])].sort((a, b) => b.oddsNum - a.oddsNum);
    $('#candidate-grid').innerHTML = list.map((candidate, index) => candidateCard(candidate, index, party)).join('');
    const pollMeta = data.pollingMeta?.parties?.[party];
    const source = $('#polling-source');
    if (source) source.innerHTML = pollMeta ? `Polling: <a href="${pollMeta.url}" target="_blank" rel="noopener">national aggregation</a>. Candidates absent from the average are marked “Not listed.”` : party === 'independent' ? 'No comparable national primary polling average exists for outside-party candidates.' : 'Polling aggregation is temporarily unavailable.';
    document.querySelectorAll('.party-switch button').forEach(button => button.classList.toggle('active', button.dataset.party === party));
  };
  document.querySelectorAll('.party-switch button').forEach(button => button.onclick = () => draw(button.dataset.party));
  draw('democratic');
  $('#candidate-updated').textContent = updated(data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.lastUpdated);
}

function renderMarkets(data) {
  $('#market-updated').textContent = updated(data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.lastUpdated);
  $('#market-list').innerHTML = (data.calls || []).map(call => {
    const outcomes = [...(call.outcomes || [])].sort((a, b) => b.probability - a.probability);
    const max = Math.max(...outcomes.map(outcome => outcome.probability), 1);
    const isParty = /party|presidency/i.test(call.question);
    const marketLabel = isParty ? 'Party market' : /Republican/i.test(call.question) ? 'Republican nomination' : 'Democratic nomination';
    const art = isParty ? `<div class="market-art party-art"><span class="d">D</span><i></i><span class="r">R</span></div>` : `<div class="market-art field-art">${outcomes.slice(0, 3).map(outcome => {const candidate = findCandidate(data, outcome.label); return candidate ? `<img src="${candidate.photo}" alt="${candidate.name}">` : '';}).join('')}</div>`;
    const sourceUrl = isParty ? 'https://polymarket.com/event/which-party-wins-2028-us-presidential-election' : /Republican/i.test(call.question) ? 'https://polymarket.com/event/republican-presidential-nominee-2028' : 'https://polymarket.com/event/democratic-presidential-nominee-2028';
    const marketLeader = outcomes[0];
    const bellPick = call.pickName || (data.libertyBellIndex.democratic >= data.libertyBellIndex.republican ? 'Democratic edge' : 'Republican edge');
    return `<article class="market-card"><div class="market-story">${art}<div class="eyebrow">The market versus The Bell</div><h2>${call.question}</h2><div class="signal-compare"><div><span>Market leader</span><strong>${marketLeader.label} · ${fmt(marketLeader.probability)}</strong></div><div><span>The Bell</span><strong>${bellPick}</strong></div></div><p class="our-call">${call.whyShort || ''}</p><a class="market-source" href="${sourceUrl}" target="_blank" rel="noopener">View the ${marketLabel.toLowerCase()} on Polymarket</a></div><div>${outcomes.map((outcome, index) => {const candidate = findCandidate(data, outcome.label); const seal = outcome.label === 'Democratic' || outcome.label === 'Republican' ? partyBadge(outcome.label) : ''; return `<div class="outcome ${index === 0 ? 'leader' : ''}"><span>${seal}${candidate ? personName(candidate, 'outcome-person') : outcome.label}</span><span class="outcome-bar"><span class="outcome-fill" style="width:${outcome.probability / max * 100}%"></span></span><span class="outcome-value">${fmt(outcome.probability)}</span></div>`;}).join('')}</div></article>`;
  }).join('');
}

function renderLedger(entries) {
  const host = $('#ledger-body');
  if (!entries.length) {
    host.innerHTML = '<div class="empty-state"><strong>No big move yet.</strong><span>The ledger starts when the Bell crosses its reporting threshold.</span></div>';
    return;
  }
  host.innerHTML = `<div class="ledger-scroll"><table class="ledger-table"><thead><tr><th>Date</th><th>What changed</th><th>Previous</th><th>New call</th><th>Why it is here</th></tr></thead><tbody>${entries.slice().reverse().map(entry => `<tr><td>${shortDate(entry.timestamp)}</td><td><strong>${entry.label || 'Bell movement'}</strong></td><td>${entry.previous || (entry.previousDemocratic != null ? `D ${fmt(entry.previousDemocratic)}` : 'Not recorded')}</td><td>${entry.value || (entry.democratic != null ? `D ${fmt(entry.democratic)} / R ${fmt(entry.republican)}` : 'Not recorded')}</td><td>${entry.note || entry.source || ''}</td></tr>`).join('')}</tbody></table></div>`;
}

if (page === 'ledger') {
  fetch('/ledger.json', {cache: 'no-store'}).then(response => response.json()).then(renderLedger).catch(() => renderLedger([]));
} else {
  fetch('/site-data.json', {cache: 'no-store'}).then(response => response.json()).then(data => {
    if (page === 'forecast') renderForecast(data);
    if (page === 'candidates') renderCandidates(data);
    if (page === 'markets') renderMarkets(data);
  }).catch(() => {
    const error = $('#data-error');
    if (error) error.textContent = 'The latest dataset could not be loaded. The published forecast is frozen.';
  });
}
