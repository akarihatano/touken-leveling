// smoke16: 第4段「集計セクション（💰小判・🟢資源）の当たり判定」の検証
// - 閉じているとき：カード内どこをタップしても開く
// - 開いているとき：本文タップでは閉じない（中のボタン誤爆防止）／見出し行で閉じる
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const dom=new JSDOM(html,{
  runScripts:'dangerously',
  url:'https://example.com/kaikouroku.html',
  beforeParse(w){
    w.gtag=function(){};
    w.XLSX={utils:{json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{},sheet_to_json:()=>[]},read:()=>({SheetNames:[],Sheets:{}}),write:()=>''};
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){};
  }
});

const w=dom.window, d=w.document;
let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }
function click(el){ el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true})); }
const isOpen=k=>d.getElementById(k==='koban'?'aggKobanBody':'aggShizai').style.display!=='none';

console.log('--- smoke16 ---');

// 小判カード
T('初期状態：閉', !isOpen('koban'));
T('閉時：カードにポインター（agg-closed）', d.getElementById('aggKobanCard').classList.contains('agg-closed'));
click(d.getElementById('aggKobanCard'));            // カードの余白（不感帯だった場所）
T('閉→カード内どこでもタップで開く', isOpen('koban'));
T('開時：ポインター解除', !d.getElementById('aggKobanCard').classList.contains('agg-closed'));
click(d.getElementById('kobanTotal'));              // 本文の中身をタップ
T('開→本文タップでは閉じない', isOpen('koban'));
click(d.querySelector('#aggKobanBody .toggle-bar .tg'));  // 博多込みボタン（誤爆防止の本丸）
T('開→中のボタンを押しても閉じない', isOpen('koban'));
click(d.getElementById('aggHdKoban'));              // 見出し行
T('開→見出し行タップで閉じる', !isOpen('koban'));
click(d.getElementById('aggHdKoban'));
T('閉→見出し行タップでも開く（二重発火しない）', isOpen('koban'));
click(d.getElementById('aggHdKoban'));
T('後始末：見出しで閉じ直せる', !isOpen('koban'));

// 資源カード
T('資源：初期状態は閉＋ポインター', !isOpen('shizai') && d.getElementById('aggShizaiCard').classList.contains('agg-closed'));
click(d.getElementById('aggShizaiCard'));
T('資源：閉→カード全体タップで開く', isOpen('shizai'));
click(d.getElementById('aggShizai'));
T('資源：開→本文タップでは閉じない', isOpen('shizai'));
click(d.getElementById('aggHdShizai'));
T('資源：開→見出し行で閉じる', !isOpen('shizai'));

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
