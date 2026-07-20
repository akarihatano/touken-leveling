// smoke13_5: 第1.5段 CSV取り込みのfloor型崩れ修正の検証
// 過去 '8-4' → 文字列のまま／連隊戦 'easy' → 文字列のまま／大阪城 '50階' → 数値50
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');

// CSV相当の行（書き出しと同じ列名）。XLSXスタブのsheet_to_jsonがこれを返す
const csvRows=[
  {'日付':'2026-07-14','場所':'過去（恒常マップ）','階数':'8-4','マス(ボス/通常)':'ボス','男士':'今剣','件数':'1','撃破回数':'3','小判':'0','博多(なし/初/極)':'','博多倍率':'','木炭':'120','玉鋼':'50','冷却材':'','砥石':'','依頼札':'','時間(分)':'10','ボス小判回数':''},
  {'日付':'2026-07-14','場所':'夏の連隊戦','階数':'easy','マス(ボス/通常)':'不明','男士':'五虎退','件数':'2','撃破回数':'1','小判':'0','博多(なし/初/極)':'','博多倍率':'','木炭':'','玉鋼':'','冷却材':'','砥石':'','依頼札':'','時間(分)':'','ボス小判回数':''},
  {'日付':'2026-07-14','場所':'大阪城（地下に眠る千両箱）','階数':'50階','マス(ボス/通常)':'ボス','男士':'鬼丸国綱','件数':'1','撃破回数':'5','小判':'1500','博多(なし/初/極)':'極','博多倍率':'','木炭':'','玉鋼':'','冷却材':'','砥石':'','依頼札':'','時間(分)':'','ボス小判回数':''},
  // ↓ 手書きゆらぎ（第1.5段の吸収対象）
  {'日付':'2026-07-15','場所':'過去（恒常マップ）','階数':'８－４','マス(ボス/通常)':'ボス','男士':'今剣','件数':'1','撃破回数':'7','小判':'0','博多(なし/初/極)':'','博多倍率':'','木炭':'','玉鋼':'','冷却材':'','砥石':'','依頼札':'','時間(分)':'','ボス小判回数':''},
  {'日付':'2026-07-15','場所':'夏の連隊戦','階数':'易','マス(ボス/通常)':'不明','男士':'五虎退','件数':'1','撃破回数':'2','小判':'0','博多(なし/初/極)':'','博多倍率':'','木炭':'','玉鋼':'','冷却材':'','砥石':'','依頼札':'','時間(分)':'','ボス小判回数':''},
  {'日付':'2026-07-15','場所':'夏の連隊戦','階数':'特別合戦場・難','マス(ボス/通常)':'不明','男士':'五虎退','件数':'1','撃破回数':'3','小判':'0','博多(なし/初/極)':'','博多倍率':'','木炭':'','玉鋼':'','冷却材':'','砥石':'','依頼札':'','時間(分)':'','ボス小判回数':''},
  {'日付':'2026-07-15','場所':'夏の連隊戦','階数':'EASY','マス(ボス/通常)':'不明','男士':'今剣','件数':'1','撃破回数':'4','小判':'0','博多(なし/初/極)':'','博多倍率':'','木炭':'','玉鋼':'','冷却材':'','砥石':'','依頼札':'','時間(分)':'','ボス小判回数':''},
];

const dom=new JSDOM(html,{
  runScripts:'dangerously',
  url:'https://example.com/kaikouroku.html',
  beforeParse(w){
    w.gtag=function(){};
    w.XLSX={
      read:()=>({SheetNames:['s'],Sheets:{s:{}}}),
      utils:{
        sheet_to_json:()=>csvRows,
        json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}
      },
      write:()=>''
    };
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){};
  }
});

const w=dom.window;
let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

console.log('--- smoke13.5 ---');

w.importTable('dummy','csv','merge');
const recs=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.filter(r=>!r.deleted);

const k=recs.find(r=>r.placeId==='kako'&&r.date==='2026-07-14');
const r=recs.find(r=>r.placeId==='rentai_natsu'&&r.date==='2026-07-14');
const o=recs.find(r=>r.placeId==='osaka');

T('7件とも取り込まれた', recs.length===7 && k && r && o);
T("過去: floorが文字列 '8-4' のまま", k && k.floor==='8-4');
T('過去: 資源(木炭120/玉鋼50)・分(10)も取り込み', k && k.res.mokutan===120 && k.res.tamahagane===50 && k.mins===10);
T("連隊戦: floorが文字列 'easy' のまま", r && r.floor==='easy');
T("大阪城: floorが数値 50（'50階'→50）", o && o.floor===50);
T('大阪城: 小判1500・博多極', o && o.koban===1500 && o.hakata==='極');

// 手書きゆらぎの吸収
const fz=recs.filter(r=>r.date==='2026-07-15');
const kz=fz.find(r=>r.placeId==='kako');
const rEasy=fz.find(r=>r.placeId==='rentai_natsu'&&r.kills===2);
const rSpHard=fz.find(r=>r.placeId==='rentai_natsu'&&r.kills===3);
const rUpper=fz.find(r=>r.placeId==='rentai_natsu'&&r.kills===4);
T("過去: 全角 '８－４' → '8-4' に統一", kz && kz.floor==='8-4');
T("連隊戦: '易' → id 'easy' に解決", rEasy && rEasy.floor==='easy');
T("連隊戦: '特別合戦場・難' → id 'sp_hard' に解決", rSpHard && rSpHard.floor==='sp_hard');
T("連隊戦: 'EASY' → id 'easy' に解決", rUpper && rUpper.floor==='easy');

// 取り込んだ過去の記録が「✏ 編集へ」ジャンプで拾えること（結合確認）
w.jumpToRecEdit('2026-07-14~kako~8-4');
const kkRec=recs.find(r=>r.placeId==='kako'&&r.date==='2026-07-14');
T('取り込んだ過去記録が✏編集へジャンプで拾える', kkRec && !!w.document.getElementById('reccard-'+kkRec.id));

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
