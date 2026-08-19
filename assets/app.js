const $ = selector => document.querySelector(selector);
const page = document.body.dataset.page || 'forecast';
const NAV = [
  ['forecast', '/', 'Home'],
  ['candidates', '/candidates.html', 'The Field'],
  ['markets', '/market-gap.html', 'Odds & Signals'],
  ['map', '/map.html', 'Electoral Map'],
  ['methodology', '/methodology.html', 'How It Works'],
  ['ledger', '/ledger.html', 'Receipts']
];

function header() {
  return `<header class="masthead"><div class="shell masthead-main"><a class="brand" href="/"><span class="brand-mark"><i></i></span><span><span class="brand-name">The Bell</span><span class="brand-formal">By Liberty Bell Vote</span></span></a><div class="mast-actions"><a class="btn donate" href="https://ko-fi.com/libertybellvote" target="_blank" rel="noopener">Donate</a><button class="theme-toggle" id="theme-toggle" aria-label="Toggle night mode" title="Toggle night mode">◐</button></div></div></header><nav class="nav"><div class="shell">${NAV.map(([id, url, label]) => `<a class="${page === id ? 'active' : ''}" href="${url}">${label}</a>`).join('')}</div></nav>`;
}

function footer() {
  return `<footer><div class="shell"><div class="footer-lead"><div class="footer-lockup"><span class="brand-mark light"><i></i></span><div><div class="footer-name">The Bell</div><p>Which way will The Bell swing?</p></div></div><div class="footer-support"><p>Independent coverage of the 2028 presidential election.</p><a class="btn donate" href="https://ko-fi.com/libertybellvote" target="_blank" rel="noopener">Support The Bell</a></div></div><div class="footer-grid"><div class="footer-col"><strong>Explore</strong><a href="/">Home</a><a href="/candidates.html">The Field</a><a href="/market-gap.html">Odds & Signals</a><a href="/map.html">Electoral Map</a></div><div class="footer-col"><strong>Accountability</strong><a href="/methodology.html">How It Works</a><a href="/ledger.html">Receipts</a><a href="mailto:libertybellvote@gmail.com?subject=Correction">Corrections</a></div><div class="footer-col"><strong>Follow</strong><a href="https://x.com/LibertyBellVote">X / Twitter</a><a href="https://instagram.com/LibertyBellVote">Instagram</a><a href="mailto:libertybellvote@gmail.com">Contact</a></div></div><div class="copyright">© 2026 Liberty Bell Vote · Market probabilities are not polls, guarantees, or financial advice.</div></div></footer>`;
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
const movement = candidate => candidate.pulseDir === 'up' ? ['▲ Rising', 'up'] : candidate.pulseDir === 'down' ? ['▼ Falling', 'down'] : ['Steady', 'flat'];

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

  $('#dem-pct').textContent = fmt(dem);
  $('#rep-pct').textContent = fmt(rep);
  $('#dem-bar').style.width = dem + '%';
  $('#rep-bar').style.width = rep + '%';
  $('#rating').textContent = rating;
  $('#bell-direction').textContent = margin >= 0 ? 'Swinging toward Democrats' : 'Swinging toward Republicans';
  $('.bell-visual').classList.toggle('lead-dem', margin >= 0);
  $('.bell-visual').classList.toggle('lead-rep', margin < 0);
  $('#bell-reading').textContent = `${abs.toFixed(1)}-point Bell edge`;
  $('#swing-arm').style.transform = `rotate(${Math.max(-24, Math.min(24, margin * 1.2))}deg)`;
  $('#updated').textContent = updated(data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.modelUpdatedAt || data.lastUpdated);
  $('#forecast-summary').textContent = call?.whyShort || 'The market has a favorite. The race does not have a winner.';
  $('#dem-mini').innerHTML = miniField(dems);
  $('#rep-mini').innerHTML = miniField(reps);
  $('#market-read').innerHTML = `The party market favors <strong>${partyPlural}</strong>. Both nomination fights are still open.`;
  $('#snapshot-party').innerHTML = margin >= 0 ? '<span aria-label="Democratic Party">🫏</span>' : '<span aria-label="Republican Party">🐘</span>';
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
}

function candidateCard(candidate, index, party) {
  const [label, cls] = movement(candidate);
  return `<article class="candidate-card compact-candidate"><div class="candidate-photo"><img src="${candidate.photo || ''}" alt="${candidate.name}" loading="lazy"><span class="standing">#${index + 1}</span></div><div class="candidate-body"><div class="candidate-name-row"><h2>${candidate.name}</h2>${partyBadge(party)}</div><div class="role">${candidate.role || ''}</div><p class="candidate-bio">${candidate.vibe || `${candidate.name} is a potential 2028 presidential contender.`}</p><div class="candidate-metrics"><div class="candidate-metric"><strong>${candidate.odds || 'N/A'}</strong><span>Market</span></div><div class="candidate-metric"><strong>${candidate.pollAvg != null ? candidate.pollAvg.toFixed(1) + '%' : 'N/A'}</strong><span>Polling</span></div><div class="candidate-metric"><strong class="pulse ${cls}">${label}</strong><span>Move</span></div></div></div></article>`;
}

function renderCandidates(data) {
  const draw = party => {
    const list = [...(party === 'democratic' ? data.field.democratic : party === 'republican' ? data.field.republican : data.thirdParty || [])].sort((a, b) => b.oddsNum - a.oddsNum);
    $('#candidate-grid').innerHTML = list.map((candidate, index) => candidateCard(candidate, index, party)).join('');
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
    return `<article class="market-card"><div class="market-story">${art}<div class="eyebrow">${marketLabel}</div><h2>${call.question}</h2><p class="our-call"><strong>${call.ourCall}</strong><br>${call.whyShort || ''}</p><a class="market-source" href="${sourceUrl}" target="_blank" rel="noopener">Odds source: Polymarket</a></div><div>${outcomes.map((outcome, index) => {const candidate = findCandidate(data, outcome.label); const seal = outcome.label === 'Democratic' || outcome.label === 'Republican' ? partyBadge(outcome.label) : ''; return `<div class="outcome ${index === 0 ? 'leader' : ''}"><span>${seal}${candidate ? personName(candidate, 'outcome-person') : outcome.label}</span><span class="outcome-bar"><span class="outcome-fill" style="width:${outcome.probability / max * 100}%"></span></span><span class="outcome-value">${fmt(outcome.probability)}</span></div>`;}).join('')}</div></article>`;
  }).join('');
}

function renderLedger(entries) {
  const host = $('#ledger-body');
  if (!entries.length) {
    host.innerHTML = '<div class="empty-state"><strong>No big move yet.</strong><span>The ledger starts when the Bell crosses its reporting threshold.</span></div>';
    return;
  }
  host.innerHTML = `<div class="ledger-scroll"><table class="ledger-table"><thead><tr><th>Date</th><th>What changed</th><th>Previous</th><th>New call</th><th>Why it is here</th></tr></thead><tbody>${entries.slice().reverse().map(entry => `<tr><td>${updated(entry.timestamp)}</td><td><strong>${entry.label || 'Bell movement'}</strong></td><td>${entry.previous || (entry.previousDemocratic != null ? `D ${fmt(entry.previousDemocratic)}` : 'Not recorded')}</td><td>${entry.value || (entry.democratic != null ? `D ${fmt(entry.democratic)} / R ${fmt(entry.republican)}` : 'Not recorded')}</td><td>${entry.note || entry.source || ''}</td></tr>`).join('')}</tbody></table></div>`;
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
