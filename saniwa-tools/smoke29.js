// smoke29: 周回だけの記録（男士も小判も資源も無しで残す）の検証
// 1) 何か入っていれば今までどおり確認なしで保存
// 2) 何も入っていないときだけ確認をはさむ（誤爆を止める）
// 3) 確認でOKすると、周回だけの記録が残る
// 4) キャンセルすると何も残らない
// 5) 周回だけの記録がドロップ率の分母に入る（ここが本命）
// 6) 最近の記録・書き出し・編集が壊れない
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('kaikouroku.html','utf8');
let exportedRows=null, importRows=[];

function boot(st,seed){
 return new JSDOM(html,{runScripts:'dangerously',url:'https://example.com/k.html',
  beforeParse(w){w.gtag=function(){};
   w.XLSX={read:()=>({SheetNames:['s'],Sheets:{s:{}}}),utils:{sheet_to_json:()=>importRows,json_to_sheet:r=>{exportedRows=r;return {};},sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
   w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
   w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
   w.HTMLElement.prototype.scrollIntoView=function(){};
   if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
   if(st)w.localStorage.setItem('kk_set_v1',JSON.stringify(st));}}).window;
}
let pass=0,fail=0; const T=(n,c)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('  NG  '+n));};
const recs=w=>JSON.parse(w.localStorage.getItem('kk_data_v1')).records.filter(r=>!r.deleted);
const cfOpen=w=>w.document.getElementById('confirmModal').classList.contains('show');
const cfMsg=w=>w.document.getElementById('cfMsg').innerHTML;
const clickOk=w=>w.document.getElementById('cfOk').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const clickCancel=w=>w.document.getElementById('cfCancel').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
// 過去8-4で、男士なし・周回数nの状態を作る
const setup=(w,n,extra)=>w.eval(
  "recState.placeId='kako';recState.floor='8-4';recState.swords={};recState.kills="+n+";"
  +"recState.koban=0;recState.hakata='なし';recState.res={};recState.mins=0;recState.prog=null;"+(extra||''));

console.log('--- smoke29 ---');

console.log('■ 何か入っていれば今までどおり（確認なし）');
{
 const w=boot(null,null);
 const before=recs(w).length;
 setup(w,3,"recState.swords={'今剣@boss':{name:'今剣',mass:'boss',count:1}};");
 w.saveRecord();
 T('男士があれば確認なしで保存', !cfOpen(w) && recs(w).length===before+1);
 T('中身も正しい', (()=>{const r=recs(w).slice(-1)[0];
   return r.swords.length===1&&r.swords[0].name==='今剣'&&r.kills===3;})());
}
{
 const w=boot(null,null);
 const before=recs(w).length;
 w.eval("recState.placeId='osaka';recState.floor=50;recState.swords={};recState.kills=2;"
   +"recState.koban=500;recState.hakata='なし';recState.res={};recState.mins=0;recState.prog=null;");
 w.saveRecord();
 T('小判だけでも確認なしで保存', !cfOpen(w) && recs(w).length===before+1);
}
{
 const w=boot(null,null);
 const before=recs(w).length;
 setup(w,2,"recState.res={mokutan:50};");
 w.saveRecord();
 T('資源だけでも確認なしで保存', !cfOpen(w) && recs(w).length===before+1);
}

console.log('\n■ 何も入っていないときだけ確認をはさむ');
{
 const w=boot(null,null);
 const before=recs(w).length;
 setup(w,5);
 w.saveRecord();
 T('確認ダイアログが出る', cfOpen(w));
 T('この時点ではまだ保存していない', recs(w).length===before);
 T('周回数が文面に出る（5周）', /5周/.test(cfMsg(w)));
 T('場所の名前が文面に出る', /過去/.test(cfMsg(w)));
 T('ボタンが「周回だけ記録する」', w.document.getElementById('cfOk').textContent==='周回だけ記録する');
 T('率のための説明がある', /ドロップ率が正しく出ます/.test(cfMsg(w)));
}

console.log('\n■ キャンセルすると何も残らない');
{
 const w=boot(null,null);
 const before=recs(w).length;
 setup(w,4);
 w.saveRecord();
 clickCancel(w);
 T('記録は増えない', recs(w).length===before);
 T('ダイアログは閉じる', !cfOpen(w));
 T('入力もそのまま残る（消えない）', w.eval('recState.kills')===4);
}

console.log('\n■ OKすると周回だけの記録が残る');
{
 const w=boot(null,null);
 const before=recs(w).length;
 setup(w,7);
 w.saveRecord();
 clickOk(w);
 T('記録が1件増える', recs(w).length===before+1);
 const r=recs(w).slice(-1)[0];
 T('男士は空', Array.isArray(r.swords) && r.swords.length===0);
 T('周回数は7のまま', r.kills===7);
 T('小判は0', (r.koban||0)===0);
 T('資源は空', Object.keys(r.res||{}).length===0);
 T('場所と階は正しい', r.placeId==='kako' && r.floor==='8-4');
 T('日付と時刻が入る', !!r.date && typeof r.at==='number' && r.at>0);
 T('入力欄がリセットされる', w.eval('recState.kills')===1);
}

console.log('\n■ ドロップ率の分母に入る（ここが本命）');
{
 // 10周して1回だけ今剣が出た。うち9周は何も出ていない
 const w=boot(null,null);
 setup(w,1,"recState.swords={'今剣@boss':{name:'今剣',mass:'boss',count:1}};");
 w.saveRecord();
 w.eval("aggState.placeId='kako';aggState.floor='8-4';aggState.mass='all';aggState.pd='all';aggState.from='';aggState.to='';renderAggControls();renderAgg();");
 const killsOf=()=>w.aggRecords().reduce((s,r)=>s+(r.kills||0),0);
 T('周回だけを足す前は1周', killsOf()===1);
 // 何も出なかった9周を足す
 setup(w,9);
 w.saveRecord(); clickOk(w);
 w.eval('renderAgg();');
 T('周回だけの記録を入れると10周になる', killsOf()===10);
 T('男士の総数は変わらない（1振りのまま）', (()=>{
   const all=w.aggRecords().reduce((s,r)=>s+r.swords.reduce((a,x)=>a+(x.count||0),0),0);
   return all===1;})());
 T('男士一覧に今剣が出る', /今剣/.test(w.document.getElementById('rankList').innerHTML));
}

console.log('\n■ 最近の記録・書き出し・編集が壊れない');
{
 const w=boot(null,null), d=w.document;
 setup(w,6);
 w.saveRecord(); clickOk(w);
 const r=recs(w).slice(-1)[0];
 w.eval("ST.recentView='rec';saveST();renderRecent();");
 T('記録の編集ビューにカードが出る', !!d.getElementById('reccard-'+r.id));
 T('周回数が出ている', /6/.test(d.getElementById('reccard-'+r.id).innerHTML));
 w.eval("ST.recentView='date';saveST();renderRecent();");
 T('日ごとビューでも落ちない', d.getElementById('recentList').innerHTML.length>0);
 // 編集で周回数を変えられる
 w.openSessionEdit(r.id);
 d.getElementById('seKills').value='3';
 w.saveSessionEdit();
 T('あとから周回数を減らせる', recs(w).find(x=>x.id===r.id).kills===3);
 // 書き出し
 exportedRows=null; w.exportCSV();
 const row=exportedRows.find(x=>x['記録ID']===r.id);
 T('CSVに1行出る', !!row);
 T('男士の欄は空', !row['男士']);
 T('撃破回数に3が入る', String(row['撃破回数'])==='3');
}

console.log('\n■ ほかの場所でも同じように動く');
{
 const w=boot(null,null);
 [['yobana','edo'],['rentai_natsu','easy'],['hyakki','hi_kou']].forEach(([pid,fl])=>{
   const before=recs(w).length;
   w.eval("recState.placeId='"+pid+"';recState.floor='"+fl+"';recState.swords={};recState.kills=2;"
     +"recState.koban=0;recState.hakata='なし';recState.res={};recState.mins=0;recState.prog=null;");
   w.saveRecord();
   const asked=cfOpen(w);
   clickOk(w);
   T(pid+'：確認が出て、OKで残る', asked && recs(w).length===before+1);
 });
}

console.log('\n■ 自動削除から守られる（今日の本題）');
{
 const w=boot(null,null);
 setup(w,8);
 w.saveRecord(); clickOk(w);
 const id=recs(w).slice(-1)[0].id;
 T('印が付いている', recs(w).slice(-1)[0].lapsOnly===true);
 // 編集で周回数を変えても消えない
 w.openSessionEdit(id);
 const d0=w.document.getElementById('seKills'); d0.value='3';
 w.saveSessionEdit();
 const r=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(x=>x.id===id);
 T('編集しても消えない', r && !r.deleted);
 T('周回数だけ変わる', r.kills===3);
}
{
 // ふつうの記録は今までどおり：男士を全部消したら記録も消える
 const w=boot(null,null);
 setup(w,2,"recState.swords={'今剣@boss':{name:'今剣',mass:'boss',count:1}};");
 w.saveRecord();
 const id=recs(w).slice(-1)[0].id;
 T('ふつうの記録には印が付かない', recs(w).slice(-1)[0].lapsOnly===undefined);
 w.delSwordRow(id,0);
 const r=JSON.parse(w.localStorage.getItem('kk_data_v1')).records.find(x=>x.id===id);
 T('男士を全部消すと今までどおり記録も消える', r && r.deleted===true);
}

console.log('\n■ CSVで書き出して取り込み直しても残る');
{
 const w=boot(null,null);
 setup(w,9);
 w.saveRecord(); clickOk(w);
 const id=recs(w).slice(-1)[0].id;
 exportedRows=null; w.exportCSV();
 const row=exportedRows.find(x=>x['記録ID']===id);
 T('CSVに1行出る', !!row);
 T('場所が書かれている', !!row['場所']);
 T('撃破回数が書かれている', String(row['撃破回数'])==='9');
 // 別の端末で取り込む
 const w2=boot(null,null);
 importRows=[row];
 w2.importTable('d','csv','merge');
 const im=JSON.parse(w2.localStorage.getItem('kk_data_v1')).records.find(x=>x.id===id);
 T('取り込めた（今までは捨てられていた）', !!im);
 T('印も戻る', im && im.lapsOnly===true);
 T('周回数も戻る', im && im.kills===9);
 T('取り込んだあと編集しても消えない', (()=>{
   w2.openSessionEdit(id);
   w2.document.getElementById('seKills').value='6';
   w2.saveSessionEdit();
   const x=JSON.parse(w2.localStorage.getItem('kk_data_v1')).records.find(y=>y.id===id);
   return x && !x.deleted && x.kills===6;
 })());
}

console.log('\n■ 空行は今までどおり捨てる');
{
 const w=boot(null,null);
 const before=recs(w).length;
 importRows=[
   {'日付':'','場所':'','階数':'','マス(ボス/通常)':'','男士':'','件数':'','撃破回数':''},
   {'日付':'2026-09-01','場所':'','階数':'','マス(ボス/通常)':'','男士':'','件数':'','撃破回数':''},
   {'日付':'','場所':'過去（恒常マップ）','階数':'8-4','マス(ボス/通常)':'','男士':'','件数':'','撃破回数':''},
 ];
 w.importTable('d','csv','merge');
 T('まっさらな行は入らない', recs(w).length===before);
 // 場所と撃破回数が書かれている行だけ入る
 importRows=[{'日付':'2026-09-01','場所':'過去（恒常マップ）','階数':'8-4','マス(ボス/通常)':'','男士':'','件数':'','撃破回数':'4'}];
 w.importTable('d','csv','merge');
 T('場所と撃破回数がそろっていれば入る', recs(w).length===before+1);
 const r=recs(w).slice(-1)[0];
 T('周回だけの記録として入る', r.swords.length===0 && r.kills===4 && r.lapsOnly===true);
}

console.log(`\n--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
