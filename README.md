# Figma Design Tokens to WordPress Styleguide

A complete workflow for converting Figma design tokens (variables) into CSS custom properties and generating an interactive HTML styleguide. Built for seamless integration with class-first WordPress page builders like Bricks Builder and Divi.

## What This Does

This project bridges the gap between Figma design and WordPress development by:

1. **Converting Figma Variables to CSS**: Transforms Figma design tokens (exported as JSON) into well-organized CSS custom properties
2. **Generating a Living Styleguide**: Creates an interactive HTML demonstration of your typography, colors, spacing, and components
3. **Maintaining Design-Dev Consistency**: Ensures your WordPress sites always reflect your latest Figma designs

## Features

- ✅ **Variable-First Design**: Supports both primitives and semantic tokens
- ✅ **Responsive Typography**: Mobile, tablet, and desktop font sizes with automatic fallback stacks
- ✅ **Color System**: Automatic swatch generation with human-readable names
- ✅ **Block Components**: Semantic tokens for headers, footers, buttons, cards, and navigation
- ✅ **Live Development**: Hot-reload with Parcel during development
- ✅ **Auto-Watch**: Automatically rebuilds when Figma exports change

## Project Structure
```
├── tokens/
│   └── figma-export.json          # Export from Figma Design Tokens plugin
├── build/
│   └── css/
│       └── variables.css          # Generated CSS custom properties
├── css/
│   ├── codesnippet.css           # Production-ready component styles
│   └── styleguide.scss           # Styles used only to make the styleguide. Don't move to the production website.
├── js/
│   ├── build.js                  # Style Dictionary build script
│   └── styleguide.js             # Interactive styleguide generators
├── index.html                    # Interactive styleguide demo
└── package.json
```

## Installation

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Setup

1. Clone this repository:
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. Install dependencies:
```bash
npm install
```

## Workflow

### 1. Export from Figma

1. In Figma, use the **Design Tokens** plugin to export your variables
2. Export as JSON format
3. Copy the entire JSON content

### 2. Update Tokens

Replace the contents of `tokens/figma-export.json` with your exported JSON:
```bash
# Open the file and paste your Figma export
# tokens/figma-export.json
```

### 3. Build & Preview

Run the development server:
```bash
npm run dev
```

This will:
- Build your CSS custom properties from the Figma tokens
- Watch for changes to `figma-export.json`
- Start a local development server with hot-reload
- Open your browser to view the interactive styleguide

When run, the styleguide will be available at `http://localhost:1234` (or another port if 1234 is in use).

You can then: 
- move the demo to an online place, such as Netlify, for team viewing (set up a project and drop the 'dist' folder into it.).
- print the styleguide as a PDF. 
- screenshot it with a whole-screenshotting plugin like Fireshot and share this back into the Figma file if it's handy. 

### 4. Use in Production

After building, you'll have two CSS files to use in your WordPress projects:

1. **`build/css/variables.css`** - Your CSS custom properties (required)
2. **`css/codesnippet.css`** - Component styles and utilities (required)

**Do NOT include** `styleguide.css` in production - it's only for the demo.

## Available Scripts
```bash
# Build tokens only
npm run build:tokens

# Development mode (build + watch + serve)
npm run dev

# Production build
npm run build

# Watch mode
npm run watch

# Start server (alias for dev)
npm start
```

## Design Token Organization

### Primitives
Core design values that don't change:
- Colors (gray scale, brand colors)
- Spacing scale (1-13 + half)
- Border radius (sm, md, lg, xl, 2xl, 3xl)
- Content widths

### Typography
Font system:
- Font families (with automatic fallback stacks)
- Font sizes (responsive: mobile, tablet, desktop)
- Font weights
- Line heights

### Blocks
Component-specific tokens:
- Headers
- Footers
- Buttons
- Cards
- Navigation
- Highlight blocks

### Utility Tokens
Reusable semantic values:
- Text colors (primary, invert, light, headings)
- Border styles
- Spacing shortcuts (xs, sm, md, lg, xl, 2xl)
- Radius shortcuts (minimal, rounded, full)

## Customization

### Adding New Fonts

Fonts are automatically given fallback stacks. To use web fonts, add them to `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Your+Font&display=swap" rel="stylesheet">
```

### Modifying the Styleguide

- Edit `css/styleguide.scss` for visual changes
- Edit `js/styleguide.js` for functionality changes
- The styleguide automatically reads from your generated `variables.css`

## Integration with WordPress

### Using with your page builder

Put your `variables.css` and `codesnippet.css` files in your WordPress theme.

#### Using with your child theme

To put them into your child theme, add this to `functions.php` or whereever you enqueue your CSS.
```php
wp_enqueue_style('design-tokens', get_stylesheet_directory_uri() . '/css/variables.css');
wp_enqueue_style('components', get_stylesheet_directory_uri() . '/css/codesnippet.css');
```

#### Using with Code Snippets (or similar plugin)

Add the files with Code Snippets and make sure they run early.

#### Using with Bricks or similar page builder

If you have a variable-first page builder like Bricks, reference CSS custom properties like so:
   - Use `var(--brand--green--pine)` for colors
   - Use `var(--spacing--md)` for spacing
   - Use `var(--font-size--h1--desktop)` for typography

### Using with Divi or blocks that don't take variabels

Similar approach - enqueue the CSS files and reference the custom properties in Divi's custom CSS fields.

## Browser Support

CSS Custom Properties are supported in all modern browsers:
- Chrome/Edge 49+
- Firefox 31+
- Safari 9.1+

## Contributing

This is a living workflow! Improvements welcome.

## License

[Your chosen license]

## Acknowledgments

Built with:
- [Style Dictionary](https://amzn.github.io/style-dictionary/) - Token transformation
- [Parcel](https://parceljs.org/) - Development bundler
- [Figma Design Tokens Plugin](https://www.figma.com/community/plugin/888356646278934516) - Token export

---

**Questions?** Open an issue or reach out!