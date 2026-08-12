// Post-build packaging for the web component. After `vite build` emits the
// IIFE bundle + single CSS file, embed the CSS into the bundle as a
// `BUNDLED_CSS` constant (so the shadow root gets styled with no runtime
// fetch), copy the self-contained bundle to dist-wc, and write an example
// index.html.
//
// ESM (package.json has "type": "module").

import fs from 'fs-extra';
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

    const cssFile = fs.readdirSync(DIST).find((f) => f.endsWith('.css'));
    let bundleJs = fs.readFileSync(bundlePath, 'utf-8');
    const css = cssFile ? fs.readFileSync(path.join(DIST, cssFile), 'utf-8') : '';

    if (cssFile) {
      console.log(`[Build] Embedding ${cssFile} into the bundle...`);
      // BUNDLED_CSS is the full stylesheet, injected into the shadow root —
      // must stay complete, the player's own CSS depends on it.
      const safeCss = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      bundleJs = `var BUNDLED_CSS = \`${safeCss}\`;\n${bundleJs}`;
      fs.writeFileSync(bundlePath, bundleJs);
    } else {
      console.warn('[Build] No CSS emitted; the bundle will ship without embedded styles.');
    }

    console.log('[Build] Copying built files...');
    await fs.ensureDir(DEST);
    await fs.copy(bundlePath, path.join(DEST, BUNDLE));

    console.log('[Build] Creating example HTML...');
    const exampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QTI3 Test Runner Example</title>
</head>
<body>
  <script src="${BUNDLE}"></script>
  <qti3-test-runner runner-config='{}'></qti3-test-runner>
</body>
</html>`;
    await fs.writeFile(path.join(DEST, 'index.html'), exampleHtml);

    console.log('[Build] Web component built successfully!');
    console.log(`[Build] Output: ${DEST}/`);
  } catch (error) {
    console.error('[Build] Error:', error);
    process.exit(1);
  }
};

build();