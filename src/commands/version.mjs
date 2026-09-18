import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE_ROOT } from "../lib/paths.mjs";

export function readPackageVersion() {
  const pkg = JSON.parse(
    readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"),
  );
  return pkg.version;
}

export async function versionCmd() {
  console.log(readPackageVersion());
}
