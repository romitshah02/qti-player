// Post-build packaging for the web component. Written as ESM (package.json
// has "type": "module"). After `vite build` emits the IIFE bundle + single
// CSS file, this script:
//   1. Embeds the compiled player CSS into the bundle as a top-level
//      `BUNDLED_CSS` constant (so the web component injects it into shadow
//      DOM with no runtime fetch).
//   2. Copies the self-contained bundle + host-safe stylesheet into dist-wc.
//   3. Writes an example index.html.

import fs from 'fs';
import { cp, mkdir, writeFile } from 'fs/promises';
import path from 'path';

const DIST = 'dist';
const DEST = 'dist-wc';
const BUNDLE = 'qti3-test-runner.js';

const build = async () => {
  try {
    const bundlePath = path.join(DIST, BUNDLE);
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Missing ${bundlePath} — did 'vite build' run first?`);
    }

    // 1. Locate the single compiled stylesheet (cssCodeSplit:false → one .css).
    const cssFile = fs.readdirSync(DIST).find((f) => f.endsWith('.css'));
    let bundleJs = fs.readFileSync(bundlePath, 'utf-8');
    const css = cssFile ? fs.readFileSync(path.join(DIST, cssFile), 'utf-8') : '';

    if (cssFile) {
      console.log(`[Build] Embedding ${cssFile} into the bundle...`);
      // Escape backticks and ${ so the CSS is a safe template-literal value.
      // BUNDLED_CSS is the FULL stylesheet, injected into the shadow root —
      // must stay complete, the player's own CSS depends on it.
      const safeCss = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      bundleJs = `var BUNDLED_CSS = \`${safeCss}\`;\n${bundleJs}`;
      fs.writeFileSync(bundlePath, bundleJs);
    } else {
      console.warn('[Build] No CSS emitted; the bundle will ship without embedded styles.');
    }

    // 2. Copy the self-contained bundle.
    console.log('[Build] Copying built files...');
    await mkdir(DEST, { recursive: true });
    await cp(bundlePath, path.join(DEST, BUNDLE));

   if (cssFile) {
      const fontFaces = (css.match(/@font-face\s*\{[^}]*\}/g) || []).join('\n');
      await writeFile(path.join(DEST, 'styles.css'), fontFaces);
    }

    // 3. Example HTML.
    console.log('[Build] Creating example HTML...');
    const exampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QTI3 Test Runner Example</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <script src="${BUNDLE}"></script>
  <qti3-test-runner runner-config='{}'></qti3-test-runner>
</body>
</html>`;
    await writeFile(path.join(DEST, 'index.html'), exampleHtml);

    console.log('[Build] Web component built successfully!');
    console.log(`[Build] Output: ${DEST}/`);
  } catch (error) {
    console.error('[Build] Error:', error);
    process.exit(1);
  }
};

build();