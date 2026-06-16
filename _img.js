const puppeteer=require('puppeteer');const path=require('path');const fs=require('fs');
function chrome(){const c='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';return fs.existsSync(c)?c:undefined;}
(async()=>{
  const b=await puppeteer.launch({executablePath:chrome(),headless:'new',args:['--no-sandbox']});
  for(const f of ['ants-camp.html','da2joburureung.html','career.html']){
    const pg=await b.newPage();
    const fails=[];
    pg.on('requestfailed',r=>fails.push(r.url().split('/').pop()));
    await pg.goto('file://'+path.join(__dirname,'fs',f),{waitUntil:'networkidle0'});
    const imgs=await pg.$$eval('img',els=>els.filter(i=>i.src&&i.src.includes('/images/')).map(i=>({src:i.src.split('/').pop(),ok:i.complete&&i.naturalWidth>0})));
    console.log(`[${f}] 이미지 ${imgs.length}개, 로드실패=${imgs.filter(i=>!i.ok).map(i=>i.src).join(',')||'없음'}  요청실패=${fails.join(',')||'없음'}`);
    await pg.close();
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
