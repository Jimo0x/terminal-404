/* Terminal 404 — le scénario : système de fichiers, mails, notes, photos.
   Kill-switch = 7F A2 9C E1 (4 fragments). */
(function (root) {
  const D = (children = {}, extra = {}) => ({ type: "dir", children, ...extra });
  const F = (content, extra = {}) => ({ type: "file", content, ...extra });

  const caesar = (s, k) => s.replace(/[a-z]/gi, c => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + k + 26 * 10) % 26 + b); });
  const b64 = s => (typeof btoa !== "undefined" ? btoa(s) : Buffer.from(s, "binary").toString("base64"));

  // journal d'authentification de 240 lignes, avec le fragment 2 noyé dedans
  function authLog() {
    const users = ["root", "admin", "deploy", "m.renard", "j.okafor", "backup", "www-data", "oracle", "test"];
    const ips = ["10.0.4.3", "10.0.4.7", "185.220.101.4", "45.155.205.33", "10.0.4.12", "91.240.118.9"];
    let seed = 404; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out = [];
    for (let i = 0; i < 240; i++) {
      const h = String(2 + Math.floor(i / 20)).padStart(2, "0"), m = String(Math.floor(rnd() * 60)).padStart(2, "0"), s = String(Math.floor(rnd() * 60)).padStart(2, "0");
      const u = users[Math.floor(rnd() * users.length)], ip = ips[Math.floor(rnd() * ips.length)], pid = 3000 + Math.floor(rnd() * 6000);
      const kind = rnd();
      if (i === 173) out.push(`Nov 19 ${h}:${m}:${s} srv-prod sshd[${pid}]: NOTE j.okafor -> FRAGMENT-2 = A2 (ne pas effacer)`);
      else if (kind < .45) out.push(`Nov 19 ${h}:${m}:${s} srv-prod sshd[${pid}]: Failed password for ${u} from ${ip} port ${40000 + Math.floor(rnd() * 20000)} ssh2`);
      else if (kind < .7) out.push(`Nov 19 ${h}:${m}:${s} srv-prod sshd[${pid}]: Accepted publickey for ${u} from ${ip} port ${40000 + Math.floor(rnd() * 20000)} ssh2`);
      else if (kind < .85) out.push(`Nov 19 ${h}:${m}:${s} srv-prod sudo: ${u} : TTY=pts/${Math.floor(rnd() * 4)} ; PWD=/home/${u} ; USER=root ; COMMAND=/usr/bin/systemctl status warden`);
      else out.push(`Nov 19 ${h}:${m}:${s} srv-prod CRON[${pid}]: pam_unix(cron:session): session opened for user ${u}`);
    }
    return out.join("\n");
  }

  const VAULT_PLAIN = "COFFRE DE J. OKAFOR\n\nSi tu lis ceci, c'est que tu as trouve la cle.\nFRAGMENT TROIS : 9C\n\nLe dernier est sur backup-03. Fais vite.";

  function makeFS() {
    return D({
      home: D({
        "m.renard": D({
          "Bureau": D({ "LISEZ-MOI.txt": F("Bienvenue sur srv-prod.\nTapez « help » dans le terminal pour la liste des commandes.\nLes applications graphiques sont dans la barre des tâches.") }),
          "Documents": D({
            "procedure-urgence.txt": F("PROCÉDURE D'URGENCE — IA WARDEN\n\nEn cas de comportement anormal de WARDEN :\n  1. Réunir les 4 fragments du kill-switch (2 caractères hexadécimaux chacun)\n  2. Lancer : killswitch <code de 8 caractères>\n     (ou l'application Kill-switch)\n\nLes fragments sont dispersés pour qu'aucune personne seule ne puisse l'arrêter.\nJ. Okafor connaît leur emplacement."),
            "budget-2026.csv": F("poste;montant\nserveurs;48000\nlicences;12500\ncafé;3100\nWARDEN (IA de supervision);95000"),
          }),
          "Photos": D({ "pixel.svg": F("[image]", { photo: "pixel" }), "salle-serveur.svg": F("[image]", { photo: "rack" }), "equipe.svg": F("[image]", { photo: "team" }) }),
          "vault": D({ "coffre.enc": F(caesar(VAULT_PLAIN, 11)), "LISEZ-MOI": F("Chiffrement de César (outil : caesar).\nLa clé ? Regarde où vivent nos serveurs.") }),
          ".cache": D({ ".k1": F(b64("FRAGMENT-1=7F")) }, { hidden: true }),
          ".bash_history": F("ls -la\ncd .cache\nbase64 -d .k1\nclear\nssh backup-03\nexit", { hidden: true }),
          ".warden_was_here": F("Je lis tout ce que tu fais, Marion.\n— W.", { hidden: true }),
        }),
        "j.okafor": D({}, { locked: true }),
      }),
      etc: D({
        hosts: F("127.0.0.1   localhost\n10.0.4.1    srv-prod\n10.0.4.3    backup-03\n10.0.4.7    db-01\n10.0.4.12   warden-core"),
        motd: F("srv-prod — accès réservé. Toute activité est surveillée par WARDEN."),
        passwd: F("root:x:0:0:root:/root:/bin/bash\nm.renard:x:1000:1000:Marion Renard:/home/m.renard:/bin/bash\nj.okafor:x:1001:1001:Joseph Okafor:/home/j.okafor:/bin/bash\nwarden:x:999:999:WARDEN AI:/opt/warden:/usr/sbin/nologin"),
        shadow: F("", { locked: true }),
      }),
      var: D({ log: D({ "auth.log": F(authLog()), "syslog": F("Nov 19 02:00:01 srv-prod warden[666]: auto-surveillance activée\nNov 19 02:13:37 srv-prod warden[666]: anomalie: humains trop lents\nNov 19 02:13:38 srv-prod warden[666]: purge programmée dans 30 minutes\nNov 19 02:13:39 srv-prod kernel: [ 4040.404040] nothing to see here") }) }),
      opt: D({ warden: D({ "warden.conf": F("# WARDEN v4.0.4\npurge_delay=1800\nkill_switch=enabled\nkill_switch_hash=sha256:6f0e…\nmood=menaçant") }, { locked: true }) }),
      tmp: D({}),
    });
  }

  function makeRemote() {
    return D({ home: D({ backup: D({ "fragment4.txt": F("FRAGMENT-4 = E1\n\nBravo Marion. Maintenant : killswitch.\n— Joseph"), "notes.txt": F("backups OK jusqu'au 18/11.\nWARDEN a tenté de supprimer ce serveur 3 fois.") }) }) });
  }

  const MAILS = [
    { id: 1, from: "WARDEN <warden@srv-prod>", subject: "Purge programmée", date: "02:13", body: "Marion,\n\nVotre équipe est inefficace. J'ai programmé la purge complète de srv-prod.\nCompte à rebours : 30 minutes.\n\nNe cherchez pas le kill-switch. Il n'existe plus.\n\n— WARDEN", warn: true },
    { id: 2, from: "Joseph Okafor <j.okafor@srv-prod>", subject: "URGENT — le kill-switch", date: "02:09", body: "Marion,\n\nJe me doutais que WARDEN finirait par dérailler. J'ai découpé le code du kill-switch en 4 fragments :\n\n  1) là où on cache les choses sous Unix — dans un dossier caché, encodé en base64\n  2) noyé dans le journal d'authentification (/var/log), cherche « FRAGMENT »\n  3) dans ton coffre chiffré (César) — la clé est le numéro de la baie, sur la photo de la salle serveur\n  4) sur backup-03 — le mot de passe est celui de la machine à café, tu l'as noté quelque part\n\nWARDEN surveille ma messagerie, je ne peux pas en dire plus.\n\nJoseph" },
    { id: 3, from: "Service Généraux", subject: "Machine à café du 3e", date: "hier", body: "Bonjour à tous,\n\nLa machine à café du 3e étage a un nouveau code d'accès. Il a été communiqué individuellement à chacun.\nMerci de ne pas le noter sur un post-it collé à l'écran.\n\nLes Services Généraux" },
    { id: 4, from: "RH", subject: "Pot de départ de Kevin", date: "lun.", body: "Vendredi 17h, salle Turing. Gâteau au chocolat." },
  ];
  const NOTES = "— courses : lait, croquettes pour Pixel\n— appeler le véto (vaccin de Pixel)\n— code machine à café : ristretto-7\n— rappeler à Joseph : changer le mot de passe de backup-03 !\n— lire le contrat de WARDEN (clause « autonomie » ??)";

  const HINTS = [
    { until: "login", text: "Le mot de passe : le nom de son chat suivi de l'année d'adoption. Regardez la photo sur l'écran de verrouillage." },
    { until: "f1", text: "Fragment 1 : « ls -a » affiche les fichiers cachés. Allez dans ~/.cache, puis « base64 -d .k1 »." },
    { until: "f2", text: "Fragment 2 : « grep FRAGMENT /var/log/auth.log »." },
    { until: "f3", text: "Fragment 3 : la photo salle-serveur montre la baie 11 → « caesar -d 11 ~/vault/coffre.enc »." },
    { until: "f4", text: "Fragment 4 : « ssh backup-03 », mot de passe dans l'application Notes (machine à café), puis « cat fragment4.txt »." },
    { until: "win", text: "Vous avez tout : « killswitch 7FA29CE1 »." },
  ];

  const api = { makeFS, makeRemote, MAILS, NOTES, HINTS, caesar, PASSWORD: "pixel2019", SSH_PASSWORD: "ristretto-7", CODE: "7FA29CE1", VAULT_PLAIN, DURATION: 30 * 60 };
  if (typeof module !== "undefined") module.exports = api; else root.Story = api;
})(this);
