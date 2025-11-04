import { readdirSync, writeFileSync, existsSync } from 'fs';

// Discover clients from dist subdirectories
let clients = [];

if (existsSync('./dist')) {
  const distDirs = readdirSync('./dist', { withFileTypes: true });
  clients = distDirs
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

if (clients.length === 0) {
  console.log('⚠️  No client directories found in ./dist/');
  console.log('   Run "npm run build" first to create client builds.\n');
  process.exit(0);
}

console.log(
  `\n🎨 Found ${clients.length} styleguide(s): ${clients.join(', ')}`
);

// Generate the landing page HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design System Styleguides - Arcana Creative</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap" rel="stylesheet">
  <meta name="robots" content="noindex,nofollow" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #2F305E;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .container {
      background: white;
      border-radius: 1.5rem;
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
      padding: 3.5rem;
      max-width: 700px;
      width: 100%;
      text-align: center;
    }

    .logo {
      margin-bottom: 2rem;
    }

    .logo img {
      height: 60px;
      width: auto;
    }

    h1 {
      font-size: 2.75rem;
      color: #2F305E;
      margin-bottom: 0.75rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .subtitle {
      color: #6B7280;
      font-size: 1.125rem;
      margin-bottom: 3rem;
      line-height: 1.6;
    }

    .buttons {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2.5rem;
    }

    .btn {
      display: block;
      padding: 1.5rem 2.5rem;
      background: #2F305E;
      color: white;
      text-decoration: none;
      border-radius: 0.75rem;
      font-size: 1.375rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(47, 48, 94, 0.3);
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 30px rgba(47, 48, 94, 0.5);
      background: #1F2040;
    }

    .btn:hover::before {
      left: 100%;
    }

    .btn:active {
      transform: translateY(-1px);
    }

    .footer {
      padding-top: 2.5rem;
      border-top: 2px solid #E5E7EB;
      color: #9CA3AF;
      font-size: 0.9375rem;
    }

    .footer-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
    }

    .footer a {
      color: #2F305E;
      text-decoration: none;
      font-weight: 700;
      transition: color 0.2s;
    }

    .footer a:hover {
      color: #1F2040;
      text-decoration: underline;
    }

    .heart {
      color: #EF4444;
      font-size: 1.1em;
    }

    @media (max-width: 640px) {
      .container {
        padding: 2.5rem 2rem;
      }

      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .btn {
        font-size: 1.125rem;
        padding: 1.25rem 2rem;
      }

      .logo img {
        height: 50px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="./fcp/arcana-logo.webp" alt="Arcana Creative" onerror="this.style.display='none'">
    </div>
    
    <h1>Design System Styleguides</h1>
    <p class="subtitle">Select a client styleguide to explore their design tokens, typography, components, and accessibility guidelines.</p>
    
    <div class="buttons">
      ${clients.map((client) => `<a href="${client}/" class="btn">${client.toUpperCase()}</a>`).join('\n      ')}
    </div>

    <div class="footer">
      <div class="footer-content">
        <p>Built with <span class="heart">♥</span> by <a href="https://arcanacreative.ca" target="_blank">Arcana Creative</a></p>
        <p style="font-size: 0.875rem; color: #D1D5DB;">Creative solutions for a better world.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

// Write the index.html file
writeFileSync('./dist/index.html', html);
console.log('✅ Created dist/index.html landing page\n');
console.log('🌐 Navigate to http://localhost:8080/ to see all styleguides\n');
