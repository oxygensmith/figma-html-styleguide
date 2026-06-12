// Function to convert CSS variable name to human-readable format
function formatVariableName(varName) {
  // Remove -- prefix and split by --
  const parts = varName.replace(/^--/, '').split('--');

  // Filter out common prefixes we don't want in the display name
  const filteredParts = parts.filter(
    (part) => !['brand', 'color'].includes(part.toLowerCase())
  );

  // Capitalize each part and join with spaces
  return filteredParts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Function to get a specific CSS variable value
function getCSSVariable(varName) {
  const allStyles = getComputedStyle(document.documentElement);

  // Try to get from computed styles first
  let value = allStyles.getPropertyValue(varName).trim();
  if (value) return value;

  // If not found, check stylesheets directly
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sheet = document.styleSheets[i];
      if (!sheet.cssRules) continue;

      for (let rule of sheet.cssRules) {
        if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === ':root') {
          const style = rule.style;
          value = style.getPropertyValue(varName).trim();
          if (value) return value;
        }
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

// Function to get all CSS variables that match a pattern
function getColorVariables(pattern) {
  const variables = [];

  // Get all CSS custom properties
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sheet = document.styleSheets[i];
      if (!sheet.cssRules) continue;

      for (let rule of sheet.cssRules) {
        if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === ':root') {
          const style = rule.style;
          for (let j = 0; j < style.length; j++) {
            const prop = style[j];
            if (prop.startsWith('--') && prop.includes(pattern)) {
              const value = style.getPropertyValue(prop).trim();
              // Only include if it's a hex color (not a var() reference)
              if (value.startsWith('#')) {
                variables.push({
                  name: prop,
                  value: value,
                  humanName: formatVariableName(prop),
                });
              }
            }
          }
        }
      }
    } catch (e) {
      continue;
    }
  }

  return variables;
}

// Build a flat map of all :root CSS custom properties
function buildPropertyMap() {
  const props = {};
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sheet = document.styleSheets[i];
      if (!sheet.cssRules) continue;
      for (let rule of sheet.cssRules) {
        if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === ':root') {
          const style = rule.style;
          for (let j = 0; j < style.length; j++) {
            const prop = style[j];
            props[prop] = style.getPropertyValue(prop).trim();
          }
        }
      }
    } catch (e) {}
  }
  return props;
}

// Follow var() reference chains within a property map
function resolveVarChain(value, propMap, depth = 0) {
  if (depth > 5 || !value.startsWith('var(')) return value;
  const match = value.match(/^var\(\s*(--[^,\s)]+)/);
  if (!match || !propMap[match[1]]) return value;
  return resolveVarChain(propMap[match[1]], propMap, depth + 1);
}

// Cached prop map + convenience resolver
let _cachedPropMap = null;
function resolveVar(varName) {
  if (!_cachedPropMap) _cachedPropMap = buildPropertyMap();
  const raw = _cachedPropMap[varName];
  return raw ? resolveVarChain(raw, _cachedPropMap) : null;
}

// Get all color variables with var() references resolved to hex
function getAllColorVariablesResolved() {
  const propMap = buildPropertyMap();
  const variables = [];
  for (const [prop, raw] of Object.entries(propMap)) {
    const resolved = resolveVarChain(raw, propMap);
    if (resolved && resolved.startsWith('#')) {
      variables.push({ name: prop, value: resolved, humanName: formatVariableName(prop) });
    }
  }
  return variables;
}

// Categorize resolved color variables into the 5 simplified groups
function categorizeColorsSimplified(all) {
  const cats = { colorTokens: [], brand: [], tints: [], gray: [], utilities: [] };
  const semanticPrefixes = /^(border|text|body|heading|footer|link|btn|bg|form|donate|nav|desktop|mobile|section|logo|header|block|card|dropdown|toggler)/;
  const excludeExact = new Set(['color', 'bg']);
  all.forEach((v) => {
    const n = v.name.replace(/^--/, '');
    if (n.startsWith('color-')) {
      cats.colorTokens.push(v);
    } else if (/gray|black|white/.test(n)) {
      cats.gray.push(v);
    } else if (/translucent|transparent/.test(n)) {
      cats.utilities.push(v);
    } else if (/-\d+$/.test(n)) {
      cats.tints.push(v);
    } else if (!semanticPrefixes.test(n) && !excludeExact.has(n)) {
      cats.brand.push(v);
    }
  });
  return cats;
}

// Function to generate swatch HTML
function generateSwatches(variables, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.innerHTML = '';

  variables.forEach((variable) => {
    const swatchDiv = document.createElement('div');
    swatchDiv.className = 'sg-swatch-container';

    // Check if color needs border (light colors)
    const needsBorder = ['#ffffff', '#fff9eaff', '#fff9ea'].includes(
      variable.value.toLowerCase()
    );

    swatchDiv.innerHTML = `
      <div class="sg-swatch-color ${needsBorder ? 'sg-swatch-border' : ''}" style="background-color: ${variable.value};"></div>
      <p class="small sg-swatch-name"><strong>${variable.humanName}</strong></p>
      <p class="small sg-swatch-variable">${variable.name}</p>
      <p class="small sg-swatch-hex">${variable.value}</p>
    `;
    container.appendChild(swatchDiv);
  });
}

function addTypographyInfo() {
  const typographySection = document.querySelector('.card.mb-lg');
  if (!typographySection) return;

  const isSimplified = window.PIPELINE === 'simplified';

  const simplifiedSizeMap = {
    h1:         ['--heading-h1-xs',  '--heading-h1-md',  '--heading-h1-lg'],
    h2:         ['--heading-h2-xs',  '--heading-h2-md',  '--heading-h2-lg'],
    h3:         ['--heading-h3-xs',  '--heading-h3-md',  '--heading-h3-lg'],
    h4:         ['--heading-h4-xs',  '--heading-h4-md',  '--heading-h4-lg'],
    h5:         ['--heading-h5-xs',  '--heading-h5-md',  '--heading-h5-lg'],
    h6:         ['--heading-h6-xs',  '--heading-h6-md',  '--heading-h6-lg'],
    'p--base':  ['--p-base-xs',      '--p-base-md',      '--p-base-lg'],
    'p--large': ['--p-large-xs',     '--p-large-md',     '--p-large-lg'],
    'p--small': ['--p-small-xs',     '--p-small-md',     '--p-small-lg'],
    display:    ['--display-xs',     '--display-md',     '--display-lg'],
    poster:     ['--poster-xs',      '--poster-md',      '--poster-lg'],
  };

  const simplifiedLHMap = {
    h1: '--leading-tight', h2: '--leading-tight', h3: '--leading-normal',
    h4: '--leading-snug',  h5: '--leading-snug',  h6: '--leading-snug',
    'p--base': '--leading-relaxed', 'p--large': '--leading-relaxed',
    'p--small': '--leading-tight',  display: '--leading-tight', poster: '--leading-tight',
  };

  function val(varName) {
    if (!varName) return '--';
    const v = isSimplified ? resolveVar(varName) : getCSSVariable(varName);
    return (v && v !== 'undefined') ? v : '--';
  }

  function getSizes(type) {
    if (isSimplified) return simplifiedSizeMap[type] || [null, null, null];
    return [`--font-size--${type}--mobile`, `--font-size--${type}--tablet`, `--font-size--${type}--desktop`];
  }

  function getWeight(type, isHeading) {
    if (isSimplified) {
      if (['h1','h2','h3','h4','h5','h6'].includes(type)) return val(`--${type}-font-weight`);
      if (type === 'display' || type === 'poster') return val('--h1-font-weight');
      return val('--base-font-weight');
    }
    return getCSSVariable(`--font-weight--${type}`) ||
      (isHeading ? getCSSVariable('--font-weight--headings') : getCSSVariable('--font-weight--body')) || '--';
  }

  function getLineHeight(type, isHeading) {
    if (isSimplified) return val(simplifiedLHMap[type] || (isHeading ? '--leading-tight' : '--leading-relaxed'));
    return isHeading
      ? getCSSVariable('--line-height--headings') || '--'
      : getCSSVariable('--line-height--p') || getCSSVariable('--line-height--base') || '--';
  }

  function getLetterSpacing(type, isHeading) {
    if (isSimplified) return '--';
    return getCSSVariable(`--letter-spacing--${type}`) ||
      (isHeading ? getCSSVariable('--letter-spacing--headings') : getCSSVariable('--letter-spacing--p')) || '--';
  }

  function buildInfoBox(type, isHeading) {
    const [mobileVar, tabletVar, desktopVar] = getSizes(type);
    const box = document.createElement('div');
    box.className = 'sg-info-box';
    box.innerHTML = `
      <div class="sg-stats-grid">
        <div class="sg-stats-column">
          <div class="sg-breakpoint-label">&nbsp;</div>
          <div class="sg-stat-label">Size</div>
          <div class="sg-stat-label">Weight</div>
          <div class="sg-stat-label">L-spacing</div>
          <div class="sg-stat-label">Line Height</div>
        </div>
        <div class="sg-stats-column">
          <div class="sg-breakpoint-label">Mobile</div>
          <div class="sg-size-value">${val(mobileVar)}</div>
          <div class="sg-stat-value">${getWeight(type, isHeading)}</div>
          <div class="sg-stat-value">${getLetterSpacing(type, isHeading)}</div>
          <div class="sg-stat-value-last">${getLineHeight(type, isHeading)}</div>
        </div>
        <div class="sg-stats-column">
          <div class="sg-breakpoint-label">Tablet</div>
          <div class="sg-size-value">${val(tabletVar)}</div>
          <div class="sg-stat-value">${getWeight(type, isHeading)}</div>
          <div class="sg-stat-value">${getLetterSpacing(type, isHeading)}</div>
          <div class="sg-stat-value-last">${getLineHeight(type, isHeading)}</div>
        </div>
        <div class="sg-stats-column">
          <div class="sg-breakpoint-label">Desktop</div>
          <div class="sg-size-value">${val(desktopVar)}</div>
          <div class="sg-stat-value">${getWeight(type, isHeading)}</div>
          <div class="sg-stat-value">${getLetterSpacing(type, isHeading)}</div>
          <div class="sg-stat-value-last">${getLineHeight(type, isHeading)}</div>
        </div>
      </div>`;
    return box;
  }

  function appendRow(el, type, isHeading, isParagraph, label) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sg-typography-wrapper';

    if (isParagraph) {
      const container = document.createElement('div');
      container.className = 'sg-typography-element';
      const lbl = document.createElement('p');
      if (type === 'p--large') lbl.className = 'large';
      else if (type === 'p--small') lbl.className = 'small';
      lbl.innerHTML = `<strong>${label}</strong>`;
      container.appendChild(lbl);
      ['Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
       'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.'].forEach((text, i) => {
        const p = document.createElement('p');
        if (type === 'p--large') p.className = 'large';
        else if (type === 'p--small') p.className = 'small';
        if (i === 1) p.style.fontStyle = 'italic';
        p.textContent = text;
        container.appendChild(p);
      });
      wrapper.appendChild(container);
      if (el) el.remove();
    } else if (el) {
      const cloned = el.cloneNode(true);
      cloned.className = 'sg-typography-element';
      wrapper.appendChild(cloned);
      el.remove();
    } else {
      const placeholder = document.createElement('p');
      placeholder.className = 'sg-typography-element';
      placeholder.style.fontSize = val(getSizes(type)[2]) || 'inherit';
      placeholder.innerHTML = `<strong>${label}</strong>`;
      wrapper.appendChild(placeholder);
    }

    wrapper.appendChild(buildInfoBox(type, isHeading));
    typographySection.appendChild(wrapper);
  }

  // Headings from HTML
  ['h1','h2','h3','h4','h5','h6'].forEach((tag) => {
    const el = typographySection.querySelector(tag);
    if (el) appendRow(el, tag, true, false, null);
  });

  // Paragraphs
  [
    { selector: 'p.mt-md', type: 'p--base',  label: 'Paragraph (Regular)' },
    { selector: 'p.large', type: 'p--large', label: 'Paragraph (Large)' },
    { selector: 'p.small', type: 'p--small', label: 'Paragraph (Small)' },
  ].forEach(({ selector, type, label }) => {
    const el = typographySection.querySelector(selector);
    if (el) appendRow(el, type, false, true, label);
  });

  // Display and poster — only if their size variables exist
  if (isSimplified) {
    if (resolveVar('--display-lg') || resolveVar('--display-xs')) {
      appendRow(null, 'display', true, false, 'Display');
    }
    if (resolveVar('--poster-lg') || resolveVar('--poster-xs')) {
      appendRow(null, 'poster', true, false, 'Poster');
    }
  }
}

// Function to generate accessibility/WCAG contrast swatches (UPDATED WITH COLOR FILTERING)
async function generateAccessibilitySwatches() {
  const container = document.querySelector('#accessibility-swatches');
  if (!container) return;

  // Get all brand color variables
  const brandColors = window.PIPELINE === 'simplified'
    ? categorizeColorsSimplified(getAllColorVariablesResolved()).brand
    : getColorVariables('brand');

  // Generate all possible combinations
  const combinations = [];
  const uniqueBackgroundColors = new Set();

  for (let i = 0; i < brandColors.length; i++) {
    for (let j = 0; j < brandColors.length; j++) {
      if (i === j) continue; // Skip same color combinations

      const fg = brandColors[i];
      const bg = brandColors[j];

      const contrastRatio = calculateContrastRatio(fg.value, bg.value);
      const wcagLevels = getWCAGCompliance(contrastRatio);

      // Only include combinations that pass AA Large at minimum
      if (wcagLevels.aaLarge) {
        combinations.push({
          foreground: fg,
          background: bg,
          contrastRatio: contrastRatio,
          wcag: wcagLevels,
        });

        // Track unique background colors for filter buttons
        uniqueBackgroundColors.add(bg.humanName);
      }
    }
  }

  // Sort by contrast ratio (highest to lowest)
  combinations.sort((a, b) => b.contrastRatio - a.contrastRatio);

  // Generate color filter buttons
  generateColorFilterButtons(Array.from(uniqueBackgroundColors).sort());

  // Generate HTML for each combination
  container.innerHTML = '';

  combinations.forEach((combo) => {
    const swatchDiv = document.createElement('div');
    swatchDiv.className = 'sg-contrast-swatch';

    console.log('Raw background name:', combo.background.name);
    console.log('Raw foreground name:', combo.foreground.name);

    // Add utility classes for styling (instead of inline styles)
    const bgClassRaw = 'has-bg-' + combo.background.name;
    const colorClassRaw = 'has-color-' + combo.foreground.name;

    // Replace all double dashes with single dashes (on string values)
    const bgClass = bgClassRaw.replace(/-{2,}/g, '-');
    const colorClass = colorClassRaw.replace(/-{2,}/g, '-');

    console.log('Converted classnames:', bgClass, colorClass);

    swatchDiv.classList.add(bgClass, colorClass);

    // Add filter classes based on WCAG compliance
    if (combo.wcag.aaLarge) swatchDiv.classList.add('contrast-aa-large');
    if (combo.wcag.aaAll) swatchDiv.classList.add('contrast-aa-all');
    if (combo.wcag.aaaLarge) swatchDiv.classList.add('contrast-aaa-large');
    if (combo.wcag.aaaAll) swatchDiv.classList.add('contrast-aaa-all');

    // Add data attributes for color filtering
    swatchDiv.setAttribute(
      'data-bg-color',
      combo.background.humanName.toLowerCase().replace(/\s+/g, '-')
    );
    swatchDiv.setAttribute(
      'data-fg-color',
      combo.foreground.humanName.toLowerCase().replace(/\s+/g, '-')
    );

    // Determine compliance text
    let complianceText = '';
    if (combo.wcag.aaaAll) {
      complianceText = 'AAA ✓ All sizes';
    } else if (combo.wcag.aaaLarge) {
      complianceText = 'AA ✓ | AAA ✓ Large';
    } else if (combo.wcag.aaAll) {
      complianceText = 'AA ✓ All sizes';
    } else if (combo.wcag.aaLarge) {
      complianceText = 'AA ✓ Large';
    }

    swatchDiv.innerHTML = `
      <div class="sg-contrast-example">
        <span class="sg-contrast-large">A</span>
        <span class="sg-contrast-small">a</span>
      </div>
      <div class="sg-contrast-info">
        <div class="sg-contrast-ratio">${combo.contrastRatio.toFixed(2)}:1</div>
        <div class="sg-contrast-compliance">${complianceText}</div>
        <div class="sg-contrast-colors">
          ${combo.foreground.humanName} on ${combo.background.humanName}
        </div>
      </div>
    `;

    container.appendChild(swatchDiv);
  });

  // Initialize filter buttons after swatches are generated
  setTimeout(() => {
    initializeContrastFilters();
  }, 0);
}

// Function to generate color filter buttons
function generateColorFilterButtons(colorNames) {
  const colorFiltersContainer = document.getElementById('color-filters');
  if (!colorFiltersContainer) return;

  colorFiltersContainer.innerHTML = '';

  // Add "All Colors" button
  const allBtn = document.createElement('button');
  allBtn.className = 'sg-filter-btn sg-color-filter active';
  allBtn.setAttribute('data-color-filter', 'all');
  allBtn.textContent = 'All Colors';
  colorFiltersContainer.appendChild(allBtn);

  // Add button for each unique background color
  colorNames.forEach((colorName) => {
    const btn = document.createElement('button');
    btn.className = 'sg-filter-btn sg-color-filter';
    btn.setAttribute(
      'data-color-filter',
      colorName.toLowerCase().replace(/\s+/g, '-')
    );
    btn.textContent = colorName;
    colorFiltersContainer.appendChild(btn);
  });
}

// Function to initialize contrast filter buttons (UPDATED)
function initializeContrastFilters() {
  const complianceButtons = document.querySelectorAll(
    '.sg-filter-btn:not(.sg-color-filter)'
  );
  const colorButtons = document.querySelectorAll('.sg-color-filter');
  const swatches = document.querySelectorAll('.sg-contrast-swatch');

  let activeComplianceFilter = 'all';
  let activeColorFilter = 'all';

  // Apply filters based on current selections
  function applyFilters() {
    swatches.forEach((swatch) => {
      let showSwatch = true;

      // Check compliance filter
      if (activeComplianceFilter !== 'all') {
        if (!swatch.classList.contains(`contrast-${activeComplianceFilter}`)) {
          showSwatch = false;
        }
      }

      // Check color filter
      if (activeColorFilter !== 'all') {
        const bgColor = swatch.getAttribute('data-bg-color');
        if (bgColor !== activeColorFilter) {
          showSwatch = false;
        }
      }

      // Show or hide swatch
      if (showSwatch) {
        swatch.classList.remove('hidden');
      } else {
        swatch.classList.add('hidden');
      }
    });
  }

  // Compliance filter buttons
  complianceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Update active button state
      complianceButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      // Get filter value
      activeComplianceFilter = button.getAttribute('data-filter');

      // Apply combined filters
      applyFilters();
    });
  });

  // Color filter buttons
  colorButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Update active button state
      colorButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      // Get filter value
      activeColorFilter = button.getAttribute('data-color-filter');

      // Apply combined filters
      applyFilters();
    });
  });
}

// Function to calculate contrast ratio between two hex colors
function calculateContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Function to get relative luminance from hex color
function getRelativeLuminance(hex) {
  // Remove # if present
  hex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply sRGB transformation
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

// Function to determine WCAG compliance levels
function getWCAGCompliance(ratio) {
  return {
    aaLarge: ratio >= 3, // 18pt+ or 14pt+ bold
    aaAll: ratio >= 4.5, // All text sizes
    aaaLarge: ratio >= 4.5, // 18pt+ or 14pt+ bold
    aaaAll: ratio >= 7, // All text sizes
  };
}

function generateTypefaceTable() {
  const container = document.querySelector('#typeface-table');
  if (!container) return;

  const propMap = buildPropertyMap();
  const fontVars = Object.keys(propMap)
    .filter((k) => k.replace(/^--/, '').startsWith('font-family-'))
    .sort();

  if (fontVars.length === 0) return;

  const groups = [
    { label: 'Primitives',   test: (n) => /^font-family-(sans|serif|mono)$/.test(n) },
    { label: 'Base / Body',  test: (n) => /^font-family-base/.test(n) },
    { label: 'Headings',     test: (n) => /^font-family-headings/.test(n) },
    { label: 'Other',        test: () => true },
  ];

  const assigned = new Set();
  const grouped = groups.map((g) => {
    const vars = fontVars.filter((v) => {
      const n = v.replace(/^--/, '');
      return !assigned.has(v) && g.test(n) && (assigned.add(v) || true);
    });
    return { label: g.label, vars };
  });

  function primaryFont(varName) {
    const resolved = resolveVarChain(propMap[varName] || '', propMap);
    return resolved.split(',')[0].trim().replace(/['"]/g, '') || varName;
  }

  let html = '';
  for (const group of grouped) {
    if (group.vars.length === 0) continue;
    html += `<p class="sg-typeface-group">${group.label}</p>`;
    html += `<div class="sg-typeface-rows mb-lg">`;
    for (const varName of group.vars) {
      const fontName = primaryFont(varName);
      html += `
        <div class="sg-typeface-row">
          <span class="sg-typeface-var">${varName}</span>
          <span class="sg-typeface-sample" style="font-family: var(${varName})">${fontName}</span>
        </div>`;
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}

// For simplified pipeline: collect all hex colors, split into brand vs gray by name
function getColorVariablesSimplified() {
  const grayTerms = ['gray', 'black', 'white'];
  const all = getColorVariables('');
  const brand = all.filter((v) => !grayTerms.some((t) => v.name.toLowerCase().includes(t)));
  const gray  = all.filter((v) =>  grayTerms.some((t) => v.name.toLowerCase().includes(t)));
  return { brand, gray };
}

// Wait for DOM and styles to load
window.addEventListener('load', () => {
  const isSimplified = window.PIPELINE === 'simplified';

  if (isSimplified) {
    const cats = categorizeColorsSimplified(getAllColorVariablesResolved());
    generateSwatches(cats.colorTokens, '#color-token-swatches');
    generateSwatches(cats.brand,       '#brand-swatches');
    generateSwatches(cats.tints,       '#tints-swatches');
    generateSwatches(cats.gray,        '#gray-swatches');
    generateSwatches(cats.utilities,   '#utilities-swatches');
  } else {
    generateSwatches(getColorVariables('brand'), '#brand-swatches');
    generateSwatches(getColorVariables('gray'),  '#gray-swatches');
  }

  // Typeface table (simplified pipeline only)
  if (isSimplified) generateTypefaceTable();

  // Add typography information
  addTypographyInfo();

  // Generate accessibility swatches
  generateAccessibilitySwatches();
  // Initialize contrast filters (call after swatches are generated)
  initializeContrastFilters();
});
