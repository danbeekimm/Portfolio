const { spawnSync } = require('child_process');
const path = require('path');
const { optimizePdfs, parseOnly } = require('./optimize-pdfs');

const ROOT = __dirname;

function buildOriginalPdfs(only) {
  const env = { ...process.env };
  // 최적화 대상인 long PDF만 생성하고 A4 PDF는 건드리지 않는다.
  env.LONG_ONLY = '1';
  if (only) env.ONLY = only;
  else delete env.ONLY;

  const result = spawnSync(process.execPath, [path.join(ROOT, 'build-pdf.js')], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`원본 PDF 빌드에 실패했습니다(exit ${result.status}).`);
  }
}

function main() {
  const only = parseOnly(process.argv.slice(2));
  buildOriginalPdfs(only);
  optimizePdfs({ only });
}

try {
  main();
} catch (error) {
  console.error(`최적화 PDF 빌드 실패: ${error.message}`);
  process.exit(1);
}
