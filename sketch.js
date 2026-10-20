/**
 * PBL 專題：臺灣鳥類生態大解密 - 拖曳式連連看（縮放不中斷連線修正版）
 * 技術：p5.js 全螢幕滿版畫布、視窗縮放保持遊戲狀態、拖曳互動、Web Audio 音效[cite: 1]
 */

const STYLE = {
  bg: "#F4F6F0",
  primary: "#2E7D32",
  accent: "#FBC02D",
  cardBg: "#FFFFFF",
  cardBorder: "#A5D6A7",
  lineOk: "#4CAF50",
  lineBad: "#D32F2F",
  lineDrag: "#2196F3",
  text: "#1B5E20"
};

const PAIRS = [
  { id: 1, name: "臺灣藍鵲", feature: "保育類特有種，擁有絢麗長藍尾羽與強烈護巢習性", imgUrl: "media/bird1.jpg" },
  { id: 2, name: "五色鳥", feature: "頭頂五彩羽毛，常在樹幹敲擊喙部發出規律木魚聲", imgUrl: "media/bird2.jpg" },
  { id: 3, name: "綠繡眼", feature: "體型小巧，眼周有標誌性白色眼圈，叫聲急促清脆", imgUrl: "media/bird3.jpg" },
  { id: 4, name: "黑面琵鷺", feature: "冬候鳥，擁有扁平如琵鷺匙狀的黑色嘴喙在水中掃食", imgUrl: "media/bird4.jpg" }
];

let birdImages = {};
let leftCards = [];
let rightCards = [];
let connections = [];
let draggingCard = null;
let gameState = "START";
let startTime = 0;
let endTime = 0;
let audioCtx = null;

// 預載本機圖片[cite: 1]
function preload() {
  PAIRS.forEach(item => {
    birdImages[item.id] = loadImage(
      item.imgUrl,
      img => console.log(`已成功載入: ${item.name}`),
      err => console.error(`載入失敗: ${item.imgUrl}`, err)
    );
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  textWrap(CHAR); // 強制中文自動換行[cite: 1]
  initGame();
}

// 關鍵修改：縮放視窗時只重新計算座標，不重設卡片與連線進度！[cite: 1]
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recalculatePositions(); 
}

// 遊戲全新開局（開局/重新開始時才執行）[cite: 1]
function initGame() {
  connections = [];
  draggingCard = null;
  
  // 1. 建立左側卡片原始陣列[cite: 1]
  leftCards = PAIRS.map(item => ({
    id: item.id,
    name: item.name,
    matched: false,
    x: 0, y: 0, w: 0, h: 0
  }));

  // 2. 隨機打亂右側卡片順序[cite: 1]
  let shuffledRight = [...PAIRS].sort(() => Math.random() - 0.5);
  rightCards = shuffledRight.map(item => ({
    id: item.id,
    name: item.name,
    text: item.feature,
    matched: false,
    x: 0, y: 0, w: 0, h: 0
  }));

  // 3. 計算座標[cite: 1]
  recalculatePositions();
}

// 重新計算座標（專門給縮放視窗時呼叫，不改變右側順序）[cite: 1]
function recalculatePositions() {
  let cardW = min(width * 0.35, 360);
  let cardH = min(height * 0.16, 110);
  let startY = height * 0.16;
  let spacingY = height * 0.19;

  // 重新計算左側位置
  leftCards.forEach((card, idx) => {
    card.x = width * 0.1;
    card.y = startY + idx * spacingY;
    card.w = cardW;
    card.h = cardH;
  });

  // 重新計算右側位置（保持原本已經打亂好的陣列順序）
  rightCards.forEach((card, idx) => {
    card.x = width - width * 0.1 - cardW;
    card.y = startY + idx * spacingY;
    card.w = cardW;
    card.h = cardH;
  });
}

function draw() {
  background(STYLE.bg);

  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "PLAY") {
    drawPlayScreen();
  } else if (gameState === "WIN") {
    drawWinScreen();
  }
}

// F1: 開始畫面[cite: 1]
function drawStartScreen() {
  let boxW = min(width * 0.8, 600);
  let boxH = min(height * 0.8, 500);

  fill(STYLE.cardBg);
  stroke(STYLE.primary);
  strokeWeight(2);
  rect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);

  noStroke();
  fill(STYLE.primary);
  textAlign(CENTER, TOP);
  textSize(min(width * 0.03, 28));
  textStyle(BOLD);
  text("臺灣鳥類生態大解密", width / 2, (height - boxH) / 2 + 40);
  textSize(min(width * 0.022, 22));
  text("【拖曳連連看大挑戰】", width / 2, (height - boxH) / 2 + 85);

  textSize(min(width * 0.018, 16));
  fill(STYLE.text);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  let ruleText = "遊戲規則：\n觀察左側【鳥類照片卡】的外觀特徵，\n按住圓點拉出一條連線，連接至右側正確的【習性卡】！\n全部正確配對即可通關！";
  text(ruleText, width / 2 - boxW * 0.4, (height - boxH) / 2 + 130, boxW * 0.8, boxH * 0.4);

  drawButton(width / 2 - 100, (height - boxH) / 2 + boxH - 80, 200, 50, "開始連線挑戰", STYLE.primary, () => {
    initAudio();
    gameState = "PLAY";
    startTime = millis();
  });
}

// F2, F3, F4: 主舞台[cite: 1]
function drawPlayScreen() {
  fill(STYLE.text);
  noStroke();
  textSize(min(width * 0.02, 22));
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("請將左側鳥類影像拖曳連線至右側正確特徵", width / 2, height * 0.04);

  // 1. 配對成功的綠線[cite: 1]
  connections.forEach(conn => {
    let lCard = leftCards.find(c => c.id === conn.leftId);
    let rCard = rightCards.find(c => c.id === conn.rightId);
    if (lCard && rCard) {
      stroke(STYLE.lineOk);
      strokeWeight(4);
      line(lCard.x + lCard.w, lCard.y + lCard.h / 2, rCard.x, rCard.y + rCard.h / 2);
    }
  });

  // 2. 拖曳中的藍線[cite: 1]
  if (draggingCard) {
    stroke(STYLE.lineDrag);
    strokeWeight(3);
    line(draggingCard.x + draggingCard.w, draggingCard.y + draggingCard.h / 2, mouseX, mouseY);
  }

  // 3. 左側媒體卡[cite: 1]
  leftCards.forEach(card => {
    stroke(card.matched ? STYLE.lineOk : STYLE.cardBorder);
    strokeWeight(2);
    fill(STYLE.cardBg);
    rect(card.x, card.y, card.w, card.h, 10);

    let imgSize = min(card.w * 0.28, card.h * 0.82);
    if (birdImages[card.id]) {
      image(birdImages[card.id], card.x + 10, card.y + (card.h - imgSize) / 2, imgSize, imgSize);
    }

    fill(STYLE.text);
    noStroke();
    textSize(min(width * 0.018, 16));
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(card.name, card.x + imgSize + 20, card.y + card.h / 2);

    fill(card.matched ? STYLE.lineOk : STYLE.accent);
    stroke(255);
    ellipse(card.x + card.w, card.y + card.h / 2, 18, 18);
  });

  // 4. 右側特徵卡[cite: 1]
  rightCards.forEach(card => {
    stroke(card.matched ? STYLE.lineOk : STYLE.cardBorder);
    strokeWeight(2);
    fill(STYLE.cardBg);
    rect(card.x, card.y, card.w, card.h, 10);

    fill(STYLE.text);
    noStroke();
    textSize(min(width * 0.014, 13));
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);
    text(card.text, card.x + 15, card.y + 6, card.w - 30, card.h - 12);

    fill(card.matched ? STYLE.lineOk : STYLE.accent);
    stroke(255);
    ellipse(card.x, card.y + card.h / 2, 18, 18);
  });

  if (connections.length === PAIRS.length) {
    endTime = millis();
    setTimeout(() => { gameState = "WIN"; }, 600);
  }
}

// F5: 成績頁[cite: 1]
function drawWinScreen() {
  let boxW = min(width * 0.8, 680);
  let boxH = min(height * 0.85, 540);

  fill(STYLE.cardBg);
  stroke(STYLE.primary);
  strokeWeight(2);
  rect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);

  let totalSec = Math.round((endTime - startTime) / 1000);

  noStroke();
  fill(STYLE.primary);
  textAlign(CENTER, TOP);
  textSize(min(width * 0.025, 24));
  textStyle(BOLD);
  text("🎉 恭喜通關！成為鳥類生態小偵探", width / 2, (height - boxH) / 2 + 25);

  textSize(min(width * 0.016, 16));
  fill(STYLE.text);
  text(`總花費時間：${totalSec} 秒 | 配對準確率：100%`, width / 2, (height - boxH) / 2 + 65);

  PAIRS.forEach((item, idx) => {
    let my = (height - boxH) / 2 + 105 + idx * (boxH * 0.14);
    fill(STYLE.bg);
    rect((width - boxW) / 2 + 30, my, boxW - 60, boxH * 0.12, 8);

    let imgSize = boxH * 0.09;
    if (birdImages[item.id]) {
      image(birdImages[item.id], (width - boxW) / 2 + 40, my + (boxH * 0.12 - imgSize) / 2, imgSize, imgSize);
    }
    
    fill(STYLE.primary);
    textAlign(LEFT, TOP);
    textSize(min(width * 0.016, 15));
    textStyle(BOLD);
    text(`• ${item.name}`, (width - boxW) / 2 + 45 + imgSize, my + 8);

    fill(STYLE.text);
    textSize(min(width * 0.013, 12));
    textStyle(NORMAL);
    text(item.feature, (width - boxW) / 2 + 45 + imgSize, my + 28, boxW - 120 - imgSize, boxH * 0.06);
  });

  drawButton(width / 2 - 90, (height - boxH) / 2 + boxH - 65, 180, 45, "再挑戰一次", STYLE.primary, () => {
    initGame();
    gameState = "PLAY";
    startTime = millis();
  });
}

function mousePressed() {
  if (gameState === "PLAY") {
    leftCards.forEach(card => {
      if (!card.matched) {
        if (mouseX >= card.x && mouseX <= card.x + card.w &&
            mouseY >= card.y && mouseY <= card.y + card.h) {
          draggingCard = card;
        }
      }
    });
  }
}

function mouseReleased() {
  if (gameState === "PLAY" && draggingCard) {
    rightCards.forEach(rCard => {
      if (!rCard.matched) {
        if (mouseX >= rCard.x - 15 && mouseX <= rCard.x + rCard.w + 15 &&
            mouseY >= rCard.y - 15 && mouseY <= rCard.y + rCard.h + 15) {
          
          if (draggingCard.id === rCard.id) {
            draggingCard.matched = true;
            rCard.matched = true;
            connections.push({ leftId: draggingCard.id, rightId: rCard.id });
            playFeedbackSound(true);
          } else {
            playFeedbackSound(false);
          }
        }
      }
    });

    draggingCard = null;
  }
}

function drawButton(x, y, w, h, label, bgCol, onClick) {
  let isHover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  fill(isHover ? "#1B5E20" : bgCol);
  stroke("#FFFFFF");
  strokeWeight(1);
  rect(x, y, w, h, 10);

  fill("#FFFFFF");
  noStroke();
  textSize(min(width * 0.018, 16));
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2);

  if (isHover && mouseIsPressed) {
    onClick();
  }
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playFeedbackSound(isCorrect) {
  initAudio();
  if (!audioCtx) return;

  let now = audioCtx.currentTime;
  let osc = audioCtx.createOscillator();
  let gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (isCorrect) {
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}