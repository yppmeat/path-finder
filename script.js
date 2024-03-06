const size = 6;
const last = size - 1;
for(let i = 0; i < size; i++) {
  const tr = document.createElement('tr');
  for(let j = 0; j < size; j++) {
    const td = document.createElement('td');
    tr.append(td);
  }
  $table.append(tr);
}

$canvas.width = $canvas.height = size * 50;
const ctx = $canvas.getContext('2d');
ctx.strokeStyle = 'red';

const typeList = { blue: 1, red: 2, start: 3, goal: 4 };
const typeArr = Object.keys(typeList);
let toolType = 'blue';

let searching = false;
let answerIndex = 0;
let answers = [];

function getAllTd() {
  return $table.querySelectorAll('td');
}

$table.addEventListener('click', e => {
  if(e.target.classList.contains(toolType)) {
    e.target.classList.remove(toolType);
    return;
  }
  e.target.classList.remove(...typeArr);
  e.target.classList.add(toolType);
});

function getMapPosList(map) {
  const posList = [];
  let index = 0;
  while(true) {
    let x, y;
    y = map.findIndex(v => (x = v.indexOf(index)) + 1);
    if(y < 0) break;
    posList.push([x, y]);
    index++;
  }
  return posList;
}


function display(map) {
  const posList = getMapPosList(map);
  ctx.beginPath();
  ctx.clearRect(0, 0, $canvas.width, $canvas.height);
  posList.forEach((v, i) => {
    ctx[i ? 'lineTo' : 'moveTo'](v[0] * 50 + 25, v[1] * 50 + 25);
  });
  ctx.stroke();
}

function showAnswer() {
  $answerInfo.innerText = `解法${answers.length}の${answerIndex + 1}`;
  display(answers[answerIndex]);
}

$answerRange.addEventListener('change', e => {
  answerIndex = +$answerRange.value;
  showAnswer();
});

$prev.addEventListener('click', e => {
  answerIndex = Math.max(answerIndex - 1, 0);
  $answerRange.value = answerIndex;
  showAnswer();
});

$next.addEventListener('click', e => {
  answerIndex = Math.min(answerIndex + 1, answers.length - 1);
  $answerRange.value = answerIndex;
  showAnswer();
});

$cancel.addEventListener('click', e => {
  searching = false;
  document.body.classList.remove('view');
});

$reset.addEventListener('click', e => {
  getAllTd().forEach(v => {
    v.classList.remove(...typeArr);
  });
});

$search.addEventListener('click', search);

$save.addEventListener('click', e => {
  const data = [...getAllTd()].map(v => {
    return typeList[v.className] ?? 0;
  }).join('');
  prompt('以下をコピーしてください:', data);
});

$load.addEventListener('click', e => {
  const data = prompt('以下に貼り付けてください:');
  if(!data) return;
  const td = getAllTd().forEach((v, i) => {
    const name = typeArr.find(v2 => typeList[v2] == data[i]);
    if(name) {
      v.classList.add(name);
    } else {
      v.classList.remove(...typeArr);
    }
  });
});

$tools.addEventListener('change', e => {
  if(e.target.name != 'tool') return;
  toolType = e.target.value;
  $resTools.querySelector(`[value="${e.target.value}"]`).checked = true;
});

$resTools.addEventListener('change', e => {
  if(e.target.name != 'tool2') return;
  toolType = e.target.value;
  $tools.querySelector(`[value="${e.target.value}"]`).checked = true;
});

async function search() {
  const data = [...getAllTd()].map(v => {
    return typeList[v.className] ?? 0;
  });
  const td = [...Array(size)].map(_ => data.splice(0, size));
  
  if(!checkTable(td)) return;
  
  document.body.classList.add('searching');
  searching = true;
  
  const map = [...Array(size)].map(_ => Array(size).fill(null));
  const rows = size;
  const cols = size;
  const startPos = getRootPos(td);
  
  const result = [];
  let answer = 0;
  let totalMoveCount = 0;
  
  let spanCount = 0;
  async function next(pos, map, index, prevDir) {
    if(!searching) return;
    
    totalMoveCount++;
    $info.innerHTML = `解法検索中（長時間お待ちください）<br>試行回数: ${totalMoveCount}, 解法数: ${answer}`;
    display(map);
    
    spanCount++
    if(spanCount >= +$range.value) {
      await new Promise(resolve => setTimeout(resolve, 0));
      spanCount = 0;
    }
    
    const [x, y] = pos;
    map[y][x] = index;
    
    // [top, right, down, left]
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const prevBlueDir = [[0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0]][prevDir];
    const prevRedDir  = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]][prevDir];
    
    if(td[y][x] == 4) {
      if(!map.flat().includes(null)) {
        result.push(structuredClone(map));
        answer++;
      }
      return;
    }
    
    let i = -1;
    for(const [dx, dy] of directions) {
      i++;
      
      const nx = x + dx;
      const ny = y + dy;
      const color = td[y][x];
      
      if(nx >= 0 && nx < rows && ny >= 0 && ny < cols) {
        if(map[ny][nx] != null) continue;
        if(color == 1 && !prevBlueDir[i]) continue;
        if(color == 2 && !prevRedDir[i]) continue;
        
        await next([nx, ny], structuredClone(map), index + 1, i);
      }
    }
  }
  await next(startPos, structuredClone(map), 0);
  
  if(searching) {
    alert('検索が終了しました');
    
    if(result.length) {
      answers = result;
      $answerRange.value = '0';
      $answerRange.max = answers.length - 1;
      answerIndex = 0;
      showAnswer();
      
      document.body.classList.add('view');
    } else {
      alert('解法は見つかりませんでした');
    }
  }
  
  document.body.classList.remove('searching');
  searching = false;
  $info.innerText = '';
}

function checkTable(td) {
  const flatTd = td.flat();
  const strTd = flatTd.join('');
  if(!flatTd.includes(3) || !flatTd.includes(4)) {
    alert('スタートとゴールを配置してください');
    return false;
  }
  if(strTd.match(/3/g).length != 1 || strTd.match(/4/g).length != 1) {
    alert('スタートまたはゴールを2つ以上配置できません');
    return false;
  }
  if([td[0][0], td[0][last], td[last][0], td[last][last]].includes(2)) {
    alert('四つ角に赤色マスは配置できません');
    return false;
  }
  return true;
}

function getRootPos(td) {
  let startX, startY;
  startY = td.findIndex(v => (startX = v.indexOf(3)) + 1);
  return [startX, startY];
}
