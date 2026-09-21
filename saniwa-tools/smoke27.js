// smoke27: ガイドと更新履歴を分けた検証
// 1) お知らせの帯が無くなった／？も光らない
// 2) 未読があるとヘッダーに「🆕 更新」が出る。読むと消える
// 3) ガイドを開いても既読にならない（更新履歴を開いたときだけ）
// 4) 更新履歴：未読は開いて「新着」、既読は畳む。同じセッション中は開き直しても新着が残る
// 5) 未読が2件たまっていたら両方とも開いて新着が付く
// 6) 設定タブのいちばん上に入口がある
// 7) 初回の人には出ない／既読の人にも出ない
// 8) 救済の帯・ガイド本体・記録データは無傷
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('kaikouroku.html','utf8');
const VER='2026.08.25';

function boot(st,seed){
 return new JSDOM(html,{runScripts:'dangerously',url:'https://example.com/k.html',
  beforeParse(w){w.gtag=function(){};
   w.XLSX={read:()=>({SheetNames:[],Sheets:{}}),utils:{sheet_to_json:()=>[],json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
   w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
   w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
   w.HTMLElement.prototype.scrollIntoView=function(){};
   if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
   if(st)w.localStorage.setItem('kk_set_v1',JSON.stringify(st));}}).window;
}
let pass=0,fail=0; const T=(n,c)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('  NG  '+n));};
const ST=w=>JSON.parse(w.localStorage.getItem('kk_set_v1')||'{}');
const btn=w=>w.document.getElementById('hdrNewsBtn');
const btnOn=w=>{const b=btn(w);return !!b&&b.style.display!=='none';};
const nbody=w=>w.document.getElementById('newsBody').innerHTML;
const gbody=w=>w.document.getElementById('guideBody').innerHTML;

console.log('--- smoke27 ---');

console.log('■ 撤去されたもの');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 T('お知らせの帯そのものが無い', !w.document.getElementById('newsBar'));
 T('救済の帯は残っている', !!w.document.getElementById('misfixBar'));
 T('？が光る仕掛けが無い（has-newが付かない）',
   !w.document.getElementById('helpBtn').classList.contains('has-new'));
 T('サイドバーの？も光らない', !w.document.getElementById('sbHelpBtn').classList.contains('has-new'));
 T('帯はmainColの先頭ではなくなり、救済の帯が先頭',
   w.document.getElementById('mainCol').firstElementChild.id==='misfixBar');
}

console.log('\n■ 未読がある人（更新を見逃していた人）');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 T('ヘッダーに「🆕 更新」が出る', btnOn(w));
 T('ボタンの中身が 🆕 更新', /🆕/.test(btn(w).innerHTML)&&/更新/.test(btn(w).innerHTML));
 T('起動しただけでは何も開かない',
   !w.document.getElementById('newsModal').classList.contains('show') &&
   !w.document.getElementById('guideModal').classList.contains('show'));

 // ガイドを開いても既読にならない
 w.openGuide();
 T('ガイドは開く', w.document.getElementById('guideModal').classList.contains('show'));
 T('ガイドを開いても「🆕 更新」は消えない', btnOn(w));
 T('ガイドを開いても既読にならない', ST(w).guideSeenVer!==VER);
 T('ガイドから更新カードが外れている',
   !/class="gcard gnew/.test(gbody(w)) && !/夜花奪還作戦に対応しました/.test(gbody(w)));
 T('もとからある「新」バッジ（📅開催回）は残っている',
   (gbody(w).match(/gnew-tag">新</g)||[]).length===1);
 T('ガイドのカードは19枚（🆕なし）', (gbody(w).match(/class="gcard /g)||[]).length===19);

 // 更新履歴を開く
 w.openNews();
 T('更新履歴が開く', w.document.getElementById('newsModal').classList.contains('show'));
 T('版番号が見出しに出る', nbody(w).includes(VER));
 T('「新着」が付く', /gnew-tag">新着</.test(nbody(w)));
 T('未読ぶんは開いた状態（foldが付かない）', !/gcard gnew fold/.test(nbody(w)));
 T('中身が出ている（夜花の一文）', /夜花奪還作戦に対応しました/.test(nbody(w)));
 T('changelogへの案内がある', /changelog\.html/.test(nbody(w)));
 T('読むと既読になる', ST(w).guideSeenVer===VER);
 T('読むと「🆕 更新」が消える', !btnOn(w));

 // 同じセッション中は開き直しても新着が残る
 w.document.getElementById('newsModal').classList.remove('show');
 w.openNews();
 T('開き直しても同じセッション中は「新着」が残る', /gnew-tag">新着</.test(nbody(w)));

 // 畳みの開閉
 w.newsToggle(VER);
 T('タップで畳める', /fold/.test(nbody(w)));
 w.newsToggle(VER);
 T('もう一度タップで開く', !/gcard gnew fold/.test(nbody(w)));
}

console.log('\n■ 読んだあとに来た人（別セッション）');
{
 const w=boot({guideShown:true,stickyDefaulted:true,guideSeenVer:VER},null);
 T('「🆕 更新」は出ない', !btnOn(w));
 w.openNews();
 T('設定などから開けば中身は見られる', nbody(w).includes(VER));
 T('新着の印は付かない', !/gnew-tag">新着</.test(nbody(w)));
 T('畳まれた状態で出る', /fold/.test(nbody(w)));
}

console.log('\n■ 正真正銘の初回（kk_set_v1が無い）');
{
 const w=boot(null,null);
 T('「🆕 更新」は出ない（見逃した更新がないため）', !btnOn(w));
 T('ガイドは自動で1回開く', w.document.getElementById('guideModal').classList.contains('show'));
 T('既読の版が入る', ST(w).guideSeenVer===VER);
 T('guideShownが立つ', ST(w).guideShown===true);
}

console.log('\n■ guideShown:false の既存ユーザーが誤爆しない');
{
 const w=boot({guideShown:false,stickyDefaulted:true},null);
 T('自動で開かない', !w.document.getElementById('guideModal').classList.contains('show'));
 T('そのかわり「🆕 更新」が出る', btnOn(w));
}

console.log('\n■ 未読が2件たまっている場合');
{
 const w=boot({guideShown:true,stickyDefaulted:true,guideSeenVer:'2026.07.01'},null);
 // NEWSに古い1件を足して、未読2件の状態を作る
 w.eval("NEWS.push({v:'2026.08.01',b:'ためしの更新その1'});");
 T('未読が2件と数えられる', w.newsUnread().length===2);
 w.openNews();
 const h=nbody(w);
 T('2件とも「新着」が付く', (h.match(/gnew-tag">新着</g)||[]).length===2);
 T('2件とも開いている', !/gcard gnew fold/.test(h));
 T('古いほうの中身も出ている', /ためしの更新その1/.test(h));
}
{
 const w=boot({guideShown:true,stickyDefaulted:true,guideSeenVer:VER},null);
 w.eval("NEWS.push({v:'2026.08.01',b:'もう読んだ更新'});");
 w.openNews();
 T('既読ぶんが混ざっていても新着は付かない', !/gnew-tag">新着</.test(nbody(w)));
 T('既読ぶんは畳まれて見出しだけ', (nbody(w).match(/fold/g)||[]).length===2);
}

console.log('\n■ 設定タブの入口');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 const pre=w.document.getElementById('preset');
 T('設定のいちばん上が更新の入口', pre.firstElementChild.classList.contains('news-entry'));
 T('入口の文字が「🆕 これまでの更新」', /🆕 これまでの更新/.test(pre.firstElementChild.innerHTML));
 T('場所プリセットはその次', pre.children[1].innerHTML.includes('場所プリセット'));
 pre.firstElementChild.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 T('押すと更新履歴が開く', w.document.getElementById('newsModal').classList.contains('show'));
}

console.log('\n■ 版番号は NEWS の先頭から自動で読む');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 T('NEWS_VER が先頭の v と同じ', w.eval('NEWS_VER')===w.eval('NEWS[0].v'));
 T('GUIDE_VER はもう無い', w.eval('typeof GUIDE_VER')==='undefined');
 T('撤去した関数が残っていない',
   ['guideHasNew','applyGuideNew','markGuideSeen','dismissNewsBar'].every(f=>typeof w[f]==='undefined'));
}

console.log('\n■ 画面外タップで閉じる');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 const bg=w.document.getElementById('newsModal');
 const inner=bg.querySelector('.modal');
 const md=(t,el)=>el.dispatchEvent(new w.MouseEvent(t,{bubbles:true,cancelable:true}));
 w.openNews();
 md('mousedown',inner);md('click',inner);
 T('中身を押しても閉じない', bg.classList.contains('show'));
 md('mousedown',inner);md('click',bg);
 T('中から押し始めて外で離しても閉じない', bg.classList.contains('show'));
 md('mousedown',bg);md('click',bg);
 T('背景を押し始めて背景で離せば閉じる', !bg.classList.contains('show'));
 w.openNews();
 bg.querySelector('.modal-actions .btn').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 T('「とじる」でも閉じる', !bg.classList.contains('show'));
}

console.log('\n■ ガイド側の機能は無傷');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 w.openGuide();
 T('冒頭の一文が出る', /ドロップを記録して、何がどれくらい出たか/.test(gbody(w)));
 w.guideFoldAll(0);
 T('すべて開く', (gbody(w).match(/class="gcard [^"]*\bfold\b/g)||[]).length===0);
 w.guideFoldAll(1);
 T('すべて閉じる', (gbody(w).match(/class="gcard [^"]*\bfold\b/g)||[]).length===19);
 w.guideToggle('place');
 T('個別に開ける', (gbody(w).match(/class="gcard [^"]*\bfold\b/g)||[]).length===18);
 T('「？」を隠すチェックが健在', !!w.document.getElementById('guideHideBtnChk'));
 w.guideToggleHideBtn(true);
 T('チェックで？が隠れる', w.document.getElementById('helpBtn').style.display==='none' && ST(w).hideHelpBtn===true);
 w.guideToggleHideBtn(false);
 T('外すと戻る', w.document.getElementById('helpBtn').style.display!=='none');
}

console.log('\n■ 記録データに触っていない');
{
 const seed={records:[{id:'x1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:3}],kills:5,date:'2026-08-01',updatedAt:1,deleted:false}],
  places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0};
 const w=boot({guideShown:true,stickyDefaulted:true},seed);
 w.openNews();w.openGuide();
 const r=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(x=>x.id==='x1');
 T('記録は無傷（男士・個数・周回）', r && r.swords[0].name==='今剣' && r.swords[0].count===3 && r.kills===5);
 T('件数も変わらない', JSON.parse(w.localStorage.getItem('kk_data_v1')).records.length===1);
}

console.log(`\n--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
