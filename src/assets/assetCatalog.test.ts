import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { IMAGE_ASSETS } from "./assetCatalog";
import { PUBLIC_ASSET_FILES } from "./assetPaths";

function flattenPaths(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(flattenPaths);
}

function assertExactCase(relativePath: string): void {
  let current = join(process.cwd(), "public");
  for (const segment of relativePath.split("/")) {
    const entries = readdirSync(current);
    assert.ok(
      entries.includes(segment),
      `Path casing mismatch at "${segment}" in "${relativePath}".`,
    );
    current = join(current, segment);
  }
}

test("every declared public asset exists with exact filename casing", () => {
  const files = flattenPaths(PUBLIC_ASSET_FILES);
  assert.equal(new Set(files).size, files.length);

  for (const file of files) {
    assert.match(file, /\.(png|webp)$/);
    assert.ok(existsSync(join(process.cwd(), "public", file)), `Missing asset: ${file}`);
    assertExactCase(file);
  }
});

test("Phaser preload keys are unique and point to declared files", () => {
  const keys = IMAGE_ASSETS.map((asset) => asset.key);
  assert.equal(new Set(keys).size, keys.length);

  const declared = new Set(flattenPaths(PUBLIC_ASSET_FILES));
  for (const asset of IMAGE_ASSETS) {
    const matched = [...declared].some((file) => asset.path.endsWith(file));
    assert.ok(matched, `Unknown preload path for key "${asset.key}": ${asset.path}`);
  }
});
