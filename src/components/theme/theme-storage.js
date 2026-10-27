export const THEME_STORAGE_KEY = "smash-kameti-theme";

export const THEME_COOKIE_MAX_AGE = 31536000;

export function resolveTheme(value) {
  return value === "light" ? "light" : "dark";
}

export function persistThemeCookie(theme) {
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}
