import { execSync } from 'child_process';
import { readdirSync, renameSync, existsSync } from 'fs';

// Discover clients from src/index-*.html files
const srcFiles = readdirSync('./src');
const clients = srcFiles
  .filter((f) => f.startsWith('index-') && f.endsWith('.html'))
  .map((f) => f.match(/index-(.+)\.html/)[1]);

if (clients.length === 0) {
  console.error('❌ No index-*.html files found in ./src/');
  process.exit(1);
}

console.log(
  `\n🏗️  Building ${clients.length} client(s): ${clients.join(', ')}\n`
);

// Build each client to its own dist subfolder
clients.forEach((client, index) => {
  console.log(
    `📦 [${index + 1}/${clients.length}] Building ${client.toUpperCase()}...`
  );

  try {
    execSync(
      `parcel build src/index-${client}.html --dist-dir dist/${client} --public-url ./`,
      {
        stdio: 'inherit',
      }
    );

    console.log(`\n   🔍 Checking output files in dist/${client}/...`);

    // Check if Parcel created index-{client}.html instead of index.html
    const wrongName = `dist/${client}/index-${client}.html`;
    const correctName = `dist/${client}/index.html`;

    console.log(`   Looking for: ${wrongName}`);
    console.log(`   Target name: ${correctName}`);

    if (existsSync(wrongName)) {
      console.log(`   ✓ Found ${wrongName}`);

      if (existsSync(correctName)) {
        console.log(
          `   ⚠️  ${correctName} already exists, removing old file first`
        );
        // If index.html already exists, remove it first
        execSync(`rm "${correctName}"`);
      }

      console.log(`   🔄 Renaming index-${client}.html → index.html`);
      renameSync(wrongName, correctName);
      console.log(`   ✓ Rename successful`);
    } else if (existsSync(correctName)) {
      console.log(`   ✓ Already named correctly as index.html`);
    } else {
      console.log(`   ⚠️  Neither index-${client}.html nor index.html found!`);
      console.log(`   📂 Files in dist/${client}/:`);
      const files = readdirSync(`dist/${client}/`);
      files.forEach((f) => console.log(`      - ${f}`));
    }

    console.log(`✅ ${client} built to dist/${client}/\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${client}`);
    console.error(`Error details: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
});

console.log(`\n✨ All clients built successfully!`);
console.log(`\n📂 Output structure:`);
clients.forEach((client) => {
  console.log(`   dist/${client}/`);
  console.log(`   └── index.html`);
});
console.log(`\n🌐 Access at:`);
clients.forEach((client) => {
  console.log(`   http://localhost:8080/${client}/`);
});
console.log('');

// Generate the landing page
console.log('🎨 Generating landing page...\n');
execSync('node scripts/generate-index.js', { stdio: 'inherit' });
