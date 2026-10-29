import { useEffect, useState } from "react";
import baked from "../generated/release.json";

export const REPO = "shakaibarsalan/BudsBridge";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;

export type Asset = {
  name: string;
  size: number;
  url: string;
  downloads: number;
  sha256: string | null;
};

export type Release = {
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
  body: string;
  assets: Asset[];
};

export type Picked = {
  release: Release;
  installer: Asset | null;
  portable: Asset | null;
  sums: Asset | null;
  /** true once the newest release came back from GitHub, false while showing the copy saved at build time */
  live: boolean;
};

const CACHE_KEY = "bb-release-v1";
const CACHE_MS = 10 * 60 * 1000;

type GhAsset = { name: string; size: number; browser_download_url: string; download_count: number };
type GhRelease = {
  tag_name: string;
  name: string | null;
  published_at: string;
  html_url: string;
  body: string | null;
  assets: GhAsset[];
  draft?: boolean;
  prerelease?: boolean;
};

export function fromGitHub(r: GhRelease, known: Release = baked as Release): Release {
  // Checksums only come with the build-time copy; keep them when the file is the same one.
  const sameTag = r.tag_name === known.tag;
  return {
    tag: r.tag_name,
    name: r.name ?? r.tag_name,
    publishedAt: r.published_at,
    url: r.html_url,
    body: r.body ?? "",
    assets: r.assets.map((a) => ({
      name: a.name,
      size: a.size,
      url: a.browser_download_url,
      downloads: a.download_count,
      sha256: sameTag ? (known.assets.find((k) => k.name === a.name)?.sha256 ?? null) : null,
    })),
  };
}

export function pick(release: Release, live: boolean): Picked {
  return {
    release,
    installer: release.assets.find((a) => /setup\.exe$/i.test(a.name)) ?? null,
    portable: release.assets.find((a) => /^BudsBridge\.exe$/i.test(a.name)) ?? null,
    sums: release.assets.find((a) => /sha256sums/i.test(a.name)) ?? null,
    live,
  };
}

function readCache(): Release | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, release } = JSON.parse(raw) as { at: number; release: Release };
    return Date.now() - at < CACHE_MS ? release : null;
  } catch {
    return null;
  }
}

function writeCache(release: Release) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), release }));
  } catch {
    /* private mode: fine, we just ask GitHub again next time */
  }
}

let inflight: Promise<Release> | null = null;

export function fetchLatest(): Promise<Release> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  inflight ??= fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((res) => {
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      return res.json() as Promise<GhRelease>;
    })
    .then((r) => {
      const release = fromGitHub(r);
      writeCache(release);
      return release;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The newest release: the build-time copy at once, then GitHub's answer when it arrives. */
export function useLatestRelease(): Picked {
  const [state, setState] = useState<Picked>(() => {
    const cached = readCache();
    return cached ? pick(cached, true) : pick(baked as Release, false);
  });
  useEffect(() => {
    let alive = true;
    fetchLatest()
      .then((r) => alive && setState(pick(r, true)))
      .catch(() => {
        /* rate limit or offline: the saved copy stays, and its links still work */
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export type OlderRelease = { tag: string; publishedAt: string; url: string; prerelease: boolean };

export async function fetchAllReleases(): Promise<OlderRelease[]> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const list = (await res.json()) as GhRelease[];
  return list
    .filter((r) => !r.draft)
    .map((r) => ({ tag: r.tag_name, publishedAt: r.published_at, url: r.html_url, prerelease: !!r.prerelease }));
}

export function version(tag: string) {
  return tag.replace(/^v/, "");
}
