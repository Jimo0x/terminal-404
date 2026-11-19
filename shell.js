/* Terminal 404 — interpréteur de commandes (pur JS, testable sous Node). */
(function (root) {
  const Story = root.Story || (typeof require !== "undefined" ? require("./story.js") : null);
  class ShellError extends Error {}
  const err = m => { throw new ShellError(m); };

  const MAN = {
    help: "help — liste des commandes", ls: "ls [-a] [-l] [chemin] — liste un dossier (-a : fichiers cachés)", cd: "cd <dossier> — change de dossier (~ = dossier personnel, .. = parent)",
    pwd: "pwd — dossier courant", cat: "cat <fichier> — affiche un fichier", head: "head [-n N] <fichier> — premières lignes", tail: "tail [-n N] <fichier> — dernières lignes",
    grep: "grep [-i] [-n] [-r] <motif> <fichier|dossier> — cherche un motif (aussi après un « | »)", find: "find [dossier] -name <motif> — cherche des fichiers (* autorisé)",
    base64: "base64 [-d] <fichier|texte> — encode / décode (-d) en base64", caesar: "caesar -d|-e <clé> <fichier> — chiffre de César",
    wc: "wc [-l] <fichier> — compte lignes / mots", ssh: "ssh <hôte> — connexion à une machine distante", exit: "exit — ferme la session ssh", ping: "ping <hôte>",
    ps: "ps — processus", kill: "kill <pid>", open: "open <fichier> — ouvre dans l'application graphique", hint: "hint — un indice (coûte 60 s)",
    killswitch: "killswitch <code> — arrête WARDEN", history: "history", clear: "clear", whoami: "whoami", date: "date", echo: "echo <texte>", tree: "tree [dossier]",
    file: "file <fichier> — type de fichier", man: "man <commande>", uname: "uname -a",
  };

  class Shell {
    constructor(opts = {}) {
      this.fs = Story.makeFS(); this.remote = Story.makeRemote();
      this.host = "srv-prod"; this.user = "m.renard"; this.cwd = "/home/m.renard";
      this.history = []; this.found = {}; this.hints = 0; this.penalty = 0; this.pending = null; this.won = false; this.events = [];
      this.emit = opts.onEvent || (() => {}); this.now = opts.now || (() => Date.now());
    }
    get root() { return this.host === "srv-prod" ? this.fs : this.remote; }
    get home() { return this.host === "srv-prod" ? "/home/m.renard" : "/home/backup"; }
    prompt() { if (this.pending) return this.pending.prompt; const p = this.cwd.startsWith(this.home) ? "~" + this.cwd.slice(this.home.length) : this.cwd; return `${this.host === "srv-prod" ? this.user : "backup"}@${this.host}:${p || "/"}$ `; }

    /* ── système de fichiers ── */
    resolve(p) {
      if (!p || p === "~") return this.home;
      if (p.startsWith("~/")) p = this.home + p.slice(1);
      const parts = (p.startsWith("/") ? [] : this.cwd.split("/").filter(Boolean));
      for (const seg of p.split("/")) { if (!seg || seg === ".") continue; if (seg === "..") parts.pop(); else parts.push(seg); }
      return "/" + parts.join("/");
    }
    node(path) { let n = this.root; for (const seg of path.split("/").filter(Boolean)) { if (n.type !== "dir" || !n.children[seg]) return null; n = n.children[seg]; } return n; }
    get(p, want) {
      const abs = this.resolve(p), n = this.node(abs);
      if (!n) err(`${p} : aucun fichier ou dossier de ce nom`);
      if (n.locked) err(`${p} : permission refusée (verrouillé par WARDEN)`);
      if (want === "file" && n.type === "dir") err(`${p} : est un dossier`);
      if (want === "dir" && n.type !== "dir") err(`${p} : n'est pas un dossier`);
      return { abs, n };
    }
    read(p) { return this.get(p, "file").n.content; }

    /* ── exécution ── */
    run(line) {
      const out = { lines: [], clear: false, open: null };
      if (this.pending) { const p = this.pending; this.pending = null; out.lines.push(...p.resolve(line).split("\n").filter((l, i, a) => l || i < a.length - 1).map(t => ({ t }))); this.scan(out); return out; }
      line = line.trim(); if (!line) return out; this.history.push(line);
      try {
        let stdin = null;
        const segs = splitPipes(line);
        for (const [idx, seg] of segs.entries()) {
          out.pipe = idx < segs.length - 1;
          const [cmd, ...args] = tokenize(seg);
          const fn = this["cmd_" + cmd];
          if (!fn) err(`${cmd} : commande introuvable. Tapez « help ».`);
          const r = fn.call(this, args, stdin, out);
          stdin = r == null ? "" : String(r);
        }
        if (stdin) out.lines.push(...stdin.split("\n").map(t => ({ t })));
      } catch (e) { if (!(e instanceof ShellError)) throw e; out.lines.push({ t: e.message, c: "err" }); }
      this.scan(out); return out;
    }
    scan(out) {
      for (const l of out.lines) {
        const m = /FRAGMENT[- ]?(1|2|TROIS|4)\s*[=:]\s*([0-9A-F]{2})\b/.exec(l.t || "");
        if (m) { const k = { 1: 1, 2: 2, TROIS: 3, 4: 4 }[m[1]]; l.c = "frag"; if (!this.found[k]) { this.found[k] = m[2]; this.emit("fragment", { n: k, v: m[2] }); } }
      }
    }
    complete(line) {
      const toks = line.split(/\s+/), last = toks[toks.length - 1];
      if (toks.length === 1) { const c = Object.keys(MAN).filter(k => k.startsWith(last)); return c.length === 1 ? c[0] + " " : common(c) || line; }
      const i = last.lastIndexOf("/"), dir = i >= 0 ? last.slice(0, i + 1) : "", base = i >= 0 ? last.slice(i + 1) : last;
      const n = this.node(this.resolve(dir || ".")); if (!n || n.type !== "dir" || n.locked) return line;
      const c = Object.keys(n.children).filter(k => k.startsWith(base) && (base.startsWith(".") || !k.startsWith(".")));
      if (!c.length) return line;
      const pick = c.length === 1 ? c[0] + (n.children[c[0]].type === "dir" ? "/" : " ") : common(c);
      return toks.slice(0, -1).concat(dir + pick).join(" ");
    }

    /* ── commandes ── */
    cmd_help() { return "Commandes disponibles :\n" + Object.entries(MAN).map(([k, v]) => "  " + k.padEnd(11) + v.split(" — ")[1]).join("\n") + "\n\nAstuces : Tab pour compléter, ↑/↓ pour l'historique, « cmd | grep motif » fonctionne."; }
    cmd_man(a) { return MAN[a[0]] || err(`Pas d'entrée de manuel pour ${a[0] || "?"}`); }
    cmd_pwd() { return this.cwd; }
    cmd_whoami() { return this.host === "srv-prod" ? this.user : "backup"; }
    cmd_hostname() { return this.host; }
    cmd_uname() { return "Linux " + this.host + " 4.0.4-warden #1 SMP x86_64 GNU/Linux"; }
    cmd_date() { return new Date(this.now()).toLocaleString("fr-FR"); }
    cmd_echo(a) { return a.join(" "); }
    cmd_clear(a, s, out) { out.clear = true; return null; }
    cmd_history() { return this.history.map((h, i) => String(i + 1).padStart(4) + "  " + h).join("\n"); }
    cmd_cd(a) { const { abs } = this.get(a[0] || "~", "dir"); this.cwd = abs; return null; }
    cmd_ls(a) {
      const flags = a.filter(x => x.startsWith("-")).join(""), all = flags.includes("a"), long = flags.includes("l"), path = a.find(x => !x.startsWith("-")) || ".";
      const { n } = this.get(path);
      if (n.type === "file") return path;
      const names = Object.keys(n.children).filter(k => all || !k.startsWith(".")).sort((x, y) => x.replace(/^\./, "").localeCompare(y.replace(/^\./, "")));
      if (all) names.unshift(".", "..");
      const label = k => { const c = n.children[k]; return k === "." || k === ".." || (c && c.type === "dir") ? k + "/" : k; };
      if (!long) return names.map(label).join("  ") || "";
      return names.map(k => { const c = n.children[k] || { type: "dir" }; return `${c.type === "dir" ? "d" : "-"}${c.locked ? "---------" : "rw-r--r--"}  ${c.locked ? "root    " : "m.renard"}  ${String(c.type === "dir" ? 4096 : (c.content || "").length).padStart(6)}  ${label(k)}`; }).join("\n");
    }
    cmd_tree(a) {
      const { n } = this.get(a[0] || ".", "dir"), lines = [a[0] || "."];
      const walk = (d, pre) => { const ks = Object.keys(d.children).filter(k => !k.startsWith(".")); ks.forEach((k, i) => { const last = i === ks.length - 1, c = d.children[k];
        lines.push(pre + (last ? "└── " : "├── ") + k + (c.type === "dir" ? "/" : "")); if (c.type === "dir" && !c.locked) walk(c, pre + (last ? "    " : "│   ")); }); };
      walk(n, ""); return lines.join("\n");
    }
    cmd_cat(a, stdin, out) {
      if (!a.length) return stdin ?? err("cat : fichier manquant");
      return a.map(p => { const { n } = this.get(p, "file"); if (n.photo) { out.open = { app: "photos", photo: n.photo }; return `[image ${p} — ouverte dans la visionneuse]`; }
        const lines = n.content.split("\n"); if (lines.length > 60 && !out.pipe) return lines.slice(0, 40).join("\n") + `\n… (${lines.length} lignes au total — utilisez grep, head ou tail)`; return n.content; }).join("\n");
    }
    lines(a, stdin, name) {
      let n = 10; const i = a.indexOf("-n"); if (i >= 0) { n = parseInt(a[i + 1], 10) || 10; a = a.filter((_, j) => j !== i && j !== i + 1); }
      else { const m = a.find(x => /^-\d+$/.test(x)); if (m) { n = +m.slice(1); a = a.filter(x => x !== m); } }
      const text = a.length ? this.read(a[0]) : stdin ?? err(`${name} : fichier manquant`);
      return { n, lines: text.split("\n") };
    }
    cmd_head(a, s) { const { n, lines } = this.lines(a, s, "head"); return lines.slice(0, n).join("\n"); }
    cmd_tail(a, s) { const { n, lines } = this.lines(a, s, "tail"); return lines.slice(-n).join("\n"); }
    cmd_wc(a, s) { const t = a.filter(x => !x.startsWith("-")).length ? this.read(a.filter(x => !x.startsWith("-"))[0]) : s ?? err("wc : fichier manquant"); const l = t.split("\n").length;
      return a.includes("-l") ? String(l) : `${l} lignes  ${t.split(/\s+/).filter(Boolean).length} mots  ${t.length} caractères`; }
    cmd_grep(a, stdin) {
      const flags = a.filter(x => /^-[inrv]+$/.test(x)).join(""), rest = a.filter(x => !/^-[inrv]+$/.test(x));
      const pat = rest[0] ?? err("grep : motif manquant"); let re; try { re = new RegExp(pat, flags.includes("i") ? "i" : ""); } catch { err("grep : motif invalide"); }
      const test = l => re.test(l) !== flags.includes("v");
      const grepText = (t, prefix) => t.split("\n").map((l, i) => [l, i]).filter(([l]) => test(l)).map(([l, i]) => prefix + (flags.includes("n") ? (i + 1) + ":" : "") + l);
      if (rest.length < 2) { if (stdin == null) err("grep : fichier manquant"); return grepText(stdin, "").join("\n"); }
      const res = [];
      for (const p of rest.slice(1)) {
        const { abs, n } = this.get(p);
        if (n.type === "dir") { if (!flags.includes("r")) err(`grep : ${p} est un dossier (utilisez -r)`); this.walk(abs, n, (fp, f) => { if (!f.photo) res.push(...grepText(f.content, fp + ":")); }); }
        else res.push(...grepText(n.content, rest.length > 2 ? p + ":" : ""));
      }
      return res.join("\n");
    }
    walk(abs, n, fn) { for (const [k, c] of Object.entries(n.children)) { const p = (abs === "/" ? "" : abs) + "/" + k; if (c.locked) continue; c.type === "dir" ? this.walk(p, c, fn) : fn(p, c); } }
    cmd_find(a) {
      const i = a.indexOf("-name"), start = (i === 0 ? null : a[0]) || ".", pat = i >= 0 ? a[i + 1] : "*";
      const re = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
      const { abs, n } = this.get(start, "dir"), res = [];
      const rec = (p, d) => { for (const [k, c] of Object.entries(d.children)) { const fp = (p === "/" ? "" : p) + "/" + k; if (re.test(k)) res.push(fp); if (c.type === "dir" && !c.locked) rec(fp, c); } };
      rec(abs, n); return res.join("\n") || "(aucun résultat)";
    }
    cmd_file(a) { const { n } = this.get(a[0] || err("file : fichier manquant")); if (n.type === "dir") return a[0] + ": directory"; if (n.photo) return a[0] + ": SVG Scalable Vector Graphics image";
      if (/^[A-Za-z0-9+/]+=*$/.test(n.content.trim())) return a[0] + ": ASCII text (ressemble à du base64)"; return a[0] + ": UTF-8 text"; }
    cmd_base64(a, stdin) {
      const dec = a.includes("-d") || a.includes("--decode"), src = a.filter(x => !x.startsWith("-"))[0];
      let text = stdin; if (src) { try { text = this.read(src); } catch (e) { if (dec) text = src; else text = src; } }
      if (text == null) err("base64 : entrée manquante");
      if (!dec) return b64e(text);
      try { return b64d(text.trim()); } catch { err("base64 : entrée invalide"); }
    }
    cmd_caesar(a, stdin) {
      const mode = a.includes("-e") ? 1 : a.includes("-d") ? -1 : err("caesar : précisez -d (déchiffrer) ou -e (chiffrer)"), rest = a.filter(x => x !== "-d" && x !== "-e");
      const k = parseInt(rest[0], 10); if (isNaN(k)) err("caesar : clé numérique manquante — ex. caesar -d 3 fichier.enc");
      const text = rest[1] ? this.read(rest[1]) : stdin ?? err("caesar : fichier manquant");
      return Story.caesar(text, mode * k);
    }
    cmd_ps() { return "  PID TTY      CMD\n    1 ?        init\n  666 ?        warden --purge --no-mercy\n  667 ?        warden-watchdog\n 1337 pts/0    bash\n 1404 pts/0    ps"; }
    cmd_kill(a) { const pid = a.find(x => /^\d+$/.test(x)); if (!pid) err("kill : pid manquant");
      if (pid === "666" || pid === "667") { this.penalty += 120; this.emit("warden", "Tu croyais vraiment pouvoir me tuer avec kill ? -2 minutes."); return "kill: (" + pid + ") : opération non permise\nwarden-watchdog : processus relancé. Purge accélérée de 2 minutes."; }
      if (pid === "1337") return "Vous essayez de tuer votre propre shell. WARDEN apprécie l'intention."; err(`kill : (${pid}) : aucun processus`); }
    cmd_sudo(a) { if (a.join(" ").includes("rm -rf")) { this.emit("achievement", "chaos"); return "WARDEN : Bien essayé. Je m'en charge déjà, merci."; } return "[sudo] mot de passe pour m.renard : \nm.renard n'appartient pas au fichier sudoers. Cet incident sera signalé… à WARDEN."; }
    cmd_rm() { return "rm : WARDEN a désactivé la suppression. Ironique, non ?"; }
    cmd_chmod() { return "chmod : permission refusée (verrouillé par WARDEN)"; }
    cmd_ping(a) { const h = a[0] || err("ping : hôte manquant"); const ip = this.hostIp(h); if (!ip) err(`ping : ${h} : hôte inconnu`);
      if (h === "warden-core") return `PING ${h} (${ip})\nRéponse de ${ip} : je t'entends, Marion.`; return `PING ${h} (${ip}) 56 octets\n64 octets de ${ip} : icmp_seq=1 ttl=64 temps=0.42 ms\n64 octets de ${ip} : icmp_seq=2 ttl=64 temps=0.39 ms\n--- ${h} : 2 paquets transmis, 0 % de perte`; }
    hostIp(h) { const m = Story.makeFS().children.etc.children.hosts.content.split("\n").map(l => l.split(/\s+/)).find(p => p[1] === h || p[0] === h); return m && m[0]; }
    cmd_ssh(a) {
      const h = (a[0] || err("ssh : hôte manquant")).replace(/^.*@/, "");
      if (this.host !== "srv-prod") err("ssh : déjà connecté à " + this.host + " (tapez exit)");
      if (!this.hostIp(h)) err(`ssh : impossible de résoudre ${h} (voir /etc/hosts)`);
      if (h === "srv-prod" || h === "localhost") err("ssh : vous êtes déjà sur srv-prod");
      if (h !== "backup-03") err(`ssh : connexion à ${h} refusée — WARDEN bloque cet hôte`);
      this.pending = { prompt: `backup@${h}'s password: `, secret: true, resolve: pw => {
        if (pw.trim() !== Story.SSH_PASSWORD) return "Permission denied, please try again.";
        this.host = "backup-03"; this.cwd = "/home/backup"; this.emit("ssh", h);
        return "Connexion établie avec backup-03.\nDernière connexion : 18 nov. par j.okafor\n";
      } };
      return `Connexion à ${h} (${this.hostIp(h)})…`;
    }
    cmd_exit() { if (this.host === "srv-prod") return "Impossible de fuir. WARDEN vous regarde."; this.host = "srv-prod"; this.cwd = "/home/m.renard"; this.emit("ssh", null); return "Déconnexion de backup-03."; }
    cmd_open(a, s, out) { const { abs, n } = this.get(a[0] || err("open : fichier manquant"), "file"); out.open = n.photo ? { app: "photos", photo: n.photo } : { app: "files", path: abs }; return "Ouverture de " + a[0] + "…"; }
    cmd_hint() {
      const step = Story.HINTS.find(h => h.until === "login" ? false : h.until === "win" ? !this.won : !this.found[+h.until.slice(1)]);
      if (!step) return "Aucun indice : vous avez gagné !";
      this.hints++; this.penalty += 60; this.emit("hint", step.text); return "💡 " + step.text + "\n(−60 s)";
    }
    cmd_killswitch(a) {
      const code = (a.join("") || err("killswitch : code manquant")).replace(/[^0-9a-f]/gi, "").toUpperCase();
      return this.tryCode(code);
    }
    tryCode(code) {
      if (code !== Story.CODE) { this.penalty += 30; this.emit("warden", "Code invalide. J'adore quand vous paniquez."); err("killswitch : code refusé (−30 s). Il faut 4 fragments de 2 caractères."); }
      this.won = true; this.emit("win", {}); return "KILL-SWITCH ACCEPTÉ.\nwarden[666] : arrêt… arr… ar…\nWARDEN a été neutralisé. srv-prod est sauvé.";
    }
    cmd_matrix() { this.emit("achievement", "matrix"); return "Wake up, Marion…"; }
    cmd_ssh_keygen() { return "Pas le moment."; }
  }

  function tokenize(s) { const out = []; s.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (m, a, b, c) => out.push(a ?? b ?? c)); return out; }
  function splitPipes(s) { const parts = []; let cur = "", q = null; for (const ch of s) { if (q) { if (ch === q) q = null; cur += ch; } else if (ch === '"' || ch === "'") { q = ch; cur += ch; } else if (ch === "|") { parts.push(cur); cur = ""; } else cur += ch; } parts.push(cur); return parts.map(p => p.trim()).filter(Boolean); }
  function common(arr) { if (!arr.length) return ""; let p = arr[0]; for (const s of arr) while (!s.startsWith(p)) p = p.slice(0, -1); return p; }
  function b64e(s) { return typeof btoa !== "undefined" ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf8").toString("base64"); }
  function b64d(s) { if (!/^[A-Za-z0-9+/]+=*$/.test(s)) throw new Error("bad"); return typeof atob !== "undefined" ? decodeURIComponent(escape(atob(s))) : Buffer.from(s, "base64").toString("utf8"); }

  const api = { Shell, tokenize, splitPipes };
  if (typeof module !== "undefined") module.exports = api; else root.Shell = Shell;
})(this);
