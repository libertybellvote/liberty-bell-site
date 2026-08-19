const STATES = [
['AK','Alaska',3,'R',7,1],['HI','Hawaii',4,'D',7,2],['WA','Washington',12,'D',1,1],['OR','Oregon',8,'D',2,1],['CA','California',54,'D',3,1],['NV','Nevada',6,'R',3,2],['AZ','Arizona',11,'R',4,2],['ID','Idaho',4,'R',2,2],['UT','Utah',6,'R',3,3],['NM','New Mexico',5,'D',4,3],['MT','Montana',4,'R',1,3],['WY','Wyoming',3,'R',2,3],['CO','Colorado',10,'D',3,4],['ND','North Dakota',3,'R',1,5],['SD','South Dakota',3,'R',2,5],['NE','Nebraska',5,'S',3,5],['KS','Kansas',6,'R',4,4],['OK','Oklahoma',7,'R',5,4],['TX','Texas',40,'R',6,4],['MN','Minnesota',10,'D',1,6],['IA','Iowa',6,'R',2,6],['MO','Missouri',10,'R',3,6],['AR','Arkansas',6,'R',4,6],['LA','Louisiana',8,'R',5,6],['WI','Wisconsin',10,'R',1,7],['IL','Illinois',19,'D',2,7],['KY','Kentucky',8,'R',3,7],['TN','Tennessee',11,'R',4,7],['MS','Mississippi',6,'R',5,7],['MI','Michigan',15,'R',1,8],['IN','Indiana',11,'R',2,8],['OH','Ohio',17,'R',2,9],['WV','West Virginia',4,'R',3,8],['AL','Alabama',9,'R',5,8],['GA','Georgia',16,'R',6,8],['PA','Pennsylvania',19,'R',2,10],['VA','Virginia',13,'D',3,9],['NC','North Carolina',16,'R',4,9],['SC','South Carolina',9,'R',5,9],['FL','Florida',30,'R',6,9],['NY','New York',28,'D',2,11],['NJ','New Jersey',14,'D',3,11],['VT','Vermont',3,'D',1,10],['NH','New Hampshire',4,'D',1,11],['ME','Maine',4,'S',1,12],['MA','Massachusetts',11,'D',2,12],['CT','Connecticut',7,'D',3,12],['RI','Rhode Island',4,'D',4,12],['MD','Maryland',10,'D',3,10],['DE','Delaware',3,'D',4,10],['DC','District of Columbia',3,'D',5,10]
];

const map = document.querySelector('#state-map');
const detail = document.querySelector('#state-detail');
const detailContent = document.querySelector('#detail-content');
document.querySelector('#detail-close').onclick = () => detail.classList.remove('open');

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
    detailContent.innerHTML = `<span class="eyebrow">${abbr} · ${ev} electoral votes</span><h2>${name}</h2><strong>${info.winner}</strong><p>${info.copy}</p>`;
    detail.classList.add('open');
  };
  map.appendChild(button);
}
