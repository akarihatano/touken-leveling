// smoke23: 夜花奪還作戦の検証
// 1) 場所の追加と並び順（百鬼夜行130 → 夜花140）
// 2) 出た敵（ボス／苦無／不明）— マスではなく敵で区別する
// 3) 資源4種・小判なし・階セレクトなし
// 4) 開催回7回（2026年は公式発表で確定ずみ＝「予想」は付かない）
// 5) 記録・集計・CSVの往復
// 6) ほかの場所に影響していない
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('kaikouroku.html','utf8');

let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

let importRows=[];
function boot(seed,settings){
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.com/kaikouroku.html',beforeParse(w){
    w.gtag=function(){};
    w.XLSX={read:()=>({SheetNames:['s'],Sheets:{s:{}}}),utils:{sheet_to_json:()=>importRows,json_to_sheet:r=>{w.__rows=r;return{};},sheet_to_csv:()=>'x',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
    w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
    w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
    w.HTMLElement.prototype.scrollIntoView=function(){};
    if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
    if(settings)w.localStorage.setItem('kk_set_v1',JSON.stringify(settings));
  }});
  return dom.window;
}
const UD=w=>JSON.parse(w.localStorage.getItem('kk_data_v1'));
const pl=(w,id)=>UD(w).places.find(p=>p.id===id);
const terms=(w,id)=>{const p=pl(w,id);return p&&p.terms?p.terms:[];};
// onRecPlaceChange はセレクトの値を読むので、recState を直接書くだけでは効かない
function goPlace(w,id){
  w.eval("recState.placeId='"+id+"';renderRecPlace();");
  w.document.getElementById('recPlace').value=id;
  w.onRecPlaceChange();
}

console.log('--- smoke23 ---');

// ════════════════════════════════════════
// A. 場所の追加と並び順
// ════════════════════════════════════════
{
  const w=boot(null,null);
  T('A1 夜花奪還作戦ができる', !!pl(w,'yobana') && pl(w,'yobana').name==='夜花奪還作戦');
  T('A2 副題は付かない', pl(w,'yobana').name.indexOf('・')<0 && pl(w,'yobana').name.indexOf('～')<0);
  T('A3 order=140', pl(w,'yobana').order===140);
  T('A4 百鬼夜行は130のまま（触っていない）', pl(w,'hyakki').order===130);
  T('A5 百鬼夜行の次に並ぶ', (()=>{
    const ids=w.activePlaces().map(p=>p.id);
    return ids[ids.indexOf('hyakki')+1]==='yobana';
  })());
  T('A6 いちばん最後', w.activePlaces().slice(-1)[0].id==='yobana');
  T('A7 短い呼び名は「夜花」', w.shortNameOf('yobana')==='夜花');
  T('A8 type は yobana', pl(w,'yobana').type==='yobana');
  T('A9 難易度で選ぶ場所ではない', w.isDiffPlaceObj(pl(w,'yobana'))!==true);
}

// ════════════════════════════════════════
// B. 出た敵（マスではなく敵で区別）
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const d=w.document;
  goPlace(w,'yobana');
  T('B1 見出しが「どの敵から？」', /どの敵から/.test(d.getElementById('massCard').querySelector('.card-h').innerHTML));
  T('B2 説明に苦無が出てくる', /苦無/.test(d.getElementById('massCard').querySelector('.card-sub').textContent));
  T('B3 苦無ボタンが出る', d.getElementById('mass-kunai').style.display!=='none');
  T('B4 不明ボタンが出る', d.getElementById('mass-unknown').style.display!=='none');
  T('B5 通常マスは出ない（男士が落ちないため）', d.getElementById('mass-normal').style.display==='none');
  T('B6 検非違使も出ない', d.getElementById('mass-kebi').style.display==='none');
  T('B7 既定はボス', w.eval('recState.mass')==='boss');
  w.setMass('kunai');
  T('B8 苦無を選べる', w.eval('recState.mass')==='kunai');
  w.setMass('unknown');
  T('B9 不明を選べる', w.eval('recState.mass')==='unknown');

  // 別の場所へ移ると元に戻る
  goPlace(w,'kako');
  T('B10 過去へ移ると苦無ボタンが消える', d.getElementById('mass-kunai').style.display==='none');
  T('B11 過去では通常マスが戻る', d.getElementById('mass-normal').style.display!=='none');
  T('B12 苦無のまま持ち越さない（ボスに戻る）', w.eval('recState.mass')==='boss');
  T('B13 過去の見出しは「どのマス？」に戻る', /どのマス/.test(d.getElementById('massCard').querySelector('.card-h').innerHTML));

  // ラベル
  T('B14 夜花では massLabelOf が「苦無」', w.massLabelOf('yobana','kunai')==='苦無');
  T('B15 夜花では unknown が「不明」（マス不明ではない）', w.massLabelOf('yobana','unknown')==='不明');
  T('B16 過去では従来どおり「マス不明」', w.massLabelOf('kako','unknown')==='マス不明');
}

// ════════════════════════════════════════
// C. 資源・小判・階セレクト
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const d=w.document;
  goPlace(w,'yobana');w.renderShizaiGrid();
  const keys=w.resourcesFor('yobana','edo');
  T('C1 資源は4種', keys.length===4);
  T('C2 木炭・玉鋼・冷却材・砥石', ['mokutan','tamahagane','reikyaku','toishi'].every(k=>keys.includes(k)));
  T('C3 依頼札は出ない', !keys.includes('irai'));
  T('C4 資源欄が実際に描かれる', !!d.getElementById('res-mokutan') && !!d.getElementById('res-toishi'));
  T('C5 依頼札の欄は無い', !d.getElementById('res-irai'));
  T('C6 階セレクトは出さない', d.getElementById('recFloorWrap').style.display==='none');
  T('C7 ステージ欄も出さない', d.getElementById('recStageWrap').style.display==='none');
  T('C8 難易度欄も出さない', (d.getElementById('recRentaiWrap')||{style:{display:'none'}}).style.display==='none');
}

// ════════════════════════════════════════
// C2. 小判と階（実機で見つかった漏れ）
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const d=w.document;
  // 大阪城 → 夜花 と移る（実際の操作と同じ経路）
  goPlace(w,'osaka');
  T('C2-1 大阪城では小判カードが出る', d.getElementById('kobanCardRec').style.display!=='none');
  w.eval("recState.koban=1500;");
  d.getElementById('kobanInput').value='1500';
  goPlace(w,'yobana');
  T('C2-2 夜花では小判カードが隠れる', d.getElementById('kobanCardRec').style.display==='none');
  T('C2-3 小判の値が持ち越されない', w.eval('recState.koban')===0);
  T('C2-4 小判の入力欄も空になる', d.getElementById('kobanInput').value==='');
  T('C2-5 「小判は金色の欄に」の案内が出ない', d.getElementById('shizaiNote').style.display==='none');
  T('C2-6 階が edo に固定される（大阪城の50が残らない）', w.eval('recState.floor')==='edo');

  // 記録して保存したときの floor
  w.eval("recState.swords={'今剣@boss':{name:'今剣',mass:'boss',count:1}};recState.kills=2;recState.res={};recState.mins=0;recState.prog=null;saveRecord();");
  const last=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.slice(-1)[0];
  T('C2-7 保存された記録の階が edo', last.placeId==='yobana' && last.floor==='edo');
  T('C2-8 保存された記録に小判が入らない', !last.koban);

  // 起動時の復元経路（前回いた場所が夜花）
  const w2=boot(JSON.parse(w.localStorage.getItem('kk_data_v1')),JSON.parse(w.localStorage.getItem('kk_set_v1')));
  T('C2-9 開き直しても階が edo（起動時の復元）', w2.eval('recState.placeId')==='yobana' && w2.eval('recState.floor')==='edo');
  T('C2-10 開き直しても小判カードは隠れたまま', w2.document.getElementById('kobanCardRec').style.display==='none');
}

// ════════════════════════════════════════
// D. 開催回と「予想」（2026年は 2026-08-25 の公式発表で確定）
// ════════════════════════════════════════
{
  const w=boot(null,null);
  const t=terms(w,'yobana');
  T('D1 7回入る', t.length===7);
  T('D2 2026年8月が先頭', t[0].name==='2026年8月');
  T('D3 2026年に予想は付かない（公式発表で確定）', !t.find(x=>x.name==='2026年8月').est);
  T('D4 2026年の期間 08-25〜09-08', (()=>{const x=t.find(y=>y.name==='2026年8月');return x.from==='2026-08-25'&&x.to==='2026-09-08';})());
  T('D5 どの回にも予想が付かない', t.filter(x=>x.est).length===0);
  T('D6 2020年が入っている', t.some(x=>x.from==='2020-08-25'&&x.to==='2020-09-08'));
  T('D7 呼び名に重複なし', new Set(t.map(x=>x.name)).size===7);
  T('D8 移行フラグが立つ', (UD(w).termsSeeded||{}).yobana===true);
  T('D9 ほかの場所の開催回は無傷（予想が増えていない）',
    terms(w,'osaka').filter(x=>x.est).length===0 && terms(w,'hyakki').filter(x=>x.est).length===0);

  // エリア設定に予想バッジが出ていないこと
  w.eval("scfgPlace='yobana';renderStageCfg();");
  T('D10 エリア設定に予想バッジが出ない', !/class="est">予想/.test(w.document.getElementById('scfgTerms').innerHTML));
  T('D11 日付は 8/25〜9/8 のまま表示される', /2026\.08\.25 〜 2026\.09\.08/.test(w.document.getElementById('scfgTerms').textContent));

  // 予想バッジの仕組みそのものは温存されている（来年またこれを使う）
  w.eval("placeById('yobana').terms.find(function(t){return t.from==='2026-08-25';}).est=true;scfgPlace='yobana';renderStageCfg();");
  T('D12 est を立てれば予想バッジは出る（仕組みは残っている）', /class="est">予想/.test(w.document.getElementById('scfgTerms').innerHTML));
}

// ════════════════════════════════════════
// E. 記録・集計・CSV
// ════════════════════════════════════════
{
  const seed={
    records:[
      {id:'y1',placeId:'yobana',floor:'edo',swords:[{name:'今剣',mass:'boss',count:2}],kills:5,res:{mokutan:120,toishi:30},mins:10,date:'2026-08-26',updatedAt:1,deleted:false},
      {id:'y2',placeId:'yobana',floor:'edo',swords:[{name:'五虎退',mass:'kunai',count:1}],kills:3,date:'2026-08-27',updatedAt:2,deleted:false},
      {id:'y3',placeId:'yobana',floor:'edo',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:1,date:'2025-09-01',updatedAt:3,deleted:false}
    ],
    places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  w.eval("aggState.placeId='yobana';aggState.floor='all';aggState.mass='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
  T('E1 集計に3件出る', w.aggRecords().length===3);
  w.eval("aggState.mass='kunai';renderAgg();");
  T('E2 苦無でしぼりこめる', /五虎退/.test(w.document.getElementById('rankList').innerHTML) && !/今剣/.test(w.document.getElementById('rankList').innerHTML));
  w.eval("aggState.mass='all';renderAgg();");

  // 開催回チップ（記録がある回だけ）
  const tid=terms(w,'yobana').find(t=>t.name==='2026年8月').id;
  T('E3 開催回チップが出る', /trm-chip/.test(w.document.getElementById('aggTrmChips').innerHTML));
  T('E4 チップに（予想）が付かない', !/（予想）/.test(w.document.getElementById('aggTrmChips').innerHTML));
  T('E4b チップに回名は出る', /2026年8月/.test(w.document.getElementById('aggTrmChips').innerHTML));
  w.setAggTerm(tid);
  T('E5 2026年の回で絞ると2件', w.aggRecords().length===2);
  T('E6 ファイル名に回名', w.aggExportName('csv')==='邂逅録_夜花_2026年8月.csv');
  w.setAggTerm(tid);

  // CSV書き出し
  w.exportCSV();
  const rows=w.__rows;
  const r1=rows.find(r=>r['記録ID']==='y1'), r2=rows.find(r=>r['記録ID']==='y2');
  T('E7 場所名が「夜花奪還作戦」', r1 && r1['場所']==='夜花奪還作戦');
  T('E8 苦無が「苦無」で書き出される', r2 && r2['マス(ボス/通常)']==='苦無');
  T('E9 資源も出る（木炭120・砥石30）', r1 && r1['木炭']===120 && r1['砥石']===30);
  T('E10 依頼札は空', r1 && !r1['依頼札']);

  // CSV取り込みの往復
  importRows=[{'日付':'2026-08-28','場所':'夜花奪還作戦','階数':'edo','マス(ボス/通常)':'苦無','男士':'鬼丸国綱','件数':'1','撃破回数':'4'}];
  w.importTable('d','csv','merge');
  const imp=UD(w).records.filter(r=>!r.deleted).find(r=>r.kills===4);
  T('E11 取り込みで夜花に入る', imp && imp.placeId==='yobana');
  T('E12 苦無として取り込まれる', imp && imp.swords[0].mass==='kunai');
  importRows=[{'日付':'2026-08-29','場所':'夜花','階数':'edo','マス(ボス/通常)':'ボス','男士':'今剣','件数':'1','撃破回数':'7'}];
  w.importTable('d','csv','merge');
  const imp2=UD(w).records.filter(r=>!r.deleted).find(r=>r.kills===7);
  T('E13 短い呼び名「夜花」でも取り込める', imp2 && imp2.placeId==='yobana');
}

// ════════════════════════════════════════
// F. 記録カードの編集
// ════════════════════════════════════════
{
  const seed={
    records:[{id:'y1',placeId:'yobana',floor:'edo',swords:[{name:'今剣',mass:'boss',count:1}],kills:2,date:'2026-08-26',updatedAt:1,deleted:false}],
    places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  w.eval("ST.recentView='rec';saveST();renderRecent();");
  const card=w.document.getElementById('reccard-y1');
  T('F1 記録カードが出る', !!card);
  T('F2 選択肢に苦無がある', /value="kunai"/.test(card.innerHTML));
  T('F3 選択肢に通常が無い', !/value="normal"/.test(card.innerHTML));
  T('F4 選択肢に検非違使が無い', !/value="kebi"/.test(card.innerHTML));
  w.changeRowMass('y1',0,'kunai');
  T('F5 苦無に変更できる', UD(w).records.find(r=>r.id==='y1').swords[0].mass==='kunai');
}

// ════════════════════════════════════════
// G. ほかの場所に影響していない
// ════════════════════════════════════════
{
  const w=boot(null,null);
  T('G1 場所は7つ', w.activePlaces().length===7);
  T('G2 過去のマス選択肢は従来どおり', (()=>{
    goPlace(w,'kako');
    const d=w.document;
    return d.getElementById('mass-normal').style.display!=='none' && d.getElementById('mass-kunai').style.display==='none';
  })());
  T('G3 大阪城の資源は4種のまま', w.resourcesFor('osaka',50).length===4);
  T('G4 連隊戦は資源なしのまま', w.resourcesFor('rentai_natsu','easy').length===0);
  T('G5 開催回の総数が70（63＋夜花7）', ['osaka','rentai_natsu','hyakki','rentai_fuyu','rentai_shoka','yobana']
    .reduce((n,id)=>n+terms(w,id).length,0)===70);
}

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
