const BASE = import.meta.env.BASE_URL;

/** A link inside this site that still works when the site lives under a sub-path. */
export function site(path = "") {
  return BASE + path.replace(/^\//, "");
}

export const DOWNLOAD_PAGE = site("download/");
export const HOME = site("");
