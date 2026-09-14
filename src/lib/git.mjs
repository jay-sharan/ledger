import { execFileSync } from "node:child_process";

export function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export function tryGit(cwd, args) {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

export function workingTreeDirty(cwd) {
  const porcelain = tryGit(cwd, ["status", "--porcelain"]);
  return porcelain !== null && porcelain.length > 0;
}
