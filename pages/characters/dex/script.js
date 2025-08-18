const STORAGE_DEX = "dex_state";
function loadDex(){
  try{
    const d = JSON.parse(localStorage.getItem(STORAGE_DEX)||"{}");
    return { unlocked: d.unlocked||{0:true} };
  }catch{ return { unlocked:{0:true} }; }
}
const dex = loadDex();

const grid = document.getElementById("grid");
function framePos(frame=1, dir=0){ // 図鑑の静止画：中央フレーム
  const x = -32*frame, y = -32*dir;
  return `${x}px ${y}px`;
}

CHARACTERS.forEach(ch=>{
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = ch.id;

  const sp = document.createElement("div");
  sp.className = "sprite";
  sp.style.backgroundImage = `url("${ch.img || '../assets/男_スーツ1.png'}")`;
  sp.style.backgroundPosition = framePos(1, 0); // 下向き中央

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = ch.name;

  card.appendChild(sp);
  card.appendChild(name);

  const locked = !dex.unlocked[ch.id];
  if(locked){
    const lock = document.createElement("div");
    lock.className = "lock";
    lock.textContent = "LOCKED";
    card.appendChild(lock);
    card.addEventListener("click", ()=> openModal(ch, true));
  }else{
    card.addEventListener("click", ()=> openModal(ch, false));
  }

  grid.appendChild(card);
});

// modal
const modal = document.getElementById("modal");
const mimg  = document.getElementById("mimg");
const mname = document.getElementById("mname");
const mr    = document.getElementById("mrarity");
const mhint = document.getElementById("mhint");
document.getElementById("close").addEventListener("click", ()=> modal.hidden=true);

function openModal(ch, locked){
  modal.hidden = false;
  mimg.src = ch.img || "../assets/男_スーツ1.png";
  mname.textContent = ch.name;
  mr.textContent = `レア度 ★${"★".repeat(ch.rarity)}`.slice(3);
  mhint.textContent = locked ? `解放ヒント：${ch.unlockHint||"色々食べて記録しよう"}` : "解放済み！";
}
