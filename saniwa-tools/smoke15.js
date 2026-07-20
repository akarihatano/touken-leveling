// smoke15: 第3段「日ごとの表示専用化＋ジャンプ」の検証
// - 日ごとビューに編集UIが残っていない（表示専用）
// - 「✏ 編集へ」→ 記録の編集ビューへ切替＋該当カードへスクロール＋フラッシュ（過去・連隊戦・大阪城）
// - 撤去した関数群が存在しない／記録の編集ビューの編集機能は無傷
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const D='2026-07-14';
const seed={
  records:[
    {id:'k1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:1}],kills:3,res:{mokutan:120},mins:10,date:D,updatedAt:1,deleted:false},
    {id:'k2',placeId:'kako',floor:'8-4',swords:[{name:'五虎退',mass:'normal',count:2}],kills:2,res:{},mins:0,date:D,updatedAt:2,deleted:false},
    {id:'r1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:1,date:D,updatedAt:3,deleted:false},
    {id:'o1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:1}],kills:5,koban:1500,hakata:'極',date:D,updatedAt:4,deleted:false},
  ],
  places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
};

let scrolledTo=[];
const dom=new JSDOM(html,{
  runScripts:'dangerously',
  url:'https://example.com/kaikouroku.html',
  beforeParse(w){
    w.gtag=function(){};
    w.XLSX={utils:{json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{},sheet_to_json:()=>[]},read:()=>({SheetNames:[],Sheets:{}}),write:()=>''};
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){scrolledTo.push(this.id);};
    w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
  }
});

const w=dom.window, d=w.document;
let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }
function stored(){ return JSON.parse(w.localStorage.getItem('kk_set_v1')); }
const list=()=>d.getElementById('recentList').innerHTML;

console.log('--- smoke15 ---');

// 1) 日ごとビューは表示専用
w.setRecentView('date');
const h=list();
T('編集UIなし：セレクト', !/mass-sel/.test(h));
T('編集UIなし：🗑', !/del-btn/.test(h));
T('編集UIなし：±ボタン', !/cnt-mini/.test(h));
T('編集UIなし：＋男士を追加', !/add-sword/.test(h) && !/add-pick/.test(h));
T('編集UIなし：撤去関数のonclickが残っていない', !/openGroupEdit|aggChgCnt|aggDelSword|aggDelKoban|aggDelShizai|changeAggMass|addSwordToGroup|toggleAddPick\(/.test(h));
T('表示要素：×n の件数表示', /×2/.test(h) && /×1/.test(h));
T('表示要素：マスの静的バッジ', /rmass-k/.test(h) && h.includes('ボス'));
T('表示要素：小判・資源の合算行（🗑なし）', /1,500枚/.test(h) && /🪵120/.test(h));
T('各グループに「✏ 編集へ」', (h.match(/✏ 編集へ/g)||[]).length===3);

// 2) ジャンプ（過去：文字列floor '8-4'）
scrolledTo=[];
w.jumpToRecEdit(D+'~kako~8-4');
T('過去：ビューがrecに切り替わる', stored().recentView==='rec');
T('過去：グループ先頭（最新=k2）のカードへスクロール', scrolledTo.includes('reccard-k2'));
T('過去：フラッシュが付く', d.getElementById('reccard-k2').classList.contains('flash'));

// 3) ジャンプ（連隊戦 'easy'・大阪城 50：floor比較の家系カバー）
w.setRecentView('date');scrolledTo=[];
w.jumpToRecEdit(D+'~rentai_natsu~easy');
T('連隊戦：r1のカードへスクロール', scrolledTo.includes('reccard-r1'));
w.setRecentView('date');scrolledTo=[];
w.jumpToRecEdit(D+'~osaka~50');
T('大阪城：o1のカードへスクロール', scrolledTo.includes('reccard-o1'));

// 4) 撤去関数が存在しない
const gone=['openGroupEdit','changeAggMass','aggChgCnt','aggDelSword','aggDelKoban','aggDelShizai','addSwordToGroup','toggleAddPick','renderAddPick','groupFirstRecord','parseRefs'];
T('撤去関数がすべて未定義', gone.every(f=>typeof w[f]==='undefined'));

// 5) 記録の編集ビューの編集機能は無傷
const recHtml=list();
T('記録の編集：セレクト・🗑・±・＋男士追加が健在', /mass-sel/.test(recHtml) && /del-btn/.test(recHtml) && /cnt-mini/.test(recHtml) && /＋ 男士を追加（この記録に）/.test(recHtml));
w.recChgCnt('k1',0,1);
T('記録の編集：個数±が動く', JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(r=>r.id==='k1').swords[0].count===2);

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
