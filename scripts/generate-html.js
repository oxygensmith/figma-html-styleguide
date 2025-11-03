// generate-html.js
// Generates HTML files for each client based on a template,
// including conditional loading of custom fonts if available.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';

// Discover clients from figma-*.json files in tokens folder
const tokenFiles = readdirSync('./tokens');
const clients = tokenFiles
  .filter((f) => f.startsWith('figma-') && f.endsWith('.json'))
  .map((f) => f.match(/figma-(.+)\.json/)[1]);

if (clients.length === 0) {
  console.error('❌ No figma-*.json files found in ./tokens/');
  process.exit(1);
}

console.log(`\n🔍 Found ${clients.length} client(s): ${clients.join(', ')}`);

// Check for custom fonts for each client
console.log('\n🔤 Checking for custom fonts...\n');

const fontWarnings = [];

clients.forEach((client) => {
  const fontsFile = `./css/fonts-${client}.css`;
  const fontsDir = `./fonts/${client}`;

  const hasFontsCSS = existsSync(fontsFile);
  const hasFontsDir = existsSync(fontsDir);

  if (hasFontsCSS) {
    console.log(`✅ ${client}: Custom fonts CSS found (fonts-${client}.css)`);
    if (!hasFontsDir) {
      fontWarnings.push({
        client,
        message: `fonts-${client}.css exists but no ./fonts/${client}/ directory found`,
      });
    }
  } else {
    console.log(`ℹ️  ${client}: Using web fonts only (no fonts-${client}.css)`);
  }
});

if (fontWarnings.length > 0) {
  console.log('\n⚠️  Font Warnings:\n');
  fontWarnings.forEach((w) => {
    console.log(`   ${w.client}: ${w.message}`);
  });
}

console.log('\n💡 Font Setup Instructions:');
console.log('   • To use Google Fonts only: No action needed');
console.log('   • To use custom fonts:');
console.log('     1. Create css/fonts-{client}.css with @font-face rules');
console.log('     2. Place font files in fonts/{client}/ directory');
console.log('     3. Ensure font-family names match your Figma variables');
console.log('     4. Run npm run build to regenerate\n');

// HTML template with conditional font loading
const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{CLIENT_UPPER}} Design System</title>
  <meta name="robots" content="noindex,nofollow" />
  
  {{CUSTOM_FONTS}}
  
  <!-- Client-specific variables (Parcel will process these) -->
  <link rel="stylesheet" href="../build/css/variables-{{CLIENT}}.css" data-source="variables-{{CLIENT}}.css">
  <link rel="stylesheet" href="../build/css/utilities-{{CLIENT}}.css" data-source="utilities-{{CLIENT}}.css">
  
  <!-- Shared utility styles -->
  <link rel="stylesheet" href="../css/codesnippet.css" data-source="codesnippet.css">
  
  <!-- Styles for this styleguide itself -->
  <link rel="stylesheet" href="../css/styleguide.scss" data-source="styleguide.scss">

  <!-- Store client name for JavaScript -->
  <script>window.CLIENT_NAME = '{{CLIENT}}';</script>
</head>
<body>
  
  <!-- HEADER -->
  <header class="header">
    <div class="container">
      <nav class="nav">
        <div class="nav-container">
          <div class="logo">{{CLIENT_UPPER}} Design System</div>
          <div class="nav-links">
            <a href="#" class="nav-link">Home</a>
            <a href="#" class="nav-link">About</a>
            <a href="#" class="nav-link nav-link-cta btn btn-primary-invert">Contact</a>
          </div>
        </div>
      </nav>
    </div>
  </header>

  <!-- HERO SECTION -->
  <section class="section-hero">
    <div class="container">
      <h1 class="mb-md">{{CLIENT_UPPER}} Styleguide</h1>
      <p class="large mb-lg">A demonstration of moving our variable-driven Figma prototypes to Divi-ready CSS.</p>
      <div class="flex gap-sm flex-wrap">
        <a href="#swatches" class="btn btn-primary">Swatches</a>
        <a href="#typography" class="btn btn-primary">Typography</a>
        <a href="#buttons" class="btn btn-secondary">Buttons</a>
        <a href="#cardsandblocks" class="btn btn-secondary">Cards and Blocks</a>
        <a href="#inverted" class="btn btn-primary">Dark background styles</a>
      </div>
    </div>
  </section>

  <!-- COLOR SWATCHES SECTION -->
  <section id="swatches" class="section-powder">
    <div class="container">
      <h2 class="mb-md">Color Palette</h2>
      <p class="mb-lg">Our semantic color system built on primitive tokens.</p>
      
      <h3 class="mb-sm">Brand Colors</h3>
      <div id="brand-swatches" class="grid-auto-fill gap-md mb-xl">
        <!-- Swatches will be generated here by JavaScript -->
      </div>
      
      <h3 class="mb-sm">Grayscale</h3>
      <div id="gray-swatches" class="grid-auto-fill gap-sm mb-xl">
        <!-- Swatches will be generated here by JavaScript -->
      </div>
    </div>
  </section>

  <!-- TYPOGRAPHY SECTION -->
  <section id="typography" class="container mt-2xl mb-2xl">
    <h2 class="mb-md">Typography Scale</h2>
    <p class="mb-lg">Our typography is responsive across mobile, tablet, and desktop breakpoints.</p>
    
    <div class="card mb-lg">
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <h4>Heading 4</h4>
      
      <p class="mt-md">Regular paragraph text.</p>
      
      <p class="large">Large paragraph text.</p>
      
      <p class="small">Small paragraph text.</p>
    </div>
  </section>

  <!-- ACCESSIBILITY SECTION -->
  <section id="accessibility" class="section-light">
    <div class="container">
      <h2 class="mb-md">Accessibility / WCAG</h2>
      <p class="mb-lg">
        Web Content Accessibility Guidelines compliance for our brand color combinations. 
        All combinations shown meet a minimum contrast ratio of <strong>3:1</strong> (WCAG AA for large text). 
        Use the filters below to show only combinations meeting specific standards.
      </p>

      <div class="sg-contrast-filters mb-md">
        <div class="sg-filter-group">
          <strong>Compliance Level:</strong>
          <button class="sg-filter-btn active" data-filter="aaa-all">AAA All Sizes (7:1+)</button>
          <button class="sg-filter-btn" data-filter="aaa-large">AAA Large (4.5:1+)</button>
          <button class="sg-filter-btn" data-filter="aa-all">AA All Sizes (4.5:1+)</button>
          <button class="sg-filter-btn" data-filter="all">All</button>
        </div>

        <div class="sg-filter-group mt-sm">
          <strong>Background Color:</strong>
          <div id="color-filters">
            <!-- Color filter buttons generated by JavaScript -->
          </div>
        </div>
      </div>

      <div id="accessibility-swatches" class="grid-auto-fill gap-md">
        <!-- Swatches will be generated here by JavaScript -->
      </div>
    </div>
  </section>

  <!-- BUTTONS SECTION -->
  <section id="buttons" class="section-light">
    <div class="container">
      <h2 class="mb-md">Button Styles</h2>
      <p class="mb-lg">Various button styles for different contexts and actions.</p>
      
      <div class="flex gap-sm flex-wrap">
        <button class="btn btn-primary">Primary Button</button>
        <button class="btn btn-primary-invert">Primary Inverted</button>
        <button class="btn btn-secondary">Secondary Button</button>
        <button class="btn btn-secondary-invert">Secondary Inverted</button>
        <button class="btn btn-alert">Alert Button</button>
      </div>
    </div>
  </section>

  <!-- CARDS & BLOCKS SECTION -->
  <section id="cardsandblocks" class="container mt-2xl mb-2xl">
    <h2 class="mb-md">Cards & Content Blocks</h2>
    <p class="mb-lg">Flexible content containers with consistent spacing and styling.</p>
    
    <div class="grid-auto-fit gap-lg mb-xl">
      <div class="card">
        <h3>Standard Card</h3>
        <p>Cards provide a clean container for related content with consistent padding and rounded corners.</p>
        <a href="#" class="btn btn-primary mt-md">Learn More</a>
      </div>
      
      <div class="card">
        <h3>Featured Content</h3>
        <p>Use cards to highlight important information or create visual hierarchy in your layouts.</p>
        <a href="#" class="btn btn-secondary mt-md">Explore</a>
      </div>
      
      <div class="card">
        <h3>Call to Action</h3>
        <p>Cards work great for CTAs, testimonials, or any content that needs emphasis and separation.</p>
        <a href="#" class="btn btn-alert mt-md">Get Started</a>
      </div>
    </div>
    
    <div class="highlight-block">
      <h3>Highlight Block</h3>
      <p class="mb-sm">This is a special highlight block with custom border radius and background color. Perfect for important announcements or featured content.</p>
      <a href="#" class="btn btn-primary">Take Action</a>
    </div>
  </section>

  <!-- BORDER RADIUS SECTION -->
  <section class="section-light">
    <div class="container">
      <h2 class="mb-md">Border Radius</h2>
      <p class="mb-lg">Consistent rounding for UI elements.</p>
      
      <div class="grid-2col gap-lg">
        <div class="card rounded-minimal">
          <h4>Minimal</h4>
          <p class="small">Subtle rounding for buttons and inputs</p>
        </div>
        <div class="card rounded">
          <h4>Rounded</h4>
          <p class="small">Standard rounding for cards</p>
        </div>
        <div class="card" style="border-radius: var(--radius--card);">
          <h4>Card</h4>
          <p class="small">Larger rounding for prominent cards</p>
        </div>
        <div class="pill">
          <h4>Pill</h4>
          <p class="small">Full rounding for badges</p>
        </div>
      </div>
    </div>
  </section>

  <!-- DARK BACKGROUND SECTION -->
  <section id="inverted" class="section-dark text-invert">
    <div class="container">
      <h2 class="mb-md text-invert">Inverted Color Scheme</h2>
      <p class="mb-lg">Our design system adapts beautifully to dark backgrounds with inverted text and button styles.</p>
      
      <div class="grid-3col gap-lg">
        <div>
          <h3 class="mb-sm text-invert headings">Feature One</h3>
          <p>Light text on dark backgrounds maintains readability while creating visual interest and hierarchy.</p>
        </div>
        <div>
          <h3 class="mb-sm text-invert headings">Feature Two</h3>
          <p>All our semantic color tokens include inverted variants for use on dark backgrounds.</p>
        </div>
        <div>
          <h3 class="mb-sm text-invert headings">Feature Three</h3>
          <p>Consistent spacing and typography ensure your content looks great in any context.</p>
        </div>
      </div>
      
      <div class="flex gap-sm flex-wrap mt-xl">
        <button class="btn btn-primary-invert">Light Button</button>
        <button class="btn btn-secondary-invert">Secondary Inverted</button>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4 class="mb-sm text-invert headings">About</h4>
          <p class="small">A design system built with Figma variables, exported through Style Dictionary, and implemented in WordPress.</p>
        </div>
        <div>
          <h4 class="mb-sm text-invert headings">Quick Links</h4>
          <div class="footer-links">
            <a href="#" class="small">Home</a>
            <a href="#" class="small">About</a>
            <a href="#" class="small">Services</a>
            <a href="#" class="small">Contact</a>
          </div>
        </div>
        <div>
          <h4 class="mb-sm text-invert headings">Contact</h4>
          <p class="small">Saskatoon, Saskatchewan<br>Treaty 6 Territory<br>Canada</p>
        </div>
      </div>
      
    </div>
  </footer>

  <!-- ASIDE -->
  <aside class="sg-our-watermark">
    <div class="container">
      <div class="sg-aside-brand">
        <a href="https://arcanacreative.ca"><img class="aside-logo" src="../img/arcana-logo.webp" alt="Arcana Creative" /></a> 
      </div>
      <div class="sg-aside-note">Made with love and care by the team at <a href="https://arcanacreative.ca">Arcana Creative.</a></div>
      <div class="sg-aside-content">
        <span class="sg-styleguide-text">Website styleguide for</span>
        <span class="sg-styleguide-client">{{CLIENT_UPPER}}</span>
      </div>
    </div>
  </aside>
  
  <script src="../js/styleguide.js"></script>

</body>
</html>`;

// Generate HTML for each client
console.log('\n📝 Generating HTML files...\n');

clients.forEach((client) => {
  // Check if custom fonts exist for this client
  const fontsFile = `./css/fonts-${client}.css`;
  const hasCustomFonts = existsSync(fontsFile);

  const customFontsLink = hasCustomFonts
    ? `<!-- Custom fonts for ${client.toUpperCase()} -->\n  <link rel="stylesheet" href="../css/fonts-${client}.css" data-source="fonts-${client}.css">`
    : `<!-- No custom fonts for ${client.toUpperCase()} (using web fonts only) -->`;

  const html = template
    .replace(/\{\{CLIENT\}\}/g, client)
    .replace(/\{\{CLIENT_UPPER\}\}/g, client.toUpperCase())
    .replace('{{CUSTOM_FONTS}}', customFontsLink);

  writeFileSync(`./src/index-${client}.html`, html);
  console.log(
    `✅ Generated src/index-${client}.html ${hasCustomFonts ? '(with custom fonts)' : '(web fonts only)'}`
  );
});

console.log(
  `\n✨ Generated ${clients.length} HTML file${clients.length !== 1 ? 's' : ''} successfully!`
);
