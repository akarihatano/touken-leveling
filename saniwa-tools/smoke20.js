// smoke20: 使い方ガイドの検証（2026-09-06に更新履歴を分離したため、帯・？の光り・🆕カードの検査は smoke27 へ移した）
// 1) カードが畳める／既定で開いているのは🆕と はじめての方へ だけ
// 2) すべて開く／すべて閉じる
// 3) 更新の見分け（新規ユーザーには🆕も光りも帯も出さない／既存ユーザーには出す）
// 4) 「？」が光る（ヘッダー・サイドバー両方）
// 5) お知らせ帯（見る／×／二度と出ない／「？」を隠していても出る）
// 6) 初回だけガイドを自動で開く
// 7) 画面外タップ（押し始めも見る）
// 8) 冒頭の一文が広がっている
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const VER='2026.08.25';

let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

// setSettings に null を渡すと kk_set_v1 が無い＝正真正銘の初回になる
function boot(setSettings,seed){
  const dom=new JSDOM(html,{
    runScripts:'dangerously',
    url:'https://example.com/kaikouroku.html',
    beforeParse(w){
      w.gtag=function(){};
      w.XLSX={read:()=>({SheetNames:['s'],Sheets:{s:{}}}),utils:{sheet_to_json:()=>[],json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
      w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
      w.scrollTo=()=>{};
      w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
      w.HTMLElement.prototype.scrollIntoView=function(){};
      if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
      if(setSettings)w.localStorage.setItem('kk_set_v1',JSON.stringify(setSettings));
    }
  });
  return dom.window;
}
const stored=w=>JSON.parse(w.localStorage.getItem('kk_set_v1')||'{}');
const gbody=w=>w.document.getElementById('guideBody').innerHTML;
const cards=w=>(gbody(w).match(/class="gcard /g)||[]).length;
const folds=w=>(gbody(w).match(/class="gcard [^"]*\bfold\b/g)||[]).length;
const help=w=>w.document.getElementById('helpBtn');
function md(w,type,el){el.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true}));}

console.log('--- smoke20 ---');

// ════════════════════════════════════════
// A. 既存ユーザー（更新を見逃している人）
// ════════════════════════════════════════
{
  const w=boot({guideShown:true,stickyDefaulted:true},null);

  T('A4 起動しただけではガイドは開かない', !w.document.getElementById('guideModal').classList.contains('show'));

  w.openGuide();
  T('A5 ガイドが開く', w.document.getElementById('guideModal').classList.contains('show'));
  T('A6 カードは19枚（更新カードはガイドから外れた）', cards(w)===19);
  T('A7 畳まれているのは18枚（はじめての方へ だけ開）', folds(w)===18);
  T('A8 更新の中身はガイドに入っていない', !/夜花奪還作戦に対応しました/.test(gbody(w)));
  T('A10 「新」バッジは1枚（📅開催回だけ）', (gbody(w).match(/gnew-tag">新</g)||[]).length===1);
  T('A11 冒頭の一文が広がっている', /ドロップを記録して、何がどれくらい出たか/.test(gbody(w)) && !/刀剣男士のドロップを記録/.test(gbody(w)));

  // 畳みの開閉
  w.guideToggle('place');
  T('A15 畳んであるカードを開ける', folds(w)===17);
  w.guideToggle('place');
  T('A16 もう一度押すと畳む', folds(w)===18);
  w.guideFoldAll(0);
  T('A17 すべて開く', folds(w)===0);
  w.guideFoldAll(1);
  T('A18 すべて閉じる', folds(w)===19);

  // 閉じて開き直しても、このセッション中は🆕が残る
  w.document.getElementById('guideModal').classList.remove('show');
  w.openGuide();
  T('A20 開き直すと畳み状態はリセットされる', folds(w)===18);

  // 今回直したカードの中身
  T('A21 📍場所カードに旧名（連隊戦～海辺の陣～）が残っていない', !/連隊戦\uFF5E海辺の陣/.test(gbody(w)));
  T('A22 📍場所カードに新しい3場所が載っている',
    /連隊戦・海辺の陣/.test(gbody(w)) && /連隊戦・初夏の陣/.test(gbody(w)) && /夜花奪還作戦/.test(gbody(w)));
  T('A23 📍場所カードに大阪城の新名称', /大阪城・地下に眠る千両箱/.test(gbody(w)));
  T('A24 📍場所カードに「終わったイベントも出す」の案内', /終わったイベントも出す/.test(gbody(w)));
  T('A25 📅開催回カードができている', /📅 開催回でふりかえる/.test(gbody(w)));
  T('A26 開催回カードにエリア設定への案内', /エリア設定タブの「📅 開催期間」/.test(gbody(w)));
  T('A27 📊集計カードの資源が3場所になっている', /過去・大阪城・夜花では資源/.test(gbody(w)));
  T('A28 目玉カードに夜花の敵ごとの説明がある',
    /夜花奪還作戦だけは、ステージではなく「出た敵」で分けます/.test(gbody(w)) && /両方の目玉をまとめて出します/.test(gbody(w)));
}

// ════════════════════════════════════════
// B. 読んだあとに再訪した人（別セッション）
// ════════════════════════════════════════
{
  const w=boot({guideShown:true,stickyDefaulted:true,guideSeenVer:VER},null);
  w.openGuide();
  T('B3 カードは19枚', cards(w)===19);
  T('B4 畳まれているのは18枚（はじめての方へ だけ開）', folds(w)===18);
}

// ════════════════════════════════════════
// C. 正真正銘の初回（kk_set_v1 が無い）
// ════════════════════════════════════════
{
  const w=boot(null,null);
  T('C1 初回：ガイドが自動で開く', w.document.getElementById('guideModal').classList.contains('show'));
  T('C2 初回：カードは19枚', cards(w)===19);
  T('C5 初回：guideSeenVerが入る', stored(w).guideSeenVer===VER);
  T('C6 初回：guideShownが立つ（二度と自動で開かない）', stored(w).guideShown===true);
}

// ════════════════════════════════════════
// D. guideShown:false の既存ユーザーが誤爆しないこと（今回の落とし穴）
//    ST.guideShown は既定値なので、既存ユーザー全員の保存済み設定にも入っている
// ════════════════════════════════════════
{
  const w=boot({guideShown:false,stickyDefaulted:true},null);
  T('D1 guideShown:false でも既存ユーザーなら自動で開かない', !w.document.getElementById('guideModal').classList.contains('show'));
}

// E. お知らせ帯は廃止（2026-09-06）。更新の知らせは smoke27 が検査する

// ════════════════════════════════════════
// F. 画面外タップ（押し始めも見る）
// ════════════════════════════════════════
{
  const w=boot({guideShown:true,stickyDefaulted:true},null);
  const bg=w.document.getElementById('guideModal');
  const inner=bg.querySelector('.modal');

  w.openGuide();
  md(w,'mousedown',inner);md(w,'click',inner);
  T('F1 中身を押しても閉じない', bg.classList.contains('show'));

  md(w,'mousedown',bg);md(w,'click',bg);
  T('F2 背景を押し始めて背景で離せば閉じる', !bg.classList.contains('show'));

  w.openGuide();
  md(w,'mousedown',inner);md(w,'click',bg);   // 文章を選んで指が外に出た
  T('F3 中から押し始めて外で離しても閉じない（今回の改良）', bg.classList.contains('show'));

  md(w,'mousedown',bg);md(w,'click',bg);
  T('F4 そのあと普通に背景タップすれば閉じる', !bg.classList.contains('show'));

  // とじるボタンは従来どおり
  w.openGuide();
  bg.querySelector('.modal-actions .btn').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  T('F5 「とじる」ボタンでも閉じる', !bg.classList.contains('show'));
}

// ════════════════════════════════════════
// G. 「？を非表示」チェックがガイドの中から動く（旧機能の温存）
// ════════════════════════════════════════
{
  const w=boot({guideShown:true,stickyDefaulted:true},null);
  w.openGuide();
  T('G1 チェックボックスがガイドの中にある', !!w.document.getElementById('guideHideBtnChk'));
  w.guideToggleHideBtn(true);
  T('G2 チェックで？が隠れる', help(w).style.display==='none' && stored(w).hideHelpBtn===true);
  w.guideToggleHideBtn(false);
  T('G3 外すと戻る', help(w).style.display!=='none');
}

// ════════════════════════════════════════
// H. 記録データにいっさい触っていないこと
// ════════════════════════════════════════
{
  const seed={
    records:[{id:'x1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:3}],kills:5,date:'2026-08-01',updatedAt:1,deleted:false}],
    places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot({guideShown:true,stickyDefaulted:true},seed);
  w.openGuide();w.guideFoldAll(1);
  const r=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(x=>x.id==='x1');
  T('H1 記録は無傷（男士・個数・周回）', r && r.swords[0].name==='今剣' && r.swords[0].count===3 && r.kills===5);
  T('H2 記録の件数も変わらない', JSON.parse(w.localStorage.getItem('kk_data_v1')).records.length===1);
}

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
