/* VitaGit catalog app.
   Content is never hardcoded here — everything in the grid comes from
   vitagit-db's index.json, fetched at runtime. */

const DB_URL = "https://raw.githubusercontent.com/KiddRwxSsj/vitagit-db/main/index.json";
const ICON_BASE = "https://raw.githubusercontent.com/KiddRwxSsj/vitagit-db/main/icons/";

const TYPE_LABELS = {
  port: "Ports", game: "Games", utility: "Utilities", emulator: "Emulators",
  app: "Apps", tool: "Tools", homebrew: "Homebrew"
};

let apps = [];
let activeType = "all";
let query = "";
let sortMode = "name";

const gridEl = document.querySelector("#grid");
const countEl = document.querySelector("#count");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const iconUrl = name => ICON_BASE + encodeURIComponent(name);

function githubPage(url) {
  if (!url) return "#";
  try {
    const u = new URL(url);
    if (u.hostname === "github.com") {
      return u.href.replace(/\/releases\/download\/.*$/, "");
    }
    return "https://github.com/search?q=" + encodeURIComponent(u.hostname) + "&type=repositories";
  } catch {
    return "#";
  }
}

/* ---------- card rendering ---------- */

function cardMarkup(a, index, compact) {
  const iconContent = a.icon
    ? `<img src="${esc(iconUrl(a.icon))}" alt="" onerror="this.remove()">`
    : esc((a.name || "?")[0].toUpperCase());

  const desc = compact ? "" : `<div class="desc" title="${esc(a.description || "")}">${esc(a.description || "No description available.")}</div>`;
  const actions = compact ? "" : `
        <div class="card-actions">
          <a class="action github" href="${esc(githubPage(a.url))}" target="_blank" rel="noopener" title="Open project page">GitHub</a>
          <a class="action download" href="${esc(a.url || "#")}" target="_blank" rel="noopener" title="Download VPK">Download</a>
        </div>`;

  return `
    <article class="card clickable${compact ? " card-compact" : ""}" style="--i:${Math.min(index, 20)}" tabindex="0" data-index="${index}" aria-label="Open details for ${esc(a.name || "Unknown")}">
      <div class="card-top">
        <div class="icon">${iconContent}</div>
        <div class="card-heading">
          <h3 title="${esc(a.name)}">${esc(a.name || "Unknown")}</h3>
          <div class="author" title="${esc(a.author)}">${esc(a.author || "Unknown author")}</div>
        </div>
      </div>
      ${desc}
      <div class="card-bottom">
        <span class="tag">${esc(a.type || "homebrew")}</span>
        <span class="version">${esc(a.version || "—")}</span>${actions}
      </div>
    </article>`;
}

/* Renders `list` into `container` and wires up a single delegated click/
   keydown listener the first time it's used. Storing the list on the
   element itself (rather than re-querying the DOM) means cards keep working
   correctly even when the same markup is shown in more than one place
   (catalog grid vs. home page shelves). `compact` produces the smaller
   shelf-card variant (no description or action buttons). */
function renderCards(container, list, compact = false) {
  container.innerHTML = list.length
    ? list.map((a, i) => cardMarkup(a, i, compact)).join("")
    : `<div class="status">No homebrew found.</div>`;
  container._cardList = list;

  if (!container._cardsWired) {
    container._cardsWired = true;
    const openFromEvent = e => {
      if (e.target.closest(".card-actions")) return;
      const card = e.target.closest(".card.clickable");
      if (!card) return;
      const app = container._cardList[Number(card.dataset.index)];
      if (app) openModal(app);
    };
    container.addEventListener("click", openFromEvent);
    container.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      openFromEvent(e);
    });
  }
}

function filteredCatalog() {
  const list = apps.filter(a => {
    const matchesType = activeType === "all" || a.type === activeType;
    const text = `${a.name} ${a.author} ${a.description} ${a.titleid}`.toLowerCase();
    return matchesType && text.includes(query);
  });

  list.sort((a, b) => {
    if (sortMode === "name") return String(a.name || "").localeCompare(String(b.name || ""));
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return sortMode === "oldest" ? dateA - dateB : dateB - dateA;
  });

  return list;
}

function renderCatalog() {
  const list = filteredCatalog();
  countEl.textContent = `${list.length.toLocaleString()} result${list.length === 1 ? "" : "s"}`;
  renderCards(gridEl, list);
}

function categoryCounts() {
  const counts = {};
  apps.forEach(app => {
    const key = String(app.type || "homebrew").toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/* Jumps to the browse view pre-filtered to `key`, reusing the existing
   filter chips there so there's a single source of truth for filtering. */
function browseByCategory(key) {
  showView("browse");
  const filterBtn = document.querySelector(`.filter[data-type="${CSS.escape(key)}"]`);
  if (filterBtn) {
    filterBtn.click();
  } else {
    activeType = key;
    renderCatalog();
  }
}

function renderCategories() {
  if (!Array.isArray(apps)) return;

  const homeCountEl = document.querySelector("#homeCount");
  if (homeCountEl) homeCountEl.textContent = apps.length;

  const categories = categoryCounts();

  const catCountEl = document.querySelector("#homeCatCount");
  if (catCountEl) catCountEl.textContent = categories.length;

  const chip = (key, n) => `
    <button class="chip" data-category="${esc(key)}">
      ${esc(TYPE_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1))}
      <span class="chip-count">${n}</span>
    </button>`;
  const tile = (key, n) => `
    <button class="all-category" data-category="${esc(key)}">
      <strong>${esc(TYPE_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1))}</strong>
      <span>${n} ${n === 1 ? "app" : "apps"}</span>
    </button>`;

  const homeChips = document.querySelector("#homeCategories");
  const allCats = document.querySelector("#allCategories");
  if (homeChips) homeChips.innerHTML = categories.map(([k, n]) => chip(k, n)).join("");
  if (allCats) allCats.innerHTML = categories.map(([k, n]) => tile(k, n)).join("");

  document.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => browseByCategory(button.dataset.category));
  });
}

/* Builds one horizontally-scrolling shelf (a la Steam's storefront rows)
   for a given list of apps, with its own "See all" link into the filtered
   browse view. */
function buildShelf(title, list, categoryKey) {
  const shelf = document.createElement("div");
  shelf.className = "shelf";
  shelf.innerHTML = `
    <div class="shelf-head">
      <h3>${esc(title)}</h3>
      <button class="text-link" type="button">See all</button>
    </div>
    <div class="shelf-track"></div>`;
  renderCards(shelf.querySelector(".shelf-track"), list, true);
  shelf.querySelector(".text-link").addEventListener("click", () => browseByCategory(categoryKey));
  return shelf;
}

/* Home page shelves are intentionally independent of the catalog's
   search/filter/sort state — otherwise typing in the browse search box
   would also change what the home page shows. */
function renderHomeShelves() {
  const recentTrack = document.querySelector("#shelfRecent");
  if (recentTrack) {
    const recent = [...apps]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 12);
    renderCards(recentTrack, recent, true);
  }

  const shelvesEl = document.querySelector("#categoryShelves");
  if (!shelvesEl) return;
  shelvesEl.innerHTML = "";

  const topTypes = categoryCounts().slice(0, 3).map(([key]) => key);
  topTypes.forEach(key => {
    const list = apps
      .filter(a => String(a.type || "homebrew").toLowerCase() === key)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 12);
    if (!list.length) return;
    shelvesEl.appendChild(buildShelf(TYPE_LABELS[key] || key, list, key));
  });
}

function render() {
  renderCatalog();
  renderCategories();
  renderHomeShelves();
}

/* ---------- modal ---------- */

function openModal(a) {
  const backdrop = document.querySelector("#modalBackdrop");
  const modalIcon = document.querySelector("#modalIcon");

  modalIcon.innerHTML = a.icon
    ? `<img src="${esc(iconUrl(a.icon))}" alt="" onerror="this.remove()">`
    : esc((a.name || "?")[0].toUpperCase());

  document.querySelector("#modalTitle").textContent = a.name || "Unknown";
  document.querySelector("#modalAuthor").textContent = a.author || "Unknown author";
  document.querySelector("#modalVersion").textContent = a.version ? `Version ${a.version}` : "";
  document.querySelector("#modalDescription").textContent = a.description || "No description available.";

  const fields = [
    ["Category", a.type || "Homebrew"],
    ["Version", a.version || "—"],
    ["Title ID", a.titleid || "—"],
    ["Updated", a.date ? new Date(a.date).toLocaleDateString() : "—"]
  ];
  document.querySelector("#modalMeta").innerHTML = fields.map(([label, value]) => `
    <div class="meta-box">
      <span class="meta-label">${esc(label)}</span>
      <span class="meta-value">${esc(value)}</span>
    </div>`).join("");

  document.querySelector("#modalGithub").href = githubPage(a.url);
  document.querySelector("#modalDownload").href = a.url || "#";

  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const backdrop = document.querySelector("#modalBackdrop");
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelector("#modalClose").addEventListener("click", closeModal);
document.querySelector("#modalBackdrop").addEventListener("click", e => {
  if (e.target.id === "modalBackdrop") closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

/* ---------- search / sort / filters ---------- */

document.querySelector("#search").addEventListener("input", e => {
  query = e.target.value.toLowerCase().trim();
  renderCatalog();
});

document.querySelector("#sort").addEventListener("change", e => {
  sortMode = e.target.value;
  renderCatalog();
});

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    activeType = btn.dataset.type;
    document.querySelector('.links a[data-view="browse"]')?.classList.add("active");
    renderCatalog();
  });
});

/* ---------- view routing (home / browse / categories) ---------- */

const viewEls = {
  home: document.querySelector("#homeView"),
  browse: document.querySelector("#catalog"),
  categories: document.querySelector("#categoriesView")
};
const navLinks = [...document.querySelectorAll(".links a[data-view]")];

function showView(name, push = true) {
  if (!viewEls[name]) name = "home";
  Object.entries(viewEls).forEach(([key, el]) => {
    el.classList.remove("view-active");
    el.style.display = "none";
    if (key === name) {
      el.style.display = "block";
      void el.offsetWidth; // restart the enter animation
      el.classList.add("view-active");
    }
  });
  navLinks.forEach(a => a.classList.toggle("active", a.dataset.view === name));
  if (push) history.pushState({ view: name }, "", "#" + name);
  window.scrollTo({ top: 0, behavior: "smooth" });
  closeMobileNav();
}

navLinks.forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  showView(a.dataset.view);
}));

window.addEventListener("popstate", () => {
  showView(location.hash.slice(1) || "home", false);
});

document.querySelectorAll("[data-view]").forEach(el => {
  if (el.closest(".links")) return; // nav links are handled above
  el.addEventListener("click", e => {
    if (el.tagName === "A") e.preventDefault();
    showView(el.dataset.view);
  });
});

/* ---------- mobile nav ---------- */

const navToggle = document.querySelector("#navToggle");
const navLinksEl = document.querySelector("#navLinksList");
function closeMobileNav() {
  navLinksEl?.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
}
navToggle?.addEventListener("click", () => {
  const open = navLinksEl.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

/* ---------- bottom fade ---------- */

const bottomFade = document.querySelector("#bottomFade");
function updateBottomFade() {
  const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
  bottomFade.classList.toggle("hidden", distanceFromBottom < 24);
}
window.addEventListener("scroll", updateBottomFade, { passive: true });
window.addEventListener("resize", updateBottomFade);
window.addEventListener("load", updateBottomFade);

/* ---------- initial view from URL hash ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const initial = ["home", "browse", "categories"].includes(location.hash.slice(1))
    ? location.hash.slice(1) : "home";
  showView(initial, false);
});

/* ---------- data load ---------- */

fetch(DB_URL)
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(data => {
    apps = Array.isArray(data) ? data : [];
    render();
  })
  .catch(err => {
    console.error(err);
    countEl.textContent = "Could not load database";
    gridEl.innerHTML = `<div class="status">The VitaGit database could not be loaded. Check your connection and try again.</div>`;
  });
