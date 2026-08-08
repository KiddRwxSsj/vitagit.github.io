(function () {
  const LOGO_LIGHT = "https://raw.githubusercontent.com/KiddRwxSsj/vitagit-db/main/vitagitDBlogolletersnobglandscape2.png";
  const LOGO_DARK = "https://raw.githubusercontent.com/KiddRwxSsj/vitagit-db/main/vitagitDBlogolletersnobglandscape.png";
  const GITHUB_ICON_LIGHT = "assets/img/github-light.png";
  const GITHUB_ICON_DARK = "assets/img/github-dark.png";
  const STORAGE_KEY = "vitagit-theme";

  const toggle = document.querySelector("#themeToggle");
  const logo = document.querySelector("#siteLogo");
  const githubIcon = document.querySelector("#githubIcon");
  if (!toggle) return;

  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (logo) logo.src = theme === "dark" ? LOGO_DARK : LOGO_LIGHT;
    if (githubIcon) githubIcon.src = theme === "dark" ? GITHUB_ICON_DARK : GITHUB_ICON_LIGHT;
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  applyTheme(initial);

  toggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.classList.add("theme-switching");
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    requestAnimationFrame(() => document.documentElement.classList.remove("theme-switching"));
  });
})();
