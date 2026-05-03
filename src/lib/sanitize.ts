import DOMPurify from "dompurify";

/**
 * Sanitise du HTML provenant d'une source non fiable (ex: contenu de cours
 * stocké en base, posts utilisateurs riches…). Bloque tout JS, balises
 * dangereuses, gestionnaires d'événements, javascript: URIs, etc.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "em", "strong", "u", "s",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "span", "div", "hr",
    ],
    ALLOWED_ATTR: ["href", "title", "alt", "src", "class", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "style"],
  });
}

/**
 * Échappe une chaîne pour insertion sûre dans du texte HTML brut.
 * Utiliser uniquement quand on ne peut pas passer par React (cas rare).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Vérifie qu'une URL d'embed vidéo provient d'un domaine de confiance.
 * Utilisé par VideoPlayer pour empêcher les iframes arbitraires.
 */
const ALLOWED_VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "vimeo.com",
]);

export function isSafeVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_VIDEO_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}