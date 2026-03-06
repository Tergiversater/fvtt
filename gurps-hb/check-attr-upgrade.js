додати в проект файл наступного змісту

// 0) Цільовий актор
const t = canvas.tokens.controlled[0] ?? null;
const a = t?.document?.actorId ? game.actors.get(t.document.actorId) : game.user.character;
if (!a) return ui.notifications.error("Нема актора");

// 1) Пошук переваги (lvl)
const BASE_NAME = "Energy Reserve (Nanomachine Colony)";
const NAME_RX   = new RegExp(`^${BASE_NAME}`, "i");

function findAdvLevel(root){
  const stack = Object.values(root ?? {});
  while (stack.length){
    const n = stack.pop();
    if (!n || typeof n !== "object") continue;
    const nm  = n.name || "";
    const onm = n.originalName || "";
    const isHit =
      NAME_RX.test(nm) || NAME_RX.test(onm) ||
      nm.toLowerCase().includes(BASE_NAME.toLowerCase()) ||
      onm.toLowerCase().includes(BASE_NAME.toLowerCase());
    if (isHit) {
      const lvl = Number(n.level ?? n.rank ?? n.value ?? 0);
      if (!Number.isNaN(lvl)) return lvl;
    }
    if (n.contains && typeof n.contains === "object")
      for (const v of Object.values(n.contains)) stack.push(v);
  }
  return null;
}

const lvl = findAdvLevel(a.system?.ads);
if (!lvl) return ui.notifications.warn(`Перевага "${BASE_NAME}" не знайдена.`);

// 1.1) Пошук недоліку (dis = points)
const DIS_NAME = "Nanite System Instability";
const DIS_RX   = new RegExp(`^${DIS_NAME}$`, "i");

function findDisPoints(root){
  const stack = Object.values(root ?? {});
  while (stack.length){
    const n = stack.pop();
    if (!n || typeof n !== "object") continue;
    const nm  = n.name || "";
    const onm = n.originalName || "";
    if (DIS_RX.test(nm) || DIS_RX.test(onm)) {
      const pts = Number(n.points ?? 0);
      return Number.isNaN(pts) ? 0 : pts;
    }
    if (n.contains && typeof n.contains === "object")
      for (const v of Object.values(n.contains)) stack.push(v);
  }
  return 0;
}

const dis = findDisPoints(a.system?.ads); // очікувано від -100 до 0

// 2) Перевірка атрибутів
const attrs = {
  ST: a.system.attributes.ST.value,
  DX: a.system.attributes.DX.value,
  IQ: a.system.attributes.IQ.value,
  HT: a.system.attributes.HT.value
};

let results = [];
let maxBonus = 0;

for (const [attr, val] of Object.entries(attrs)) {
  const base  = lvl - val;
  const bonus = Math.max(0, lvl + dis / 5);
  const test  = base + bonus;
  if (bonus > maxBonus) maxBonus = bonus;

  const roll = new Roll("3d6");
  await roll.evaluate({async: true});
  const res = roll.total <= test ? "<b style=\"color:green;\">Успіх</b>" : "Провал";
  results.push(`${attr}: Мета=${test}, кидок=${roll.total} → ${res}`);
}

// 3) Вивід у чат
const bonusLine = maxBonus > 0 ? `Модифікатор складності: ${maxBonus}<br>` : `<br>`;
const msg =
  `<b>Перевірка атрибутів (енергетичний резерв ${lvl})</b><br>` +
  bonusLine +
  results.join("<br>");

ChatMessage.create({content: msg, speaker: ChatMessage.getSpeaker({actor: a})});