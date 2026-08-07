const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TARGETS = [
  {
    only: 'fs',
    source: 'portfolio-fs-long.pdf',
    output: 'portfolio-fs-long-optimized.pdf',
  },
  {
    only: 'backend',
    source: 'portfolio-long.pdf',
    output: 'portfolio-long-optimized.pdf',
  },
];

// 객체와 스트림의 중복을 제거하고, 기존 데이터를 손실 없이 다시 압축한다.
const CLEAN_ARGS = ['clean', '-gggg', '-z', '-f', '-i', '-t', '-Z', '-e', '100'];

function parseOnly(argv, envOnly = process.env.ONLY) {
  let only = envOnly || null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--only') {
      only = argv[i + 1];
      if (!only) throw new Error('--only 뒤에 fs 또는 backend 값이 필요합니다.');
      i += 1;
    } else if (arg.startsWith('--only=')) {
      only = arg.slice('--only='.length);
    } else {
      throw new Error(`지원하지 않는 인자입니다: ${arg}`);
    }
  }

  if (only && !TARGETS.some(target => target.only === only)) {
    throw new Error(`ONLY/--only 값은 fs 또는 backend여야 합니다: ${only}`);
  }
  return only;
}

function mutoolInstallGuide(platform = process.platform) {
  switch (platform) {
    case 'darwin':
      return 'macOS는 `brew install mupdf-tools`로 설치하세요.';
    case 'win32':
      return (
        'Windows는 https://mupdf.com/releases 에서 Windows 바이너리 ZIP을 받은 뒤, ' +
        '`mutool.exe`가 있는 폴더를 PATH에 추가하세요.'
      );
    case 'linux':
      return (
        'Ubuntu/Debian은 `sudo apt install mupdf-tools`로 설치하세요. ' +
        '다른 배포판은 패키지 관리자에서 mupdf-tools를 설치하세요.'
      );
    default:
      return (
        'https://mupdf.com/releases 에서 운영체제에 맞는 MuPDF 도구를 설치하고 ' +
        '`mutool`을 PATH에 추가하세요.'
      );
  }
}

function runMutool(args, options = {}) {
  const result = spawnSync('mutool', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error?.code === 'ENOENT') {
    throw new Error(`mutool을 찾을 수 없습니다. ${mutoolInstallGuide()}`);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout || ''}` : '';
    throw new Error(`mutool 실행에 실패했습니다(exit ${result.status}).${detail}`);
  }
  return result.stdout || '';
}

function pageCount(pdfPath) {
  const info = runMutool(['info', pdfPath], { capture: true });
  const match = info.match(/Pages:\s*(\d+)/);
  if (!match) throw new Error(`페이지 수를 확인할 수 없습니다: ${pdfPath}`);
  return Number(match[1]);
}

function mib(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function optimizeOne(target) {
  const sourcePath = path.join(ROOT, target.source);
  const outputPath = path.join(ROOT, target.output);
  const tempPath = path.join(ROOT, `.${target.output}.${process.pid}.tmp.pdf`);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`원본 PDF가 없습니다: ${target.source}`);
  }

  const sourceBytes = fs.statSync(sourcePath).size;
  const sourcePages = pageCount(sourcePath);
  console.log(`▶ ${target.source} 무손실 최적화 중…`);

  try {
    runMutool([...CLEAN_ARGS, sourcePath, tempPath]);

    const optimizedPages = pageCount(tempPath);
    if (sourcePages !== optimizedPages) {
      throw new Error(
        `페이지 수가 달라졌습니다: 원본 ${sourcePages}, 최적화본 ${optimizedPages}`
      );
    }

    // 검증이 끝난 임시 파일로만 기존 최적화본을 교체한다.
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    fs.renameSync(tempPath, outputPath);

    const outputBytes = fs.statSync(outputPath).size;
    const savedPercent = ((sourceBytes - outputBytes) / sourceBytes) * 100;
    console.log(
      `✓ ${target.output}: ${mib(sourceBytes)} MiB → ${mib(outputBytes)} MiB ` +
      `(${savedPercent.toFixed(1)}% 감소, ${sourcePages}페이지)`
    );
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

function optimizePdfs({ only = null } = {}) {
  const targets = only ? TARGETS.filter(target => target.only === only) : TARGETS;
  targets.forEach(optimizeOne);
}

if (require.main === module) {
  try {
    optimizePdfs({ only: parseOnly(process.argv.slice(2)) });
  } catch (error) {
    console.error(`PDF 최적화 실패: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { optimizePdfs, parseOnly, mutoolInstallGuide };
