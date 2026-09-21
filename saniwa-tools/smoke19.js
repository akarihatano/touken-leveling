// smoke19: 第1段「難易度で選ぶイベントの共通の型／短い呼び名／対百鬼夜行迎撃作戦」の検証
// - 百鬼夜行の場所が一度だけ作られる（消した人には戻さない）
// - 難易度表が場所ごとに引ける（別の場所で同じidを使ってもぶつからない）
// - 記録画面：迎撃ライン3行×3・小判/資源/モードバーが隠れる・空振りの文言が型ごと
// - 集計画面：迎撃ラインのセレクト・マス絞り込みが隠れる
// - ステージ設定：鍵が hyakki@ラインid・⭐が出る
// - CSV取り込み：正式名称／短い呼び名／フルネーム／素のラベル／誤入力の拒否
// - 連隊戦の既存の動きが壊れていないこと
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const D='2026-08-12';
let importRows=[], exportedRows=null, blobName=null;

function boot(seed,set){
  const dom=new JSDOM(html,{
    runScripts:'dangerously',
    url:'https://example.com/kaikouroku.html',
    beforeParse(w){
      w.gtag=function(){};
      w.XLSX={
        read:()=>({SheetNames:['s'],Sheets:{s:{}}}),
        utils:{sheet_to_json:()=>importRows,json_to_sheet:r=>{exportedRows=r;return {};},
               sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},
        writeFile:()=>{},write:()=>''
      };
      w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
      w.scrollTo=()=>{};
      w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
      w.HTMLElement.prototype.scrollIntoView=function(){};
      if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
      if(set)w.localStorage.setItem('kk_set_v1',JSON.stringify(set));
    }
  });
  const w=dom.window;
  const origCreate=w.document.createElement.bind(w.document);
  w.document.createElement=function(t){
    const el=origCreate(t);
    if(String(t).toLowerCase()==='a')el.click=function(){blobName=el.download;};
    return el;
  };
  return w;
}
const UDof=w=>JSON.parse(w.localStorage.getItem('kk_data_v1'));
const placesOf=w=>UDof(w).places;
const pOf=(w,id)=>placesOf(w).find(p=>p.id===id);

let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

// 期間しぼりこみのヘルパー（smoke17と同じ使い方）
function setDates(f,t){
  d.getElementById('aggPdFrom').value=f;
  d.getElementById('aggPdTo').value=t;
  w.onAggPeriodDate();
}
function setPd(p){ w.setAggPeriod(d.querySelector('#aggPdChips .pd-chip[data-p="'+p+'"]')); }

console.log('--- smoke19 ---');

// ══ 1) 場所プリセット ══
{
  const w=boot(null,null);
  const h=pOf(w,'hyakki');
  T('新規：百鬼夜行の場所が作られる', !!h);
  T('新規：名前が「対百鬼夜行迎撃作戦」', h&&h.name==='対百鬼夜行迎撃作戦');
  T('新規：type は hyakki', h&&h.type==='hyakki');
  T('新規：order は 130（連隊戦110より後）', h&&h.order===130);
  T('新規：名前に波線・記号が入っていない', h&&!/[～〜~（）()・\-]/.test(h.name));
  T('新規：既存の場所（過去・大阪城・連隊戦）も無事', ['kako','osaka','rentai_natsu'].every(id=>!!pOf(w,id)));
}
{
  // 既存ユーザー（百鬼夜行がまだない）に一度だけ足される。記録は無傷
  const seed={
    records:[{id:'r1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:2}],kills:3,date:D,updatedAt:1,deleted:false}],
    places:[
      {id:'kako',name:'過去（恒常マップ）',type:'kako',order:0,updatedAt:1,deleted:false},
      {id:'rentai_natsu',name:'連隊戦～海辺の陣～',type:'rentai',order:110,updatedAt:1,deleted:false}
    ],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,{rentaiNameV1:true});
  T('既存：百鬼夜行が足される', !!pOf(w,'hyakki'));
  T('既存：もとの記録は無傷', UDof(w).records.filter(r=>!r.deleted).length===1);
  T('既存：連隊戦の名前は触られない', pOf(w,'rentai_natsu').name==='連隊戦～海辺の陣～');
}
{
  // 自分で消した人には戻さない（deleted:true が残っていれば足さない）
  const seed={
    records:[],
    places:[
      {id:'kako',name:'過去（恒常マップ）',type:'kako',order:0,updatedAt:1,deleted:false},
      {id:'hyakki',name:'対百鬼夜行迎撃作戦',type:'hyakki',order:130,updatedAt:1,deleted:true}
    ],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  T('消した人には戻さない', placesOf(w).filter(p=>p.id==='hyakki'&&!p.deleted).length===0);
}

// ══ 2) 難易度表（場所ごと） ══
const w=boot(null,null);
const d=w.document;
T('百鬼夜行：迎撃ラインは9つ', w.eval("DIFF_SETS.hyakki.items.length")===9);
T('百鬼夜行：行は高→中→低の3行', w.eval("DIFF_SETS.hyakki.rows.map(r=>r.head).join(',')")==='高難易度,中難易度,低難易度');
T('百鬼夜行：並びは甲→乙→丙', w.eval("DIFF_SETS.hyakki.items.slice(0,3).map(i=>i.label).join('')")==='甲乙丙');
T('フルネーム：hi_kou → 高難易度・甲', w.diffName('hyakki','hi_kou')==='高難易度・甲');
T('フルネーム：tei_hei → 低難易度・丙', w.diffName('hyakki','tei_hei')==='低難易度・丙');
T('見出し：百鬼夜行は「迎撃ライン」', w.diffLabel('hyakki')==='迎撃ライン');
T('見出し：連隊戦は「難易度」のまま', w.diffLabel('rentai_natsu')==='難易度');
T('連隊戦：難易度は8つのまま', w.eval("DIFF_SETS.rentai.items.length")===8);
T('連隊戦：フルネームは従来どおり（sp_hard → 特別合戦場・難）', w.diffName('rentai_natsu','sp_hard')==='特別合戦場・難');
T('連隊戦：通常はそのまま（hard → 難）', w.diffName('rentai_natsu','hard')==='難');
// 場所をまたいだ取り違えが起きない
T('idは場所ごと：連隊戦に hi_kou はない', w.isDiffId('rentai_natsu','hi_kou')===false);
T('idは場所ごと：百鬼夜行に easy はない', w.isDiffId('hyakki','easy')===false);
T('先頭の難易度：百鬼夜行は hi_kou', w.firstDiffId('hyakki')==='hi_kou');
T('先頭の難易度：連隊戦は easy', w.firstDiffId('rentai_natsu')==='easy');
T('過去・大阪城は難易度制ではない', !w.isDiffPlace('kako') && !w.isDiffPlace('osaka'));

// ══ 3) 短い呼び名 ══
T('短い呼び名：過去', w.shortNameOf('kako')==='過去');
T('短い呼び名：大阪城', w.shortNameOf('osaka')==='大阪城');
T('短い呼び名：海辺の陣 → 夏の連隊戦', w.shortNameOf('rentai_natsu')==='夏の連隊戦');
T('短い呼び名：百鬼夜行', w.shortNameOf('hyakki')==='百鬼夜行');
T('自分で名前を変えた場合は当てない', (()=>{
  w.eval("placeById('hyakki').name='わたしの百鬼夜行';");
  const r=w.shortNameOf('hyakki')==='わたしの百鬼夜行';
  w.eval("placeById('hyakki').name=HYAKKI_NAME;");
  return r;
})());

// ══ 4) 記録画面 ══
w.eval("recState.placeId='hyakki';renderRecPlace();onRecPlaceChange();");
w.eval("recState.placeId='hyakki';renderRecFloor();");
T('記録：ラベルが「迎撃ライン」', d.getElementById('recRentaiLabel').textContent==='迎撃ライン');
T('記録：難易度ボタン欄が出る', d.getElementById('recRentaiWrap').style.display==='block');
T('記録：ボタンは9つ', d.querySelectorAll('#recRentaiBtns .rec-stage-btn').length===9);
T('記録：行は3つ・3列指定', d.querySelectorAll('#recRentaiBtns .rentai-row-label').length===3 && d.querySelectorAll('#recRentaiBtns .rentai-grid.c3').length===3);
T('記録：行見出しが高・中・低', [...d.querySelectorAll('#recRentaiBtns .rentai-row-label')].map(e=>e.textContent).join(',')==='高難易度,中難易度,低難易度');
T('記録：小判カードが隠れる', d.getElementById('kobanCardRec').style.display==='none');
T('記録：資源カードが隠れる', d.getElementById('shizaiCard').style.display==='none');
T('記録：モードバーが隠れる', d.getElementById('modeBar').style.display==='none');
T('記録：空振りボタンが出る', d.getElementById('rentaiNoDropBtn').style.display!=='none');
T('記録：空振りの文言が百鬼夜行向け', d.getElementById('rentaiNoDropBtn').textContent==='― ドロップ無し（空振り）として記録 ―');
T('記録：空振りの説明も百鬼夜行向け', /何も出なかった周/.test(d.getElementById('rentaiNoDropNote').innerHTML));
T('記録：周回の説明が「1周＝1回の出陣」', /1周＝1回の出陣/.test(d.getElementById('killsNote').innerHTML));
// ※ ヘッダーのサブは静的な「― 男士ドロップ集計 ―」で、updateHeaderSub が探す
//    'hSub' は現在この画面に存在しない（前からの空振り関数）。落ちないことだけ見ておく
T('ヘッダー更新が落ちない（サブは静的のまま）', (()=>{
  try{ w.updateHeaderSub(); }catch(e){ return false; }
  return d.querySelector('.h-sub').textContent==='― 男士ドロップ集計 ―';
})());
T('記録：初期の迎撃ラインは高難易度・甲', w.eval('recState.floor')==='hi_kou');
T('記録：えらび中の表示', /高難易度・甲/.test(d.getElementById('rentaiSel').innerHTML));
w.pickDiff('chu_otsu');
T('記録：別のラインを選べる', w.eval('recState.floor')==='chu_otsu' && /中難易度・乙/.test(d.getElementById('rentaiSel').innerHTML));
w.pickDiff('easy');
T('記録：他の場所のidは受け付けない', w.eval('recState.floor')==='chu_otsu');

// 連隊戦に戻したときの文言（型ごとに出し分いている）
w.eval("recState.placeId='rentai_natsu';renderRecFloor();");
T('連隊戦：ラベルは「難易度」', d.getElementById('recRentaiLabel').textContent==='難易度');
T('連隊戦：ボタンは8つ・4列', d.querySelectorAll('#recRentaiBtns .rec-stage-btn').length===8 && d.querySelectorAll('#recRentaiBtns .rentai-grid.c4').length===2);
T('連隊戦：空振りの文言は従来どおり', d.getElementById('rentaiNoDropBtn').textContent==='― 目玉なしで記録（周回だけ）―');
T('連隊戦：周回の説明は「1周＝ボス1体」', /1周＝ボス1体/.test(d.getElementById('killsNote').innerHTML));

// ══ 5) 記録の保存 ══
w.eval("recState.placeId='hyakki';recState.floor='hi_otsu';recState.swords={'今剣@unknown':{name:'今剣',mass:'unknown',count:1}};recState.kills=5;recState.koban=0;recState.hakata='なし';recState.res={};recState.mins=0;recState.prog=null;saveRecord();");
{
  const all=UDof(w).records, last=all[all.length-1];
  T('保存：placeId が hyakki', last.placeId==='hyakki');
  T('保存：floor に迎撃ラインidが入る', last.floor==='hi_otsu');
  T('保存：小判は0', (last.koban||0)===0);
  T('保存：周回数が入る', last.kills===5);
}

// ══ 6) 集計画面 ══
w.eval("aggState.placeId='hyakki';aggState.floor='all';aggState.mass='all';renderAggControls();renderAgg();");
T('集計：ラベルが「迎撃ライン」', d.getElementById('aggFloorLabel').textContent==='迎撃ライン');
T('集計：optgroupが3つ', d.querySelectorAll('#aggFloor optgroup').length===3);
T('集計：選択肢は「すべての迎撃ライン」＋9つ', d.querySelectorAll('#aggFloor option').length===10);
T('集計：先頭は「すべての迎撃ライン」', d.querySelector('#aggFloor option').textContent==='すべての迎撃ライン');
T('集計：小判カードが隠れる', d.getElementById('aggKobanCard').style.display==='none');
T('集計：マス絞り込みカードが隠れる', d.getElementById('aggMassCard').style.display==='none');
T('集計：さっきの記録が拾える', w.aggRecords().length===1);
w.eval("aggState.floor='hi_otsu';renderAgg();");
T('集計：ラインで絞れる', w.aggRecords().length===1);
w.eval("aggState.floor='tei_hei';renderAgg();");
T('集計：別のラインでは0件', w.aggRecords().length===0);

// ══ 7) 書き出しのファイル名 ══
w.eval("aggState.floor='hi_otsu';aggState.pd='all';aggState.from='';aggState.to='';renderAgg();");
blobName=null;w.exportAggCSV();
T('書き出し：ファイル名に読める迎撃ライン名が入る', blobName==='邂逅録_百鬼夜行_高難易度乙_全期間.csv');

// ══ 8) ステージ設定（目玉） ══
w.eval("scfgSetPlace('hyakki');");
T('目玉：鍵が hyakki@先頭ライン', w.eval('scfgKey()')==='hyakki@hi_kou');
T('目玉：ボタンが9つ出る', d.querySelectorAll('#scfgBody .rec-stage-btn').length===9);
T('目玉：百鬼夜行向けの注意書きが出る', /指定しなくても集計は出ます/.test(d.getElementById('scfgBody').innerHTML));
w.scfgPickDiff('chu_hei');
T('目玉：ラインを切り替えられる', w.eval('scfgKey()')==='hyakki@chu_hei');
w.scfgAdd('小豆長光');
T('目玉：指定が入る', w.eval("featuredList('hyakki','chu_hei').join(',')")==='小豆長光');
T('目玉：他のラインには入っていない', w.eval("featuredList('hyakki','hi_kou').length")===0);
T('目玉：⭐印が出る', /scfg-has/.test(d.getElementById('scfgBody').innerHTML));
w.eval("scfgSetPlace('rentai_natsu');");
T('連隊戦の目玉の鍵は従来どおり', w.eval('scfgKey()')==='rentai_natsu@easy');
T('連隊戦の目玉ボタンは8つ', d.querySelectorAll('#scfgBody .rec-stage-btn').length===8);

// ══ 8.5) 目玉を「全部に入れる」ボタン（第2段） ══
{
  w.eval("scfgSetPlace('hyakki');scfgPickDiff('chu_hei');");
  T('まとめて入れる：ボタンが出ている', !!d.getElementById('scfgCopyAllBtn'));
  T('まとめて入れる：ボタンの文言に9と迎撃ラインが入る', /9つの迎撃ライン/.test(d.getElementById('scfgCopyAllBtn').textContent));
  // 押す → 確認ダイアログ → OK
  w.scfgCopyToAll();
  T('まとめて入れる：確認ダイアログが出る', d.getElementById('confirmModal').classList.contains('show'));
  T('まとめて入れる：確認文にコピー元の名前が出る', /中難易度・丙/.test(d.getElementById('cfMsg').textContent));
  T('まとめて入れる：この時点ではまだ入っていない', w.eval("featuredList('hyakki','hi_kou').length")===0);
  d.getElementById('cfOk').click();
  T('まとめて入れる：9つ全部に入る', w.eval("DIFF_SETS.hyakki.items.every(i=>featuredList('hyakki',i.id).join(',')==='小豆長光')"));
  T('まとめて入れる：ダイアログが閉じる', !d.getElementById('confirmModal').classList.contains('show'));
  T('まとめて入れる：保存される', (()=>{
    const f=UDof(w).featuredByStage;
    return f['hyakki@hi_kou'] && f['hyakki@hi_kou'][0]==='小豆長光' && f['hyakki@tei_hei'][0]==='小豆長光';
  })());
  T('まとめて入れる：他の場所（連隊戦）には影響しない', w.eval("featuredList('rentai_natsu','easy').length")===0);
  // キャンセルしたら何も起きない
  w.eval("scfgPickDiff('hi_kou');scfgRemove&&0;");
  w.eval("UD.featuredByStage['hyakki@hi_kou']=['今剣'];save();renderStageCfg();");
  w.scfgCopyToAll();
  d.getElementById('cfCancel').click();
  T('まとめて入れる：キャンセルすると何も変わらない', w.eval("featuredList('hyakki','tei_hei').join(',')")==='小豆長光');
  // 後始末（取り込みテストに影響させない）
  w.eval("UD.featuredByStage={};save();");
}

// ══ 8.7) 空振りボタン2つ（第3段・(あ)） ══
{
  w.eval("recState.placeId='hyakki';renderRecFloor();");
  const b1=d.getElementById('rentaiNoDropBtn'), b2=d.getElementById('rentaiNoDropBtn2');
  T('空振り：百鬼夜行では2つとも出る', b1.style.display!=='none' && b2.style.display!=='none');
  T('空振り：2つめの文言', b2.textContent==='― お迎えしたい男士は出なかった（周回だけ）―');
  T('空振り：2つめの説明', /ほかの男士が出ていても記録しない/.test(d.getElementById('rentaiNoDropNote2').innerHTML));
  w.eval("recState.placeId='rentai_natsu';renderRecFloor();");
  T('空振り：連隊戦では1つだけ', d.getElementById('rentaiNoDropBtn').style.display!=='none' && d.getElementById('rentaiNoDropBtn2').style.display==='none');
  w.eval("recState.placeId='kako';renderRecFloor();");
  T('空振り：過去では両方とも出ない', d.getElementById('rentaiNoDropBtn').style.display==='none' && d.getElementById('rentaiNoDropBtn2').style.display==='none');
  w.eval("recState.placeId='hyakki';renderRecFloor();");
}

// ══ 8.8) 階セレクトに記録のある階を自動で出す（第1段の追加分） ══
{
  T('階：設定にある階はそのまま出る', w.eval("floorOptions(placeById('osaka')).includes(99)"));
  T('階：設定にない100階は、記録がなければ出ない', w.eval("floorOptions(placeById('osaka')).includes(100)")===false);
  w.eval("UD.records.push({id:'old100',placeId:'osaka',floor:100,swords:[],kills:1,koban:0,date:'2019-01-01',updatedAt:1,deleted:false});save();");
  T('階：100階の記録があれば選べるようになる', w.eval("floorOptions(placeById('osaka')).includes(100)"));
  T('階：並びは大きい順のまま', w.eval("JSON.stringify(floorOptions(placeById('osaka')).slice(0,2))")==='[100,99]');
  w.eval("aggState.placeId='osaka';aggState.floor='all';renderAggControls();");
  T('階：集計のセレクトにも100階が出る', /<option value="100"/.test(d.getElementById('aggFloor').innerHTML));
  T('階：削除済みの記録の階は出さない', (()=>{
    w.eval("UD.records.find(r=>r.id==='old100').deleted=true;save();");
    const r=w.eval("floorOptions(placeById('osaka')).includes(100)")===false;
    w.eval("UD.records=UD.records.filter(r=>r.id!=='old100');save();");
    return r;
  })());
  w.eval("aggState.placeId='hyakki';renderAggControls();");
}

// ══ 8.9) 取りこぼしの修正（否定形の 'rentai' 判定） ══
{
  // 候補リストは迎撃ラインごとに絞られる（前は百鬼夜行だけ全ライン混ざっていた）
  w.eval("UD.records=UD.records.filter(r=>r.placeId!=='hyakki');");
  w.eval("UD.records.push({id:'q1',placeId:'hyakki',floor:'hi_kou',swords:[{name:'今剣',mass:'unknown',count:9}],kills:1,date:'"+D+"',updatedAt:1,deleted:false});");
  w.eval("UD.records.push({id:'q2',placeId:'hyakki',floor:'tei_hei',swords:[{name:'鳴狐',mass:'unknown',count:9}],kills:1,date:'"+D+"',updatedAt:2,deleted:false});save();");
  w.eval("recState.placeId='hyakki';recState.floor='hi_kou';recState.recMode='easy';buildQuick();");
  const q=()=>d.getElementById('quickCands').innerHTML;
  T('候補：選んでいる迎撃ラインの男士だけ出る', /今剣/.test(q()) && !/鳴狐/.test(q()));
  w.eval("recState.floor='tei_hei';buildQuick();");
  T('候補：ラインを変えると入れ替わる', /鳴狐/.test(q()) && !/今剣/.test(q()));

  // 記録の編集カードにマスセレクトを出さない
  w.eval("ST.recentView='rec';saveST();renderRecent();");
  const card=()=>{const e=d.getElementById('reccard-q1');return e?e.innerHTML:'';};
  T('記録カード：百鬼夜行にマスセレクトを出さない', card()!=='' && !/mass-sel/.test(card()));
  w.eval("UD.records=UD.records.filter(r=>r.id!=='q1'&&r.id!=='q2');save();renderRecent();");
}

// ══ 8.95) （い）空振りを2種類に分ける ══
{
  w.eval("recState.placeId='hyakki';recState.floor='hi_kou';recState.swords={};recState._swseq=0;renderRecFloor();");
  w.pickNoDrop();
  T('（い）：空振りは __nodrop__ で入る', w.eval("Object.values(recState.swords)[0].name")==='__nodrop__');
  T('（い）：選択中の表示は「ドロップ無し（空振り）」', /ドロップ無し（空振り）/.test(d.getElementById('selectedBox').innerHTML));
  w.eval("recState.swords={};recState._swseq=0;renderSelected();");
  w.pickNoFeat();
  T('（い）：2つめは __nofeat__ で入る', w.eval("Object.values(recState.swords)[0].name")==='__nofeat__');
  T('（い）：選択中の表示が別の文言になる', /お迎えしたい男士は出なかった/.test(d.getElementById('selectedBox').innerHTML));

  // 保存 → 記録一覧での見え方が分かれる
  w.eval("recState.kills=4;recState.koban=0;recState.hakata='なし';recState.res={};recState.mins=0;recState.prog=null;saveRecord();");
  const last=()=>{const a=UDof(w).records;return a[a.length-1];};
  const nf=last();
  T('（い）：記録に __nofeat__ が保存される', nf.swords[0].name==='__nofeat__');
  w.eval("ST.recentView='rec';saveST();renderRecent();");
  T('（い）：記録一覧では「目玉なし」と出る', /目玉なし/.test(d.getElementById('recentList').innerHTML));
  T('（い）：「ドロップ無し」とは別物として出る', !/ドロップ無し/.test(d.getElementById('reccard-'+nf.id).innerHTML));

  // 集計：男士ランキングには出ない／周回数は数えられる
  w.eval("aggState.placeId='hyakki';aggState.floor='hi_kou';aggState.mass='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
  T('（い）：集計の男士一覧に印が出てこない', !/__nofeat__|__nodrop__/.test(d.getElementById('rankList').innerHTML));
  T('（い）：周回は集計に入る', w.aggRecords().some(r=>r.id===nf.id));

  // 書き出し → 取り込みの往復
  exportedRows=null;w.exportCSV();
  const erow=exportedRows.find(x=>x['記録ID']===nf.id);
  T('（い）：書き出しの男士欄が「目玉なし」', erow && erow['男士']==='目玉なし');
  T('（い）：百鬼夜行の「目玉なし」→ __nofeat__', w.resolveSword('目玉なし','hyakki')==='__nofeat__');
  T('（い）：連隊戦の「目玉なし」は __nodrop__ のまま（往復が壊れない）', w.resolveSword('目玉なし','rentai_natsu')==='__nodrop__');
  T('（い）：連隊戦のNODROP書き出し名は従来どおり「目玉なし」', w.noDropNameOf('__nodrop__','rentai_natsu')==='目玉なし');
  T('（い）：「ドロップ無し」は今まで通り __nodrop__', w.resolveSword('ドロップ無し')==='__nodrop__');
  T('（い）：「空振り」も __nodrop__ のまま', w.resolveSword('空振り')==='__nodrop__');

  importRows=[{'日付':D,'場所':'対百鬼夜行迎撃作戦','階数':'高難易度・甲','マス(ボス/通常)':'不明',
               '男士':'目玉なし','件数':'1','撃破回数':'201','小判':'','博多(なし/初/極)':''}];
  w.importTable('d','csv','merge');
  T('（い）：取り込みで __nofeat__ に戻る', (()=>{
    const r=UDof(w).records.find(x=>!x.deleted&&x.kills===201);
    return r&&r.swords[0].name==='__nofeat__';
  })());
  importRows=[{'日付':D,'場所':'対百鬼夜行迎撃作戦','階数':'高難易度・甲','マス(ボス/通常)':'不明',
               '男士':'ドロップ無し','件数':'1','撃破回数':'202','小判':'','博多(なし/初/極)':''}];
  w.importTable('d','csv','merge');
  T('（い）：昔のCSVの「ドロップ無し」は __nodrop__ のまま', (()=>{
    const r=UDof(w).records.find(x=>!x.deleted&&x.kills===202);
    return r&&r.swords[0].name==='__nodrop__';
  })());
  w.eval("UD.records=UD.records.filter(r=>r.kills!==201&&r.kills!==202&&r.id!=='"+nf.id+"');save();");
}

// ══ 8.96) 📋 この条件のまとめ（総周回数・空振りの周回数） ══
{
  w.eval("UD.records=UD.records.filter(r=>r.placeId!=='hyakki');");
  w.eval("UD.records.push({id:'s1',placeId:'hyakki',floor:'hi_kou',swords:[{name:'今剣',mass:'boss',count:2}],kills:3,date:'"+D+"',updatedAt:1,deleted:false});");
  w.eval("UD.records.push({id:'s2',placeId:'hyakki',floor:'hi_kou',swords:[{name:'__nodrop__',mass:'boss',count:1}],kills:10,date:'"+D+"',updatedAt:2,deleted:false});");
  w.eval("UD.records.push({id:'s3',placeId:'hyakki',floor:'hi_kou',swords:[{name:'__nofeat__',mass:'boss',count:1}],kills:5,date:'"+D+"',updatedAt:3,deleted:false});");
  w.eval("UD.records.push({id:'s4',placeId:'hyakki',floor:'tei_hei',swords:[{name:'__nodrop__',mass:'boss',count:1}],kills:7,date:'"+D+"',updatedAt:4,deleted:false});");
  w.eval("UD.records.push({id:'s5',placeId:'hyakki',floor:'hi_kou',swords:[{name:'__nodrop__',mass:'boss',count:1}],kills:99,date:'2020-01-01',updatedAt:5,deleted:true});save();");
  w.eval("aggState.placeId='hyakki';aggState.floor='all';aggState.mass='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
  const sum=()=>d.getElementById('aggSummary').textContent.replace(/\s+/g,'');

  T('まとめ：カードが出る', d.getElementById('aggSumCard').style.display!=='none');
  T('まとめ：総周回数は全記録の合計（3+10+5+7=25周）', /総周回数25周/.test(sum()));
  T('まとめ：削除済みの記録は数えない（99周が入らない）', !/124周|99周/.test(sum()));
  T('まとめ：ドロップがあった回数（2回）', /ドロップがあった回数2回/.test(sum()));
  T('まとめ：空振りは周回数で数える（10+7=17周・押した回数の2ではない）', /ドロップ無し（空振り）17周/.test(sum()));
  T('まとめ：目玉なしは別に数える（5周）', /目玉なし5周/.test(sum()));
  T('まとめ：記録の件数（4件）', /記録の件数4件/.test(sum()));

  // ステージで絞ると連動する
  w.eval("aggState.floor='hi_kou';renderAgg();");
  T('まとめ：ラインで絞ると総周回数も減る（3+10+5=18周）', /総周回数18周/.test(sum()));
  T('まとめ：ラインで絞ると空振りも減る（10周）', /ドロップ無し（空振り）10周/.test(sum()));

  // 期間しぼりこみと連動する
  w.eval("aggState.floor='all';renderAgg();");
  setDates('2020-01-01','2020-01-31');
  T('まとめ：期間外なら記録0でカードが隠れる', d.getElementById('aggSumCard').style.display==='none');
  setPd('all');
  T('まとめ：全期間に戻すとまた出る', d.getElementById('aggSumCard').style.display!=='none' && /総周回数25周/.test(sum()));

  // 目玉を指定していなくても総周回数が出る（要望の本体）
  T('まとめ：目玉の指定がなくても総周回数が出る', w.eval("featuredList('hyakki','hi_kou').length")===0 && /総周回数/.test(sum()));

  // 空振りがない場所では行が出ない
  w.eval("UD.records.push({id:'s6',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:1}],kills:4,date:'"+D+"',updatedAt:6,deleted:false});save();");
  w.eval("aggState.placeId='kako';aggState.floor='8-4';aggState.mass='all';renderAggControls();renderAgg();");
  T('まとめ：空振りの記録がなければ行を出さない', !/空振り/.test(sum()) && !/目玉なし/.test(sum()));
  T('まとめ：過去でも総周回数は出る（4周）', /総周回数4周/.test(sum()));

  // マスをしぼりこんだときは総周回数を出さず、注意書きを出す
  w.eval("aggState.mass='normal';renderAgg();");
  // ※ 注意書きの文中にも「総周回数」の語が入るので、行のラベルだけを見る
  const sumRows=()=>[...d.querySelectorAll('#aggSummary .agg-sum-row .l')].map(e=>e.textContent);
  T('まとめ：マス＝通常では総周回数の行を出さない', !sumRows().includes('総周回数'));
  T('まとめ：マスを絞ると注意書きが出る', /マスをしぼりこんでいます/.test(d.getElementById('aggSummary').innerHTML));
  w.eval("aggState.mass='boss';renderAgg();");
  T('まとめ：マス＝ボスなら総周回数が出る', /総周回数4周/.test(sum()));

  w.eval("UD.records=UD.records.filter(r=>['s1','s2','s3','s4','s5','s6'].indexOf(r.id)<0);save();");
  w.eval("aggState.placeId='hyakki';aggState.floor='all';aggState.mass='all';renderAggControls();renderAgg();");
}

// ══ 9) CSV取り込み ══
{
  const row=(place,floor,kills)=>([{
    '日付':D,'場所':place,'階数':floor,'マス(ボス/通常)':'不明','男士':'今剣','件数':'1',
    '撃破回数':String(kills),'小判':'','博多(なし/初/極)':''
  }]);
  const found=k=>{const r=UDof(w).records.find(x=>!x.deleted&&x.kills===k);return r||null;};

  importRows=row('対百鬼夜行迎撃作戦','高難易度・甲',101); w.importTable('d','csv','merge');
  T('取り込み：正式名称＋フルネーム', (()=>{const r=found(101);return r&&r.placeId==='hyakki'&&r.floor==='hi_kou';})());

  importRows=row('百鬼夜行','hi_hei',102); w.importTable('d','csv','merge');
  T('取り込み：短い呼び名でも入る', (()=>{const r=found(102);return r&&r.placeId==='hyakki'&&r.floor==='hi_hei';})());

  importRows=row('対百鬼夜行迎撃作戦','低難易度乙',103); w.importTable('d','csv','merge');
  T('取り込み：区切りの中黒がなくても解決', (()=>{const r=found(103);return r&&r.floor==='tei_otsu';})());

  importRows=row('対百鬼夜行迎撃作戦','甲',104); w.importTable('d','csv','merge');
  T('取り込み：素の「甲」は最初の行（高難易度）に入る', (()=>{const r=found(104);return r&&r.floor==='hi_kou';})());

  const before=UDof(w).records.length;
  importRows=row('対百鬼夜行迎撃作戦','ちょい甲',105); w.importTable('d','csv','merge');
  T('取り込み：知らないラインは弾く', UDof(w).records.length===before);
  T('取り込み：エラー文に「迎撃ライン」が出る', /迎撃ライン「ちょい甲」/.test(d.body.innerHTML));

  // 連隊戦の取り込みが壊れていない
  importRows=row('連隊戦～海辺の陣～','特別合戦場・難',106); w.importTable('d','csv','merge');
  T('取り込み：連隊戦の特別合戦場は従来どおり', (()=>{const r=found(106);return r&&r.placeId==='rentai_natsu'&&r.floor==='sp_hard';})());
  importRows=row('夏の連隊戦','易',107); w.importTable('d','csv','merge');
  T('取り込み：連隊戦の旧名も従来どおり', (()=>{const r=found(107);return r&&r.placeId==='rentai_natsu'&&r.floor==='easy';})());
  importRows=row('大阪城','50階',108); w.importTable('d','csv','merge');
  T('取り込み：大阪城も短い呼び名で入る', (()=>{const r=found(108);return r&&r.placeId==='osaka'&&r.floor===50;})());
}

// ══ 9.5) 連隊戦の「目玉なし」往復（回帰の見張り） ══
{
  w.eval("UD.records.push({id:'rnd1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'__nodrop__',mass:'unknown',count:1}],kills:7,date:'"+D+"',updatedAt:99,deleted:false});save();");
  exportedRows=null;w.exportCSV();
  const row=exportedRows.find(x=>x['記録ID']==='rnd1');
  T('連隊戦：NODROPは「目玉なし」で書き出される', row && row['男士']==='目玉なし');
  importRows=[{'日付':D,'場所':'連隊戦～海辺の陣～','階数':'easy','マス(ボス/通常)':'不明',
               '男士':'目玉なし','件数':'1','撃破回数':'301','小判':'','博多(なし/初/極)':''}];
  w.importTable('d','csv','merge');
  T('連隊戦：取り込むと __nodrop__ に戻る（種類が化けない）', (()=>{
    const r=UDof(w).records.find(x=>!x.deleted&&x.kills===301);
    return r&&r.swords[0].name==='__nodrop__';
  })());
  w.eval("UD.records=UD.records.filter(r=>r.id!=='rnd1'&&r.kills!==301);save();");
}

// ══ 10) 書き出しの往復 ══
exportedRows=null;w.exportCSV();
{
  const r=exportedRows.find(x=>String(x['撃破回数'])==='101');
  T('書き出し：百鬼夜行の場所名が正式名称で出る', r&&r['場所']==='対百鬼夜行迎撃作戦');
  T('書き出し：階数に迎撃ラインidが出る', r&&r['階数']==='hi_kou');
}

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
