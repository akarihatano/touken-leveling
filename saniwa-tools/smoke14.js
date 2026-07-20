// smoke14: 第2段「記録時刻＋✏記録の編集ビュー」の検証
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const D='2026-07-14';
// JSTで 2026-07-14 14:30 になるUTCタイムスタンプ（05:30 UTC）
const AT_1430=Date.UTC(2026,6,14,5,30,0);
const seed={
  records:[
    {id:'k1',placeId:'kako',floor:'8-4',swords:[{name:'今剣',mass:'boss',count:1}],kills:3,koban:0,hakata:null,res:{mokutan:120,tamahagane:50},mins:10,date:D,updatedAt:1,deleted:false},
    {id:'k2',placeId:'kako',floor:'8-4',swords:[{name:'五虎退',mass:'normal',count:2}],kills:2,koban:0,hakata:null,res:{},mins:0,date:D,updatedAt:2,deleted:false},
    {id:'r1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:1,date:D,updatedAt:3,deleted:false},
    {id:'o1',placeId:'osaka',floor:50,swords:[{name:'鬼丸国綱',mass:'boss',count:1}],kills:5,koban:1500,hakata:'極',date:D,updatedAt:4,at:AT_1430,deleted:false},
  ],
  places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
};

const dom=new JSDOM(html,{
  runScripts:'dangerously',
  url:'https://example.com/kaikouroku.html',
  beforeParse(w){
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
function stored(){ return JSON.parse(w.localStorage.getItem('kk_set_v1')); }
const list=()=>d.getElementById('recentList');

console.log('--- smoke14 ---');

// 1) 既定は日ごとビュー（従来表示のまま・✏この周回あり）
T('既定は日ごとビュー', (stored()===null||stored().recentView!=='rec') && /✏ 編集へ/.test(list().innerHTML));
T('セグメント：日ごと側がon', d.querySelector('.rv-btn[data-v="date"]').classList.contains('on'));

// 2) 切替と記憶
w.setRecentView('rec');
T('切替でST.recentView=rec が保存される', stored().recentView==='rec');
T('セグメント：記録の編集側がon', d.querySelector('.rv-btn[data-v="rec"]').classList.contains('on'));
T('記録の編集：日付見出しがある', /day-head/.test(list().innerHTML) && list().innerHTML.includes('2026.07.14'));
T('記録の編集：カードが4枚', (list().innerHTML.match(/reccard-/g)||[]).length===4);
T('記録の編集では男士の並びボタンを隠す', d.getElementById('sortBtns').style.display==='none');

// 3) 時刻・記録Nラベル
T("at付き記録は '14:30' 表示", list().innerHTML.includes('14:30'));
T("atなし記録は '記録1・記録2' 表示", list().innerHTML.includes('記録1')&&list().innerHTML.includes('記録2'));

// 4) 場所タイプ別の行構成
const cardHtml=id=>{const el=d.getElementById('reccard-'+id);return el?el.innerHTML:'';};
T('過去カード：マスセレクトに検非違使（4択）', /kebi/.test(cardHtml('k1')) && cardHtml('k1').includes('検非違使'));
T('連隊戦カード：マスセレクトなし', !/mass-sel/.test(cardHtml('r1')));
T('大阪城カード：マスセレクトは3択（検非なし）', /mass-sel/.test(cardHtml('o1')) && !/kebi/.test(cardHtml('o1')));
T('大阪城カード：小判行＋(博多極)併記', /小判/.test(cardHtml('o1')) && /博多極/.test(cardHtml('o1')));
T('過去カード：小判行なし', !/koban-row/.test(cardHtml('k1')));
T('過去カード：資源行（スマホ=タップで編集）', /タップで編集/.test(cardHtml('k1')) && /openResEdit/.test(cardHtml('k1')));
T('＋男士を追加（この記録に）ボタンがある', /＋ 男士を追加（この記録に）/.test(cardHtml('k2')));

// 5) PC表示：資源はその場タップ編集＋行🗑
w.eval("ST.viewMode='pc';renderRecent();");
T('PC表示：資源値がタップ編集（rres-）', /rres-k1-mokutan/.test(cardHtml('k1')) && /editRecMins/.test(cardHtml('k1')) && /delShizaiRow/.test(cardHtml('k1')));
w.eval("ST.viewMode='phone';renderRecent();");

// 6) 行操作（1レコード直指定）
w.commitRecCnt('k1',0,'7');
T('個数タップ確定：k1の今剣が7に', rec('k1').swords[0].count===7);
w.commitRecKoban('o1','2000');
T('小判タップ確定：o1が2000に', rec('o1').koban===2000);
w.changeRowMass('k1',0,'kebi');
T('マス変更：k1の今剣が検非マスに', rec('k1').swords[0].mass==='kebi');

// 7) ＋男士追加が正しい記録に入る
w.renderAddPickRec('k2','');
T('候補のonclickが addSwordToRec（記録直指定）', /addSwordToRec\('k2'/.test(d.getElementById('pick-k2').innerHTML));
w.addSwordToRec('k2','今剣');
T('k2に今剣が追加され、k1は無傷', rec('k2').swords.length===2 && rec('k1').swords.length===1);

// 8) ✏編集モーダルの場所タイプ分岐
w.openSessionEdit('k1');
T('過去：階・小判・博多欄が隠れる', d.getElementById('seFloorWrap').style.display==='none' && d.getElementById('seKobanWrap').style.display==='none' && d.getElementById('seHakataWrap').style.display==='none');
d.getElementById('seKills').value='9';
w.saveSessionEdit();
T('過去：周回数のみ更新・小判/博多は壊れない', rec('k1').kills===9 && (rec('k1').koban||0)===0 && rec('k1').hakata===null);
w.openSessionEdit('o1');
T('大阪城：階・小判・博多欄が出る', d.getElementById('seFloorWrap').style.display==='block' && d.getElementById('seKobanWrap').style.display==='block');
T('大阪城：小判欄に現在値2000', d.getElementById('seKoban').value==='2000');
w.closeSessionEdit();

// 9) 資源編集モーダル（スマホ）
w.openResEdit('k1');
T('モーダルに木炭入力欄・現在値120', d.getElementById('re-mokutan') && d.getElementById('re-mokutan').value==='120');
d.getElementById('re-mokutan').value='200';
d.getElementById('reMins').value='15';
w.saveResEdit();
T('保存で res.mokutan=200・mins=15', rec('k1').res.mokutan===200 && rec('k1').mins===15);
w.openResEdit('k1');
w.delResFromEditModal();
T('🗑資源を削除で res空・mins=0・記録は残る', Object.keys(rec('k1').res).length===0 && rec('k1').mins===0 && !rec('k1').deleted);

// 10) saveRecord: at付与＋両ビューの自動オープン
w.eval("recState.placeId='kako';recState.floor='8-4';recState.swords={'今剣@boss':{name:'今剣',mass:'boss',count:1}};recState.kills=2;recState.koban=0;recState.hakata='なし';recState.res={};recState.mins=0;recState.prog=null;saveRecord();");
const all=JSON.parse(w.localStorage.getItem('kk_data_v1')).records;
const last=all[all.length-1];
T('新規記録に at が付く（number）', typeof last.at==='number' && last.at>0);
T('保存直後：gid鍵と r:鍵の両方が開く', stored().recentOpen[[last.date,'kako','8-4'].join('~')]===true && stored().recentOpen['r:'+last.id]===true);

// 11) 開閉記憶（r:鍵）と日ごとビューの無傷確認
w.toggleRecentRec('o1');
T('記録カードの開閉が r:鍵 で記憶される', stored().recentOpen['r:o1']===true);
w.setRecentView('date');
T('日ごとビューに戻れる（✏編集へ・表示専用）', /✏ 編集へ/.test(list().innerHTML) && d.getElementById('sortBtns').style.display!=='none');

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
