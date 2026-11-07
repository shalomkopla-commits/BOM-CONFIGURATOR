import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const rootDir = process.cwd();
const imgDir = path.join(rootDir, 'public', 'images', 'assemblies');

// 1. Read all 19 PNG images as base64 data URLs (keyed once by SKU)
const imageMap = {};
for (const file of fs.readdirSync(imgDir)) {
  if (file.endsWith('.png')) {
    const sku = path.basename(file, '.png');
    const b64 = fs.readFileSync(path.join(imgDir, file)).toString('base64');
    imageMap[sku] = `data:image/png;base64,${b64}`;
  }
}

// 2. Read local React, Scheduler, ReactDOM, and XLSX from node_modules
const reactCode = fs.readFileSync(
  path.join(rootDir, 'node_modules/react/cjs/react.production.min.js'),
  'utf8'
);
const schedulerCode = fs.readFileSync(
  path.join(rootDir, 'node_modules/scheduler/cjs/scheduler.production.min.js'),
  'utf8'
);
const reactDomCode = fs.readFileSync(
  path.join(rootDir, 'node_modules/react-dom/cjs/react-dom.production.min.js'),
  'utf8'
);
const xlsxCode = fs.readFileSync(
  path.join(rootDir, 'node_modules/xlsx/dist/xlsx.mini.min.js'),
  'utf8'
);

const runtimeShim = `
window.React = (function() {
  var exports = {};
  var module = { exports: exports };
  ${reactCode}
  return module.exports;
})();
window.Scheduler = (function() {
  var exports = {};
  var module = { exports: exports };
  ${schedulerCode}
  return module.exports;
})();
window.ReactDOM = (function() {
  var exports = {};
  var module = { exports: exports };
  var require = function(name) {
    if (name === 'react') return window.React;
    if (name === 'scheduler') return window.Scheduler;
    throw new Error('Unknown module: ' + name);
  };
  ${reactDomCode}
  return module.exports;
})();
`;

function stripImportsAndExports(code, exportDefaultName) {
  let out = code
    .replace(/^['"]use client['"];?\s*/gm, '')
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/export\s+type\s+[\s\S]*?;\s*/g, '')
    .replace(/export\s+interface\s+[\s\S]*?\n\}/g, '');

  if (exportDefaultName) {
    out = out.replace(
      /export\s+default\s+function\s+(\w+)/g,
      `function ${exportDefaultName}`
    );
  }
  out = out.replace(/export\s+const\s+/g, 'const ');
  out = out.replace(/export\s+async\s+function\s+/g, 'async function ');
  out = out.replace(/export\s+function\s+/g, 'function ');
  return out;
}

const filesToBundle = [
  { file: 'src/data/initialData.ts', defaultName: null },
  { file: 'src/lib/bomEngine.ts', defaultName: null },
  { file: 'src/lib/supabase.ts', defaultName: null },
  { file: 'src/lib/excelExport.ts', defaultName: null },
  {
    file: 'src/components/MultiSelectDropdown.tsx',
    defaultName: 'MultiSelectDropdown',
  },
  {
    file: 'src/components/VisualProductTree.tsx',
    defaultName: 'VisualProductTree',
  },
  { file: 'src/components/AdminDashboard.tsx', defaultName: 'AdminDashboard' },
  { file: 'src/app/page.tsx', defaultName: 'HomePage' },
];

let combinedTsx = `
const { useState, useEffect, useMemo, useRef } = React;
const process = { env: { NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' } };
const createClient = () => null;
const EMBEDDED_PNGS: Record<string, string> = ${JSON.stringify(imageMap)};
`;

for (const item of filesToBundle) {
  const fullPath = path.join(rootDir, item.file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  combinedTsx +=
    `\n// --- ${item.file} ---\n` +
    stripImportsAndExports(raw, item.defaultName) +
    '\n';
}

combinedTsx += `
getItemImageUrl = function(skuOrId: string, customImg?: string | null, isCustom?: boolean): string {
  if (customImg && customImg.startsWith('data:')) return customImg;
  if (customImg && customImg.includes('/images/assemblies/')) {
    const key = customImg.split('/').pop()?.replace('.png', '') || '';
    if (EMBEDDED_PNGS[key]) return EMBEDDED_PNGS[key];
  }
  if (isCustom && EMBEDDED_PNGS['CUSTOM-DEV']) return EMBEDDED_PNGS['CUSTOM-DEV'];
  if (EMBEDDED_PNGS[skuOrId]) return EMBEDDED_PNGS[skuOrId];
  return EMBEDDED_PNGS['OPT-MOD-100'] || '';
};

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = (ReactDOM as any).createRoot(rootEl);
  root.render(React.createElement(HomePage));
}
`;

const transpiled = ts.transpileModule(combinedTsx, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
    jsx: ts.JsxEmit.React,
    removeComments: true,
  },
}).outputText;

const cssContent = fs
  .readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf8')
  .replace(/@tailwind\s+\w+;/g, '');

const finalHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>תוצאה סופית – אפליקציית קונפיגורטור BOM (Next.js + Supabase + Excel)</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
${cssContent}
  </style>
</head>
<body class="bg-slate-100 text-slate-900 font-sans min-h-screen flex flex-col">
  <div id="root"></div>
  <script>
${xlsxCode}
${runtimeShim}
${transpiled}
  </script>
</body>
</html>`;

const artifactOut =
  'C:\\Users\\Shalom\\.gemini\\antigravity\\brain\\9ca4bfb9-149a-4b15-bff8-302b762f917a\\final_app_preview.html';
fs.writeFileSync(artifactOut, finalHtml, 'utf8');
console.log(
  'Successfully built self-contained final_app_preview.html (' +
    Math.round(finalHtml.length / 1024) +
    ' KB)'
);
