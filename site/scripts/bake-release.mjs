// Saves the latest GitHub release into src/generated/release.json before a build.
// The pages still ask GitHub for the newest release when they load; this copy is
// what they show first, and what stays if GitHub can't be reached.
// Without network it keeps the copy that is already there.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "shakaibarsalan/BudsBridge";
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../src/generated/release.json");

async function get(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "budsbridge-site-build",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res;
}

async function checksums(release) {
  const sums = release.assets.find((a) => a.name === "SHA256SUMS.txt");
  if (!sums) return {};
  const text = await (await get(sums.browser_download_url)).text();
  return Object.fromEntries(
    text
      .split("\n")
      .map((line) => line.trim().match(/^([0-9a-f]{64})\s+\*?(.+)$/i))
      .filter(Boolean)
      .map((m) => [m[2], m[1].toLowerCase()]),
  );
}

try {
  const release = await (await get(`https://api.github.com/repos/${REPO}/releases/latest`)).json();
  const sha256 = await checksums(release).catch(() => ({}));
  const data = {
    tag: release.tag_name,
    name: release.name,
    publishedAt: release.published_at,
    url: release.html_url,
    body: release.body ?? "",
    assets: release.assets.map((a) => ({
      name: a.name,
      size: a.size,
      url: a.browser_download_url,
      downloads: a.download_count,
      sha256: sha256[a.name] ?? null,
    })),
  };
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(data, null, 2) + "\n");
  console.log(`bake-release: ${data.tag}, ${data.assets.length} files`);
} catch (err) {
  try {
    const kept = JSON.parse(await readFile(out, "utf8"));
    console.warn(`bake-release: GitHub unreachable (${err.message}); keeping ${kept.tag}`);
  } catch {
    console.error(`bake-release: GitHub unreachable and no saved release: ${err.message}`);
    process.exit(1);
  }
}
