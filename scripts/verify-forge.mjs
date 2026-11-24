import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const manifestLib = require('@forge/manifest');
const cliRequire = createRequire(require.resolve('@forge/cli/package.json'));
const bundlerLib = cliRequire('@forge/bundler');

async function verifyManifest() {
  const result = await manifestLib.validate(false);
  if (!result.success) {
    console.error('Forge manifest validation FAILED:', JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }
  console.log('Forge manifest validation PASSED (0 errors).');
  return result.manifestObject?.yamlContent;
}

async function verifyNodeBundle(yamlContent) {
  const appDirectory = process.cwd();
  const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracegate-forge-bundle-'));

  try {
    const logger = {
      info: () => {},
      warn: (msg) => console.warn(msg),
      error: (msg) => console.error(msg),
      debug: () => {},
    };

    const wrapperProvider = bundlerLib.getWrapperProvider({ isLocal: false });
    const configReader = {
      readConfig: async () => ({
        app: {
          runtime: { name: 'nodejs22.x' },
        },
      }),
    };

    const nodeBundler = bundlerLib.getNodeBundler(logger, wrapperProvider, configReader);
    const out = await nodeBundler.bundle({
      appDirectory,
      entryPoints: [{ name: 'index', path: 'src/index.ts' }],
      outputDir: tempOutputDir,
      packageConfig: undefined,
    });

    const compiledPath = path.join(out.outputDir, 'index.cjs');
    if (!fs.existsSync(compiledPath)) {
      throw new Error(`Expected compiled Forge bundle at ${compiledPath}, but it does not exist.`);
    }

    const compiledExports = require(compiledPath);
    const declaredFns = yamlContent?.modules?.function ?? [];
    for (const fn of declaredFns) {
      const [, exportName] = String(fn.handler).split('.');
      if (typeof compiledExports[exportName] !== 'function') {
        throw new Error(
          `Manifest function "${fn.key}" expects handler "${fn.handler}", but "${exportName}" is ${typeof compiledExports[exportName]}.`,
        );
      }
    }

    const stats = fs.statSync(compiledPath);
    console.log(
      `Forge NodeBundler PASSED: compiled index.cjs (${stats.size} bytes) with all ${declaredFns.length} handler exports verified.`,
    );
  } finally {
    fs.rmSync(tempOutputDir, { recursive: true, force: true });
  }
}

const yamlContent = await verifyManifest();
await verifyNodeBundle(yamlContent);
