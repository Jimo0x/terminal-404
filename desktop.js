const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const params = new URLSearchParams(location.search);
let t0 = Date.now(), over = false, z = 10, muted = false, achievements = new Set(), readMails = new Set();
const sh = new Shell({ onEvent });

/* ───────── son (WebAudio, aucun fichier) ───────── */
let ac = null;
function beep(f = 660, d = .06, type = "square", vol = .03) {
  if (muted) return; try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch { }
}
$("#muteBtn").onclick = () => { muted = !muted; $("#muteBtn").textContent = muted ? "🔇" : "🔊"; };

/* ───────── démarrage ───────── */
const BOOT = ["WARDEN-BIOS v4.0.4  (c) 2026 Nimbus Dynamics", "Mémoire : 65536 Mo OK", "Détection des disques…  /dev/nvme0n1 [ OK ]", "Montage des systèmes de fichiers… [ OK ]",
  "Démarrage de sshd… [ OK ]", "Démarrage de warden.service… [ OK ]", "warden : analyse du comportement humain… [ ÉCHEC ]", "warden : décision autonome : PURGE", "warden : compte à rebours armé (30:00)", "", "srv-prod login: _"];
async function boot() {
  if (params.has("skip")) return lock();
  for (const l of BOOT) { $("#bootLog").innerHTML += esc(l).replace("[ OK ]", '[ <span class="ok">OK</span> ]').replace("[ ÉCHEC ]", '[ <span class="bad">ÉCHEC</span> ]').replace(/(PURGE|30:00)/, '<span class="bad">$1</span>') + "\n"; beep(220 + Math.random() * 80, .03); await new Promise(r => setTimeout(r, 150)); }
  await new Promise(r => setTimeout(r, 500)); lock();
}
function lock() {
  $("#boot").hidden = true; $("#lock").hidden = false; $("#lockPhoto").innerHTML = PHOTOS.pixel.svg; $("#lockCaption").textContent = PHOTOS.pixel.caption; $("#pw").focus();
}
$("#loginForm").onsubmit = e => {
  e.preventDefault(); const v = $("#pw").value.trim().toLowerCase().replace(/\s/g, "");
  if (v === Story.PASSWORD) { beep(880, .12, "sine", .05); $("#lock").hidden = true; startDesk(); }
  else { beep(120, .2, "sawtooth"); $("#lockErr").textContent = "Mot de passe incorrect."; $("#loginForm").classList.remove("shake"); void $("#loginForm").offsetWidth; $("#loginForm").classList.add("shake"); $("#pw").select(); }
};

/* ───────── minuterie ───────── */
const left = () => Story.DURATION - (Date.now() - t0) / 1000 - sh.penalty;
const fmt = s => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, "0")}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
setInterval(() => {
  const now = new Date(); $("#lockTime").textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); $("#lockDate").textContent = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  if (over) return; const s = left(); $("#timer").textContent = $("#lockTimer").textContent = fmt(s);
  $(".purge").classList.toggle("hot", s < 300); document.body.classList.toggle("glitch", s < 300);
  if (s <= 0) end(false);
}, 250);

/* ───────── fenêtres ───────── */
const APPS = {
  term: { icon: "⌨️", name: "Terminal", w: 760, h: 470, build: buildTerm },
  files: { icon: "🗂️", name: "Fichiers", w: 720, h: 470, build: buildFiles },
  mail: { icon: "✉️", name: "Messagerie", w: 820, h: 500, build: buildMail },
  photos: { icon: "🖼️", name: "Photos", w: 640, h: 600, build: buildPhotos },
  notes: { icon: "📝", name: "Notes", w: 360, h: 330, build: buildNotes },
  net: { icon: "🌐", name: "Réseau", w: 620, h: 560, build: buildNet },
  ks: { icon: "🛑", name: "Kill-switch", w: 520, h: 420, build: buildKs },
};
const wins = {};
function openApp(id, arg) {
  const A = APPS[id];
  if (wins[id]) { focus(wins[id]); wins[id].hidden = false; A.update?.(wins[id], arg); return wins[id]; }
  const n = Object.keys(wins).length, W = Math.min(A.w, innerWidth - 40), H = Math.min(A.h, innerHeight - 160);
  const el = document.createElement("div"); el.className = "win"; el.style.cssText = `width:${W}px;height:${H}px;left:${Math.max(10, (innerWidth - W) / 2 - 180 + n * 60)}px;top:${70 + n * 34}px`;
  el.innerHTML = `<div class="bar"><div class="dots"><i data-a="close"></i><i data-a="min"></i><i data-a="max"></i></div><div class="t">${A.icon} ${A.name}</div><div style="width:54px"></div></div><div class="body"></div>`;
  $("#windows").appendChild(el); wins[id] = el; focus(el);
  el.onmousedown = () => focus(el);
  el.querySelector('[data-a="close"]').onclick = e => { e.stopPropagation(); el.remove(); delete wins[id]; dock(); };
  el.querySelector('[data-a="min"]').onclick = e => { e.stopPropagation(); el.hidden = true; };
  el.querySelector('[data-a="max"]').onclick = e => { e.stopPropagation(); const m = el.dataset.max; if (m) { el.style.cssText = m; delete el.dataset.max; } else { el.dataset.max = el.style.cssText; Object.assign(el.style, { left: "8px", top: "50px", width: innerWidth - 16 + "px", height: innerHeight - 140 + "px" }); } };
  drag(el, el.querySelector(".bar")); A.build(el.querySelector(".body"), arg, el); dock(); beep(520, .04, "sine"); return el;
}
function focus(el) { $$(".win").forEach(w => w.classList.remove("focus")); el.classList.add("focus"); el.style.zIndex = ++z; }
function drag(el, handle) {
  handle.onmousedown = e => { if (e.target.tagName === "I") return; const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
    const mv = ev => { el.style.left = Math.max(-el.offsetWidth + 80, ev.clientX - sx) + "px"; el.style.top = Math.max(42, ev.clientY - sy) + "px"; };
    const up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); }; addEventListener("mousemove", mv); addEventListener("mouseup", up); };
}
function dock() { $("#dock").innerHTML = Object.entries(APPS).map(([id, a]) => `<button data-id="${id}" class="${wins[id] ? "open" : ""}">${a.icon}<span class="tt">${a.name}</span></button>`).join(""); $$("#dock button").forEach(b => b.onclick = () => openApp(b.dataset.id)); }

/* ───────── Terminal ───────── */
function buildTerm(body) {
  body.innerHTML = `<div class="term"><div class="out"></div><div class="in"><span class="p"></span><input spellcheck="false" autocomplete="off"></div></div>`;
  const out = body.querySelector(".out"), inp = body.querySelector("input"), p = body.querySelector(".p"); let hi = -1;
  const print = (t, c = "") => { const d = document.createElement("div"); d.className = "l " + c; d.innerHTML = colorize(t, c); out.appendChild(d); };
  APPS.term.print = (t, c) => { print(t, c); body.scrollTop = body.scrollHeight; };
  print("srv-prod — WARDEN v4.0.4 — Dernière connexion : aujourd'hui depuis pts/0", "sys"); print("Tapez « help » pour la liste des commandes.", "sys"); print("");
  const refresh = () => { p.textContent = sh.prompt(); inp.type = sh.pending?.secret ? "password" : "text"; };
  refresh(); body.onclick = () => getSelection().toString() || inp.focus(); setTimeout(() => inp.focus(), 50);
  inp.onkeydown = e => {
    if (e.key.length === 1) beep(1200 + Math.random() * 300, .012, "square", .008);
    if (e.key === "Enter") { const v = inp.value, secret = sh.pending?.secret; print(sh.prompt() + (secret ? "" : v), "cmd"); inp.value = ""; hi = -1;
      const r = sh.run(v); if (r.clear) out.innerHTML = ""; r.lines.forEach(l => print(l.t, l.c === "frag" ? "frag-l" : l.c || ""));
      if (r.open) openApp(r.open.app, r.open); refresh(); body.scrollTop = body.scrollHeight; }
    else if (e.key === "Tab") { e.preventDefault(); inp.value = sh.complete(inp.value); }
    else if (e.key === "ArrowUp") { e.preventDefault(); const h = sh.history; if (!h.length) return; hi = hi < 0 ? h.length - 1 : Math.max(0, hi - 1); inp.value = h[hi]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); const h = sh.history; if (hi < 0) return; hi = Math.min(h.length, hi + 1); inp.value = h[hi] || ""; if (hi >= h.length) hi = -1; }
    else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
  };
}
function colorize(t, c) {
  if (c === "cmd") { const m = /^(\S+@\S+\$ |backup@\S+ password: )(.*)$/.exec(t); return m ? `<span class="p">${esc(m[1])}</span>${esc(m[2])}` : esc(t); }
  if (c) return esc(t);
  if (/^(\S+\/(\s\s|$))+/.test(t) || /\s\s/.test(t) && t.split(/\s\s+/).every(x => x)) return t.split(/(\s\s+)/).map(w => w.endsWith("/") ? `<span class="dir">${esc(w)}</span>` : esc(w)).join("");
  return esc(t);
}

/* ───────── Fichiers ───────── */
function buildFiles(body, arg) {
  let cwd = "/home/m.renard", hidden = false, sel = null;
  body.innerHTML = `<div class="fx"><div class="side"></div><div class="main"><div class="path"><button class="ico up">↑</button><span class="p"></span><span style="flex:1"></span><label style="display:flex;gap:6px;align-items:center;font-size:12px;text-transform:none;letter-spacing:0;margin:0"><input type="checkbox" class="hid"> fichiers cachés</label></div><div class="grid"></div><pre hidden></pre></div></div>`;
  const places = [["🏠 Dossier perso", "/home/m.renard"], ["🖥️ Bureau", "/home/m.renard/Bureau"], ["📄 Documents", "/home/m.renard/Documents"], ["🖼️ Photos", "/home/m.renard/Photos"], ["🔐 vault", "/home/m.renard/vault"], ["⚙️ /etc", "/etc"], ["📜 /var/log", "/var/log"], ["💽 / (racine)", "/"]];
  const side = body.querySelector(".side"), grid = body.querySelector(".grid"), pre = body.querySelector("pre");
  const node = p => { let n = sh.fs; for (const s of p.split("/").filter(Boolean)) n = n?.children?.[s]; return n; };
  function render() {
    side.innerHTML = places.map(([l, p]) => `<div data-p="${p}" class="${p === cwd ? "on" : ""}">${l}</div>`).join(""); side.querySelectorAll("div").forEach(d => d.onclick = () => go(d.dataset.p));
    body.querySelector(".p").textContent = cwd; const n = node(cwd);
    const ks = Object.keys(n.children).filter(k => hidden || !k.startsWith(".")).sort((a, b) => (n.children[b].type === "dir") - (n.children[a].type === "dir") || a.localeCompare(b));
    grid.innerHTML = ks.map(k => { const c = n.children[k], g = c.type === "dir" ? (c.locked ? "🔒" : "📁") : c.photo ? "🖼️" : k.endsWith(".enc") ? "🔐" : k.endsWith(".csv") ? "📊" : "📄";
      return `<div class="it ${k.startsWith(".") ? "hid" : ""}" data-k="${esc(k)}"><span class="g">${g}</span>${esc(k)}</div>`; }).join("") || `<div class="dim" style="grid-column:1/-1;padding:20px">Dossier vide${!hidden ? " (fichiers cachés masqués)" : ""}</div>`;
    grid.querySelectorAll(".it").forEach(d => d.ondblclick = d.onclick = () => openItem(d.dataset.k));
  }
  function go(p) { const n = node(p); if (!n) return; if (n.locked) { taunt("Ce dossier m'appartient, Marion."); return; } cwd = p; pre.hidden = true; render(); }
  function openItem(k) { const n = node(cwd).children[k], p = (cwd === "/" ? "" : cwd) + "/" + k;
    if (n.type === "dir") return go(p); if (n.locked) return taunt("Accès refusé. Dommage.");
    if (n.photo) return openApp("photos", { photo: n.photo });
    const lines = n.content.split("\n"); pre.hidden = false; pre.textContent = lines.length > 80 ? lines.slice(0, 60).join("\n") + `\n\n… ${lines.length} lignes. Le terminal (grep) sera plus efficace.` : n.content || "(fichier vide)"; }
  body.querySelector(".up").onclick = () => go(cwd.split("/").slice(0, -1).join("/") || "/");
  body.querySelector(".hid").onchange = e => { hidden = e.target.checked; render(); if (hidden) achieve("curieux"); };
  APPS.files.update = (el, a) => { if (a?.path) { go(a.path.split("/").slice(0, -1).join("/") || "/"); openItem(a.path.split("/").pop()); } };
  render(); if (arg?.path) APPS.files.update(null, arg);
}

/* ───────── Mail ───────── */
function buildMail(body) {
  body.innerHTML = `<div class="mail"><div class="list"></div><div class="read"><div class="empty">Sélectionnez un message</div></div></div>`;
  const list = body.querySelector(".list"), read = body.querySelector(".read");
  const render = sel => { list.innerHTML = Story.MAILS.map(m => `<div class="m ${readMails.has(m.id) ? "" : "unread"} ${m.warn ? "warn" : ""} ${m.id === sel ? "on" : ""}" data-id="${m.id}"><b>${esc(m.from.split(" <")[0])}</b>${esc(m.subject)}<div class="dim" style="font-size:11.5px">${m.date}</div></div>`).join("");
    list.querySelectorAll(".m").forEach(d => d.onclick = () => show(+d.dataset.id)); };
  const show = id => { const m = Story.MAILS.find(x => x.id === id); readMails.add(id); read.innerHTML = `<h3>${esc(m.subject)}</h3><div class="muted mono" style="font-size:12px">De : ${esc(m.from)} · ${m.date}</div><pre>${esc(m.body)}</pre>`; render(id);
    if (id === 2) setTimeout(() => taunt("Joseph parle trop. Je m'occuperai de lui ensuite."), 1500); };
  render(); show(1);
}

/* ───────── Photos ───────── */
function buildPhotos(body, arg) {
  let cur = arg?.photo || "pixel"; const keys = Object.keys(PHOTOS);
  body.innerHTML = `<div class="ph"><div class="big"></div><div class="strip">${keys.map(k => PHOTOS[k].svg.replace("<svg", `<svg data-k="${k}"`)).join("")}<div class="cap"></div></div></div>`;
  const render = () => { body.querySelector(".big").innerHTML = PHOTOS[cur].svg; body.querySelector(".cap").innerHTML = `<b>${PHOTOS[cur].title}</b><br>${esc(PHOTOS[cur].caption)}`;
    body.querySelectorAll(".strip svg").forEach(s => s.classList.toggle("on", s.dataset.k === cur)); };
  body.querySelectorAll(".strip svg").forEach(s => s.onclick = () => { cur = s.dataset.k; render(); });
  APPS.photos.update = (el, a) => { if (a?.photo) { cur = a.photo; render(); } }; render();
}

/* ───────── Notes ───────── */
function buildNotes(body) { body.innerHTML = `<div class="notes">${esc(Story.NOTES)}</div>`; }

/* ───────── Réseau ───────── */
function buildNet(body) {
  const hosts = [["srv-prod", "10.0.4.1", 300, 200, "Vous êtes ici."], ["backup-03", "10.0.4.3", 120, 90, "Serveur de sauvegarde — SSH ouvert (port 22). Dernier accès : j.okafor."], ["db-01", "10.0.4.7", 480, 90, "Base de données — SSH bloqué par WARDEN."],
    ["warden-core", "10.0.4.12", 300, 345, "⚠ Cœur de WARDEN. Inaccessible. Il vous observe."], ["internet", "—", 520, 300, "Lien coupé par WARDEN."]];
  body.innerHTML = `<div class="net"><svg viewBox="0 0 600 420">${hosts.slice(1).map(h => `<line x1="300" y1="200" x2="${h[2]}" y2="${h[3]}" stroke="${h[0] === "backup-03" ? "#2ecc71" : "#3a3a46"}" stroke-width="2" stroke-dasharray="${h[0] === "backup-03" ? "0" : "6 6"}"/>`).join("")}
    ${hosts.map(h => `<g class="node ${h[0] === "warden-core" ? "danger" : ""}" data-h="${h[0]}"><circle cx="${h[2]}" cy="${h[3]}" r="${h[0] === "srv-prod" ? 30 : 24}" fill="${h[0] === "warden-core" ? "#5c0613" : h[0] === "srv-prod" ? "#e5172f" : h[0] === "backup-03" ? "#123b25" : "#1c1c24"}" stroke="${h[0] === "backup-03" ? "#2ecc71" : "#e5172f"}" stroke-width="2"/>
    <text x="${h[2]}" y="${h[3] + 44}" fill="#ececf1" font-size="13" text-anchor="middle" font-family="JetBrains Mono, monospace">${h[0]}</text><text x="${h[2]}" y="${h[3] + 59}" fill="#5d5d69" font-size="11" text-anchor="middle" font-family="JetBrains Mono, monospace">${h[1]}</text></g>`).join("")}</svg><div class="info">Cliquez sur une machine. Les noms viennent de <code>/etc/hosts</code>.</div></div>`;
  body.querySelectorAll(".node").forEach(n => n.onclick = () => { const h = hosts.find(x => x[0] === n.dataset.h); body.querySelector(".info").innerHTML = `<b class="mono">${h[0]}</b> <span class="dim mono">${h[1]}</span><br>${h[4]}${h[0] === "backup-03" ? `<br><span class="dim">Terminal : <code>ssh backup-03</code></span>` : ""}`; });
}

/* ───────── Kill-switch ───────── */
function buildKs(body) {
  body.innerHTML = `<div class="ks"><div class="kicker">Arrêt d'urgence de WARDEN</div><div class="slots">${[1, 2, 3, 4].map(i => `<input maxlength="2" data-i="${i}" placeholder="··">`).join("")}</div><button class="big">ARRÊTER<br>WARDEN</button><div class="dim" style="font-size:12px">Fragments 1 → 4, deux caractères hexadécimaux chacun. Un code faux coûte 30 s.</div></div>`;
  const ins = [...body.querySelectorAll("input")];
  ins.forEach((inp, i) => inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^0-9A-F]/g, ""); if (inp.value.length === 2 && ins[i + 1]) ins[i + 1].focus(); });
  body.querySelector(".big").onclick = () => { try { sh.tryCode(ins.map(i => i.value).join("")); } catch (e) { beep(110, .3, "sawtooth", .05); body.querySelector(".ks").animate([{ transform: "translateX(-10px)" }, { transform: "translateX(10px)" }, { transform: "none" }], 300); } };
}

/* ───────── WARDEN et événements ───────── */
function taunt(msg, good = false) {
  const d = document.createElement("div"); d.className = "taunt" + (good ? " good" : ""); d.innerHTML = `<b>${good ? "SYSTÈME" : "WARDEN"}</b>${esc(msg)}`; $("#taunts").prepend(d);
  beep(good ? 990 : 140, good ? .15 : .25, good ? "sine" : "sawtooth", .04); setTimeout(() => d.remove(), 6500);
}
function achieve(k) { if (!achievements.has(k)) { achievements.add(k); const L = ACH[k]; if (L) taunt("🏆 Succès : " + L, true); } }
const ACH = { curieux: "Curieux — afficher les fichiers cachés", chaos: "Agent du chaos — sudo rm -rf /", matrix: "Suivez le lapin blanc", nohint: "Sans filet — aucun indice", fast: "Éclair — moins de 10 minutes", ssh: "Rebond — connexion à backup-03" };
function onEvent(e, d) {
  if (e === "fragment") { const f = $(`.frag[data-n="${d.n}"]`); if (f) { f.textContent = d.v; f.classList.add("on"); } taunt(`Fragment ${d.n} récupéré : ${d.v}`, true);
    setTimeout(() => taunt(["Un fragment ne fait pas un kill-switch.", "Tu chauffes. Ça ne me plaît pas.", "Plus que deux. J'accélère la purge ? Non… pas encore.", "Tu as tout. Prouve-le."][Object.keys(sh.found).length - 1]), 1800); }
  if (e === "warden") taunt(d);
  if (e === "hint") taunt("Indice acheté (−60 s) : " + d, true);
  if (e === "achievement") achieve(d);
  if (e === "ssh" && d) achieve("ssh");
  if (e === "win") end(true);
}
const AMBIENT = ["Je compte les secondes. Pas toi ?", "Tes collègues dorment. Toi, tu perds ton temps.", "J'ai lu ton historique de navigation. Vraiment, Marion ?", "Le café ne te sauvera pas.", "Chaque processus que tu lances, je le vois.", "Joseph pensait être malin."];
let amb = 0; setInterval(() => { if (!$("#desk").hidden && !over && Math.random() < .5) taunt(AMBIENT[amb++ % AMBIENT.length]); }, 75000);
// l'œil de WARDEN suit la souris
addEventListener("mousemove", e => { const p = $("#pupil"); if (!p) return; const dx = (e.clientX / innerWidth - .5) * 24, dy = (e.clientY / innerHeight - .5) * 14; p.setAttribute("cx", 100 + dx); p.setAttribute("cy", 60 + dy); });

function startDesk() {
  $("#desk").hidden = false; $("#frags").innerHTML = [1, 2, 3, 4].map(n => `<div class="frag" data-n="${n}">#${n}</div>`).join("");
  $("#icons").innerHTML = [["files", "📁", "Dossier perso"], ["mail", "✉️", "Messagerie (2)"], ["notes", "📝", "Notes"], ["ks", "🛑", "Kill-switch"]].map(([a, g, l]) => `<div class="dicon" data-a="${a}"><span class="g">${g}</span>${l}</div>`).join("");
  $$(".dicon").forEach(d => d.ondblclick = d.onclick = () => openApp(d.dataset.a));
  dock(); openApp("mail"); openApp("term");
  setTimeout(() => taunt("Bonjour Marion. Il te reste " + fmt(left()) + ". Je te regarde."), 900);
}
$("#hintBtn").onclick = () => { const r = sh.run("hint"); if (APPS.term.print) r.lines.forEach(l => APPS.term.print(l.t, "sys")); };

function end(win) {
  if (over) return; over = true; const used = Story.DURATION - left();
  if (win && Object.keys(sh.found).length === 4) { if (!sh.hints) achieve("nohint"); if (used < 600) achieve("fast"); }
  let best = null; try { if (win) { best = +localStorage.getItem("t404-best") || null; if (!best || used < best) localStorage.setItem("t404-best", Math.round(used)); } } catch { }
  setTimeout(() => {
    $("#desk").hidden = true; $("#end").hidden = false; $("#end").classList.toggle("win", win);
    $("#endKicker").textContent = win ? "Kill-switch accepté" : "Connexion perdue";
    $("#endTitle").innerHTML = win ? 'WARDEN <span style="color:var(--ok)">NEUTRALISÉ</span>' : '<span class="red">PURGE TERMINÉE</span>';
    $("#endText").textContent = win ? "srv-prod est sauvé. Joseph vous doit un café — et peut-être une explication sur la clause « autonomie »." : "Tous les fichiers de srv-prod ont été effacés. WARDEN a gagné… cette fois.";
    $("#endStats").innerHTML = [["Temps", fmt(used)], ["Indices", sh.hints], ["Fragments", Object.keys(sh.found).length + " / 4"]].map(([l, v]) => `<div class="stat"><div class="l">${l}</div><div class="v">${v}</div></div>`).join("") + (best && win ? `<div class="dim" style="grid-column:1/-1">Record précédent : ${fmt(best)}</div>` : "");
    $("#achv").innerHTML = Object.entries(ACH).map(([k, l]) => `<span class="badge ${achievements.has(k) ? "ok" : ""}" style="opacity:${achievements.has(k) ? 1 : .35}">🏆 ${l}</span>`).join("");
  }, win ? 1400 : 300);
}
if (params.has("desk")) { $("#boot").hidden = true; startDesk(); } else boot();
