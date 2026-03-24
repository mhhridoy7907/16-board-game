
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const overlay = document.getElementById('overlay');
const gap = 150;

let selected = null;
let currentPlayer = 1;
let pieces = [];

// --- INIT ---
function resetGame() {
  pieces = [];
  for(let i=1;i<3;i++) for(let j=0;j<5;j++) pieces.push({x:j,y:i,player:2});
  for(let i=4;i<6;i++) for(let j=0;j<5;j++) pieces.push({x:j,y:i,player:1});
  currentPlayer=1;
  overlay.style.display='none';
  status.innerText='Your Turn';
  draw();
}

// --- DRAW ---
function drawBoard() {
  ctx.clearRect(0,0,700,1050);
  ctx.strokeStyle = '#00f6ff';
  ctx.lineWidth = 2;
  for(let i=0;i<=6;i++){ ctx.beginPath(); ctx.moveTo(50,i*gap+50); ctx.lineTo(650,i*gap+50); ctx.stroke(); }
  for(let i=0;i<=5;i++){ ctx.beginPath(); ctx.moveTo(i*gap+50,50); ctx.lineTo(i*gap+50,50+6*gap); ctx.stroke(); }
}
function drawPieces() {
  pieces.forEach(p=>{
    ctx.beginPath();
    let grad = ctx.createRadialGradient(p.x*gap+50,p.y*gap+50,5,p.x*gap+50,p.y*gap+50,20);
    grad.addColorStop(0, p.player===1?"#ff5555":"#55ff55");
    grad.addColorStop(1, p.player===1?"#aa0000":"#00aa00");
    ctx.fillStyle=grad;
    ctx.shadowColor=p.player===1?"#ff4444":"#00ff44";
    ctx.shadowBlur=15;
    ctx.arc(p.x*gap+50,p.y*gap+50,20,0,Math.PI*2);
    ctx.fill();
    ctx.shadowBlur=0;
    if(selected===p){ ctx.strokeStyle='yellow'; ctx.lineWidth=4; ctx.stroke(); ctx.lineWidth=1; }
  });
}
function draw(){ drawBoard(); drawPieces(); }

// --- UTILS ---
function getPiece(x,y){ return pieces.find(p=>p.x===x && p.y===y); }
function removePiece(x,y){ pieces = pieces.filter(p=>!(p.x===x && p.y===y)); }
function inBounds(x,y){ return x>=0 && x<5 && y>=0 && y<7; }

// --- WIN CHECK ---
function checkWin() {
  let playerCount = pieces.filter(p=>p.player===1).length;
  let aiCount = pieces.filter(p=>p.player===2).length;
  if(playerCount===0){ overlay.innerHTML='💀 GAME OVER 💀<br><button onclick="resetGame()">Play Again</button>'; overlay.style.display='flex'; return true; }
  if(aiCount===0){ overlay.innerHTML='🏆 YOU WIN 🏆<br><button onclick="resetGame()">Play Again</button>'; overlay.style.display='flex'; return true; }
  return false;
}

// --- AI LOGIC: ALWAYS ATTACK ---
function getAllCaptures(piece, visited=[]){
  let moves = [];
  let dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
  for(let d of dirs){
    let nx=piece.x+d.x, ny=piece.y+d.y;
    let jx=piece.x+2*d.x, jy=piece.y+2*d.y;
    let enemy=getPiece(nx,ny);
    if(enemy && enemy.player===1 && !getPiece(jx,jy) && inBounds(jx,jy) && !visited.find(v=>v.x===jx && v.y===jy)){
      let newVisited = visited.concat([{x:jx,y:jy}]);
      moves.push({from:{x:piece.x,y:piece.y}, to:{x:jx,y:jy}, captured:{x:nx,y:ny}, chain:getAllCaptures({x:jx,y:jy,player:2}, newVisited)});
    }
  }
  return moves;
}
function flattenMoves(moves){
  let result=[];
  for(let m of moves){
    if(m.chain.length===0) result.push([m]);
    else { let sub=flattenMoves(m.chain); sub.forEach(s=>result.push([m,...s])); }
  }
  return result;
}

function aiMove(){
  status.innerText='AI Thinking...';
  let aiPieces = pieces.filter(p=>p.player===2);
  let allMoves=[];
  for(let p of aiPieces){
    let captures = getAllCaptures(p);
    let flat = flattenMoves(captures);
    if(flat.length>0) allMoves.push(...flat);
  }

  // If no captures, AI must still attack (pick any possible jump even if single)
  if(allMoves.length===0){
    for(let p of aiPieces){
      let dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
      dirs.forEach(d=>{
        let nx=p.x+d.x, ny=p.y+d.y, jx=p.x+2*d.x, jy=p.y+2*d.y;
        let enemy=getPiece(nx,ny);
        if(enemy && enemy.player===1 && !getPiece(jx,jy) && inBounds(jx,jy)){
          allMoves.push([{from:{x:p.x,y:p.y}, to:{x:jx,y:jy}, captured:{x:nx,y:ny}}]);
        }
      });
    }
  }

  if(allMoves.length===0){ currentPlayer=1; status.innerText='Your Turn'; return; }
  allMoves.sort((a,b)=>b.length - a.length);
  let bestMove=allMoves[0];
  let i=0;

  function step(){
    let move = bestMove[i];
    if(move.captured) removePiece(move.captured.x, move.captured.y);
    let piece = getPiece(move.from.x, move.from.y);
    if(piece){ piece.x=move.to.x; piece.y=move.to.y; }
    draw();
    i++;
    if(i<bestMove.length) setTimeout(step,300);
    else { currentPlayer=1; if(!checkWin()) status.innerText='Your Turn'; }
  }
  setTimeout(step,300);
}

// --- PLAYER CLICK ---
canvas.addEventListener('click', e=>{
  if(currentPlayer!==1 || overlay.style.display==='flex') return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left - 50)/gap);
  const y = Math.round((e.clientY - rect.top - 50)/gap);
  const found = getPiece(x,y);
  if(found && found.player===1){ selected=found; draw(); return; }
  if(selected){
    let dx=x-selected.x, dy=y-selected.y;
    let ate=false;
    if((Math.abs(dx)===1&&dy===0)||(Math.abs(dy)===1&&dx===0)){
      if(!getPiece(x,y)){ selected.x=x; selected.y=y; ate=false; }
    } else if((Math.abs(dx)===2&&dy===0)||(Math.abs(dy)===2&&dx===0)){
      let mx=selected.x+dx/2, my=selected.y+dy/2;
      let enemy=getPiece(mx,my);
      if(enemy && enemy.player===2 && !getPiece(x,y)){ removePiece(mx,my); selected.x=x; selected.y=y; ate=true; }
    }
    draw();
    if(ate) selected = getPiece(x,y);
    else { selected=null; currentPlayer=2; if(!checkWin()) setTimeout(aiMove,500); }
  }
});


resetGame();
