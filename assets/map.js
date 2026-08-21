const STATES = [
  ['AK','Alaska',3,'R'],['HI','Hawaii',4,'D'],['WA','Washington',12,'D'],['OR','Oregon',8,'D'],['CA','California',54,'D'],['NV','Nevada',6,'R'],['AZ','Arizona',11,'R'],['ID','Idaho',4,'R'],['UT','Utah',6,'R'],['NM','New Mexico',5,'D'],['MT','Montana',4,'R'],['WY','Wyoming',3,'R'],['CO','Colorado',10,'D'],['ND','North Dakota',3,'R'],['SD','South Dakota',3,'R'],['NE','Nebraska',5,'S'],['KS','Kansas',6,'R'],['OK','Oklahoma',7,'R'],['TX','Texas',40,'R'],['MN','Minnesota',10,'D'],['IA','Iowa',6,'R'],['MO','Missouri',10,'R'],['AR','Arkansas',6,'R'],['LA','Louisiana',8,'R'],['WI','Wisconsin',10,'R'],['IL','Illinois',19,'D'],['KY','Kentucky',8,'R'],['TN','Tennessee',11,'R'],['MS','Mississippi',6,'R'],['MI','Michigan',15,'R'],['IN','Indiana',11,'R'],['OH','Ohio',17,'R'],['WV','West Virginia',4,'R'],['AL','Alabama',9,'R'],['GA','Georgia',16,'R'],['PA','Pennsylvania',19,'R'],['VA','Virginia',13,'D'],['NC','North Carolina',16,'R'],['SC','South Carolina',9,'R'],['FL','Florida',30,'R'],['NY','New York',28,'D'],['NJ','New Jersey',14,'D'],['VT','Vermont',3,'D'],['NH','New Hampshire',4,'D'],['ME','Maine',4,'S'],['MA','Massachusetts',11,'D'],['CT','Connecticut',7,'D'],['RI','Rhode Island',4,'D'],['MD','Maryland',10,'D'],['DE','Delaware',3,'D'],['DC','District of Columbia',3,'D']
];
const BATTLEGROUNDS = new Set(['AZ','GA','MI','NV','NC','PA','WI']);
const POPULATION_2020 = {AL:5024279,AK:733391,AZ:7151502,AR:3011524,CA:39538223,CO:5773714,CT:3605944,DE:989948,DC:689545,FL:21538187,GA:10711908,HI:1455271,ID:1839106,IL:12812508,IN:6785528,IA:3190369,KS:2937880,KY:4505836,LA:4657757,ME:1362359,MD:6177224,MA:7029917,MI:10077331,MN:5706494,MS:2961279,MO:6154913,MT:1084225,NE:1961504,NV:3104614,NH:1377529,NJ:9288994,NM:2117522,NY:20201249,NC:10439388,ND:779094,OH:11799448,OK:3959353,OR:4237256,PA:13002700,RI:1097379,SC:5118425,SD:886667,TN:6910840,TX:29145505,UT:3271616,VT:643077,VA:8631393,WA:7705281,WV:1793716,WI:5893718,WY:576851};
let modelProjection = {democraticEV:286,republicanEV:252,tossupEV:0,stateWinners:{AZ:'R',GA:'D',MI:'D',NV:'R',NC:'R',PA:'D',WI:'D'},stateRatings:{}};
let mapView = 'projection';
const mapHost = document.querySelector('#state-map');
const detail = document.querySelector('#state-detail');
const detailContent = document.querySelector('#detail-content');
const statePicker = document.querySelector('#state-picker');
const stateByName = new Map(STATES.map(state => [state[1], state]));
document.querySelector('#detail-close').onclick = () => {};

STATES.slice().sort((a,b) => a[1].localeCompare(b[1])).forEach(state => {
  const option = document.createElement('option');
  option.value = state[0]; option.textContent = state[1]; statePicker.append(option);
});

const projectedWinner = state => modelProjection.stateWinners?.[state[0]] || state[3];
function detailCopy(state) {
  const [abbr,name,ev,result] = state;
  if (mapView === 'result') {
    if (abbr === 'ME') return {winner:'Split electoral vote',copy:'Harris won 3 electoral votes. Trump won 1 from the Second Congressional District.'};
    if (abbr === 'NE') return {winner:'Split electoral vote',copy:'Trump won 4 electoral votes. Harris won 1 from the Second Congressional District.'};
    const person = result === 'D' ? 'Kamala Harris' : 'Donald Trump';
    return {winner:`${person} won in 2024`,copy:`${person} received all ${ev} of ${name}’s electoral votes.`};
  }
  const winner = projectedWinner(state);
  if (winner === 'T') return {winner:'Toss-up'};
  if (winner === 'S') return {winner:'Projected split vote',copy:`The Bell currently keeps ${name} split by congressional district.`};
  const party = winner === 'D' ? 'Democratic' : 'Republican';
  const stateRating = modelProjection.stateRatings?.[abbr];
  const rating = stateRating?.rating || (BATTLEGROUNDS.has(abbr) ? 'Battleground' : 'Projected');
  const path = winner !== result ? `It moves from the 2024 ${result === 'D' ? 'Democratic' : 'Republican'} column under today’s national environment.` : 'It remains with the party that carried it in 2024 under today’s model conditions.';
  const margin = stateRating ? ` · ${winner}${Math.abs(stateRating.projectedMargin).toFixed(1)}` : '';
  return {winner:`${rating} ${party}${margin}`,copy:`The Bell currently assigns ${ev} electoral votes to the ${party.toLowerCase()} column. ${path}`};
}

function showDetail(state,pathNode) {
  document.querySelectorAll('.state-shape.active').forEach(shape => shape.classList.remove('active'));
  if (pathNode) pathNode.classList.add('active');
  const [abbr,name,ev] = state; const info = detailCopy(state);
  const population = POPULATION_2020[abbr];
  const populationText = population ? new Intl.NumberFormat('en-US').format(population) : 'Not available';
  detailContent.innerHTML = `<span class="eyebrow">${abbr} · ${ev} electoral votes</span><h2>${name}</h2><strong>${info.winner}</strong><span class="state-population">2020 population · ${populationText}</span>`;
  statePicker.value = abbr;
}

function showMapOverview() {
  detailContent.innerHTML = `<span class="eyebrow">The Bell’s prediction</span><h2>Choose a state</h2><strong>See what is driving the call.</strong><p>Hover, tap, or use the state finder to read the current 2028 prediction. State calls reflect the full Bell Model, not any single poll.</p>`;
}

statePicker.onchange = () => {
  const state = STATES.find(item => item[0] === statePicker.value); if (!state) return;
  showDetail(state,document.querySelector(`.state-shape[data-state="${state[0]}"]`));
};

function applyView() {
  document.querySelectorAll('[data-map-view]').forEach(button => button.classList.toggle('active',button.dataset.mapView === mapView));
  document.querySelector('#map-dem-score').textContent = mapView === 'projection' ? modelProjection.democraticEV : '226';
  document.querySelector('#map-rep-score').textContent = mapView === 'projection' ? modelProjection.republicanEV : '312';
  document.querySelector('#map-toss-score').textContent = mapView === 'projection' && modelProjection.tossupEV ? `${modelProjection.tossupEV} toss-up` : '';
  document.querySelector('#map-dem-name').textContent = mapView === 'projection' ? 'Democratic' : 'Harris';
  document.querySelector('#map-rep-name').textContent = mapView === 'projection' ? 'Republican' : 'Trump';
  document.querySelector('#map-dem-photo').hidden = mapView === 'projection';
  document.querySelector('#map-rep-photo').hidden = mapView === 'projection';
  document.querySelector('#map-dem-party').hidden = mapView !== 'projection';
  document.querySelector('#map-rep-party').hidden = mapView !== 'projection';
  document.querySelector('#map-dem-track').style.width = mapView === 'projection' ? `${modelProjection.democraticEV / 5.38}%` : '42%';
  document.querySelector('#map-toss-track').style.width = mapView === 'projection' ? `${(modelProjection.tossupEV || 0) / 5.38}%` : '0%';
  document.querySelector('#map-rep-track').style.width = mapView === 'projection' ? `${modelProjection.republicanEV / 5.38}%` : '58%';
  document.querySelector('#map-view-note').textContent = mapView === 'projection' ? 'Current Bell Model prediction' : 'Certified 2024 result';
  document.querySelectorAll('.state-shape').forEach(node => {
    const state = STATES.find(item => item[0] === node.dataset.state);
    const winner = mapView === 'projection' ? projectedWinner(state) : state[3];
    const partyClass = winner === 'D' ? 'dem' : winner === 'R' ? 'rep' : winner === 'T' ? 'tossup' : 'split';
    node.setAttribute('class',`state-shape ${partyClass} ${mapView === 'projection' && BATTLEGROUNDS.has(state[0]) ? 'battleground' : ''}`);
    const fill = winner === 'D' ? '#3b73a8' : winner === 'R' ? '#b4473d' : winner === 'T' ? '#d7ad50' : 'url(#split-state)';
    node.style.setProperty('fill',fill,'important');
    node.setAttribute('fill',fill);
  });
  statePicker.value = '';
  showMapOverview();
}
document.querySelectorAll('[data-map-view]').forEach(button => button.onclick = () => { mapView = button.dataset.mapView; applyView(); });

async function drawMap() {
  try {
    const [response,dataResponse] = await Promise.all([fetch('https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json'),fetch('/site-data.json',{cache:'no-store'})]); if (!response.ok) throw new Error();
    const atlas = await response.json();
    if (dataResponse.ok) { const data = await dataResponse.json(); if (data.electoralProjection) modelProjection = data.electoralProjection; }
    const features = topojson.feature(atlas,atlas.objects.states).features.filter(feature => stateByName.has(feature.properties.name));
    mapHost.innerHTML = ''; const width = 975, height = 610;
    const svg = d3.select(mapHost).append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label','The Bell 2028 Electoral College projection');
    const defs = svg.append('defs'); const split = defs.append('linearGradient').attr('id','split-state').attr('x1','0').attr('x2','1');
    split.append('stop').attr('offset','49%').attr('class','split-dem').attr('stop-color','#3b73a8'); split.append('stop').attr('offset','51%').attr('class','split-rep').attr('stop-color','#b4473d');
    const collection = {type:'FeatureCollection',features}; const projection = d3.geoAlbersUsa().fitExtent([[20,20],[width-20,height-20]],collection); const path = d3.geoPath(projection);
    svg.selectAll('path').data(features).join('path').attr('class','state-shape').attr('d',path).attr('data-state',feature => stateByName.get(feature.properties.name)[0]).attr('tabindex','0')
      .attr('aria-label',feature => { const state=stateByName.get(feature.properties.name); return `${state[1]}, ${state[2]} electoral votes`; })
      .on('click',function(event,feature){showDetail(stateByName.get(feature.properties.name),this);})
      .on('mouseenter',function(event,feature){if(window.matchMedia('(hover: hover) and (pointer: fine)').matches) showDetail(stateByName.get(feature.properties.name),this);})
      .on('keydown',function(event,feature){if(event.key==='Enter'||event.key===' ')showDetail(stateByName.get(feature.properties.name),this);});
    svg.selectAll('text').data(features.filter(feature => path.area(feature)>120)).join('text').attr('class','state-label')
      .attr('transform',feature => { const [x,y]=path.centroid(feature); const state=stateByName.get(feature.properties.name)[0]; return state==='FL'?`translate(${x+20},${y+4})`:`translate(${x},${y})`; })
      .text(feature => stateByName.get(feature.properties.name)[0]);
    applyView();
  } catch { mapHost.innerHTML='<p class="map-error">The geographic map could not load. Refresh to try again.</p>'; }
}
drawMap();
