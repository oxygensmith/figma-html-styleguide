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

// Function to add typography info to heading elements
// Function to add typography info to heading elements
function addTypographyInfo() {
  const typographySection = document.querySelector('.card.mb-lg');
  if (!typographySection) return;

  // Define which elements to annotate
  const elements = [
    { selector: 'h1', type: 'h1', isHeading: true, isParagraph: false },
    { selector: 'h2', type: 'h2', isHeading: true, isParagraph: false },
    { selector: 'h3', type: 'h3', isHeading: true, isParagraph: false },
    { selector: 'h4', type: 'h4', isHeading: true, isParagraph: false },
    {
      selector: 'p.mt-md',
      type: 'p--base',
      isHeading: false,
      isParagraph: true,
      label: 'Paragraph (Regular)',
    },
    {
      selector: 'p.large',
      type: 'p--large',
      isHeading: false,
      isParagraph: true,
      label: 'Paragraph (Large)',
    },
    {
      selector: 'p.small',
      type: 'p--small',
      isHeading: false,
      isParagraph: true,
      label: 'Paragraph (Small)',
    },
  ];

  elements.forEach(({ selector, type, isHeading, isParagraph, label }) => {
    const element = typographySection.querySelector(selector);
    if (!element) return;

    // Get size info
    const mobile = getCSSVariable(`--font-size--${type}--mobile`) || '--';
    const tablet = getCSSVariable(`--font-size--${type}--tablet`) || '--';
    const desktop = getCSSVariable(`--font-size--${type}--desktop`) || '--';

    // Get weight - element-specific first, then fallback to global
    const weight =
      getCSSVariable(`--font-weight--${type}`) ||
      (isHeading
        ? getCSSVariable('--font-weight--headings')
        : getCSSVariable('--font-weight--body')) ||
      '--';

    // Get letter-spacing - element-specific first, then fallback to global
    const letterSpacing =
      getCSSVariable(`--letter-spacing--${type}`) ||
      (isHeading
        ? getCSSVariable('--letter-spacing--headings')
        : getCSSVariable('--letter-spacing--p')) ||
      '--';

    // Get line height
    const lineHeight = isHeading
      ? getCSSVariable('--line-height--headings') || '--'
      : getCSSVariable('--line-height--p') ||
        getCSSVariable('--line-height--base') ||
        '--';

    // Create wrapper to hold both heading and info side-by-side
    const wrapper = document.createElement('div');
    wrapper.className = 'sg-typography-wrapper';

    // Handle paragraphs differently
    if (isParagraph) {
      // Create container for paragraph examples
      const paragraphContainer = document.createElement('div');
      paragraphContainer.className = 'sg-typography-element';

      // Add label
      const paragraphLabel = document.createElement('p');
      // Apply the correct class for styling to match the paragraph style
      if (type === 'p--large') {
        paragraphLabel.className = 'large';
      } else if (type === 'p--small') {
        paragraphLabel.className = 'small';
      }
      paragraphLabel.innerHTML = `<strong>${label}</strong>`;
      paragraphContainer.appendChild(paragraphLabel);

      // First paragraph
      const firstPara = document.createElement('p');
      // Apply the correct class for styling
      if (type === 'p--large') {
        firstPara.className = 'large';
      } else if (type === 'p--small') {
        firstPara.className = 'small';
      }
      firstPara.textContent =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';
      paragraphContainer.appendChild(firstPara);

      // Second paragraph (italic)
      const secondPara = document.createElement('p');
      // Apply the correct class for styling
      if (type === 'p--large') {
        secondPara.className = 'large';
      } else if (type === 'p--small') {
        secondPara.className = 'small';
      }
      secondPara.style.fontStyle = 'italic';
      secondPara.textContent =
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
      paragraphContainer.appendChild(secondPara);

      wrapper.appendChild(paragraphContainer);

      // Remove the original element
      element.remove();
    } else {
      // For headings, clone the element
      const clonedElement = element.cloneNode(true);
      clonedElement.className = 'sg-typography-element';
      wrapper.appendChild(clonedElement);

      // Remove the original element
      element.remove();
    }

    // Create info box with 4-column layout
    const infoBox = document.createElement('div');
    infoBox.className = 'sg-info-box';

    infoBox.innerHTML = `
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
          <div class="sg-size-value">${mobile}</div>
          <div class="sg-stat-value">${weight}</div>
          <div class="sg-stat-value">${letterSpacing}</div>
          <div class="sg-stat-value-last">${lineHeight}</div>
        </div>
        <div class="sg-stats-column">
          <div class="sg-breakpoint-label">Tablet</div>
          <div class="sg-size-value">${tablet}</div>
          <div class="sg-stat-value">${weight}</div>
          <div class="sg-stat-value">${letterSpacing}</div>
          <div class="sg-stat-value-last">${lineHeight}</div>
        </div>
        <div class="sg-stats-column">
          <div class="sg-breakpoint-label">Desktop</div>
          <div class="sg-size-value">${desktop}</div>
          <div class="sg-stat-value">${weight}</div>
          <div class="sg-stat-value">${letterSpacing}</div>
          <div class="sg-stat-value-last">${lineHeight}</div>
        </div>
      </div>
    `;

    wrapper.appendChild(infoBox);

    // Insert wrapper into the typography section
    typographySection.appendChild(wrapper);
  });
}

// Function to generate accessibility/WCAG contrast swatches (UPDATED)
async function generateAccessibilitySwatches() {
  const container = document.querySelector('#accessibility-swatches');
  if (!container) return;

  // Get all brand color variables
  const brandColors = getColorVariables('brand');

  // Generate all possible combinations
  const combinations = [];

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
      }
    }
  }

  // Sort by contrast ratio (highest to lowest)
  combinations.sort((a, b) => b.contrastRatio - a.contrastRatio);

  // Generate HTML for each combination
  container.innerHTML = '';

  combinations.forEach((combo) => {
    const swatchDiv = document.createElement('div');
    swatchDiv.className = 'sg-contrast-swatch';
    swatchDiv.style.backgroundColor = combo.background.value;
    swatchDiv.style.color = combo.foreground.value;

    // Add filter classes based on WCAG compliance
    if (combo.wcag.aaLarge) swatchDiv.classList.add('contrast-aa-large');
    if (combo.wcag.aaAll) swatchDiv.classList.add('contrast-aa-all');
    if (combo.wcag.aaaLarge) swatchDiv.classList.add('contrast-aaa-large');
    if (combo.wcag.aaaAll) swatchDiv.classList.add('contrast-aaa-all');

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
}

// Function to initialize contrast filter buttons
function initializeContrastFilters() {
  const filterButtons = document.querySelectorAll('.sg-filter-btn');
  const swatches = document.querySelectorAll('.sg-contrast-swatch');

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Update active button state
      filterButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      // Get filter value
      const filter = button.getAttribute('data-filter');

      // Apply filter
      swatches.forEach((swatch) => {
        if (filter === 'all') {
          swatch.classList.remove('hidden');
        } else {
          // Show only swatches that have the matching class
          if (swatch.classList.contains(`contrast-${filter}`)) {
            swatch.classList.remove('hidden');
          } else {
            swatch.classList.add('hidden');
          }
        }
      });
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

// Wait for DOM and styles to load
window.addEventListener('load', () => {
  // Generate brand color swatches
  const brandColors = getColorVariables('brand');
  generateSwatches(brandColors, '#brand-swatches');

  // Generate grayscale swatches
  const grayColors = getColorVariables('gray');
  generateSwatches(grayColors, '#gray-swatches');

  // Add typography information
  addTypographyInfo();

  // Generate accessibility swatches
  generateAccessibilitySwatches();
  // Initialize contrast filters (call after swatches are generated)
  initializeContrastFilters();
});
