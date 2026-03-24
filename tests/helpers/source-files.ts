import fs from "node:fs/promises";
import path from "node:path";

export function repoPath(...segments: string[]) {
  return path.resolve(process.cwd(), ...segments);
}

export async function readRepoFile(...segments: string[]) {
  return fs.readFile(repoPath(...segments), "utf8");
}

export function normalizeSource(source: string) {
  return source.replace(/\r\n/g, "\n");
}

export function sourceContainsAll(source: string, fragments: string[]) {
  const normalizedSource = normalizeSource(source).toLowerCase();

  return fragments.every((fragment) =>
    normalizedSource.includes(fragment.toLowerCase())
  );
}

export function sourceContainsNone(source: string, fragments: string[]) {
  const normalizedSource = normalizeSource(source).toLowerCase();

  return fragments.every(
    (fragment) => !normalizedSource.includes(fragment.toLowerCase())
  );
}
