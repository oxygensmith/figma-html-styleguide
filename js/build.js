import StyleDictionary from 'style-dictionary';
import { readFileSync, writeFileSync } from 'fs';

// Read the Figma export
const figmaExport = JSON.parse(
  readFileSync('./tokens/figma-export.json', 'utf8')
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
  // Add more as needed
};

// Function to add unit metadata to tokens
function addUnitMetadata(obj) {
  for (let key in obj) {
    if (obj[key].type && obj[key].value !== undefined) {
      // It's a token - check if any unit rule matches the path
      for (let unitKey in units) {
        if (key.includes(unitKey)) {
          obj[key].unit = units[unitKey];
          break; // Use first match
        }
      }
    } else if (typeof obj[key] === 'object') {
      // It's a group - recurse
      addUnitMetadata(obj[key]);
    }
  }
  return obj;
}

// Filter function to remove text style objects from typography
function filterTextStyles(obj) {
  const filtered = {};
  for (let key in obj) {
    // Skip if it's a text style object (has fontSize, fontFamily properties)
    if (obj[key].fontSize || obj[key].fontFamily) {
      continue;
    }
    // If it's a group, recurse
    if (typeof obj[key] === 'object' && !obj[key].type) {
      filtered[key] = filterTextStyles(obj[key]);
    } else {
      // It's a variable, keep it
      filtered[key] = obj[key];
    }
  }
  return filtered;
}

// Keep the nested structure
let tokens = {
  primitives: figmaExport['primitives'],
  typography: filterTextStyles(figmaExport['typography']),
  blocks: figmaExport['blocks'], // Add blocks collection
  ...figmaExport['tokens'],
};

// Add unit metadata
tokens = addUnitMetadata(tokens);

// Write the tokens for Style Dictionary
writeFileSync('./tokens/tokens.json', JSON.stringify(tokens, null, 2));

// Register custom name transform with double dashes
StyleDictionary.registerTransform({
  name: 'name/double-dash',
  type: 'name',
  transform: (token) => {
    return token.path.join('--');
  },
});

// Register custom CSS format that preserves references as var()
StyleDictionary.registerFormat({
  name: 'css/variables-with-references',
  format: ({ dictionary }) => {
    // Define system font stacks (Bootstrap 5 defaults)
    const systemFontStack =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
    const serifFontStack = 'Georgia, "Times New Roman", Times, serif';

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
    // Helper function to format a token
    const formatToken = (token) => {
      let value = token.value;

      const originalValue = token.original?.value || token.value;

      if (typeof originalValue === 'string' && originalValue.includes('{')) {
        const ref = originalValue.match(/\{([^}]+)\}/)[1];
        // Remove 'primitives.', 'typography.', 'blocks.', and 'color.' from references
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

        // HANDLE LINE-HEIGHT FIRST (before checking unit)
        if (tokenPath.includes('line-height')) {
          // Line-height: if value is very small (< 10), it's a ratio (unitless)
          // If it's large (>= 10), it's in pixels and needs to be converted to ratio
          value = token.value >= 10 ? token.value / 16 : token.value;
        } else {
          // For non-line-height values, use unit logic
          const unit = token.unit || 'rem';

          if (unit === '') {
            // Other unitless values divide by 16
            value = token.value / 16;
          } else if (unit === 'px') {
            // Keep as pixels
            value = `${token.value}px`;
          } else if (unit === 'em' || unit === 'rem') {
            // Convert to em or rem
            value = `${token.value / 16}${unit}`;
          } else {
            // Fallback
            value = `${token.value}${unit}`;
          }
        }
      } else if (
        token.type === 'string' &&
        token.path.includes('font-family')
      ) {
        // Add fallback font stack to font-family values
        const fontName = token.value;

        // Add quotes if font name has spaces
        const quotedFont = fontName.includes(' ') ? `"${fontName}"` : fontName;

        // Add universal fallback stack
        value = `${quotedFont}, ${systemFontStack}`;
      }

      // Remove 'primitives', 'typography', 'blocks', and 'color' from the path
      const path = token.path.filter(
        (p) =>
          p !== 'primitives' &&
          p !== 'typography' &&
          p !== 'blocks' &&
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

// Register custom transform group
StyleDictionary.registerTransformGroup({
  name: 'custom/css',
  transforms: ['name/double-dash', 'color/hex'],
});

// Build configuration
const config = {
  log: {
    verbosity: 'verbose',
  },
  source: ['tokens/tokens.json'],
  platforms: {
    css: {
      transformGroup: 'custom/css',
      buildPath: '../build/css/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables-with-references',
        },
      ],
    },
  },
};

const sd = new StyleDictionary(config);
await sd.buildAllPlatforms();
