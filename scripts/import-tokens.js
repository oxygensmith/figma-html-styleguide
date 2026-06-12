import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'fs';
import path from 'path';

const [,, zipPath, clientSlug] = process.argv;

if (!zipPath || !clientSlug) {
  console.error('Usage: node scripts/import-tokens.js <path-to-zip> <client-slug>');
  console.error('Example: node scripts/import-tokens.js ~/Downloads/tokens.zip chroma');
  process.exit(1);
}

const resolvedZip = path.resolve(zipPath);
const outDir = `./tokens/import-${clientSlug}`;
const tmpDir = `./tokens/.tmp-${clientSlug}`;

if (!existsSync(resolvedZip)) {
  console.error(`❌ Zip file not found: ${resolvedZip}`);
  process.exit(1);
}

if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

console.log(`\n📦 Unzipping ${path.basename(resolvedZip)}...`);
execSync(`unzip -q "${resolvedZip}" -d "${tmpDir}"`);

function findJsonFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

const jsonFiles = findJsonFiles(tmpDir);
const meta = {};

console.log(`\n🗂  Processing ${jsonFiles.length} collection(s):\n`);

for (const filePath of jsonFiles.sort()) {
  const slug = path.basename(filePath, '.json');
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));

  const collectionName =
    raw.$extensions?.figma?.collection?.name ||
    slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  meta[slug] = collectionName;

  const { $extensions, ...tokens } = raw;

  writeFileSync(
    path.join(outDir, `${slug}.json`),
    JSON.stringify(tokens, null, 2)
  );

  console.log(`  ✓ ${slug}.json  →  "${collectionName}"`);
}

writeFileSync(path.join(outDir, '_meta.json'), JSON.stringify(meta, null, 2));
rmSync(tmpDir, { recursive: true });

console.log(`\n✅ Imported ${jsonFiles.length} files to tokens/import-${clientSlug}/`);
console.log(`   Next: npm run tokens (or npm run build)\n`);
