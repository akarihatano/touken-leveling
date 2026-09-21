// smoke30: 特命調査・慶長熊本の検証（2026-09-21）
// 1) 場所が足される（名前・型・並び順215・短い呼び名・一度だけの種まき）
// 2) 記録画面に9つのボタン（3段×3列・2024年までの回は破線）。記録を残して集計まで通る
// 3) 開催期間5回が入り、記録が正しい回に振り分けられる（集計の金色チップ）
// 4) label「戦った場所」が、文章の中で名詞として通る
// 5) ★の鍵：普・難はマスごとに共有、2024年までの回はそれぞれ独立（置き場は6つ）
// 6) エリア設定：説明の一言・「（普・難 共通）」の見出し・まとめて入れるボタンは出さない
// ※ 2026-09-21 のスレッドで書いた c1/c1b/c2/c25/c3a/c3b を1本にまとめたもの。判定の行は変えていない
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('kaikouroku.html','utf8');
function boot(){return new JSDOM(html,{runScripts:'dangerously',url:'https://example.com/k.html',
 beforeParse(w){w.gtag=function(){};
  w.XLSX={read:()=>({SheetNames:[],Sheets:{}}),utils:{sheet_to_json:()=>[],json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
  w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
  w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  w.HTMLElement.prototype.scrollIntoView=function(){};}}).window;}
let pass=0,fail=0; const T=(n,c)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('  NG  '+n));};

console.log('--- smoke30 ---');

console.log('\n━━━━ 第1段：場所の定義 ━━━━');
{
const w=boot();

const ps=w.activePlaces(), k=ps.find(p=>p.id==='keicho_kumamoto');
T('場所が追加されている', !!k);
T('名前が正しい', k && k.name==='特命調査・慶長熊本');
T('型が正しい', k && k.type==='keicho_kumamoto');
T('並び順が215', k && k.order===215);
T('短い呼び名は慶長熊本', w.shortNameOf('keicho_kumamoto')==='慶長熊本');
T('並びの位置＝いちばん下', ps[ps.length-1].id==='keicho_kumamoto');
T('難易度型として認識される', w.isDiffPlace('keicho_kumamoto')===true);
const s=w.diffSetOf('keicho_kumamoto');
T('表が引ける', !!s);
T('9つある', s && s.items.length===9);
T('3段ある', s && s.rows.length===3);
T('昔の段だけ破線', s && s.items.filter(x=>x.old).length===3);
console.log('  -- 正式な呼び名 --');
['old_kuragari','futsu_honmaru','nan_normal','futsu_kuragari'].forEach(id=>
  console.log('     '+id+' → '+w.diffName('keicho_kumamoto',id)));
T('昔の段は段名が付かない', w.diffName('keicho_kumamoto','old_kuragari')==='闇り通路のボス');
T('普の段は普・が付く', w.diffName('keicho_kumamoto','futsu_honmaru')==='普・本丸御殿');
T('難の段は難・が付く', w.diffName('keicho_kumamoto','nan_normal')==='難・通常マス');
}

console.log('\n━━━━ 第1段：記録から集計まで ━━━━');
{
const w=boot(), d=w.document;
const recs=()=>JSON.parse(w.localStorage.getItem('kk_data_v1')).records.filter(r=>!r.deleted);

// 記録画面で慶長熊本を選ぶ
w.eval("recState.placeId='keicho_kumamoto';rememberPlace();renderDiffBtns();");
const box=d.getElementById('recRentaiBtns');
T('ボタンが9つ描かれる', box.querySelectorAll('.rec-stage-btn').length===9);
T('段の見出しが3つ', box.querySelectorAll('.rentai-row-label').length===3);
T('破線が3つ', box.querySelectorAll('.rec-stage-btn.old').length===3);
T('3列で並ぶ', box.querySelectorAll('.rentai-grid.c3').length===3);
T('見出しが「戦った場所」', d.getElementById('recRentaiLabel').textContent==='戦った場所');
T('昔の段の見出しが灰色（old）', box.querySelector('.rentai-row-label').classList.contains('old'));

// 押して選べる
w.pickDiff('nan_honmaru');
T('押すと選べる', w.eval("recState.floor")==='nan_honmaru');
T('「えらび中」に出る', /難・本丸御殿/.test(d.getElementById('rentaiSel').innerHTML));

// 記録を残せる
w.eval("recState.swords={'地蔵行平@boss':{name:'地蔵行平',mass:'boss',count:1}};recState.kills=4;"
  +"recState.koban=0;recState.hakata='なし';recState.res={};recState.mins=0;recState.prog=null;");
const before=recs().length;
w.saveRecord();
T('記録が残る', recs().length===before+1);
const r=recs().slice(-1)[0];
T('場所と階が正しい', r.placeId==='keicho_kumamoto' && r.floor==='nan_honmaru');
T('周回数4・男士1振り', r.kills===4 && r.swords[0].name==='地蔵行平');
T('小判は付かない', (r.koban||0)===0);
T('資源は空', Object.keys(r.res||{}).length===0);

// 周回だけボタンが出る
w.eval("recState.placeId='keicho_kumamoto';recState.floor='futsu_honmaru';renderRecFloor();buildQuick();");
T('「目玉なしで記録」が出る', d.getElementById('rentaiNoDropBtn').style.display!=='none');
T('周回数の注記が入る', /1周＝マップを回りきる/.test(d.getElementById('rec').innerHTML));

// 集計に出る
w.eval("aggState.placeId='keicho_kumamoto';aggState.floor='nan_honmaru';aggState.mass='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
T('集計で周回数が分母になる', w.aggRecords().reduce((s,x)=>s+(x.kills||0),0)===4);
T('男士一覧に出る', /地蔵行平/.test(d.getElementById('rankList').innerHTML));
}

console.log('\n━━━━ 第2段：開催期間5回 ━━━━');
{
const w=boot();
const p=w.placeById('keicho_kumamoto');
T('開催回が5つ入る', p.terms && p.terms.length===5);
console.log('  -- 入った開催回 --');
p.terms.forEach(t=>console.log('     '+t.name+'  '+t.from+' 〜 '+t.to+(t.est?'（予想）':'')));
T('いちばん新しいのが2026年の回', p.terms[0].from==='2026-09-08' && p.terms[0].to==='2026-09-29');
T('予想の印は付いていない（全部確定）', p.terms.every(t=>!t.est));
T('名前が自動で付く', p.terms.every(t=>!!t.name));
T('名前が重複しない', new Set(p.terms.map(t=>t.name)).size===5);
T('一度きりの印が立つ', JSON.parse(w.localStorage.getItem('kk_data_v1')).termsSeeded.keicho_kumamoto===true);

// 記録が正しい回に振り分けられるか
const mk=(date)=>w.eval("(function(){var r={id:uid(),placeId:'keicho_kumamoto',floor:'futsu_honmaru',"
 +"swords:[{name:'地蔵行平',mass:'boss',count:1}],kills:1,date:'"+date+"',at:Date.now(),updatedAt:Date.now(),deleted:false};"
 +"UD.records.push(r);save();return r.id;})()");
mk('2026-09-10'); mk('2024-10-05'); mk('2020-05-01'); mk('2026-10-15');  // 最後は開催期間の外
const t26=p.terms.find(t=>t.from==='2026-09-08'), t24=p.terms.find(t=>t.from==='2024-10-01'), t20=p.terms.find(t=>t.from==='2020-04-28');
T('2026-09-10 は2026年の回に入る', w.inTerm('2026-09-10',t26)===true);
T('2026-09-10 は2024年の回に入らない', w.inTerm('2026-09-10',t24)===false);
T('2024-10-05 は2024年の回に入る', w.inTerm('2024-10-05',t24)===true);
T('2020-05-01 は2020年の回に入る', w.inTerm('2020-05-01',t20)===true);
T('開催期間の外は どの回にも入らない', p.terms.every(t=>!w.inTerm('2026-10-15',t)));
T('初日も入る（両端を含む）', w.inTerm('2026-09-08',t26)===true);
T('最終日も入る（両端を含む）', w.inTerm('2026-09-29',t26)===true);
T('前日は入らない', w.inTerm('2026-09-07',t26)===false);
T('翌日は入らない', w.inTerm('2026-09-30',t26)===false);

// 夜花の 9/8 と重なる日：それぞれ自分の場所の回にしか効かない
const yb=w.placeById('yobana').terms.find(t=>t.from==='2026-08-25');
T('9/8は夜花の回にも慶長熊本の回にも入る（場所が違うので衝突しない）',
  w.inTerm('2026-09-08',yb)===true && w.inTerm('2026-09-08',t26)===true);

// 集計の開催回セレクトに出るか
w.eval("aggState.placeId='keicho_kumamoto';aggState.floor='all';aggState.mass='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
const box=w.document.getElementById('aggTrmChips');
const chips=[...box.querySelectorAll('.trm-chip')];
T('集計に開催回のチップが出る', chips.length>0);
T('記録のある回だけ並ぶ（5回ではなく3回）', chips.length===3);
T('見出しに場所の短い名前が出る', /慶長熊本の開催回/.test(w.document.getElementById('aggTrmLab').innerHTML));
T('並ぶのは2026・2024・2020の回',
  chips.map(c=>c.textContent).join('|')==='2026年9月|2024年10月|2020年4月');
// チップを押すとその回だけになる
const id26=p.terms.find(t=>t.from==='2026-09-08').id;
w.setAggTerm(id26);
T('押すとその回で絞り込まれる', w.eval("aggState.pd")==='term' && w.eval("aggState.from")==='2026-09-08' && w.eval("aggState.to")==='2026-09-29');
T('その回の記録だけになる（1件）', w.aggRecords().length===1);
w.setAggTerm(id26);
T('もう一度押すと解除される', w.eval("aggState.pd")==='all');
}

console.log('\n━━━━ label：「戦った場所」が文章で通る ━━━━');
{
const w=boot(), d=w.document;
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'(無い)';

// 1. 記録画面の見出し
w.eval("recState.placeId='keicho_kumamoto';rememberPlace();renderDiffBtns();");
const h1=txt(d.getElementById('recRentaiLabel'));
console.log('  1 記録画面の見出し     → 「'+h1+'」');
T('記録画面の見出し', h1==='戦った場所');

// 2・3. 集計の見出しと「すべての〜」
w.eval("aggState.placeId='keicho_kumamoto';aggState.floor='all';aggState.mass='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
const all=d.getElementById('aggFloor').options[0].textContent;
console.log('  3 集計の絞り込み       → 「'+all+'」');
T('集計の「すべての〜」', all==='すべての戦った場所');

// 4・5・6. エリア設定
w.eval("scfgPlace='keicho_kumamoto';renderStageCfg();");
const body=d.getElementById('scfgBody');
const note=txt(body.querySelector('.mini-note'));
const cbtn=txt(d.getElementById('scfgCopyAllBtn'));
const cnote=txt(body.querySelector('.scfg-copyall .mini-note'));
console.log('  4 エリア設定の説明     → 「'+note+'」');
// 5・6 は第3段で「慶長熊本では出さない」と決めたので、出ていないことを確かめる
console.log('  5 まとめて入れるボタン → '+(d.getElementById('scfgCopyAllBtn')?'出ている':'出ていない（第3段で隠した）'));
console.log('  6 その下の注意書き     → '+(body.querySelector('.scfg-copyall')?'出ている':'出ていない（第3段で隠した）'));
T('エリア設定の説明', note==='戦った場所を選んで、その戦った場所の目玉（レアドロップ）を指定します。');
T('まとめて入れるボタンは出ていない（第3段）', !d.getElementById('scfgCopyAllBtn'));
T('その注意書きも出ていない（第3段）', !body.querySelector('.scfg-copyall'));

// 7. 確認ダイアログとトースト（押したときの文）
w.scfgCopyToAll();
const msg=txt(d.getElementById('cfMsg'));
console.log('  7 押したときの確認     → 「'+msg+'」');
T('確認の文', /ほかの8つの戦った場所/.test(msg));

// 問いかけの形が1つも残っていない
// body.innerHTML は <script> の中身（コメント）まで含むので使わない。画面に出る文字だけを見る
const shown=[...d.body.querySelectorAll('*')].filter(el=>el.tagName!=='SCRIPT'&&el.tagName!=='STYLE')
  .map(el=>[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('')).join('');
T('画面に「どこで戦った」が1つも出ていない', !/どこで戦った/.test(shown));
T('（検査の確かめ）画面の文字はちゃんと拾えている', /戦った場所/.test(shown));
}

console.log('\n━━━━ 第3段：★の鍵の読み書き ━━━━');
{
const w=boot();
const K='keicho_kumamoto', fl=(f)=>w.featuredList(K,f);
const set=(diff,name)=>w.eval("scfgPlace='"+K+"';scfgDiff='"+diff+"';scfgAdd('"+name+"');");
const fbs=()=>JSON.parse(w.localStorage.getItem('kk_data_v1')).featuredByStage;

console.log('■ 鍵の作り');
T('普・本丸 → @honmaru',   w.keichoFeatKey('futsu_honmaru')==='keicho_kumamoto@honmaru');
T('難・本丸 → @honmaru',   w.keichoFeatKey('nan_honmaru')==='keicho_kumamoto@honmaru');
T('昔・本丸 → @old_honmaru', w.keichoFeatKey('old_honmaru')==='keicho_kumamoto@old_honmaru');
T('普・闇り → @kuragari',  w.keichoFeatKey('futsu_kuragari')==='keicho_kumamoto@kuragari');
T('難・通常 → @normal',    w.keichoFeatKey('nan_normal')==='keicho_kumamoto@normal');
T('すべて → 空の鍵',        w.keichoFeatKey('all')==='keicho_kumamoto@all');
T('9つから6つの鍵が出る',
  new Set(w.diffSetOf(K).items.map(d=>w.keichoFeatKey(d.id))).size===6);

console.log('\n■ 普で入れると難にも効く');
set('futsu_honmaru','地蔵行平');
T('普・本丸に出る', fl('futsu_honmaru').includes('地蔵行平'));
T('難・本丸にも出る', fl('nan_honmaru').includes('地蔵行平'));
T('昔・本丸には出ない（別）', !fl('old_honmaru').includes('地蔵行平'));
T('闇り通路には出ない（マス違い）', !fl('futsu_kuragari').includes('地蔵行平'));
T('保存は @honmaru の1か所だけ', JSON.stringify(fbs()[K+'@honmaru'])==='["地蔵行平"]');
T('古い形の鍵には書いていない', !fbs()[K+'@futsu_honmaru'] && !fbs()[K+'@nan_honmaru']);

console.log('\n■ 難で足しても同じ置き場に入る');
set('nan_honmaru','古今伝授の太刀');
T('普から見ても2人', fl('futsu_honmaru').length===2);
T('難から見ても2人', fl('nan_honmaru').length===2);

console.log('\n■ 昔の段はそれぞれ独立');
set('old_kuragari','古今伝授の太刀');
set('old_honmaru','地蔵行平');
T('昔・闇り通路は古今伝授だけ', JSON.stringify(fl('old_kuragari'))==='["古今伝授の太刀"]');
T('昔・本丸は地蔵だけ', JSON.stringify(fl('old_honmaru'))==='["地蔵行平"]');
T('今の本丸は2人のまま（昔に引きずられない）', fl('futsu_honmaru').length===2);
T('今の闇り通路は空のまま', fl('futsu_kuragari').length===0);

console.log('\n■ 外すと両方から消える');
w.eval("scfgPlace='"+K+"';scfgDiff='nan_honmaru';scfgRemove('地蔵行平');");
T('難で外すと普からも消える', !fl('futsu_honmaru').includes('地蔵行平'));
T('昔の地蔵は残る', fl('old_honmaru').includes('地蔵行平'));

console.log('\n■ 記録画面と集計の★');
w.eval("recState.placeId='"+K+"';recState.floor='nan_honmaru';recState.mass='boss';");
T('記録画面：難・本丸で古今伝授が★', w.curFeatured().includes('古今伝授の太刀'));
T('isFeatured も同じ答え', w.isFeatured('古今伝授の太刀',K,'futsu_honmaru','boss')===true);

console.log('\n■ ほかの場所に影響していない');
w.eval("scfgPlace='rentai_fuyu';scfgDiff='easy';scfgAdd('今剣');");
T('連隊戦は今までどおり 場所@難易度', JSON.stringify(fbs()['rentai_fuyu@easy'])==='["今剣"]');
T('連隊戦の別の難易度には入らない', w.featuredList('rentai_fuyu','hard').length===0);
w.eval("scfgPlace='yobana';scfgMass='kunai';scfgAdd('日向正宗');");
T('夜花は今までどおり敵ごと', w.featuredList('yobana',null,'kunai').includes('日向正宗'));

console.log('\n■ 場所を消した人でも★が見える（id で見分けた理由）');
w.eval("placeById('"+K+"').deleted=true;");
T('消した場所でも昔の記録の★は引ける', w.featuredList(K,'futsu_honmaru').includes('古今伝授の太刀'));
}

console.log('\n━━━━ 第3段：エリア設定の見た目 ━━━━');
{
const w=boot(), d=w.document;
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'(無い)';
const K='keicho_kumamoto', body=()=>d.getElementById('scfgBody');
const open=(diff)=>w.eval("scfgPlace='"+K+"';scfgDiff='"+diff+"';renderStageCfg();");
const head=()=>txt(body().querySelector('.meda-target span'));
const stars=()=>[...body().querySelectorAll('.rec-stage-btn')].filter(b=>b.querySelector('.scfg-has')).length;

console.log('■ 説明の一言');
open('futsu_honmaru');
const notes=[...body().querySelectorAll('.mini-note')].map(txt);
T('「普と難は同じ目玉を見ます」が出る', notes.some(n=>/普と難は同じ目玉を見ます/.test(n)));
T('昔の段は別、と書いてある', notes.some(n=>/2024年までの回は.*別に指定します/.test(n)));
T('百鬼夜行の説明は出ない', !notes.some(n=>/百鬼夜行には/.test(n)));

console.log('\n■ 設定欄の見出し');
open('futsu_honmaru');  console.log('     普・本丸 → 「'+head()+'」');
T('普・本丸 → 本丸御殿（普・難 共通）', head()==='本丸御殿（普・難 共通）');
open('nan_honmaru');    console.log('     難・本丸 → 「'+head()+'」');
T('難・本丸 → 同じ見出し', head()==='本丸御殿（普・難 共通）');
open('nan_kuragari');   console.log('     難・闇り → 「'+head()+'」');
T('難・闇り通路 → 闇り通路のボス（普・難 共通）', head()==='闇り通路のボス（普・難 共通）');
open('futsu_normal');   console.log('     普・通常 → 「'+head()+'」');
T('普・通常 → 通常マス（普・難 共通）', head()==='通常マス（普・難 共通）');
open('old_honmaru');    console.log('     昔・本丸 → 「'+head()+'」');
T('昔・本丸 → 共通は付かない', head()==='本丸御殿');

console.log('\n■ まとめて入れるボタン');
open('futsu_honmaru');
T('慶長熊本では出ない', !d.getElementById('scfgCopyAllBtn'));
T('その下の注意書きも出ない', !body().querySelector('.scfg-copyall'));

console.log('\n■ ⭐の付きかた（普で入れると、普と難の両方が光る）');
open('futsu_honmaru'); w.scfgAdd('地蔵行平');
open('futsu_honmaru');
T('光るのは2つ（普・本丸と難・本丸）', stars()===2);
const lit=[...body().querySelectorAll('.rec-stage-btn')].filter(b=>b.querySelector('.scfg-has'))
  .map(b=>b.getAttribute('onclick').match(/'(.+)'/)[1]).sort().join(',');
console.log('     光ったボタン：'+lit);
T('光ったのは futsu_honmaru と nan_honmaru', lit==='futsu_honmaru,nan_honmaru');
open('old_kuragari'); w.scfgAdd('古今伝授の太刀');
open('old_kuragari');
T('昔・闇り通路を足すと3つ光る', stars()===3);

console.log('\n■ 連隊戦・百鬼夜行は今までどおり');
w.eval("scfgPlace='rentai_fuyu';scfgDiff='easy';renderStageCfg();");
T('連隊戦：まとめて入れるボタンは出る', !!d.getElementById('scfgCopyAllBtn'));
T('連隊戦：見出しに「共通」は付かない', !/共通/.test(head()));
T('連隊戦：慶長熊本の説明は出ない', ![...body().querySelectorAll('.mini-note')].some(n=>/普と難は同じ/.test(n.textContent)));
w.eval("scfgPlace='hyakki';scfgDiff='hi_kou';renderStageCfg();");
T('百鬼夜行：まとめて入れるボタンは出る', !!d.getElementById('scfgCopyAllBtn'));
T('百鬼夜行：自分の説明は出る', [...body().querySelectorAll('.mini-note')].some(n=>/百鬼夜行には/.test(n.textContent)));
}

console.log(`\n--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
