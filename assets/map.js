const STATES = [
['AK','Alaska',3,'R',7,1],['HI','Hawaii',4,'D',8,1],['WA','Washington',12,'D',1,2],['OR','Oregon',8,'D',2,2],['CA','California',54,'D',3,1],['NV','Nevada',6,'R',3,2],['AZ','Arizona',11,'R',4,2],['ID','Idaho',4,'R',2,3],['UT','Utah',6,'R',3,3],['NM','New Mexico',5,'D',4,3],['MT','Montana',4,'R',1,4],['WY','Wyoming',3,'R',2,4],['CO','Colorado',10,'D',3,4],['ND','North Dakota',3,'R',1,6],['SD','South Dakota',3,'R',2,6],['NE','Nebraska',5,'S',3,6],['KS','Kansas',6,'R',4,5],['OK','Oklahoma',7,'R',5,5],['TX','Texas',40,'R',6,5],['MN','Minnesota',10,'D',1,7],['IA','Iowa',6,'R',2,7],['MO','Missouri',10,'R',3,7],['AR','Arkansas',6,'R',4,7],['LA','Louisiana',8,'R',5,7],['WI','Wisconsin',10,'R',1,8],['IL','Illinois',19,'D',2,8],['KY','Kentucky',8,'R',3,8],['TN','Tennessee',11,'R',4,8],['MS','Mississippi',6,'R',5,8],['MI','Michigan',15,'R',1,10],['IN','Indiana',11,'R',2,9],['OH','Ohio',17,'R',2,10],['WV','West Virginia',4,'R',3,9],['AL','Alabama',9,'R',5,9],['GA','Georgia',16,'R',6,9],['PA','Pennsylvania',19,'R',2,11],['VA','Virginia',13,'D',3,10],['NC','North Carolina',16,'R',4,10],['SC','South Carolina',9,'R',5,10],['FL','Florida',30,'R',6,10],['NY','New York',28,'D',2,12],['NJ','New Jersey',14,'D',3,12],['VT','Vermont',3,'D',1,11],['NH','New Hampshire',4,'D',1,12],['ME','Maine',4,'S',1,13],['MA','Massachusetts',11,'D',2,13],['CT','Connecticut',7,'D',3,13],['RI','Rhode Island',4,'D',4,13],['MD','Maryland',10,'D',3,11],['DE','Delaware',3,'D',4,11],['DC','District of Columbia',3,'D',5,11]
];

const map = document.querySelector('#state-map');
const detail = document.querySelector('#state-detail');

function detailCopy(state) {
  const [abbr,name,ev,winner] = state;
  if (abbr === 'ME') return {winner:'Split electoral vote',copy:'Harris won 3 electoral votes. Trump won 1 from the Second Congressional District.'};
  if (abbr === 'NE') return {winner:'Split electoral vote',copy:'Trump won 4 electoral votes. Harris won 1 from the Second Congressional District.'};
  const person = winner === 'D' ? 'Kamala Harris' : 'Donald Trump';
  return {winner:`${person} won`,copy:`${person} received all ${ev} of ${name}’s electoral votes.`};
}

for (const state of STATES) {
  const [abbr,name,ev,winner,row,col] = state;
  const button = document.createElement('button');
  button.className = `state-tile ${winner === 'D' ? 'dem' : winner === 'R' ? 'rep' : 'split'}`;
  button.style.gridRow = row;
  button.style.gridColumn = col;
  button.innerHTML = `<strong>${abbr}</strong><span>${ev}</span>`;
  button.setAttribute('aria-label', `${name}, ${ev} electoral votes`);
  button.onclick = () => {
    document.querySelectorAll('.state-tile.active').forEach(tile => tile.classList.remove('active'));
    button.classList.add('active');
    const info = detailCopy(state);
    detail.innerHTML = `<span class="eyebrow">${abbr} · ${ev} electoral votes</span><h2>${name}</h2><strong>${info.winner}</strong><p>${info.copy}</p>`;
  };
  map.appendChild(button);
}
