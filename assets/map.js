const STATES = [
  ['AK','Alaska',3,'R'],['HI','Hawaii',4,'D'],['WA','Washington',12,'D'],['OR','Oregon',8,'D'],['CA','California',54,'D'],['NV','Nevada',6,'R'],['AZ','Arizona',11,'R'],['ID','Idaho',4,'R'],['UT','Utah',6,'R'],['NM','New Mexico',5,'D'],['MT','Montana',4,'R'],['WY','Wyoming',3,'R'],['CO','Colorado',10,'D'],['ND','North Dakota',3,'R'],['SD','South Dakota',3,'R'],['NE','Nebraska',5,'S'],['KS','Kansas',6,'R'],['OK','Oklahoma',7,'R'],['TX','Texas',40,'R'],['MN','Minnesota',10,'D'],['IA','Iowa',6,'R'],['MO','Missouri',10,'R'],['AR','Arkansas',6,'R'],['LA','Louisiana',8,'R'],['WI','Wisconsin',10,'R'],['IL','Illinois',19,'D'],['KY','Kentucky',8,'R'],['TN','Tennessee',11,'R'],['MS','Mississippi',6,'R'],['MI','Michigan',15,'R'],['IN','Indiana',11,'R'],['OH','Ohio',17,'R'],['WV','West Virginia',4,'R'],['AL','Alabama',9,'R'],['GA','Georgia',16,'R'],['PA','Pennsylvania',19,'R'],['VA','Virginia',13,'D'],['NC','North Carolina',16,'R'],['SC','South Carolina',9,'R'],['FL','Florida',30,'R'],['NY','New York',28,'D'],['NJ','New Jersey',14,'D'],['VT','Vermont',3,'D'],['NH','New Hampshire',4,'D'],['ME','Maine',4,'S'],['MA','Massachusetts',11,'D'],['CT','Connecticut',7,'D'],['RI','Rhode Island',4,'D'],['MD','Maryland',10,'D'],['DE','Delaware',3,'D'],['DC','District of Columbia',3,'D']
];

const mapHost = document.querySelector('#state-map');
const detail = document.querySelector('#state-detail');
const detailContent = document.querySelector('#detail-content');
const stateByName = new Map(STATES.map(state => [state[1], state]));
document.querySelector('#detail-close').onclick = () => detail.classList.remove('open');

function detailCopy(state) {
  const [abbr, name, ev, winner] = state;
  if (abbr === 'ME') return {winner:'Split electoral vote', copy:'Harris won 3 electoral votes. Trump won 1 from the Second Congressional District.'};
  if (abbr === 'NE') return {winner:'Split electoral vote', copy:'Trump won 4 electoral votes. Harris won 1 from the Second Congressional District.'};
  const person = winner === 'D' ? 'Kamala Harris' : 'Donald Trump';
  return {winner:`${person} won`, copy:`${person} received all ${ev} of ${name}’s electoral votes.`};
}

function showDetail(state, pathNode) {
  document.querySelectorAll('.state-shape.active').forEach(shape => shape.classList.remove('active'));
  pathNode.classList.add('active');
  const [abbr, name, ev] = state;
  const info = detailCopy(state);
  detailContent.innerHTML = `<span class="eyebrow">${abbr} · ${ev} electoral votes</span><h2>${name}</h2><strong>${info.winner}</strong><p>${info.copy}</p>`;
  detail.classList.add('open');
}

async function drawMap() {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    if (!response.ok) throw new Error('Map data unavailable');
    const atlas = await response.json();
    const features = topojson.feature(atlas, atlas.objects.states).features.filter(feature => stateByName.has(feature.properties.name));
    mapHost.innerHTML = '';
    const width = 975;
    const height = 610;
    const svg = d3.select(mapHost).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('aria-label', '2024 presidential election results by state');
    const defs = svg.append('defs');
    const split = defs.append('linearGradient').attr('id', 'split-state').attr('x1', '0').attr('x2', '1');
    split.append('stop').attr('offset', '49%').attr('class', 'split-dem');
    split.append('stop').attr('offset', '51%').attr('class', 'split-rep');
    const collection = {type:'FeatureCollection', features};
    const projection = d3.geoAlbersUsa().fitExtent([[20, 20], [width - 20, height - 20]], collection);
    const path = d3.geoPath(projection);
    svg.selectAll('path').data(features).join('path')
      .attr('d', path)
      .attr('class', feature => {
        const state = stateByName.get(feature.properties.name);
        return `state-shape ${state[3] === 'D' ? 'dem' : state[3] === 'R' ? 'rep' : 'split'}`;
      })
      .attr('tabindex', '0')
      .attr('aria-label', feature => {
        const state = stateByName.get(feature.properties.name);
        return `${state[1]}, ${state[2]} electoral votes`;
      })
      .on('click', function(event, feature) { showDetail(stateByName.get(feature.properties.name), this); })
      .on('keydown', function(event, feature) { if (event.key === 'Enter' || event.key === ' ') showDetail(stateByName.get(feature.properties.name), this); });
    svg.selectAll('text').data(features.filter(feature => path.area(feature) > 260)).join('text')
      .attr('class', 'state-label')
      .attr('transform', feature => {
        const [x, y] = path.centroid(feature);
        const state = stateByName.get(feature.properties.name)[0];
        return state === 'FL' ? `translate(${x - 14},${y - 18})` : `translate(${x},${y})`;
      })
      .text(feature => stateByName.get(feature.properties.name)[0]);
  } catch (error) {
    mapHost.innerHTML = '<p class="map-error">The geographic map could not load. Refresh to try again.</p>';
  }
}

drawMap();
