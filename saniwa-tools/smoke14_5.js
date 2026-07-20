// smoke14_5: あかり改修分の検証
// 1) 旧CSV型崩れの一度きり修復（日付シリアル・過去ステージ'84'/シリアル）
// 2) CSVの記録ID・記録時刻の書き出し＆取り込み往復・二重登録防止
// 3) 取り込み検証（不明ステージ・不明難易度はエラー行に）
// 4) 検非違使マスの書き出し・取り込み・kebiByStage解放
// 5) PC/スマホ切替で最近の記録が作り直される
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const D='2026-07-14';
const AT_1430=Date.UTC(2026,6,14,5,30,0); // JST 14:30
const SERIAL_84=Math.round((Date.UTC(2001,7,4)-Date.UTC(1899,11,30))/86400000);   // '8-4'が日付化したシリアル
const SERIAL_D=Math.round((Date.UTC(2026,6,14)-Date.UTC(1899,11,30))/86400000);   // 2026-07-14のシリアル

const seed={
  records:[
    // 壊れた記録たち（修復対象）
    {id:'b1',placeId:'kako',floor:'84',swords:[{name:'今剣',mass:'boss',count:1}],kills:1,date:D,updatedAt:1,deleted:false},
    {id:'b2',placeId:'kako',floor:String(SERIAL_84),swords:[{name:'五虎退',mass:'normal',count:1}],kills:1,date:D,updatedAt:2,deleted:false},
    {id:'b3',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'kebi',count:1}],kills:1,date:String(SERIAL_D),updatedAt:3,deleted:false},
    // 健全な記録（触られてはいけない）
    {id:'g1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:1}],kills:2,date:D,updatedAt:4,at:AT_1430,deleted:false},
    {id:'g2',placeId:'osaka',floor:50,swords:[],kills:3,koban:500,hakata:'極',hrate:2,date:D,updatedAt:5,deleted:false},
  ],
  places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
};

let importRows=[];  // sheet_to_jsonが返す行（テストごとに差し替え）
let exportedRows=null; // json_to_sheetに渡された行を捕まえる

const dom=new JSDOM(html,{
  runScripts:'dangerously',
  url:'https://example.com/kaikouroku.html',
  beforeParse(w){
    w.gtag=function(){};
    w.XLSX={
      read:()=>({SheetNames:['s'],Sheets:{s:{}}}),
      utils:{
        sheet_to_json:()=>importRows,
        json_to_sheet:rows=>{exportedRows=rows;return {};},
        sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}
      },
      write:()=>''
    };
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};
    w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){};
    w.HTMLElement.prototype.click=w.HTMLElement.prototype.click||function(){};
    w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
  }
});

const w=dom.window, d=w.document;
let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }
function rec(id){ return JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(r=>r.id===id); }
function stored(){ return JSON.parse(w.localStorage.getItem('kk_set_v1')); }

console.log('--- smoke14.5 ---');

// 1) 一度きり修復
T("修復: floor '84' → '8-4'", rec('b1').floor==='8-4');
T(`修復: floorシリアル ${SERIAL_84} → '8-4'`, rec('b2').floor==='8-4');
T(`修復: dateシリアル ${SERIAL_D} → '${D}'`, rec('b3').date===D);
T('修復: 健全な記録は無傷（updatedAtも）', rec('g1').floor==='8-4' && rec('g1').updatedAt===4 && rec('g2').floor===50 && rec('g2').updatedAt===5);
T('修復: フラグcsvTypeRepairV1が立つ', stored().csvTypeRepairV1===true);

// 2) 書き出し：記録ID・記録時刻・検非違使
const rows=w.recordsToRows();
T('書き出し: 全行に記録IDが入る', Array.isArray(rows) && rows.length>0 && rows.every(r=>r['記録ID']));
const g1row=rows.find(r=>r['記録ID']==='g1');
T('書き出し: at付き記録の記録時刻がISO形式', g1row && /^\d{4}-\d{2}-\d{2}T/.test(g1row['記録時刻']));
const b3row=rows.find(r=>r['記録ID']==='b3');
T('書き出し: 検非違使マスが「検非違使」で出る', b3row && b3row['マス(ボス/通常)']==='検非違使');

// 3) 取り込み往復：ID・時刻の保持と二重登録防止
const beforeCnt=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.length;
importRows=[
  {'日付':D,'場所':'過去（恒常マップ）','階数':'7-2','マス(ボス/通常)':'検非違使','男士':'村雲江','件数':'1','撃破回数':'2','小判':'','博多(なし/初/極)':'','記録ID':'rimport01','記録時刻':new Date(AT_1430).toISOString()},
];
w.importTable('dummy','csv','merge');
const imp=rec('rimport01');
T('取り込み: 記録IDが保持される', !!imp);
T('取り込み: 記録時刻がms数値で入る', imp && imp.at===AT_1430);
T('取り込み: 検非違使マスで入る', imp && imp.swords[0].mass==='kebi');
T('取り込み: kebiByStageが解放される', JSON.parse(w.localStorage.getItem('kk_data_v1')).kebiByStage['kako@7-2']===true);
w.importTable('dummy','csv','merge'); // 同じCSVをもう一度
const afterCnt=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.length;
T('取り込み: 同じ記録IDは二重登録しない', afterCnt===beforeCnt+1);

// 4) 取り込み検証：不明ステージ・不明難易度はエラー行に
importRows=[
  {'日付':D,'場所':'過去（恒常マップ）','階数':'9-9','マス(ボス/通常)':'ボス','男士':'今剣','件数':'1','撃破回数':'1'},
  {'日付':D,'場所':'夏の連隊戦','階数':'ちょい難','マス(ボス/通常)':'不明','男士':'今剣','件数':'1','撃破回数':'1'},
];
const preCnt=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.length;
w.importTable('dummy','csv','merge');
const postCnt=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.length;
T('取り込み: 不明ステージ/難易度は取り込まれない', postCnt===preCnt);
T('取り込み: エラーメッセージが表示される', /確認できませんでした/.test(d.body.innerHTML));

// 5) PC/スマホ切替で最近の記録が作り直される
w.eval("ST.recentView='rec';saveST();renderRecent();");
const listHtml=()=>d.getElementById('recentList').innerHTML;
T('スマホ表示: 資源なしでも切替自体は正常（タップ編集記法なし）', !/rres-/.test(listHtml()));
// 資源つき記録を足して切替
w.eval("UD.records.push({id:'res1',placeId:'kako',floor:'8-4',swords:[],kills:1,res:{mokutan:10},mins:1,date:'"+D+"',updatedAt:9,deleted:false});save();renderRecent();");
T('スマホ表示: 資源行はモーダル方式', /openResEdit\('res1'\)/.test(listHtml()));
w.toggleViewMode();
T('PC切替: 資源行がその場タップ編集に作り直される', /rres-res1-mokutan/.test(listHtml()));
w.toggleViewMode();
T('スマホへ戻す: モーダル方式に戻る', /openResEdit\('res1'\)/.test(listHtml()));

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
