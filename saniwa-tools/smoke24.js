// smoke24: 階ラベルの一本化（stageLabel）の検証
// 1) 夜花が「江戸下町」と出る（サイドバー2箇所・日ごと・記録カード）
// 2) 画面に内部の階ID edo が出ない／内部キー（gid）は従来どおり edo のまま
// 3) 書き出し案内文が難易度IDではなく読める名前を出す
// 4) stageLabel が唯一の出どころで、旧3関数はそこへ寄せてある
const fs=require('fs');const {JSDOM}=require('jsdom');
const seed={records:[
 {id:'y1',placeId:'yobana',floor:'edo',swords:[{name:'今剣',mass:'boss',count:2}],kills:5,date:'2026-08-26',updatedAt:1,deleted:false},
 {id:'r1',placeId:'rentai_natsu',floor:'sp_hard',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:2,date:'2026-08-26',updatedAt:2,deleted:false},
 {id:'o1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:1}],kills:3,koban:900,date:'2026-08-26',updatedAt:3,deleted:false},
 {id:'k1',placeId:'kako',floor:'8-4',swords:[{name:'五虎退',mass:'boss',count:1}],kills:1,date:'2026-08-26',updatedAt:4,deleted:false},
 {id:'f1',placeId:'rentai_fuyu',floor:'ran_chuya',swords:[{name:'南泉一文字',mass:'unknown',count:1}],kills:1,date:'2026-08-26',updatedAt:5,deleted:false},
 {id:'h1',placeId:'hyakki',floor:'hi_kou',swords:[{name:'日本号',mass:'unknown',count:1}],kills:1,date:'2026-08-26',updatedAt:6,deleted:false}],
places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0};
const w=new JSDOM(fs.readFileSync('kaikouroku.html','utf8'),{runScripts:'dangerously',url:'https://example.com/k.html',
 beforeParse(w){w.gtag=function(){};
  w.XLSX={read:()=>({SheetNames:[],Sheets:{}}),utils:{sheet_to_json:()=>[],json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
  w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
  w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));}}).window;
const d=w.document;
let pass=0,fail=0; const T=(n,c)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('  NG  '+n));};

console.log('--- smoke24 ---');
console.log('=== 夜花：4つの表示 ===');
w.eval("recState.placeId='yobana';recState.floor='edo';renderSbNow();renderSbToday();");
const now=d.getElementById('sbNow').textContent;
console.log('   サイドバー「いまの周回」→ '+now.trim());
T('いまの周回に江戸下町', /江戸下町/.test(now) && !/edo/.test(now));
const td=d.getElementById('sbToday');
console.log('   サイドバー「きょう」   → '+(td?td.textContent.replace(/\s+/g,' ').trim().slice(0,60):'-'));
T('きょうにも edo が出ない', td && !/edo/.test(td.innerHTML));
w.eval("ST.recentView='date';saveST();renderRecent();");
const dh=d.getElementById('recentList').innerHTML;
console.log('   日ごとの見出し        → '+(dh.match(/<span class="sh-title">([^<]*)</)||[])[1]);
T('日ごとビューに edo階 が出ない', !/edo階/.test(dh));
T('日ごとビューに江戸下町が出る', /江戸下町/.test(dh));
w.eval("ST.recentView='rec';saveST();renderRecent();");
const rh=d.getElementById('recentList').innerHTML;
T('記録カードに edo階 が出ない', !/edo階/.test(rh));
T('記録カードに江戸下町が出る', /江戸下町/.test(rh));

console.log('\n=== 書き出し案内文（難易度が読める名前に）===');
w.eval("renderAggControls();renderAgg();");
function note(pid,fl){
  d.getElementById('aggPlace').value=pid; w.onAggPlace();
  if(fl!=null){const s=d.getElementById('aggFloor'); s.value=String(fl); w.onAggFloor();}
  return (d.getElementById('aggExportNote').textContent||'').trim();
}
const n1=note('rentai_natsu','sp_hard'); console.log('   '+n1);
T('連隊戦：特別合戦場・難 と出る', /特別合戦場・難/.test(n1) && !/sp_hard/.test(n1));
const n2=note('rentai_fuyu','ran_chuya'); console.log('   '+n2);
T('冬の連隊戦：乱・昼夜 と出る', /乱・昼夜/.test(n2) && !/ran_chuya/.test(n2));
const n3=note('hyakki','hi_kou'); console.log('   '+n3);
T('百鬼夜行：高難易度・甲 と出る', /高難易度・甲/.test(n3) && !/hi_kou/.test(n3));
const n4=note('osaka',50); console.log('   '+n4);
T('大阪城：50階 と出る', /50階/.test(n4));
const n5=note('kako','8-4'); console.log('   '+n5);
T('過去：ステージ名まで出る', /8-4/.test(n5));
const n6=note('yobana'); console.log('   '+n6);
T('夜花：階の部分が付かない（全期間・場所のみ）', !/edo/.test(n6));
T('夜花のファイル名は従来どおり', w.aggExportName('csv')==='邂逅録_夜花_全期間.csv');

console.log('\n=== ページ全体に edo が残っていないか ===');
w.eval("recState.placeId='yobana';recState.floor='edo';renderSbNow();renderSbToday();ST.recentView='date';saveST();renderRecent();");
// script/style を除いた「目に見えるテキスト」だけを見る
const vis=d.body.cloneNode(true);
[...vis.querySelectorAll('script,style')].forEach(e=>e.remove());
const shown=vis.textContent;
console.log('   画面テキスト内の "edo" 出現 '+((shown.match(/edo/g)||[]).length)+' 回');
T('画面に edo が1つも出ない', !/edo/.test(shown));
T('内部キー（onclickのgid）は従来どおり edo のまま',
  /toggleRecentGroup\('2026-08-26~yobana~edo'\)/.test(d.body.innerHTML));
console.log('\n=== 一本化されているか ===');
T('stageLabel が公開されている', typeof w.stageLabel==='function');
T('recHeadName は stageLabel と同じ結果', ['yobana|edo','osaka|50','kako|8-4','rentai_natsu|sp_hard','hyakki|hi_kou']
  .every(k=>{const[a,b]=k.split('|');return w.recHeadName(a,b)===w.stageLabel(a,b);}));
T('sbStageLabel も stageLabel と同じ結果', ['yobana|edo','osaka|50','kako|8-4','rentai_fuyu|ran_chuya']
  .every(k=>{const[a,b]=k.split('|');return w.sbStageLabel(a,b)===w.stageLabel(a,b);}));
T('江戸下町の名前は定数から来ている', w.eval('YOBANA_FLOOR_NAME')==='江戸下町' && w.stageLabel('yobana','edo')===w.eval('YOBANA_FLOOR_NAME'));
T('記録データは無傷', w.eval('UD.records.filter(r=>!r.deleted).length')===7-1);

console.log(`\n--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
