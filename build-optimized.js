const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { optimizePdfs, parseOnly } = require('./optimize-pdfs');

const ROOT = __dirname;

function buildOriginalPdfs(only, outputDir) {
  const env = { ...process.env };
  // 최적화에 필요한 long 원본만 임시 폴더에 생성한다.
  env.LONG_ONLY = '1';
  env.PDF_OUTPUT_DIR = outputDir;
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
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-pdf-'));
  try {
    buildOriginalPdfs(only, sourceDir);
    optimizePdfs({ only, sourceDir });
  } finally {
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`최적화 PDF 빌드 실패: ${error.message}`);
  process.exit(1);
}
