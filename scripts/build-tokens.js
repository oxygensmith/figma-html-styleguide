/* this interacts with Styledictionary */

import StyleDictionary from 'style-dictionary';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';

// Auto-discover clients from index-*.html files
function discoverClients() {
  const htmlFiles = readdirSync('./src');
  const tokenFiles = readdirSync('./tokens');

  const clientsWithHTML = [];
  const clientsWithTokens = [];

  htmlFiles.forEach((file) => {
    const match = file.match(/^index-(.+)\.html$/);
    if (match) clientsWithHTML.push(match[1]);
  });

  tokenFiles.forEach((file) => {
    const match = file.match(/^figma-(.+)\.json$/);
    if (match) clientsWithTokens.push(match[1]);
  });

  readdirSync('./tokens', { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      const match = entry.name.match(/^import-(.+)$/);
      if (match && !clientsWithTokens.includes(match[1])) {
        clientsWithTokens.push(match[1]);
      }
    }
  });

  // Find clients that have both HTML and tokens
  const validClients = clientsWithHTML.filter((client) =>
    clientsWithTokens.includes(client)
  );

  // Warn about mismatches
  const htmlOnly = clientsWithHTML.filter(
    (client) => !clientsWithTokens.includes(client)
  );
  const tokensOnly = clientsWithTokens.filter(
    (client) => !clientsWithHTML.includes(client)
  );

  if (htmlOnly.length > 0) {
    console.warn(
      `\n⚠️  HTML files without matching tokens: ${htmlOnly.join(', ')}`
    );
    console.warn(`   Add figma-{client}.json files for these clients`);
  }

  if (tokensOnly.length > 0) {
    console.warn(
      `\n⚠️  Token files without matching HTML: ${tokensOnly.join(', ')}`
    );
    console.warn(`   Add index-{client}.html files for these clients`);
  }

  if (validClients.length === 0) {
    console.error(
      '\n❌ No valid client pairs found (need both index-*.html and tokens)'
    );
    process.exit(1);
  }

  return validClients;
}

const clients = discoverClients();

console.log(
  `\n🔍 Discovered ${clients.length} client(s): ${clients.join(', ')}`
);

// Define unit rules - checks if key appears anywhere in the token path
const units = {
  'line-height': '', // unitless
  'letter-spacing': 'em',
  'border-width': 'px',
  artboard: 'px',
  'max-width': 'px',
  spacing: 'rem',
  radius: 'rem',
  padding: 'rem',
  margin: 'rem',
};

// Function to add unit metadata to tokens
function addUnitMetadata(obj) {
  for (let key in obj) {
    if (obj[key].type && obj[key].value !== undefined) {
      for (let unitKey in units) {
        if (key.includes(unitKey)) {
          obj[key].unit = units[unitKey];
          break;
        }
      }
    } else if (typeof obj[key] === 'object') {
      addUnitMetadata(obj[key]);
    }
  }
  return obj;
}

// Filter function to remove text style objects from typography
function filterTextStyles(obj) {
  const filtered = {};
  for (let key in obj) {
    if (obj[key].fontSize || obj[key].fontFamily) {
      continue;
    }
    if (typeof obj[key] === 'object' && !obj[key].type) {
      filtered[key] = filterTextStyles(obj[key]);
    } else {
      filtered[key] = obj[key];
    }
  }
  return filtered;
}

// ============================================
// REGISTER STYLE DICTIONARY TRANSFORMS & FORMATS
// (Only register once, before the loop)
// ============================================

StyleDictionary.registerTransform({
  name: 'name/double-dash',
  type: 'name',
  transform: (token) => token.path.join('--'),
});

StyleDictionary.registerFormat({
  name: 'css/variables-with-references',
  format: ({ dictionary }) => {
    const systemFontStack =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

    // Separate collections
    const primitiveTokens = dictionary.allTokens.filter(
      (token) => token.path[0] === 'primitives'
    );
    const typographyTokens = dictionary.allTokens.filter(
      (token) => token.path[0] === 'typography'
    );
    const blocksTokens = dictionary.allTokens.filter(
      (token) => token.path[0] === 'blocks'
    );
    const semanticTokens = dictionary.allTokens.filter(
      (token) =>
        token.path[0] !== 'primitives' &&
        token.path[0] !== 'typography' &&
        token.path[0] !== 'blocks'
    );

    // Helper function to format a token
    const formatToken = (token) => {
      let value = token.value;
      const originalValue = token.original?.value || token.value;

      if (typeof originalValue === 'string' && originalValue.includes('{')) {
        const ref = originalValue.match(/\{([^}]+)\}/)[1];
        const cleanRef = ref
          .replace('primitives.', '')
          .replace('typography.', '')
          .replace('blocks.', '')
          .replace('color.', '');
        const varName = '--' + cleanRef.split('.').join('--');
        value = `var(${varName})`;
      } else if (
        token.type === 'dimension' &&
        typeof token.value === 'number'
      ) {
        const tokenPath = token.path.join('--');

        if (tokenPath.includes('line-height')) {
          value = token.value >= 10 ? token.value / 16 : token.value;
        } else {
          const unit = token.unit || 'rem';

          if (unit === '') {
            value = token.value / 16;
          } else if (unit === 'px') {
            value = `${token.value}px`;
          } else if (unit === 'em' || unit === 'rem') {
            value = `${token.value / 16}${unit}`;
          } else {
            value = `${token.value}${unit}`;
          }
        }
      } else if (
        token.type === 'string' &&
        token.path.includes('font-family')
      ) {
        const fontName = token.value;
        const quotedFont = fontName.includes(' ') ? `"${fontName}"` : fontName;
        value = `${quotedFont}, ${systemFontStack}`;
      }

      const path = token.path.filter(
        (p) =>
          p !== 'primitives' &&
          p !== 'typography' &&
          p !== 'blocks' &&
          p !== 'tokens' &&
          p !== 'color'
      );
      return `  --${path.join('--')}: ${value};`;
    };

    // Helper function to group tokens by category
    const groupByCategory = (tokens) => {
      const groups = {};
      tokens.forEach((token) => {
        const path = token.path.filter(
          (p) =>
            p !== 'primitives' &&
            p !== 'typography' &&
            p !== 'blocks' &&
            p !== 'color'
        );
        const category = path[0] || 'other';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(token);
      });
      return groups;
    };

    // Build output with section comments
    let output = ':root {\n';

    // Primitives section
    output += '  /* ==================== */\n';
    output += '  /* PRIMITIVES           */\n';
    output += '  /* ==================== */\n\n';

    const primitiveGroups = groupByCategory(primitiveTokens);
    Object.keys(primitiveGroups)
      .sort()
      .forEach((category) => {
        output += `  /* ${category} */\n`;
        output += primitiveGroups[category].map(formatToken).join('\n');
        output += '\n\n';
      });

    // Typography section
    output += '  /* ==================== */\n';
    output += '  /* TYPOGRAPHY           */\n';
    output += '  /* ==================== */\n\n';

    const typographyGroups = groupByCategory(typographyTokens);
    Object.keys(typographyGroups)
      .sort()
      .forEach((category) => {
        output += `  /* ${category} */\n`;
        output += typographyGroups[category].map(formatToken).join('\n');
        output += '\n\n';
      });

    // Blocks section
    output += '  /* ==================== */\n';
    output += '  /* BLOCKS               */\n';
    output += '  /* ==================== */\n\n';

    const blocksGroups = groupByCategory(blocksTokens);
    Object.keys(blocksGroups)
      .sort()
      .forEach((category) => {
        output += `  /* ${category} */\n`;
        output += blocksGroups[category].map(formatToken).join('\n');
        output += '\n\n';
      });

    // Semantic tokens section (utility tokens)
    output += '  /* ==================== */\n';
    output += '  /* UTILITY TOKENS       */\n';
    output += '  /* ==================== */\n\n';

    const semanticGroups = groupByCategory(semanticTokens);
    Object.keys(semanticGroups)
      .sort()
      .forEach((category) => {
        output += `  /* ${category} */\n`;
        output += semanticGroups[category].map(formatToken).join('\n');
        output += '\n\n';
      });

    output += '}';

    return output;
  },
});

// Register utilities CSS format
StyleDictionary.registerFormat({
  name: 'css/utilities',
  format: ({ dictionary }) => {
    const colorTokens = dictionary.allTokens.filter(
      (token) => token.type === 'color'
    );

    let output = '/* ========================================= */\n';
    output += '/* AUTO-GENERATED UTILITY CLASSES           */\n';
    output += '/* Generated from Figma variables           */\n';
    output += '/* Do not edit manually                     */\n';
    output += '/* ========================================= */\n\n';

    output += '/* COLOR UTILITIES */\n\n';

    colorTokens.forEach((token) => {
      const path = token.path.filter(
        (p) =>
          p !== 'primitives' &&
          p !== 'typography' &&
          p !== 'blocks' &&
          p !== 'color'
      );
      const className = path.join('-').replace(/--/g, '-');
      const varName = '--' + path.join('--');

      // Text color utility
      output += `.has-color-${className} {\n`;
      output += `  color: var(${varName}) !important;\n`;
      output += `}\n\n`;

      // Background color utility
      output += `.has-bg-${className} {\n`;
      output += `  background-color: var(${varName}) !important;\n`;
      output += `}\n\n`;
    });

    output += '/* END COLOR UTILITIES */\n';

    return output;
  },
});

StyleDictionary.registerTransformGroup({
  name: 'custom/css',
  transforms: ['name/double-dash', 'color/hex'],
});

// ============================================
// SIMPLIFIED PIPELINE
// ============================================

let simplifiedRegistered = false;

function ensureSimplifiedRegistered() {
  if (simplifiedRegistered) return;

  StyleDictionary.registerTransform({
    name: 'name/simplified-leaf',
    type: 'name',
    transform: (token) => token.path[token.path.length - 1],
  });

  StyleDictionary.registerTransform({
    name: 'value/dimension-to-rem',
    type: 'value',
    filter: (token) => token.type === 'dimension',
    transform: (token) => {
      const val = token.value;
      if (typeof val === 'string' && val.endsWith('px')) {
        const px = parseFloat(val);
        if (!isNaN(px)) return `${parseFloat((px / 16).toFixed(4))}rem`;
      }
      return val;
    },
  });

  StyleDictionary.registerTransformGroup({
    name: 'simplified/css',
    transforms: ['name/simplified-leaf', 'color/hex', 'value/dimension-to-rem'],
  });

  StyleDictionary.registerFormat({
    name: 'css/simplified-variables',
    format: ({ dictionary, options }) => {
      const meta = options?.meta || {};
      const allLeafNames = new Set(dictionary.allTokens.map((t) => t.path[t.path.length - 1]));
      function getFontFallback(token) {
        const leaf = token.path[token.path.length - 1];
        if (!leaf.startsWith('font-family-')) return null;
        const orig = token.original?.$value ?? token.original?.value ?? '';
        if (typeof orig === 'string' && /^\{[^}]+\}$/.test(orig)) return null;
        const suffix = leaf.replace(/^font-family-/, '');
        return allLeafNames.has(`fallback-${suffix}`) ? `var(--fallback-${suffix})` : null;
      }

      function getVarValue(token) {
        const orig = token.original?.$value ?? token.original?.value;
        if (typeof orig === 'string' && /^\{[^}]+\}$/.test(orig)) {
          const leaf = orig.slice(1, -1).split('.').pop();
          return `var(--${leaf})`;
        }
        const val = token.value !== undefined ? token.value : orig;
        if (typeof val === 'number') {
          return parseFloat(val.toFixed(4)).toString();
        }
        if (typeof val === 'string' && val.endsWith('px')) {
          const px = parseFloat(val);
          if (!isNaN(px)) return `${parseFloat((px / 16).toFixed(4))}rem`;
        }
        if (typeof val === 'string') {
          const m = val.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
          if (m) {
            const hex = (n) => parseInt(n).toString(16).padStart(2, '0');
            const base = `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
            return m[4] !== undefined
              ? base + Math.round(parseFloat(m[4]) * 255).toString(16).padStart(2, '0')
              : base;
          }
        }
        return val;
      }

      const byFile = {};
      for (const token of dictionary.allTokens) {
        const slug = path.basename(token.filePath || '', '.json') || 'unknown';
        if (!byFile[slug]) byFile[slug] = [];
        byFile[slug].push(token);
      }

      let output = '';

      if (options?.googleFonts?.length) {
        const families = options.googleFonts.map((f) => `family=${f.replace(/ /g, '+')}`).join('&');
        output += `@import url('https://fonts.googleapis.com/css2?${families}&display=swap');\n`;
      }

      if (options?.typekitId) {
        output += `@import url('https://use.typekit.net/${options.typekitId}.css');\n`;
      }

      if (output) output += '\n';

      output += ':root {\n';

      const collectionOrder = options?.collectionOrder;
      const sortedSlugs = Object.keys(byFile).sort((a, b) => {
        if (collectionOrder) {
          const ai = collectionOrder.indexOf(a);
          const bi = collectionOrder.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
        }
        if (a === 'primitives') return -1;
        if (b === 'primitives') return 1;
        if (a.startsWith('tokens-') && b.startsWith('components-')) return -1;
        if (a.startsWith('components-') && b.startsWith('tokens-')) return 1;
        return a.localeCompare(b);
      });

      for (const slug of sortedSlugs) {
        const collectionName = meta[slug] || slug;
        const collectionTokens = byFile[slug];

        output += `\n  /* ${'='.repeat(26)} */\n`;
        output += `  /* ${collectionName} */\n`;
        output += `  /* ${'='.repeat(26)} */\n\n`;

        const byGroup = {};
        for (const token of collectionTokens) {
          const group = token.path.slice(0, -1).join(' > ') || null;
          if (!byGroup[group]) byGroup[group] = [];
          byGroup[group].push(token);
        }

        for (const group of Object.keys(byGroup).sort()) {
          if (group) output += `  /* ${group} */\n`;
          for (const token of byGroup[group].sort((a, b) => a.name.localeCompare(b.name))) {
            const leaf = token.path[token.path.length - 1];
            const tokenType = token.type || token.original?.$type;
            const isNote = leaf.toLowerCase().startsWith('note') && tokenType === 'string';
            if (isNote) {
              const noteText = token.value ?? token.original?.$value;
              output += `  /* ${noteText} */\n`;
            } else {
              let tokenValue = getVarValue(token);
              const fallback = getFontFallback(token);
              if (fallback) tokenValue = `${tokenValue}, ${fallback}`;
              output += `  --${leaf}: ${tokenValue};\n`;
            }
          }
          output += '\n';
        }
      }

      output += '}';
      return output;
    },
  });

  StyleDictionary.registerFormat({
    name: 'css/simplified-utilities',
    format: ({ dictionary }) => {
      const colorTokens = dictionary.allTokens.filter(
        (t) => t.type === 'color' || t.original?.$type === 'color'
      );
      let output = '/* AUTO-GENERATED COLOR UTILITIES */\n\n';
      for (const token of colorTokens) {
        const leaf = token.path[token.path.length - 1];
        if (leaf.toLowerCase().startsWith('note')) continue;
        output += `.has-color-${leaf} { color: var(--${leaf}) !important; }\n`;
        output += `.has-bg-${leaf} { background-color: var(--${leaf}) !important; }\n\n`;
      }
      return output;
    },
  });

  simplifiedRegistered = true;
}

async function buildSimplified(client, clientConfig) {
  const importDir = `./tokens/import-${client}`;

  if (!existsSync(importDir)) {
    console.error(`❌ Import directory not found: ${importDir}`);
    console.error(`   Run: node scripts/import-tokens.js <zip-path> ${client}`);
    return;
  }

  const meta = JSON.parse(readFileSync(path.join(importDir, '_meta.json'), 'utf8'));
  const excludeCollections = clientConfig.excludeCollections || [];

  const sourceFiles = readdirSync(importDir)
    .filter((f) => f.endsWith('.json') && f !== '_meta.json')
    .filter((f) => !excludeCollections.includes(path.basename(f, '.json')))
    .map((f) => path.join(importDir, f));

  if (sourceFiles.length === 0) {
    console.error(`❌ No token files found in ${importDir}`);
    return;
  }

  ensureSimplifiedRegistered();

  const config = {
    log: { verbosity: 'verbose' },
    usesDtcg: true,
    source: sourceFiles,
    platforms: {
      css: {
        transformGroup: 'simplified/css',
        buildPath: './build/css/',
        files: [
          { destination: `variables-${client}.css`, format: 'css/simplified-variables', options: { meta, collectionOrder: clientConfig.collectionOrder, googleFonts: clientConfig.googleFonts, typekitId: clientConfig.typekitId } },
          { destination: `utilities-${client}.css`, format: 'css/simplified-utilities' },
        ],
      },
    },
  };

  const sd = new StyleDictionary(config);
  await sd.buildAllPlatforms();

  console.log(`✅ Built variables-${client}.css and utilities-${client}.css (simplified)`);
}

// ============================================
// PROCESS EACH CLIENT
// ============================================

for (const client of clients) {
  console.log(`\n🎨 Building tokens for: ${client.toUpperCase()}`);

  const configPath = `./tokens/config-${client}.json`;
  const clientConfig = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf8'))
    : null;

  if (clientConfig?.pipeline === 'simplified') {
    await buildSimplified(client, clientConfig);
    continue;
  }

  const figmaExportPath = `./tokens/figma-${client}.json`;

  try {
    const figmaExport = JSON.parse(readFileSync(figmaExportPath, 'utf8'));

    // Keep the nested structure
    let tokens = {
      primitives: figmaExport['primitives'] || {},
      typography: figmaExport['typography']
        ? filterTextStyles(figmaExport['typography'])
        : {},
      blocks: figmaExport['blocks'] || {},
      tokens: figmaExport['tokens'] || {}, // ✅ Keep tokens as a nested object
    };

    // Add unit metadata
    tokens = addUnitMetadata(tokens);

    // Write the tokens for Style Dictionary
    writeFileSync(
      `./tokens/tokens-${client}.json`,
      JSON.stringify(tokens, null, 2)
    );

    // Build configuration for this client
    const config = {
      log: {
        verbosity: 'verbose',
      },
      source: [`tokens/tokens-${client}.json`],
      platforms: {
        css: {
          transformGroup: 'custom/css',
          buildPath: `./build/css/`,
          files: [
            {
              destination: `variables-${client}.css`,
              format: 'css/variables-with-references',
            },
            {
              destination: `utilities-${client}.css`,
              format: 'css/utilities',
            },
          ],
        },
      },
    };

    const sd = new StyleDictionary(config);
    await sd.buildAllPlatforms();

    console.log(`✅ Built variables-${client}.css and utilities-${client}.css`);
  } catch (error) {
    console.error(`❌ Error building ${client}: ${error.message}`);
    console.log(`   Make sure ./tokens/figma-${client}.json exists`);
  }
}

console.log('\n✨ All client tokens built successfully!');

// Debug: Check if files exist
console.log('\n=== Checking generated files ===');
clients.forEach((client) => {
  console.log(`${client}:`);
  console.log(
    `  variables-${client}.css exists:`,
    existsSync(`./build/css/variables-${client}.css`)
  );
  console.log(
    `  utilities-${client}.css exists:`,
    existsSync(`./build/css/utilities-${client}.css`)
  );
});
