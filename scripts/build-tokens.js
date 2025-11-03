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
      '\n❌ No valid client pairs found (need both index-*.html and figma-*.json)'
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
// PROCESS EACH CLIENT
// ============================================

for (const client of clients) {
  console.log(`\n🎨 Building tokens for: ${client.toUpperCase()}`);

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
