// Function to convert CSS variable name to human-readable format
function formatVariableName(varName) {
  // Remove -- prefix and split by --
  const parts = varName.replace(/^--/, '').split('--');
  
  // Filter out common prefixes we don't want in the display name
  const filteredParts = parts.filter(part => 
    !['brand', 'color'].includes(part.toLowerCase())
  );
  
  // Capitalize each part and join with spaces
  return filteredParts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
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
                  humanName: formatVariableName(prop)
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
  
  variables.forEach(variable => {
    const swatchDiv = document.createElement('div');
    swatchDiv.className = 'sg-swatch-container';
    
    // Check if color needs border (light colors)
    const needsBorder = ['#ffffff', '#fff9eaff', '#fff9ea'].includes(variable.value.toLowerCase());
    
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
    { selector: 'p.mt-md', type: 'p--base', isHeading: false, isParagraph: true, label: 'Paragraph (Regular)' },
    { selector: 'p.large', type: 'p--large', isHeading: false, isParagraph: true, label: 'Paragraph (Large)' },
    { selector: 'p.small', type: 'p--small', isHeading: false, isParagraph: true, label: 'Paragraph (Small)' }
  ];
  
  elements.forEach(({ selector, type, isHeading, isParagraph, label }) => {
    const element = typographySection.querySelector(selector);
    if (!element) return;
    
    // Get size info
    const mobile = getCSSVariable(`--font-size--${type}--mobile`) || '--';
    const tablet = getCSSVariable(`--font-size--${type}--tablet`) || '--';
    const desktop = getCSSVariable(`--font-size--${type}--desktop`) || '--';
    
    // Get weight - element-specific first, then fallback to global
    const weight = getCSSVariable(`--font-weight--${type}`) || 
                  (isHeading ? getCSSVariable('--font-weight--headings') : getCSSVariable('--font-weight--body')) || 
                  '--';
    
    // Get letter-spacing - element-specific first, then fallback to global
    const letterSpacing = getCSSVariable(`--letter-spacing--${type}`) || 
                         (isHeading ? getCSSVariable('--letter-spacing--headings') : getCSSVariable('--letter-spacing--p')) || 
                         '--';
    
    // Get line height
    const lineHeight = isHeading ? 
                      (getCSSVariable('--line-height--headings') || '--') : 
                     (getCSSVariable('--line-height--p') || getCSSVariable('--line-height--base') || '--');
    
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
      firstPara.textContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';
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
      secondPara.textContent = 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
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
});