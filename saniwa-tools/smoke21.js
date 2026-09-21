// smoke21: 開催期間（方式C）の検証
// 1) 既定値の投入（50回・場所ごとの一度きり・恒常マップには入れない）
// 2) 呼び名の自動生成と枝番
// 3) 集計の開催回チップ（記録があるものだけ・押す/解除・場所切替）
// 4) 期間フィルタが開催回で効く（両端を含む）
// 5) ショートカット／手入力を触ると開催回が外れる
// 6) 書き出しのファイル名に回名が入る
// 7) 編集（足す・直す・消す）とユーザー保護（自分で直した回に移行が触らない）
// 8) 記録には何も足していない
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

function boot(seed,settings){
  const dom=new JSDOM(html,{
    runScripts:'dangerously',
    url:'https://example.com/kaikouroku.html',
    beforeParse(w){
      w.gtag=function(){};
      w.XLSX={read:()=>({SheetNames:['s'],Sheets:{s:{}}}),utils:{sheet_to_json:()=>[],json_to_sheet:r=>{w.__rows=r;return {};},sheet_to_csv:()=>'x',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:(wb,n)=>{w.__xlsx=n;},write:()=>''};
      w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
      w.scrollTo=()=>{};
      w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
      w.HTMLElement.prototype.scrollIntoView=function(){};
      if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
      if(settings)w.localStorage.setItem('kk_set_v1',JSON.stringify(settings));
    }
  });
  const w=dom.window;
  // ダウンロード名を捕まえる
  const oc=w.document.createElement.bind(w.document);
  w.document.createElement=function(t){
    const el=oc(t);
    if(String(t).toLowerCase()==='a')el.click=function(){w.__blob=el.download;};
    return el;
  };
  return w;
}
const UD=w=>JSON.parse(w.localStorage.getItem('kk_data_v1'));
const terms=(w,pid)=>{const p=UD(w).places.find(x=>x.id===pid);return p&&p.terms?p.terms:[];};
const chips=w=>w.document.getElementById('aggTrmChips');
const ids=w=>w.aggRecords().map(r=>r.id).sort().join(',');

console.log('--- smoke21 ---');

// ════════════════════════════════════════
// A. 既定値の投入
// ════════════════════════════════════════
{
  const w=boot(null,null);
  T('A1 大阪城に39回入る', terms(w,'osaka').length===39);
  T('A2 海辺の陣に8回入る', terms(w,'rentai_natsu').length===8);
  T('A3 百鬼夜行に3回入る', terms(w,'hyakki').length===3);
  T('A4 恒常マップ（過去）には入れない', terms(w,'kako').length===0);
  T('A5 場所ごとの移行フラグが立つ', (()=>{
    const t=UD(w).termsSeeded||{};
    return t.osaka===true&&t.rentai_natsu===true&&t.hyakki===true;
  })());

  const o=terms(w,'osaka');
  T('A6 大阪城の最新が 2026-06-02〜06-23', o.some(t=>t.from==='2026-06-02'&&t.to==='2026-06-23'));
  T('A7 大阪城の最古が 2015-06-11〜07-07', o.some(t=>t.from==='2015-06-11'&&t.to==='2015-07-07'));
  T('A8 呼び名が「2026年6月」の形', o.some(t=>t.name==='2026年6月') && o.some(t=>t.name==='2015年6月'));
  T('A9 呼び名に重複がない（39件すべて別名）', new Set(o.map(t=>t.name)).size===39);
  const h=terms(w,'hyakki');
  T('A10 百鬼夜行 2026年8月が 08-12〜08-25', h.some(t=>t.name==='2026年8月'&&t.from==='2026-08-12'&&t.to==='2026-08-25'));
  T('A11 百鬼夜行 2025年8月が 08-12〜08-26', h.some(t=>t.name==='2025年8月'&&t.from==='2025-08-12'&&t.to==='2025-08-26'));
  T('A12 百鬼夜行 2024年8月が 08-13〜08-27', h.some(t=>t.name==='2024年8月'&&t.from==='2024-08-13'&&t.to==='2024-08-27'));
  T('A13 既定値には「予想」が付いていない（全部発表済み）', o.concat(h).every(t=>!t.est));
  T('A14 既定値は mine ではない（移行が触ってよい印）', o.every(t=>!t.mine));
}

// ════════════════════════════════════════
// B. 二度目は走らない／ユーザーが消しても復活しない
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const p=UD(w).places.find(x=>x.id==='osaka');
  // 全部消して保存 → 開き直す
  w.eval("var p=UD.places.find(function(x){return x.id==='osaka';});p.terms=[];save();");
  const w2=boot(UD(w),null);
  T('B1 ユーザーが全部消したら、開き直しても復活しない', terms(w2,'osaka').length===0);
  T('B2 フラグは立ったまま', (UD(w2).termsSeeded||{}).osaka===true);
}
{
  // フラグだけ落とすと入り直す（新しい場所が増えたときの経路）
  const w=boot(null,null);
  const d=UD(w);
  delete d.termsSeeded.hyakki;
  d.places.find(x=>x.id==='hyakki').terms=[];
  const w2=boot(d,null);
  T('B3 フラグが無い場所には既定値が入る（新しい場所の経路）', terms(w2,'hyakki').length===3);
  T('B4 ほかの場所は二重に増えない', terms(w2,'osaka').length===39);
}

// ════════════════════════════════════════
// C. 集計の開催回チップ（記録があるものだけ）
// ════════════════════════════════════════
{
  const w=boot(null,null);
  w.eval("aggState.placeId='osaka';aggState.floor='all';renderAggControls();renderAgg();");
  T('C1 記録が1件も無ければチップは出ない', chips(w).style.display==='none' && chips(w).innerHTML==='');

  // 2026年6月（06-02〜06-23）と 2025年9月（09-30〜10-14）に記録を置く
  w.eval("UD.records.push({id:'r1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:1}],kills:2,koban:100,date:'2026-06-10',updatedAt:1,deleted:false});"
        +"UD.records.push({id:'r2',placeId:'osaka',floor:50,swords:[{name:'日本号',mass:'boss',count:1}],kills:3,koban:200,date:'2025-10-01',updatedAt:2,deleted:false});"
        +"UD.records.push({id:'r3',placeId:'osaka',floor:50,swords:[{name:'御手杵',mass:'boss',count:1}],kills:1,koban:50,date:'2021-01-01',updatedAt:3,deleted:false});" // どの開催回にも入らない日
        +"save();renderAgg();");
  const html1=chips(w).innerHTML;
  T('C2 記録がある回だけ出る（2回）', (html1.match(/trm-chip/g)||[]).length===2);
  T('C3 2026年6月が出る', /2026年6月/.test(html1));
  T('C4 2025年9月が出る', /2025年9月/.test(html1));
  T('C5 記録がない回（2023年3月）は出ない', !/2023年3月/.test(html1));
  T('C6 39個は並ばない', (html1.match(/trm-chip/g)||[]).length<39);

  // 押す
  const t2026=terms(w,'osaka').find(t=>t.name==='2026年6月');
  w.setAggTerm(t2026.id);
  T('C7 押すと期間がその回になる', w.eval('aggState.from')==='2026-06-02' && w.eval('aggState.to')==='2026-06-23');
  T('C8 押すと pd が term になる', w.eval("aggState.pd")==='term');
  T('C9 その回の記録だけになる', ids(w)==='r1');
  T('C10 チップに on が付く', /trm-chip on/.test(chips(w).innerHTML));
  T('C11 要約に回名と期間が出る', (()=>{
    const s=w.document.getElementById('aggPdSummary').innerHTML;
    return /2026年6月/.test(s) && /2026\.06\.02/.test(s) && /2026\.06\.23/.test(s);
  })());
  // もう一度押すと解除
  w.setAggTerm(t2026.id);
  T('C12 もう一度押すと解除されて全期間に戻る', w.eval("aggState.pd")==='all' && w.eval('aggState.from')==='' && ids(w)==='r1,r2,r3');
}

// ════════════════════════════════════════
// D. 境界（両端を含む）
// ════════════════════════════════════════
{
  const w=boot(null,null);
  w.eval("UD.records.push({id:'b1',placeId:'hyakki',floor:'hi_kou',swords:[{name:'九鬼正宗',mass:'unknown',count:1}],kills:1,date:'2026-08-12',updatedAt:1,deleted:false});"  // 初日
        +"UD.records.push({id:'b2',placeId:'hyakki',floor:'hi_kou',swords:[{name:'三日月宗近',mass:'unknown',count:1}],kills:1,date:'2026-08-25',updatedAt:2,deleted:false});"  // 最終日
        +"UD.records.push({id:'b3',placeId:'hyakki',floor:'hi_kou',swords:[{name:'数珠丸恒次',mass:'unknown',count:1}],kills:1,date:'2026-08-11',updatedAt:3,deleted:false});"  // 前日
        +"UD.records.push({id:'b4',placeId:'hyakki',floor:'hi_kou',swords:[{name:'大典太光世',mass:'unknown',count:1}],kills:1,date:'2026-08-26',updatedAt:4,deleted:false});"  // 翌日
        +"save();aggState.placeId='hyakki';aggState.floor='all';renderAggControls();renderAgg();");
  const t=terms(w,'hyakki').find(x=>x.name==='2026年8月');
  w.setAggTerm(t.id);
  T('D1 初日(08-12)と最終日(08-25)は含まれる', ids(w)==='b1,b2');
  T('D2 前日(08-11)・翌日(08-26)は含まれない', !ids(w).includes('b3') && !ids(w).includes('b4'));
}

// ════════════════════════════════════════
// E. ほかの絞り込みを触ると開催回が外れる
// ════════════════════════════════════════
{
  const w=boot(null,null);
  w.eval("UD.records.push({id:'e1',placeId:'osaka',floor:50,swords:[],kills:1,date:'2026-06-10',updatedAt:1,deleted:false});save();"
        +"aggState.placeId='osaka';aggState.floor='all';renderAggControls();renderAgg();");
  const t=terms(w,'osaka').find(x=>x.name==='2026年6月');

  w.setAggTerm(t.id);
  w.setAggPeriod(w.document.querySelector('#aggPdChips .pd-chip[data-p="thism"]'));
  T('E1 ショートカットを押すと開催回が外れる', w.eval("aggState.pd")==='thism' && w.eval("aggState.termId")==='');
  T('E2 開催回チップの on が消える', !/trm-chip on/.test(chips(w).innerHTML));

  w.setAggTerm(t.id);
  w.document.getElementById('aggPdFrom').value='2026-01-01';
  w.document.getElementById('aggPdTo').value='2026-12-31';
  w.onAggPeriodDate();
  T('E3 日付を手入力すると開催回が外れる', w.eval("aggState.pd")==='custom' && w.eval("aggState.termId")==='');

  // 場所を変えたら外れる
  w.setAggTerm(t.id);
  w.eval("aggState.placeId='hyakki';aggState.floor='all';renderAggControls();renderAgg();");
  T('E4 場所を変えると開催回が外れる', w.eval("aggState.pd")==='all' && w.eval("aggState.termId")==='');
}

// ════════════════════════════════════════
// F. 書き出しのファイル名
// ════════════════════════════════════════
{
  const w=boot(null,null);
  w.eval("UD.records.push({id:'f1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:1}],kills:1,koban:100,date:'2026-06-10',updatedAt:1,deleted:false});save();"
        +"aggState.placeId='osaka';aggState.floor='all';renderAggControls();renderAgg();");
  const t=terms(w,'osaka').find(x=>x.name==='2026年6月');
  w.setAggTerm(t.id);
  T('F1 ファイル名に回名が入る', w.aggExportName('csv')==='邂逅録_大阪城_2026年6月.csv');
  w.eval("aggState.floor=50;renderAgg();");
  T('F2 階と回名の両方が入る', w.aggExportName('csv')==='邂逅録_大阪城_50_2026年6月.csv');
  w.exportAggCSV();
  T('F3 実際に書き出せて中身は1件', w.__rows && w.__rows.length===1 && w.__rows[0]['記録ID']==='f1');
  T('F4 ダウンロード名も回名', w.__blob==='邂逅録_大阪城_50_2026年6月.csv');
  w.eval("aggState.floor='all';renderAgg();");
  w.setAggTerm(t.id); // 解除
  T('F5 解除すれば従来どおり「全期間」', w.aggExportName('csv')==='邂逅録_大阪城_全期間.csv');
}

// ════════════════════════════════════════
// G. エリア設定タブでの編集
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const d=w.document;
  w.eval("scfgPlace='osaka';renderStageCfg();");
  T('G1 開催期間カードが出る', d.getElementById('scfgTermsCard').style.display!=='none');
  T('G2 最初は5回だけ表示', (d.getElementById('scfgTerms').innerHTML.match(/class="trm[ "]/g)||[]).length===5);
  T('G3 「もっと見る（全39回）」がある', /全39回/.test(d.getElementById('scfgTerms').innerHTML));
  w.trmShowMore();
  T('G4 もっと見るで39回すべて出る', (d.getElementById('scfgTerms').innerHTML.match(/class="trm[ "]/g)||[]).length===39);

  // 恒常マップでは出ない
  w.eval("scfgPlace='kako';renderStageCfg();");
  T('G5 過去では「恒常マップなので開催期間はありません」', /恒常マップなので/.test(d.getElementById('scfgTerms').innerHTML));

  // 足す
  w.eval("scfgPlace='hyakki';renderStageCfg();");
  w.trmEdit('new');
  d.getElementById('trmFrom').value='2027-08-11';
  d.getElementById('trmTo').value='2027-08-24';
  d.getElementById('trmName').value='';
  w.trmSave();
  const h=terms(w,'hyakki');
  T('G6 開催回を足せる（3→4回）', h.length===4);
  T('G7 呼び名が開始日から自動生成される', h.some(t=>t.name==='2027年8月'&&t.from==='2027-08-11'));
  T('G8 自分で足した回に mine が付く', h.find(t=>t.name==='2027年8月').mine===true);

  // 直す（予想フラグ）
  const nid=h.find(t=>t.name==='2027年8月').id;
  w.trmEdit(nid);
  d.getElementById('trmEst').checked=true;
  d.getElementById('trmTo').value='2027-08-25';
  w.trmSave();
  T('G9 「予想」を付けられる', terms(w,'hyakki').find(t=>t.id===nid).est===true);
  T('G10 一覧に「予想」バッジが出る', /class="est">予想/.test(d.getElementById('scfgTerms').innerHTML));

  // 開始日が終了日より後なら保存しない
  w.trmEdit(nid);
  d.getElementById('trmFrom').value='2027-09-01';
  d.getElementById('trmTo').value='2027-08-01';
  w.trmSave();
  T('G11 開始>終了は保存しない', terms(w,'hyakki').find(t=>t.id===nid).from==='2027-08-11');

  // 消す
  w.trmCancel();
  w.trmDel(nid);
  d.getElementById('cfOk').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  T('G12 消せる（4→3回）', terms(w,'hyakki').length===3);
  T('G13 消しても既定の3回は残る', terms(w,'hyakki').every(t=>!t.mine));
}

// ════════════════════════════════════════
// H. 呼び名の枝番（同じ年月が重なったとき）
// ════════════════════════════════════════
{
  const w=boot(null,null);
  w.eval("scfgPlace='hyakki';renderStageCfg();");
  w.trmEdit('new');
  w.document.getElementById('trmFrom').value='2026-08-01';
  w.document.getElementById('trmTo').value='2026-08-05';
  w.document.getElementById('trmName').value='';
  w.trmSave();
  const names=terms(w,'hyakki').map(t=>t.name);
  T('H1 同じ年月が重なると枝番が付く', names.includes('2026年8月') && names.includes('2026年8月(2)'));
  T('H2 呼び名は手で上書きもできる', (()=>{
    const id=terms(w,'hyakki').find(t=>t.name==='2026年8月(2)').id;
    w.trmEdit(id);
    w.document.getElementById('trmName').value='お盆の残党戦';
    w.trmSave();
    return terms(w,'hyakki').some(t=>t.name==='お盆の残党戦');
  })());
}

// ════════════════════════════════════════
// I. 記録には何も足していない
// ════════════════════════════════════════
{
  const seed={
    records:[{id:'x1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:3}],kills:5,koban:900,date:'2026-06-10',updatedAt:1,deleted:false}],
    places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  const r=UD(w).records.find(x=>x.id==='x1');
  T('I1 記録のキーが増えていない', !('termId' in r) && !('term' in r));
  T('I2 記録の中身は無傷', r.swords[0].count===3 && r.kills===5 && r.koban===900 && r.date==='2026-06-10');
  T('I3 記録の件数も変わらない', UD(w).records.length===1);
}

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
