/* Photos dessinées en SVG (aucune image externe). */
const PHOTOS = {
  pixel: { title: "pixel.svg", caption: "Pixel, premier jour à la maison 🐾 — adopté le 14/03/2019", svg: `
<svg viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="pg" cx=".5" cy=".3"><stop offset="0" stop-color="#3b2a24"/><stop offset="1" stop-color="#140d0b"/></radialGradient></defs>
<rect width="480" height="340" fill="url(#pg)"/><rect y="250" width="480" height="90" fill="#2a1d18"/><ellipse cx="240" cy="262" rx="150" ry="22" fill="#000" opacity=".35"/>
<ellipse cx="240" cy="205" rx="105" ry="62" fill="#e8a25c"/><path d="M330 215 q60 -10 55 -60 q-2 -14 -12 -6 q2 40 -45 44z" fill="#e8a25c"/>
<g fill="#c97c35"><path d="M175 175 q12 30 0 60" stroke="#c97c35" stroke-width="9" fill="none"/><path d="M215 165 q10 35 0 75" stroke="#c97c35" stroke-width="9" fill="none"/><path d="M255 165 q10 35 0 75" stroke="#c97c35" stroke-width="9" fill="none"/></g>
<circle cx="170" cy="140" r="62" fill="#efae6a"/><path d="M118 112 l-8 -62 l48 34z M222 112 l8 -62 l-48 34z" fill="#efae6a"/><path d="M122 104 l-5 -40 l30 22z M218 104 l5 -40 l-30 22z" fill="#f6c6c0"/>
<ellipse cx="148" cy="138" rx="10" ry="13" fill="#1d2b12"/><ellipse cx="192" cy="138" rx="10" ry="13" fill="#1d2b12"/><circle cx="151" cy="133" r="4" fill="#fff"/><circle cx="195" cy="133" r="4" fill="#fff"/>
<path d="M164 160 l6 6 l6 -6z" fill="#e57a8a"/><path d="M170 166 q-8 10 -18 6 M170 166 q8 10 18 6" stroke="#5a3820" stroke-width="2.5" fill="none"/>
<g stroke="#fff" stroke-width="1.5" opacity=".7"><path d="M135 160 l-40 -6 M135 166 l-40 4 M205 160 l40 -6 M205 166 l40 4"/></g>
<path d="M126 192 q44 22 88 0" stroke="#d81f3c" stroke-width="10" fill="none"/><circle cx="170" cy="212" r="15" fill="#f2c94c" stroke="#b7932b" stroke-width="3"/><text x="170" y="217" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle" fill="#5b4510">PIXEL</text>
<rect x="330" y="40" width="120" height="72" rx="6" fill="#f4f1e8" transform="rotate(6 390 76)"/><text x="390" y="72" font-family="Georgia" font-size="15" text-anchor="middle" fill="#333" transform="rotate(6 390 76)">Bienvenue</text><text x="390" y="94" font-family="Georgia" font-size="15" text-anchor="middle" fill="#d81f3c" transform="rotate(6 390 76)">Pixel ♥ 2019</text>
</svg>` },
  rack: { title: "salle-serveur.svg", caption: "Salle serveur, 2e sous-sol — notre production vit ici", svg: `
<svg viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#05070c"/></linearGradient></defs>
<rect width="480" height="340" fill="url(#rg)"/><path d="M0 300 L480 300 L480 340 L0 340z" fill="#10151f"/>
${[0, 1, 2].map(i => { const x = 40 + i * 145, num = [10, 11, 12][i]; return `<rect x="${x}" y="40" width="115" height="255" rx="4" fill="#161c28" stroke="#2a3446"/>
${Array.from({ length: 9 }, (_, j) => `<rect x="${x + 10}" y="${70 + j * 24}" width="95" height="18" rx="2" fill="#0d121b" stroke="#222b3a"/>${[0, 1, 2, 3].map(k => `<circle cx="${x + 20 + k * 9}" cy="${79 + j * 24}" r="2.2" fill="${(i * 7 + j * 3 + k) % 5 === 0 ? "#ff3b52" : (i + j + k) % 3 ? "#2ecc71" : "#f5a524"}"/>`).join("")}<rect x="${x + 64}" y="${76 + j * 24}" width="34" height="6" fill="#1e2635"/>`).join("")}
<rect x="${x + 22}" y="46" width="71" height="18" rx="3" fill="${num === 11 ? "#f2c94c" : "#c9ced8"}"/><text x="${x + 57.5}" y="59" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="#111">BAIE ${num}</text>`; }).join("")}
<text x="240" y="325" font-family="monospace" font-size="11" text-anchor="middle" fill="#56627a">srv-prod est dans la baie du milieu — J.O.</text>
</svg>` },
  team: { title: "equipe.svg", caption: "L'équipe infra — séminaire 2025 (Joseph, Marion, Kevin)", svg: `
<svg viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="340" fill="#1d2a3a"/><circle cx="400" cy="70" r="40" fill="#f6d36b" opacity=".9"/><path d="M0 250 q120 -60 240 -10 t240 -20 v120 h-480z" fill="#1f3b2b"/>
${[[130, "#6b4a3a", "#e5172f", "Joseph"], [240, "#c98d6b", "#5aa9ff", "Marion"], [350, "#e8c3a0", "#2ecc71", "Kevin"]].map(([x, skin, shirt, n]) => `<path d="M${x - 45} 340 q0 -95 45 -95 q45 0 45 95z" fill="${shirt}"/><circle cx="${x}" cy="200" r="34" fill="${skin}"/><circle cx="${x - 11}" cy="196" r="3.5" fill="#111"/><circle cx="${x + 11}" cy="196" r="3.5" fill="#111"/><path d="M${x - 12} 212 q12 10 24 0" stroke="#111" stroke-width="2.5" fill="none"/><text x="${x}" y="320" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#fff" opacity=".85">${n}</text>`).join("")}
</svg>` },
};
