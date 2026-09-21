// smoke28: 設定タブのカードを畳めるようにした検証
// 1) 既定は6枚とも開いている（あかりの判断：一度は見る場所だから）
// 2) 見出しを押すと畳める／もう一度押すと開く
// 3) 畳んだ状態を覚えて、開き直しても畳まれたまま
// 4) 畳んだカードは見出しだけ残り、中身が隠れる
// 5) 更新履歴の入口は畳みの対象外
// 6) 集計・エリア設定のカードには手を付けていない
// 7) 中身の機能（テーマ・チェック・書き出しボタン）は無傷
// 8) 記録データは無傷
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('kaikouroku.html','utf8');
const IDS=['place','wish','theme','view','sync','data'];

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
const card=(w,id)=>w.document.getElementById('pc-'+id);
const folded=(w,id)=>card(w,id).classList.contains('fold');
const foldCount=w=>IDS.filter(id=>folded(w,id)).length;

console.log('--- smoke28 ---');

console.log('■ 6枚とも畳めるようになっている');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 T('6枚とも fcard になっている', IDS.every(id=>{
   const c=card(w,id);return c&&c.classList.contains('fcard');}));
 T('設定タブの fcard はちょうど6枚',
   w.document.querySelectorAll('#preset .fcard').length===6);
 T('見出しに▼が付いている', IDS.every(id=>/class="arw">▼/.test(card(w,id).innerHTML)));
 T('見出しを押すと presetToggle が呼ばれる形になっている',
   IDS.every(id=>card(w,id).querySelector('.card-h').getAttribute('onclick')==="presetToggle('"+id+"')"));
 T('見出しの文言は変えていない',
   /🏯 場所プリセット/.test(card(w,'place').innerHTML) &&
   /💾 データの保存・読み込み/.test(card(w,'data').innerHTML) &&
   /☁ クラウド同期（Google Drive）/.test(card(w,'sync').innerHTML));
}

console.log('\n■ 既定は全部開いている');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 T('はじめは1枚も畳まれていない', foldCount(w)===0);
 T('覚えている畳みも空', Object.keys(ST(w).presetFold||{}).length===0);
}
{
 const w=boot(null,null);   // 正真正銘の初回
 T('初回の人も全部開いている', foldCount(w)===0);
}

console.log('\n■ 押すと畳む／もう一度押すと開く');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 w.presetToggle('view');
 T('表示設定が畳まれる', folded(w,'view'));
 T('ほかの5枚は開いたまま', foldCount(w)===1);
 T('覚えられている', ST(w).presetFold.view===true);
 w.presetToggle('view');
 T('もう一度押すと開く', !folded(w,'view'));
 T('覚えからも消える', !ST(w).presetFold.view);

 // 見出しのクリックでも動く
 card(w,'data').querySelector('.card-h').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 T('見出しをタップしても畳める', folded(w,'data'));
}

console.log('\n■ 畳んだ状態を覚えて、開き直しても残る');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 w.presetToggle('view'); w.presetToggle('data'); w.presetToggle('sync');
 T('3枚畳んだ', foldCount(w)===3);
 const w2=boot(ST(w),null);
 T('開き直しても3枚とも畳まれている',
   folded(w2,'view') && folded(w2,'data') && folded(w2,'sync'));
 T('畳んでいない3枚は開いたまま',
   !folded(w2,'place') && !folded(w2,'wish') && !folded(w2,'theme'));
 // 端末ごとの設定なので、クラウドに乗る記録データには入らない
 T('記録データ側には畳みが入らない',
   !JSON.stringify(JSON.parse(w.localStorage.getItem('kk_data_v1'))).includes('presetFold'));
}

console.log('\n■ 畳むと見出しだけ残る');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 const d=w.document;
 const vis=el=>{const s=w.getComputedStyle(el);return s.display!=='none';};
 // チェック本体ではなく、カード直下の要素（label）の見え方を見る
 const row=()=>d.getElementById('stickyModeChk').closest('label');
 T('開いているとき：中の設定行が見える', vis(row()));
 w.presetToggle('view');
 T('畳むと中の設定行が隠れる', !vis(row()));
 T('見出しは残る', vis(card(w,'view').querySelector('.card-h')));
 T('カード自体は消えない', vis(card(w,'view')));
 T('隠れるのはカード直下のすべて（見出し以外）', (()=>{
   const kids=[...card(w,'view').children];
   return kids.every(el=>el.classList.contains('card-h')?vis(el):!vis(el));
 })());
 w.presetToggle('view');
 T('開き直すとまた見える', vis(row()));
}

console.log('\n■ 更新履歴の入口は畳みの対象外');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 const pre=w.document.getElementById('preset');
 const ne=pre.firstElementChild;
 T('いちばん上は更新履歴の入口のまま', ne.classList.contains('news-entry'));
 T('入口は fcard ではない', !ne.classList.contains('fcard'));
 T('入口を押すと更新履歴が開く（畳まない）', (()=>{
   ne.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
   return w.document.getElementById('newsModal').classList.contains('show')
       && !ne.classList.contains('fold');
 })());
 T('入口の次が場所プリセット', pre.children[1].id==='pc-place');
}

console.log('\n■ ほかのタブには手を付けていない');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 T('集計タブに fcard は無い', w.document.querySelectorAll('#agg .fcard').length===0);
 T('エリア設定タブに fcard は無い', w.document.querySelectorAll('#stagecfg .fcard').length===0);
 T('集計タブのカードは今までどおり8枚', w.document.querySelectorAll('#agg .card-h').length===8);
 T('集計タブの見出しは押せないまま（onclickが付いていない）',
   [...w.document.querySelectorAll('#agg .card-h')].every(e=>!/presetToggle/.test(e.getAttribute('onclick')||'')));
}

console.log('\n■ カードの中身の機能は無傷');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 const d=w.document;
 T('テーマの並びが描かれている', d.getElementById('themeRow').innerHTML.length>0);
 // 場所の一覧は設定タブを開いたときに描かれる
 w.showScreen('preset',d.querySelector('.tab[data-scr="preset"]'));
 T('設定タブを開くと場所の一覧が描かれる', d.getElementById('placeList').innerHTML.length>0);
 T('お迎えの検索欄がある', !!d.getElementById('wishSearch'));
 T('クラウドの状態表示がある', !!d.getElementById('syncStatus'));
 // 畳んでいても中の機能は生きている（表示が消えるだけ）
 w.presetToggle('theme');
 T('畳んでもテーマの中身は消えない', d.getElementById('themeRow').innerHTML.length>0);
 w.presetToggle('theme');
 // チェックの操作
 d.getElementById('stickyModeChk').checked=false;
 w.toggleStickyMode();
 T('表示設定のチェックが効く', ST(w).stickyMode===false);
 w.toggleStickyMode();
}

console.log('\n■ 更新履歴（smoke27の仕組み）と喧嘩していない');
{
 const w=boot({guideShown:true,stickyDefaulted:true},null);
 T('「🆕 更新」は出たまま', w.document.getElementById('hdrNewsBtn').style.display!=='none');
 w.presetToggle('sync');
 T('カードを畳んでも更新ボタンは無関係', w.document.getElementById('hdrNewsBtn').style.display!=='none');
 w.openNews();
 T('更新履歴は開ける', w.document.getElementById('newsModal').classList.contains('show'));
 T('読むと更新ボタンが消える', w.document.getElementById('hdrNewsBtn').style.display==='none');
 T('畳みの記録は残っている', ST(w).presetFold.sync===true);
}

console.log('\n■ 記録データに触っていない');
{
 const seed={records:[{id:'x1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:3}],kills:5,date:'2026-08-01',updatedAt:1,deleted:false}],
  places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0};
 const w=boot({guideShown:true,stickyDefaulted:true},seed);
 IDS.forEach(id=>w.presetToggle(id));
 T('6枚とも畳める', foldCount(w)===6);
 const r=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(x=>x.id==='x1');
 T('記録は無傷（男士・個数・周回）', r && r.swords[0].name==='今剣' && r.swords[0].count===3 && r.kills===5);
 T('件数も変わらない', JSON.parse(w.localStorage.getItem('kk_data_v1')).records.length===1);
}

console.log(`\n--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
