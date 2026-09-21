// smoke17: 期間しぼりこみ＋「この条件で書き出す」の検証
// - 期間フィルタが集計（男士・小判・資源）に効く
// - ショートカット／手入力／境界（from・toを含む）／逆転（from>to）
// - 書き出しが期間×場所×ステージで絞られる／マスは効かない／ファイル名
// - 全件書き出し（設定画面）は従来どおり全部出る
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');

// 「今日」を固定できないので、相対期間は実行日基準で組み立てる
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const NOW=new Date();
const TODAY=ymd(NOW);
const dAgo=n=>{const d=new Date(NOW);d.setDate(d.getDate()-n);return ymd(d);};
const THIS_M1=ymd(new Date(NOW.getFullYear(),NOW.getMonth(),1));           // 今月1日
const LAST_M1=ymd(new Date(NOW.getFullYear(),NOW.getMonth()-1,1));         // 先月1日
const LAST_ME=ymd(new Date(NOW.getFullYear(),NOW.getMonth(),0));           // 先月末日

const seed={
  records:[
    // 大阪城50階：日付ちがいで4件（境界テスト用に固定日付）
    {id:'a1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:1}],kills:2,koban:100,hakata:null,date:'2026-07-01',updatedAt:1,deleted:false},
    {id:'a2',placeId:'osaka',floor:50,swords:[{name:'日本号',mass:'boss',count:2}],kills:3,koban:200,hakata:null,date:'2026-07-10',updatedAt:2,deleted:false},
    {id:'a3',placeId:'osaka',floor:50,swords:[{name:'御手杵',mass:'normal',count:1}],kills:1,koban:300,hakata:null,date:'2026-07-20',updatedAt:3,deleted:false},
    {id:'a4',placeId:'osaka',floor:99,swords:[{name:'蜻蛉切',mass:'boss',count:1}],kills:1,koban:400,hakata:null,date:'2026-07-10',updatedAt:4,deleted:false},
    // 過去（別の場所・資源つき）
    {id:'k1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:1}],kills:1,res:{mokutan:120},mins:10,date:'2026-07-01',updatedAt:5,deleted:false},
    {id:'k2',placeId:'kako',floor:'8-4',swords:[{name:'五虎退',mass:'normal',count:3}],kills:2,res:{mokutan:60},mins:5,date:'2026-07-20',updatedAt:6,deleted:false},
    // 相対期間テスト用は階30に分ける（相対日付が固定日付と重なっても境界テストを汚さないため）
    {id:'t0',placeId:'osaka',floor:30,swords:[{name:'日本号',mass:'boss',count:1}],kills:1,koban:0,date:TODAY,updatedAt:7,deleted:false},
    {id:'t7',placeId:'osaka',floor:30,swords:[{name:'日本号',mass:'boss',count:1}],kills:1,koban:0,date:dAgo(6),updatedAt:8,deleted:false},
    {id:'t40',placeId:'osaka',floor:30,swords:[{name:'日本号',mass:'boss',count:1}],kills:1,koban:0,date:dAgo(40),updatedAt:9,deleted:false},
    {id:'tlm',placeId:'osaka',floor:30,swords:[{name:'日本号',mass:'boss',count:1}],kills:1,koban:0,date:LAST_M1,updatedAt:10,deleted:false},
    // 削除済み（どの期間にも出てはいけない）
    {id:'del',placeId:'osaka',floor:50,swords:[{name:'日本号',mass:'boss',count:9}],kills:9,koban:9999,date:'2026-07-10',updatedAt:11,deleted:true},
  ],
  places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
};

let exportedRows=null, writtenName=null, blobName=null;

const dom=new JSDOM(html,{
  runScripts:'dangerously',
  url:'https://example.com/kaikouroku.html',
  beforeParse(w){
    w.gtag=function(){};
    w.XLSX={
      read:()=>({SheetNames:['s'],Sheets:{s:{}}}),
      utils:{
        sheet_to_json:()=>[],
        json_to_sheet:rows=>{exportedRows=rows;return {};},
        sheet_to_csv:()=>'csv-body',
        book_new:()=>({}),book_append_sheet:()=>{}
      },
      writeFile:(wb,name)=>{writtenName=name;},
      write:()=>''
    };
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};
    w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){};
    w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
  }
});

const w=dom.window, d=w.document;
let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

// ダウンロードのファイル名を捕まえる（a.download を横取り）
const origCreate=d.createElement.bind(d);
d.createElement=function(tag){
  const el=origCreate(tag);
  if(String(tag).toLowerCase()==='a'){
    el.click=function(){ blobName=el.download; };
  }
  return el;
};

const ids=()=>w.aggRecords().map(r=>r.id).sort().join(',');
const setPd=p=>w.setAggPeriod(d.querySelector('#aggPdChips .pd-chip[data-p="'+p+'"]'));
function setDates(f,t){
  d.getElementById('aggPdFrom').value=f;
  d.getElementById('aggPdTo').value=t;
  w.onAggPeriodDate();
}
function toOsaka50(){
  w.eval("aggState.placeId='osaka';aggState.floor=50;aggState.mass='all';renderAggControls();renderAgg();");
}
// 相対期間（今月・先月・過去N日）のテストは階30で行う
function toOsaka30(){
  w.eval("aggState.placeId='osaka';aggState.floor=30;aggState.mass='all';renderAggControls();renderAgg();");
}

console.log('--- smoke17 ---');

// 0) 初期状態
T('初期は全期間（from/toが空）', w.eval('aggState.pd')==='all' && w.eval('aggState.from')==='' && w.eval('aggState.to')==='');
T('初期チップ：全期間がon', d.querySelector('#aggPdChips .pd-chip[data-p="all"]').classList.contains('on'));

// 1) 期間フィルタの基本（大阪城50階に固定）
toOsaka50();
T('全期間：50階の生きてる記録が全部（削除済みは出ない）', ids()==='a1,a2,a3');

setDates('2026-07-01','2026-07-10');
T('7/1〜7/10：境界を両端とも含む（a1,a2）', ids()==='a1,a2');
T('別の階（99階のa4）は入らない', !ids().includes('a4'));

setDates('2026-07-02','2026-07-09');
T('7/2〜7/9：どちらの境界も外れる（0件）', ids()==='');

setDates('2026-07-10','');
T('開始日だけ：7/10以降', ids().split(',').includes('a2') && ids().split(',').includes('a3') && !ids().split(',').includes('a1'));

setDates('','2026-07-10');
T('終了日だけ：7/10まで（a1,a2）', ids()==='a1,a2');

setDates('2026-07-20','2026-07-01');
T('開始>終了：0件になる', ids()==='');
T('開始>終了：注意文が出る', d.getElementById('aggPdSummary').classList.contains('pd-warn') && /開始日が終了日より後/.test(d.getElementById('aggPdSummary').innerHTML));

// 2) ショートカット（相対日付の記録がある階30で）
toOsaka30();
setPd('d7');
T('過去7日：今日と6日前が入り、40日前は入らない', ids().split(',').includes('t0') && ids().split(',').includes('t7') && !ids().split(',').includes('t40'));
T('過去7日：日付欄が自動で埋まる', d.getElementById('aggPdFrom').value===dAgo(6) && d.getElementById('aggPdTo').value===TODAY);
T('過去7日：チップがonになる', d.querySelector('#aggPdChips .pd-chip[data-p="d7"]').classList.contains('on'));

setPd('d30');
T('過去30日：40日前は入らない', !ids().split(',').includes('t40') && ids().split(',').includes('t0'));

setPd('thism');
T('今月：開始が今月1日・終了が今日', d.getElementById('aggPdFrom').value===THIS_M1 && d.getElementById('aggPdTo').value===TODAY);
T('今月：先月1日の記録は入らない', !ids().split(',').includes('tlm'));

setPd('lastm');
T('先月：先月1日〜先月末日', d.getElementById('aggPdFrom').value===LAST_M1 && d.getElementById('aggPdTo').value===LAST_ME);
T('先月：先月1日の記録が入り、今日の記録は入らない', ids().split(',').includes('tlm') && !ids().split(',').includes('t0'));

setPd('all');
T('全期間に戻せる（from/to空）', w.eval('aggState.from')==='' && w.eval('aggState.to')==='');
T('全期間：要約が「全期間」表示', /全期間/.test(d.getElementById('aggPdSummary').innerHTML) && !d.getElementById('aggPdSummary').classList.contains('pd-warn'));

// 3) 手入力するとショートカットの選択が外れる／空にすると全期間に戻る
setDates('2026-07-01','2026-07-10');
T('手入力：pdがcustomになりチップのonが消える', w.eval('aggState.pd')==='custom' && !d.querySelector('#aggPdChips .pd-chip.on'));
setDates('','');
T('日付を空にすると全期間に戻る', w.eval('aggState.pd')==='all' && d.querySelector('#aggPdChips .pd-chip[data-p="all"]').classList.contains('on'));

// 4) 集計本体（男士・小判）に効く（固定日付の階50に戻す）
toOsaka50();
setDates('2026-07-01','2026-07-10');
T('男士一覧が期間内だけ（鬼丸国綱・日本号のみ）', /鬼丸国綱/.test(d.getElementById('rankList').innerHTML) && /日本号/.test(d.getElementById('rankList').innerHTML) && !/御手杵/.test(d.getElementById('rankList').innerHTML));
T('小判合計が期間内の合計（100+200=300）', d.getElementById('kobanTotal').textContent.replace(/,/g,'')==='300');
setPd('all');
T('全期間に戻すと小判合計が増える（300より大きい）', Number(d.getElementById('kobanTotal').textContent.replace(/,/g,''))>300);

// 5) 資源にも効く（過去へ切替）
w.eval("aggState.placeId='kako';aggState.floor='8-4';aggState.mass='all';renderAggControls();renderAgg();");
setDates('2026-07-01','2026-07-01');
T('資源：7/1だけなら木炭120', /120/.test(d.getElementById('aggShizai').innerHTML) && !/180/.test(d.getElementById('aggShizai').innerHTML));
setPd('all');
T('資源：全期間なら木炭180（120+60）', /180/.test(d.getElementById('aggShizai').innerHTML));

// 6) 0件のときの表示
setDates('2020-01-01','2020-01-31');
T('0件：期間向けのメッセージが出る', /この期間には、まだ記録がありません/.test(d.getElementById('rankList').innerHTML));
T('0件：書き出しカードも「記録がありません」', /記録がありません/.test(d.getElementById('aggExportNote').innerHTML));

// 7) 書き出し：期間×場所×ステージで絞られる
toOsaka50();
setDates('2026-07-01','2026-07-10');
T('書き出し案内：件数が出る（2件）', /2件/.test(d.getElementById('aggExportNote').innerHTML));
exportedRows=null;blobName=null;
w.exportAggCSV();
T('CSV：期間内の2件だけが行になる', exportedRows && exportedRows.length===2);
T('CSV：出た記録IDがa1とa2', exportedRows && exportedRows.map(r=>r['記録ID']).sort().join(',')==='a1,a2');
T('CSV：別の階(a4)・別の場所(k1)・削除済み(del)は入らない', exportedRows && !exportedRows.some(r=>['a4','k1','del'].includes(r['記録ID'])));
T('CSV：ファイル名に場所と期間が入る', blobName==='邂逅録_大阪城_50_20260701-20260710.csv');

exportedRows=null;writtenName=null;
w.exportAggXLSX();
T('Excel：同じく2件・ファイル名が.xlsx', exportedRows && exportedRows.length===2 && writtenName==='邂逅録_大阪城_50_20260701-20260710.xlsx');

// 8) マスのしぼりこみは書き出しに効かない（記録まるごと）
w.eval("aggState.mass='boss';renderAgg();");
exportedRows=null;
w.exportAggCSV();
T('マス=ボスにしても書き出しは記録まるごと（2件のまま）', exportedRows && exportedRows.length===2);
w.eval("aggState.mass='all';renderAgg();");

// 9) ファイル名のバリエーション
w.eval("aggState.floor='all';renderAgg();");
blobName=null;w.exportAggCSV();
T('ファイル名：階すべてなら階を入れない', blobName==='邂逅録_大阪城_20260701-20260710.csv');
setPd('all');
blobName=null;w.exportAggCSV();
T('ファイル名：全期間なら「全期間」', blobName==='邂逅録_大阪城_全期間.csv');
setDates('2026-07-10','');
blobName=null;w.exportAggCSV();
T('ファイル名：開始日だけなら「以降」', blobName==='邂逅録_大阪城_20260710以降.csv');
setDates('','2026-07-10');
blobName=null;w.exportAggCSV();
T('ファイル名：終了日だけなら「まで」', blobName==='邂逅録_大阪城_20260710まで.csv');

// 10) 0件のときは書き出さない
setDates('2020-01-01','2020-01-31');
blobName=null;exportedRows=null;
w.exportAggCSV();
T('0件：CSVを書き出さない', blobName===null);
writtenName=null;
w.exportAggXLSX();
T('0件：Excelも書き出さない', writtenName===null);

// 11) 設定画面の全件書き出しは従来どおり（期間の影響を受けない）
exportedRows=null;blobName=null;
w.exportCSV();
const alive=seed.records.filter(r=>!r.deleted).length;
T('全件CSV：期間を絞っていても全記録が出る', exportedRows && exportedRows.length===alive);
T('全件CSV：ファイル名は従来の 邂逅録_日付.csv', /^邂逅録_\d{8}\.csv$/.test(blobName||''));

// 12) recordsToRows の後方互換（引数なし＝全件）
T('recordsToRows()：引数なしは全記録', w.recordsToRows().length===alive);
T('recordsToRows(配列)：渡した分だけ', w.recordsToRows([seed.records[0]]).length===1);

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
