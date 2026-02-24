/* ─────────────────────────────────────────
   CINEMA VISUALIZATION — script.js
   Full working version
───────────────────────────────────────── */

// ─────────────────────────────────────────
// POSTERS
// ─────────────────────────────────────────
let POSTERS = {};

async function loadPosters() {
  try {
    const res = await fetch("data/posters.json");
    if (res.ok) POSTERS = await res.json();
  } catch {}
}

function getPoster(title) {
  return POSTERS[title] || null;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function parseR(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function rClass(r) {
  if (r === null) return "";
  if (r >= 4.5) return "high";
  if (r >= 3.5) return "mid";
  return "low";
}

// ─────────────────────────────────────────
// GENRE COLORS
// ─────────────────────────────────────────
const GENRE_COLORS = {
  Drama:"#7eb89a", Thriller:"#c47c7c", Horror:"#9890c8", Crime:"#c8a87c",
  "Sci-Fi":"#7ca4c8", Comedy:"#c8be7c", Romance:"#c87ca4", Action:"#c89e7c",
  Mystery:"#9c90c8", History:"#a4a47c", Music:"#b47cc8", War:"#90b490",
  Fantasy:"#7cc8c8", Adventure:"#aec890", Documentary:"#a0a09c",
  Anime:"#c8a090", Biography:"#90c8a8", Sport:"#c8c890",
  "Coming-of-Age":"#c89078", Legal:"#9090c8", Musical:"#c87890",
  Other:"#b0b0a8"
};

function genreColor(g) {
  return GENRE_COLORS[(g || "Other").split("/")[0].trim()] || GENRE_COLORS.Other;
}

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let all = [];
let filtered = [];
let filter = "all";
let query = "";
let sim = null;

let svg, W, H, gBubble;

// ─────────────────────────────────────────
// DOM
// ─────────────────────────────────────────
const $ = id => document.getElementById(id);

const $search  = $("searchInput");
const $clear   = $("clearBtn");
const $list    = $("movieList");
const $count   = $("resultsCount");
const $total   = $("totalCount");
const $theme   = $("themeToggle");
const $tip     = $("tooltip");
const $legends = $("legendGenres");

// ─────────────────────────────────────────
// DARK MODE
// ─────────────────────────────────────────
$theme.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  $theme.querySelector(".toggle-icon").textContent = dark ? "◐" : "◑";
  refreshStrokes();
});

function isDark() {
  return document.documentElement.dataset.theme === "dark";
}

function refreshStrokes() {
  gBubble?.selectAll("circle.bubble")
    .attr("stroke", isDark()
      ? "rgba(255,255,255,0.16)"
      : "rgba(0,0,0,0.09)");
}

// ─────────────────────────────────────────
// SEARCH & FILTER
// ─────────────────────────────────────────
$search.addEventListener("input", () => {
  query = $search.value.toLowerCase().trim();
  $clear.classList.toggle("visible", query.length > 0);
  applyFilters();
});

$clear.addEventListener("click", () => {
  $search.value = "";
  query = "";
  applyFilters();
});

document.querySelectorAll(".filter-pill").forEach(btn =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter;
    applyFilters();
  })
);

function applyFilters() {
  filtered = all.filter(m => {
    if (query) {
      const hit =
        m.title.toLowerCase().includes(query) ||
        m.genre.toLowerCase().includes(query) ||
        (m.language || "").toLowerCase().includes(query);
      if (!hit) return false;
    }
    if (filter !== "all") {
      if (m.my_rating === null || m.my_rating < +filter) return false;
    }
    return true;
  });

  renderList(filtered);
  dimBubbles(filtered);

  $count.textContent =
    (query || filter !== "all") ? `${filtered.length} of ${all.length} films` : "";
}

// ─────────────────────────────────────────
// LIST
// ─────────────────────────────────────────
function renderList(movies) {
  $list.innerHTML = "";

  if (!movies.length) {
    $list.innerHTML = `<li class="empty-state">🎞 No films match.</li>`;
    return;
  }

  movies.forEach((m, i) => {
    const li = document.createElement("li");
    li.className = "movie-item";
    li.innerHTML = `
      <span class="item-rank">${i + 1}</span>
      <div class="item-info">
        <div class="item-title">${m.title}</div>
        <div class="item-meta">${m.year} · ${m.genre.split("/")[0]}</div>
      </div>
      <span class="item-rating ${rClass(m.my_rating)}">
        ${m.my_rating ?? "—"}
      </span>
    `;

    li.addEventListener("mouseenter", () => glowBubble(m.title));
    li.addEventListener("mouseleave", clearGlow);
    li.addEventListener("click", () => pinCard(m));

    $list.appendChild(li);
  });
}

// ─────────────────────────────────────────
// SVG INIT
// ─────────────────────────────────────────
function initSVG() {
  const el = $("vizContainer");
  W = el.clientWidth;
  H = el.clientHeight;

  svg = d3.select("#mainViz")
    .attr("width", W)
    .attr("height", H);

  const defs = svg.append("defs");

  const glow = defs.append("filter")
    .attr("id", "glow2")
    .append("feGaussianBlur")
    .attr("stdDeviation", 14);

  svg.append("rect")
    .attr("width", W)
    .attr("height", H)
    .attr("fill", "transparent");

  svg.append("g").attr("class", "line-group");
  gBubble = svg.append("g").attr("class", "bubble-group");
}

// ─────────────────────────────────────────
// BUBBLES
// ─────────────────────────────────────────
function renderBubbles(movies) {
  if (!svg) return;

  gBubble.selectAll("*").remove();
  svg.select(".line-group").selectAll("*").remove();

  const rScale = d3.scaleSqrt().domain([4, 9.5]).range([8, 46]);
  const nodes = movies.map(m => ({ ...m, r: rScale(m.imdb_rating || 7) }));

  sim?.stop();

  sim = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(8))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collision", d3.forceCollide(d => d.r + 3))
    .on("tick", () => {
      gBubble.selectAll("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

  const circles = gBubble.selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", "bubble")
    .attr("r", d => d.r)
    .attr("fill", d => genreColor(d.genre))
    .attr("fill-opacity", isDark() ? 0.52 : 0.68)
    .attr("stroke", isDark()
      ? "rgba(255,255,255,0.16)"
      : "rgba(0,0,0,0.09)")
    .on("mouseenter", (ev, d) => showTip(ev, d))
    .on("mousemove", moveTip)
    .on("mouseleave", hideTip)
    .on("click", (ev, d) => {
      ev.stopPropagation();
      pinCard(d);
    });
}

// ─────────────────────────────────────────
// DIM / GLOW
// ─────────────────────────────────────────
function dimBubbles(show) {
  const set = new Set(show.map(m => m.title));
  gBubble?.selectAll("circle")
    .attr("fill-opacity", d => set.has(d.title) ? 0.7 : 0.05);
}

function glowBubble(title) {
  gBubble?.selectAll("circle")
    .attr("filter", d => d.title === title ? "url(#glow2)" : null)
    .attr("r", d => d.title === title ? d.r * 1.25 : d.r);
}

function clearGlow() {
  gBubble?.selectAll("circle")
    .attr("filter", null)
    .attr("r", d => d.r);
}

// ─────────────────────────────────────────
// TOOLTIP + TAG PILLS
// ─────────────────────────────────────────
function showTip(ev, d) {
  fillCard(d);
  renderTags(d);
  $tip.classList.add("visible");
  moveTip(ev);
}

function moveTip(ev) {
  const box    = $("vizContainer").getBoundingClientRect();
  const tipW   = $tip.offsetWidth  || 400;
  const tipH   = $tip.offsetHeight || 220;
  const margin = 12;

  // Cursor position relative to container
  let x = ev.clientX - box.left + 18;
  let y = ev.clientY - box.top  - 10;

  // Flip left if would overflow right edge
  if (x + tipW + margin > box.width)
    x = ev.clientX - box.left - tipW - 18;

  // Flip up if would overflow bottom edge
  if (y + tipH + margin > box.height)
    y = ev.clientY - box.top - tipH - 10;

  // Never go above top or past left edge
  x = Math.max(margin, x);
  y = Math.max(margin, y);

  $tip.style.left = x + "px";
  $tip.style.top  = y + "px";
}

function hideTip() {
  if (!$tip.classList.contains("pinned"))
    $tip.classList.remove("visible");
}

// Dismiss pinned card when clicking viz background
$("vizContainer").addEventListener("click", e => {
  if (e.target.tagName === "svg" || e.target.tagName === "rect" || e.target === $("vizContainer")) {
    $tip.classList.remove("visible", "pinned");
  }
});

function renderTags(d) {
  const wrap = $("tooltipTags");
  wrap.innerHTML = "";

  if (!d.my_tag) return;

  d.my_tag.split(",").map(t => t.trim()).forEach(tag => {
    const pill = document.createElement("span");
    pill.className = `tag-pill tag-${tag.toLowerCase().replace(/\s+/g, "-")}`;
    pill.textContent = tag;
    wrap.appendChild(pill);
  });
}

// ─────────────────────────────────────────
// PINNED CARD
// ─────────────────────────────────────────
function pinCard(d) {
  fillCard(d);
  renderTags(d);
  $tip.classList.add("visible", "pinned");

  // Center the card in the viz container
  const box  = $("vizContainer");
  const tipW = $tip.offsetWidth  || 400;
  const tipH = $tip.offsetHeight || 220;
  const x    = Math.max(12, (box.clientWidth  - tipW) / 2);
  const y    = Math.max(12, (box.clientHeight - tipH) / 2);
  $tip.style.left = x + "px";
  $tip.style.top  = y + "px";

  clearTimeout(window._pinTO);
  window._pinTO = setTimeout(() => {
    $tip.classList.remove("visible", "pinned");
  }, 6000);
}

// ─────────────────────────────────────────
// FILL CARD
// ─────────────────────────────────────────
function fillCard(d) {
  $("tooltipTitle").textContent   = d.title;
  $("tooltipYear").textContent    = d.year;
  $("tooltipImdb").textContent    = `IMDb ${d.imdb_rating ?? "N/A"}`;
  $("tooltipMine").textContent    = d.my_rating ? `★ ${d.my_rating}` : "Unrated";
  $("tooltipGenre").textContent   = d.genre;
  $("tooltipLang").textContent    = d.language || "—";
  $("tooltipSource").textContent  = d.streaming_source || "—";
  $("tooltipSummary").textContent = d.summary || "";

  const poster = $("tooltipPoster");
  const url = getPoster(d.title);

  poster.innerHTML = url
    ? `<img src="${url}" />`
    : `<span class="poster-emoji">🎬</span>`;
}

// ─────────────────────────────────────────
// LOAD DATA
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// RESIZE
// ─────────────────────────────────────────
window.addEventListener("resize", () => {
  const el = $("vizContainer");
  W = el.clientWidth;
  H = el.clientHeight;
  svg?.attr("width", W).attr("height", H);
  svg?.select("rect").attr("width", W).attr("height", H);
  if (sim) {
    sim.force("center", d3.forceCenter(W / 2, H / 2))
       .alpha(0.3).restart();
  }
  // Re-center pinned card on resize
  if ($tip.classList.contains("pinned")) {
    const tipW = $tip.offsetWidth  || 400;
    const tipH = $tip.offsetHeight || 220;
    $tip.style.left = Math.max(12, (el.clientWidth  - tipW) / 2) + "px";
    $tip.style.top  = Math.max(12, (el.clientHeight - tipH) / 2) + "px";
  }
});

// ─────────────────────────────────────────
loadPosters().then(() => {
  d3.csv("movies_final.csv").then(raw => {
    all = raw.map(d => ({
      title: d.title?.trim(),
      year: +d.year,
      genre: d.genre || "Other",
      summary: d.summary,
      imdb_rating: parseR(d.imdb_rating),
      my_rating: parseR(d.my_rating),
      language: d.language,
      streaming_source: d.streaming_source,
      my_tag: d.my_tag || ""
    }));

    filtered = [...all];
    $total.textContent = all.length;

    initSVG();
    renderList(filtered);
    renderBubbles(filtered);
  });
});