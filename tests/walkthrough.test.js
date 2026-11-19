const test = require("node:test"), assert = require("node:assert");
const Story = require("../story.js"); global.Story = Story;
const { Shell, tokenize, splitPipes } = require("../shell.js");
const txt = o => o.lines.map(l => l.t).join("\n");

test("parcours complet : 4 fragments puis kill-switch", () => {
  const ev = []; const sh = new Shell({ onEvent: (e, d) => ev.push([e, d]) });
  assert.match(txt(sh.run("ls")), /Documents\//);
  assert.doesNotMatch(txt(sh.run("ls")), /\.cache/);
  assert.match(txt(sh.run("ls -a")), /\.cache\//);
  sh.run("cd .cache");
  assert.match(txt(sh.run("base64 -d .k1")), /FRAGMENT-1=7F/);
  assert.match(txt(sh.run("grep FRAGMENT /var/log/auth.log")), /FRAGMENT-2 = A2/);
  assert.match(txt(sh.run("cat ~/vault/coffre.enc")), /^QZFQQPP|[A-Z]/);
  assert.match(txt(sh.run("caesar -d 11 ~/vault/coffre.enc")), /FRAGMENT TROIS : 9C/);
  assert.match(txt(sh.run("ssh backup-03")), /Connexion/);
  assert.match(sh.prompt(), /password/);
  assert.match(txt(sh.run("mauvais")), /denied/);
  sh.run("ssh backup-03"); sh.run("ristretto-7");
  assert.equal(sh.host, "backup-03");
  assert.match(txt(sh.run("cat fragment4.txt")), /FRAGMENT-4 = E1/);
  sh.run("exit");
  assert.deepEqual(sh.found, { 1: "7F", 2: "A2", 3: "9C", 4: "E1" });
  assert.match(txt(sh.run("killswitch 7F A2 9C E1")), /ACCEPTÉ/);
  assert.ok(ev.some(e => e[0] === "win")); assert.equal(ev.filter(e => e[0] === "fragment").length, 4);
});

test("pipes, head/tail, wc, find, complétion", () => {
  const sh = new Shell();
  assert.equal(txt(sh.run("cat /var/log/auth.log | wc -l")), "240");
  assert.match(txt(sh.run("cat /var/log/auth.log")), /240 lignes au total/);
  assert.match(txt(sh.run("cat /var/log/auth.log | grep FRAGMENT")), /A2/);
  assert.equal(txt(sh.run("head -n 3 /etc/hosts")).split("\n").length, 3);
  assert.match(txt(sh.run("find / -name *.enc")), /\/home\/m.renard\/vault\/coffre.enc/);
  assert.equal(sh.complete("ca"), "ca");                 // cat / caesar : préfixe commun
  assert.equal(sh.complete("cae"), "caesar ");
  assert.equal(sh.complete("cd Doc"), "cd Documents/");
  assert.equal(sh.complete("cd ~/.ca"), "cd ~/.cache/");
});

test("erreurs, verrous et pénalités", () => {
  const sh = new Shell();
  assert.match(txt(sh.run("cd /opt/warden")), /permission refusée/);
  assert.match(txt(sh.run("foo")), /introuvable/);
  assert.match(txt(sh.run("ssh warden-core")), /refusée/);
  sh.run("kill 666"); assert.equal(sh.penalty, 120);
  sh.run("killswitch 00000000"); assert.equal(sh.penalty, 150);
  sh.run("hint"); assert.equal(sh.hints, 1); assert.equal(sh.penalty, 210);
  assert.match(txt(sh.run("cd ..; ls")), /introuvable|aucun/);
});

test("tokenisation", () => {
  assert.deepEqual(tokenize(`grep "a b" f`), ["grep", "a b", "f"]);
  assert.deepEqual(splitPipes(`echo "x|y" | grep x`), [`echo "x|y"`, "grep x"]);
});
