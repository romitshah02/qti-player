// Post-build packaging for the web component. Written as ESM (package.json
// has "type": "module"). After `vite build` emits the IIFE bundle + single
// CSS file, this script:
//   1. Embeds the compiled player CSS into the bundle as a top-level
//      `BUNDLED_CSS` constant (so the web component injects it into shadow
//      DOM with no runtime fetch).
//   2. Copies the self-contained bundle + host-safe stylesheet into the
//      package output.
//   3. Writes an example index.html.
//   4. Writes a package manifest so CI can `npm publish` the output directly.

import fs from 'fs';
import { cp, mkdir, writeFile } from 'fs/promises';
import path from 'path';

const DIST = 'dist';
const PKG_ROOT = 'dist-wc';
const DEST = 'dist-wc/assets/qti-player';
const BUNDLE = 'qti3-test-runner.js';

// npm package name for the web component.
const WC_PACKAGE_NAME = 'test-qti-player-web-component-react';

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
      // The `./styles` export is loaded into the HOST document by some
      // consumers. The player is fully styled via BUNDLED_CSS inside its
      // shadow root (above), so this file must NOT carry the global reset or
      // hashed component classes — those would leak into the host page. Ship
      // ONLY document-level @font-face rules, which are safe to load anywhere.
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

    // 4. Generate the package manifest so CI can `npm publish ./dist-wc`
    //    without a committed (and drift-prone) copy. Version is derived from
    //    the project package.json so it never diverges from the source of truth.
    console.log('[Build] Writing package manifest...');
    const projectPkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const manifest = {
      name: WC_PACKAGE_NAME,
      version: projectPkg.version,
      description: 'React-based QTI3 test runner web component',
      main: 'assets/qti-player/qti3-test-runner.js',
      exports: {
        '.': './assets/qti-player/qti3-test-runner.js',
        './styles': './assets/qti-player/styles.css',
      },
      files: ['assets/qti-player/'],
      homepage: 'https://github.com/romitshah02/qti-player#readme',
      repository: {
        type: 'git',
        url: 'https://github.com/romitshah02/qti-player.git',
      },
      keywords: ['sunbird', 'qti', 'question', 'player', 'web-component', 'react'],
      license: 'MIT',
    };
    await writeFile(path.join(PKG_ROOT, 'package.json'), JSON.stringify(manifest, null, 2));

    console.log('[Build] Web component built successfully!');
    console.log(`[Build] Output: ${DEST}/`);
    console.log(`[Build] Package: ${WC_PACKAGE_NAME}@${projectPkg.version}`);
  } catch (error) {
    console.error('[Build] Error:', error);
    process.exit(1);
  }
};

build();