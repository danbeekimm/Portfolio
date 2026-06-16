const puppeteer=require('puppeteer');const path=require('path');const fs=require('fs');
function chrome(){const c='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';return fs.existsSync(c)?c:undefined;}
const base='file://'+path.join(__dirname,'fs');
(async()=>{
  const b=await puppeteer.launch({executablePath:chrome(),headless:'new',args:['--no-sandbox']});
  const pg=await b.newPage();
  const tests=[
    {card:'.project-card.career', name:'career'},
    {card:null, name:'da2', sel:'a.card-link[href="da2joburureung.html"]'},
    {card:null, name:'ants', sel:'a.card-link[href="ants-camp.html"]'},
  ];
  for(const t of tests){
    await pg.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
    const sel = t.sel || t.card;
    await Promise.all([pg.waitForNavigation({waitUntil:'domcontentloaded'}), pg.click(sel)]);
    const detailUrl = pg.url();
    // back-link 클릭
    await Promise.all([pg.waitForNavigation({waitUntil:'domcontentloaded'}), pg.click('a.back-link')]);
    const backUrl = pg.url();
    const ok = backUrl.endsWith('/fs/index.html');
    console.log(`[${t.name}] 상세=${detailUrl.split('/fs/')[1]}  →메인=${backUrl.split('/pf2/')[1]}  ${ok?'✓ fs로 복귀':'✗ 백엔드로 샜음'}`);
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
