// smoke13: 第1段 parseInt病3箇所の修正検証
// 対象: openGroupEdit / aggDelShizai / aggDelKoban の floor 比較
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const D='2026-07-14';
const seed={
  records:[
    // 過去 8-4 ×2件（資源つき）
    {id:'k1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:1}],kills:3,koban:0,hakata:null,res:{mokutan:120,tamahagane:50},mins:10,date:D,updatedAt:1,deleted:false},
    {id:'k2',placeId:'kako',floor:'8-4',swords:[{name:'五虎退',mass:'normal',count:2}],kills:2,koban:0,hakata:null,res:{toishi:30},mins:5,date:D,updatedAt:2,deleted:false},
    // 連隊戦 easy ×2件
    {id:'r1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:1,date:D,updatedAt:3,deleted:false},
    {id:'r2',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:1,date:D,updatedAt:4,deleted:false},
    // 大阪城 50階 ×2件（小判つき・退行チェック）
    {id:'o1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:1}],kills:5,koban:1500,hakata:'極',date:D,updatedAt:5,deleted:false},
    {id:'o2',placeId:'osaka',floor:50,swords:[],kills:3,koban:800,hakata:null,date:D,updatedAt:6,deleted:false},
    // 別の日・同じ階（混入しないことの確認用）
    {id:'o3',placeId:'osaka',floor:50,swords:[],kills:1,koban:100,hakata:null,date:'2026-07-13',updatedAt:7,deleted:false},
  ],
  places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
};

const dom=new JSDOM(html,{
  runScripts:'dangerously',
  url:'https://example.com/kaikouroku.html',
  beforeParse(w){
    // 外部依存のスタブ
    w.gtag=function(){};
    w.XLSX={utils:{json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{},sheet_to_json:()=>[]},read:()=>({SheetNames:[],Sheets:{}}),write:()=>''};
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){};
    w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
  }
});

const w=dom.window, d=w.document;
let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }
function rec(id){ return JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(r=>r.id===id); }

console.log('--- smoke13 ---');

// 1) openGroupEdit: 過去（文字列floor '8-4'）で2件出る（旧: parseInt('8-4')=8 → 0件バグ）
w.openGroupEdit(D+'~kako~8-4');
let msg=d.getElementById('cfMsg').innerHTML;
T('過去 8-4: 選択モーダルに2件', /2件あります/.test(msg) && (msg.match(/openSessionEdit/g)||[]).length===2);
d.getElementById('confirmModal').classList.remove('show');

// 2) openGroupEdit: 連隊戦（'easy' → 旧NaN）で2件出る
w.openGroupEdit(D+'~rentai_natsu~easy');
msg=d.getElementById('cfMsg').innerHTML;
T('連隊戦 easy: 選択モーダルに2件', /2件あります/.test(msg) && (msg.match(/openSessionEdit/g)||[]).length===2);
d.getElementById('confirmModal').classList.remove('show');

// 3) openGroupEdit: 大阪城（数値floor 50）は退行なく2件（別の日の o3 は混ざらない）
w.openGroupEdit(D+'~osaka~50');
msg=d.getElementById('cfMsg').innerHTML;
T('大阪城 50階: 選択モーダルに2件（別日は混入しない）', /2件あります/.test(msg) && (msg.match(/openSessionEdit/g)||[]).length===2);
d.getElementById('confirmModal').classList.remove('show');

// 4) aggDelShizai: 過去の資源削除が実際に消える（旧: 空振り）
w.aggDelShizai(D+'~kako~8-4');
const k1=rec('k1'), k2=rec('k2');
T('過去 資源削除: k1のresが空・mins=0', k1 && Object.keys(k1.res).length===0 && k1.mins===0);
T('過去 資源削除: k2のresが空・mins=0', k2 && Object.keys(k2.res).length===0 && k2.mins===0);
T('過去 資源削除: 男士は残る', k1.swords.length===1 && k2.swords.length===1 && !k1.deleted && !k2.deleted);

// 5) aggDelKoban: 大阪城の小判削除（退行チェック）＋別日は無事
w.aggDelKoban(D+'~osaka~50');
const o1=rec('o1'), o2=rec('o2'), o3=rec('o3');
T('大阪城 小判削除: o1/o2のkobanが0', o1.koban===0 && o2.koban===0);
T('大阪城 小判削除: 男士なし小判のみのo2はソフト削除', o2.deleted===true);
T('大阪城 小判削除: 別日のo3は無傷', o3.koban===100 && !o3.deleted);

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
