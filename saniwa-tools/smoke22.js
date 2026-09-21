// smoke22: 連隊戦の3分割（C）＋改名（D）の検証
// 1) 場所が3つに分かれ、隣り合って並ぶ
// 2) 難易度表（冬8・初夏9・海辺8）と破線
// 3) 開催回の既定値（冬11・初夏2）
// 4) 終わったイベントを畳む
// 5) 場所セレクトの下の補足
// 6) 入れ違え記録の救済
// 7) 短い呼び名とファイル名
// 8) 記録は無傷
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('kaikouroku.html','utf8');

let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

function boot(seed,settings){
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.com/kaikouroku.html',beforeParse(w){
    w.gtag=function(){};
    w.XLSX={read:()=>({SheetNames:[],Sheets:{}}),utils:{sheet_to_json:()=>[],json_to_sheet:r=>{w.__rows=r;return{};},sheet_to_csv:()=>'x',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){};
    if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
    if(settings)w.localStorage.setItem('kk_set_v1',JSON.stringify(settings));
  }});
  return dom.window;
}
const UD=w=>JSON.parse(w.localStorage.getItem('kk_data_v1'));
const ST=w=>JSON.parse(w.localStorage.getItem('kk_set_v1')||'{}');
const pl=(w,id)=>UD(w).places.find(p=>p.id===id);
const terms=(w,id)=>{const p=pl(w,id);return p&&p.terms?p.terms:[];};

console.log('--- smoke22 ---');

// ════════════════════════════════════════
// A. 場所が3つに分かれる
// ════════════════════════════════════════
{
  const w=boot(null,null);
  T('A1 冬の連隊戦ができる', !!pl(w,'rentai_fuyu') && pl(w,'rentai_fuyu').name==='連隊戦');
  T('A2 初夏の陣ができる', !!pl(w,'rentai_shoka') && pl(w,'rentai_shoka').name==='連隊戦・初夏の陣');
  T('A3 海辺の陣は中黒に改名ずみ', pl(w,'rentai_natsu').name==='連隊戦・海辺の陣');
  T('A4 大阪城も中黒', pl(w,'osaka').name==='大阪城・地下に眠る千両箱');
  T('A5 並び順が 冬105→海辺110→初夏115', pl(w,'rentai_fuyu').order===105 && pl(w,'rentai_natsu').order===110 && pl(w,'rentai_shoka').order===115);
  T('A6 連隊戦3つが隣り合う', (()=>{
    const ids=w.activePlaces().map(p=>p.id);
    const i=ids.indexOf('rentai_fuyu');
    return ids[i+1]==='rentai_natsu' && ids[i+2]==='rentai_shoka';
  })());
  T('A7 初夏だけ ended', pl(w,'rentai_shoka').ended===true && !pl(w,'rentai_fuyu').ended && !pl(w,'rentai_natsu').ended);
  T('A8 短い呼び名が3つとも別（冬/夏/初夏の連隊戦）',
    w.shortNameOf('rentai_fuyu')==='冬の連隊戦' && w.shortNameOf('rentai_natsu')==='夏の連隊戦' && w.shortNameOf('rentai_shoka')==='初夏の連隊戦');
}

// ════════════════════════════════════════
// B. 難易度表
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const ids=id=>w.eval("DIFF_SETS['"+id+"'].items.map(function(d){return d.id;})");
  T('B1 冬は8個', ids('rentai_fuyu').length===8);
  T('B2 冬に単発の乱が無い', ids('rentai_fuyu').indexOf('ran')<0);
  T('B3 冬に4種の乱がある', ['ran_chuya','ran_yasen','ran_kenrou','ran_ensen'].every(x=>ids('rentai_fuyu').includes(x)));
  T('B4 初夏は9個', ids('rentai_shoka').length===9);
  T('B5 初夏に単発の乱がある', ids('rentai_shoka').includes('ran'));
  T('B6 単発の乱に old 印（破線用）', w.eval("DIFF_SETS['rentai_shoka'].items.find(function(d){return d.id==='ran';}).old")===true);
  T('B7 海辺は8個のまま（特別合戦場）', ids('rentai').length===8 && ids('rentai').includes('sp_easy'));
  T('B8 通常4のidは3つとも共通（救済で移せるように）',
    ['easy','normal','hard','superhard'].every(x=>ids('rentai_fuyu').includes(x)&&ids('rentai_shoka').includes(x)&&ids('rentai').includes(x)));
  T('B9 乱のフルネームが「乱・昼夜」', w.diffName('rentai_fuyu','ran_chuya')==='乱・昼夜');
  T('B10 通常はそのまま「易」', w.diffName('rentai_fuyu','easy')==='易');

  // 破線が実際に描かれる
  w.eval("recState.placeId='rentai_shoka';renderRecFloor();");
  const area=w.document.getElementById('recStageArea')||w.document.getElementById('recDiffArea');
  const h=w.document.getElementById('rec').innerHTML;
  T('B11 初夏の画面に破線ボタンが1つ出る', (h.match(/rec-stage-btn old/g)||[]).length===1);
  w.eval("recState.placeId='rentai_fuyu';renderRecFloor();");
  T('B12 冬の画面には破線が無い', !/rec-stage-btn old/.test(w.document.getElementById('rec').innerHTML));
}

// ════════════════════════════════════════
// C. 開催回の既定値
// ════════════════════════════════════════
{
  const w=boot(null,null);
  T('C1 冬に11回入る', terms(w,'rentai_fuyu').length===11);
  T('C2 初夏に2回入る', terms(w,'rentai_shoka').length===2);
  T('C3 冬の最新が 2025-12-16〜2026-01-13', terms(w,'rentai_fuyu').some(t=>t.from==='2025-12-16'&&t.to==='2026-01-13'));
  T('C4 冬の最古が 2015-12-29〜2016-01-18', terms(w,'rentai_fuyu').some(t=>t.from==='2015-12-29'&&t.to==='2016-01-18'));
  T('C5 初夏の2回が正しい', (()=>{
    const t=terms(w,'rentai_shoka');
    return t.some(x=>x.from==='2018-06-28'&&x.to==='2018-07-26') && t.some(x=>x.from==='2017-05-30'&&x.to==='2017-06-13');
  })());
  T('C6 冬の呼び名は開始年月（2025年12月）', terms(w,'rentai_fuyu').some(t=>t.name==='2025年12月'));
  T('C7 呼び名に重複なし', new Set(terms(w,'rentai_fuyu').map(t=>t.name)).size===11);
  T('C8 場所ごとの移行フラグが立つ', (UD(w).termsSeeded||{}).rentai_fuyu===true && (UD(w).termsSeeded||{}).rentai_shoka===true);
  T('C9 既存3場所の開催回は無傷', terms(w,'osaka').length===39 && terms(w,'rentai_natsu').length===8 && terms(w,'hyakki').length===3);
}

// ════════════════════════════════════════
// D. 終わったイベントを畳む
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const opts=()=>[...w.document.getElementById('recPlace').options].map(o=>o.value);
  w.eval("recState.placeId='osaka';renderRecPlace();");
  T('D1 既定では初夏の陣が記録画面に出ない', !opts().includes('rentai_shoka'));
  T('D2 冬と海辺は出る', opts().includes('rentai_fuyu') && opts().includes('rentai_natsu'));
  T('D3 集計のセレクトには出る（畳まない）', w.activePlaces().some(p=>p.id==='rentai_shoka'));
  T('D4 切替のチェックが出ている', /終わったイベントも出す/.test(w.document.getElementById('recPlaceExtras').innerHTML));
  T('D5 タグに初夏の連隊戦', /初夏の連隊戦/.test(w.document.getElementById('recPlaceExtras').innerHTML));
  w.setShowEnded(true);
  T('D6 オンにすると出る（終了つき）', opts().includes('rentai_shoka') &&
    [...w.document.getElementById('recPlace').options].some(o=>/（終了）/.test(o.textContent)));
  T('D7 設定が保存される', ST(w).showEnded===true);
  w.setShowEnded(false);
  T('D8 戻せる', !opts().includes('rentai_shoka'));
  // 選択中なら畳まれない
  w.eval("recState.placeId='rentai_shoka';renderRecPlace();");
  T('D9 いま選んでいる場所は畳まれない', opts().includes('rentai_shoka'));
}

// ════════════════════════════════════════
// E. 場所セレクトの下の補足
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const ex=()=>w.document.getElementById('recPlaceExtras').innerHTML;
  w.eval("recState.placeId='rentai_fuyu';renderRecPlaceExtras();");
  T('E1 冬を選ぶと補足が出る', /この「<b>連隊戦<\/b>」は<b>冬<\/b>/.test(ex()));
  T('E2 補足に「連隊戦・海辺の陣」への案内', /連隊戦・海辺の陣/.test(ex()));
  w.eval("recState.placeId='rentai_natsu';renderRecPlaceExtras();");
  T('E3 海辺では補足が出ない', !/place-note/.test(ex()));
  w.eval("recState.placeId='osaka';renderRecPlaceExtras();");
  T('E4 大阪城でも出ない', !/place-note/.test(ex()));
}

// ════════════════════════════════════════
// F. 入れ違え記録の救済
// ════════════════════════════════════════
{
  const seed={
    records:[
      // 冬の開催期間にある海辺の陣の記録（＝入れ間違い）
      {id:'m1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:2}],kills:3,date:'2025-12-20',updatedAt:1,deleted:false},
      {id:'m2',placeId:'rentai_natsu',floor:'hard',swords:[{name:'南泉一文字',mass:'unknown',count:1}],kills:1,date:'2026-01-05',updatedAt:2,deleted:false},
      // 特別合戦場（冬に無いので移さない）
      {id:'m3',placeId:'rentai_natsu',floor:'sp_hard',swords:[{name:'今剣',mass:'unknown',count:1}],kills:1,date:'2025-12-25',updatedAt:3,deleted:false},
      // ちゃんと夏の記録（触ってはいけない）
      {id:'ok1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'五虎退',mass:'unknown',count:1}],kills:2,date:'2026-07-05',updatedAt:4,deleted:false}
    ],
    places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  T('F1 入れ違えを2件見つける（特別合戦場は除く）', w.misfiledWinterRecords().length===2);
  T('F2 除いた特別合戦場を1件数える', w.misfiledSkipped()===1);
  T('F3 帯が出る', w.document.getElementById('misfixBar').classList.contains('show'));
  w.openMisfixDialog();
  T('F4 ダイアログに件数と年月が出る', (()=>{
    const h=w.document.getElementById('confirmModal').innerHTML;
    return /2件/.test(h) && /2025年12月/.test(h) && /特別合戦場の記録 1件/.test(h);
  })());
  w.document.getElementById('cfOk').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  const rec=id=>UD(w).records.find(r=>r.id===id);
  T('F5 2件が冬へ移る', rec('m1').placeId==='rentai_fuyu' && rec('m2').placeId==='rentai_fuyu');
  T('F6 特別合戦場は動かない', rec('m3').placeId==='rentai_natsu');
  T('F7 夏の記録は動かない', rec('ok1').placeId==='rentai_natsu');
  T('F8 記録の中身は無傷', rec('m1').swords[0].name==='村雲江' && rec('m1').swords[0].count===2 && rec('m1').kills===3 && rec('m1').date==='2025-12-20');
  T('F9 帯が消える', !w.document.getElementById('misfixBar').classList.contains('show'));
  T('F10 二度と出ないフラグ', ST(w).misfixDone===true);
  const w2=boot(UD(w),ST(w));
  T('F11 開き直しても帯は出ない', !w2.document.getElementById('misfixBar').classList.contains('show'));
}
{
  // 断ったら二度と出ない
  const seed={
    records:[{id:'m1',placeId:'rentai_natsu',floor:'easy',swords:[],kills:1,date:'2025-12-20',updatedAt:1,deleted:false}],
    places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  T('F12 帯が出ている', w.document.getElementById('misfixBar').classList.contains('show'));
  w.dismissMisfixBar();
  T('F13 ×で消える', !w.document.getElementById('misfixBar').classList.contains('show'));
  T('F14 記録は動いていない', UD(w).records[0].placeId==='rentai_natsu');
  const w2=boot(UD(w),ST(w));
  T('F15 開き直しても出ない', !w2.document.getElementById('misfixBar').classList.contains('show'));
}
{
  // 入れ違えが無ければ帯は出ない
  const w=boot(null,null);
  T('F16 該当なしなら帯は出ない', !w.document.getElementById('misfixBar').classList.contains('show'));
}

// ════════════════════════════════════════
// G. 取り込みとファイル名
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const cases=[
    ['連隊戦','rentai_fuyu'],
    ['冬の連隊戦','rentai_fuyu'],
    ['連隊戦・海辺の陣','rentai_natsu'],
    ['連隊戦～海辺の陣～','rentai_natsu'],
    ['夏の連隊戦','rentai_natsu'],
    ['連隊戦・初夏の陣','rentai_shoka'],
    ['初夏の連隊戦','rentai_shoka'],
    ['大阪城（地下に眠る千両箱）','osaka'],
    ['大阪城・地下に眠る千両箱','osaka'],
  ];
  cases.forEach(([inp,want])=>T(`G "${inp}" → ${want}`, w.resolvePlace(inp)===want));
  w.eval("aggState.placeId='rentai_fuyu';aggState.floor='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
  T('G10 ファイル名が短い呼び名', w.aggExportName('csv')==='邂逅録_冬の連隊戦_全期間.csv');
}

// ════════════════════════════════════════
// H. 既存の記録が壊れていない
// ════════════════════════════════════════
{
  const seed={
    records:[{id:'x1',placeId:'rentai_natsu',floor:'sp_hard',swords:[{name:'村雲江',mass:'unknown',count:5}],kills:9,date:'2026-07-10',updatedAt:1,deleted:false}],
    places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  const r=UD(w).records.find(x=>x.id==='x1');
  T('H1 海辺の記録は無傷', r.placeId==='rentai_natsu' && r.floor==='sp_hard' && r.swords[0].count===5 && r.kills===9);
  T('H2 件数も変わらない', UD(w).records.length===1);
  T('H3 狐ヶ崎為次が読み込まれている', w.eval('MR.some(function(x){return x[1]==="狐ヶ崎為次";})')===true);
}

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
