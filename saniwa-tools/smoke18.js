// smoke18: 「夏の連隊戦」→「連隊戦～海辺の陣～」改名の検証
// - 新規データは新名称で作られる
// - 既存データ（旧名）は一度きりの移行で改名される。IDと記録は無傷
// - 自分で名前を変えていた場合は上書きしない
// - CSV取り込み：新名称・旧名・波線ちがい（全角チルダ/波ダッシュ/半角~）を正しく連隊戦に入れる
// - 書き出しは新名称で出る
const fs=require('fs');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('kaikouroku.html','utf8');
const NEW='連隊戦・海辺の陣';              // 中黒（2026-08-16の改名）
const MID='連隊戦\uFF5E海辺の陣\uFF5E';    // 中黒にする前の名前（全角チルダ）
const WAVE='連隊戦\u301C海辺の陣\u301C';  // 波ダッシュ
const ASCII='連隊戦~海辺の陣~';           // 半角チルダ
const OLD='夏の連隊戦';
const D='2026-08-01';

let pass=0,fail=0;
function T(name,cond){ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  NG  '+name);} }

let importRows=[], exportedRows=null;

// 種を変えて起動しなおすためのヘルパー
function boot(seed,setSettings){
  let dom=new JSDOM(html,{
    runScripts:'dangerously',
    url:'https://example.com/kaikouroku.html',
    beforeParse(w){
      w.gtag=function(){};
      w.XLSX={
        read:()=>({SheetNames:['s'],Sheets:{s:{}}}),
        utils:{
          sheet_to_json:()=>importRows,
          json_to_sheet:rows=>{exportedRows=rows;return {};},
          sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}
        },
        writeFile:()=>{},write:()=>''
      };
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
const places=w=>JSON.parse(w.localStorage.getItem('kk_data_v1')).places;
const rentai=w=>places(w).find(p=>p.id==='rentai_natsu');
const recsOf=w=>JSON.parse(w.localStorage.getItem('kk_data_v1')).records;

console.log('--- smoke18 ---');

// 1) まっさら（新規ユーザー）＝新名称で作られる
{
  const w=boot(null,null);
  const r=rentai(w);
  T('新規：連隊戦が新名称で作られる', r && r.name===NEW);
  T('新規：IDは rentai_natsu のまま', r && r.id==='rentai_natsu');
  T('新規：区切りが中黒 U+30FB', r && r.name.charCodeAt(3)===0x30FB);
  T('新規：全角チルダを含まない', r && r.name.indexOf('\uFF5E')<0);
}

// 2) 既存データ（旧名・記録つき）＝一度きりの移行で改名。記録は無傷
{
  const seed={
    records:[
      {id:'r1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:2}],kills:3,date:D,updatedAt:1,deleted:false},
      {id:'r2',placeId:'rentai_natsu',floor:'hard',swords:[{name:'南泉一文字',mass:'unknown',count:1}],kills:1,date:D,updatedAt:2,deleted:false},
    ],
    places:[
      {id:'rentai_natsu',name:OLD,type:'rentai',order:110,updatedAt:1,deleted:false},
      {id:'osaka',name:'大阪城（地下に眠る千両箱）',type:'osaka',floors:[50,99],order:100,updatedAt:1,deleted:false},
      {id:'kako',name:'過去（恒常マップ）',type:'kako',order:0,updatedAt:1,deleted:false}
    ],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  const r=rentai(w);
  T('既存：いちばん古い名前（夏の連隊戦）が新名称に書き換わる', r && r.name===NEW);
  T('既存：IDは変わらない', r && r.id==='rentai_natsu');
  T('既存：記録は無傷（2件・placeIdもそのまま）',
    recsOf(w).filter(x=>x.placeId==='rentai_natsu'&&!x.deleted).length===2);
  T('既存：記録の中身も無傷（村雲江×2・周回3）', (()=>{
    const x=recsOf(w).find(y=>y.id==='r1');
    return x&&x.swords[0].name==='村雲江'&&x.swords[0].count===2&&x.kills===3;
  })());
  T('既存：移行フラグ rentaiNameV1 が立つ', JSON.parse(w.localStorage.getItem('kk_set_v1')).rentaiNameV1===true);
  T('既存：大阪城も中黒に改名される', (()=>{
    const o=places(w).find(p=>p.id==='osaka');
    return o&&o.name==='大阪城・地下に眠る千両箱';
  })());
  T('既存：過去は触られない', (()=>{
    const k=places(w).find(p=>p.id==='kako');
    return k&&k.name==='過去（恒常マップ）';
  })());
}

// 2.5) 中黒にする前の名前（連隊戦～海辺の陣～）からも移行する
{
  const seed={
    records:[{id:'m1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:4,date:D,updatedAt:1,deleted:false}],
    places:[
      {id:'rentai_natsu',name:MID,type:'rentai',order:110,updatedAt:1,deleted:false},
      {id:'osaka',name:'大阪城（地下に眠る千両箱）',type:'osaka',floors:[50,99],order:100,updatedAt:1,deleted:false}
    ],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  T('中黒前：連隊戦～海辺の陣～ が 連隊戦・海辺の陣 になる', rentai(w).name===NEW);
  T('中黒前：大阪城も同時に中黒になる', places(w).find(p=>p.id==='osaka').name==='大阪城・地下に眠る千両箱');
  T('中黒前：記録は無傷', recsOf(w).filter(r=>!r.deleted).length===1 && recsOf(w)[0].kills===4);
  T('中黒前：短い呼び名も生きている', w.shortNameOf('rentai_natsu')==='夏の連隊戦' && w.shortNameOf('osaka')==='大阪城');
}

// 3) 自分で名前を変えていた場合は上書きしない
{
  const seed={
    records:[],
    places:[{id:'rentai_natsu',name:'わたしの連隊戦',type:'rentai',order:110,updatedAt:1,deleted:false}],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  T('自分でつけた名前は上書きしない', rentai(w).name==='わたしの連隊戦');
  T('それでも移行フラグは立つ（毎回走らない）', JSON.parse(w.localStorage.getItem('kk_set_v1')).rentaiNameV1===true);
}

// 4) 移行ずみの人には二度目が走らない（あとから旧名に戻しても勝手に変えない）
{
  const seed={
    records:[],
    places:[{id:'rentai_natsu',name:OLD,type:'rentai',order:110,updatedAt:1,deleted:false}],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,{rentaiNameV1:true});
  T('移行ずみ：二度目は走らない（旧名のまま残る）', rentai(w).name===OLD);
}

// 5) CSV取り込み：名前のゆれを全部 rentai_natsu に入れる
{
  const seed={records:[],places:[],featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0};
  const w=boot(seed,null);
  const rows=(pname,kills)=>([{
    '日付':D,'場所':pname,'階数':'易','マス(ボス/通常)':'不明','男士':'村雲江','件数':'1',
    '撃破回数':String(kills),'小判':'','博多(なし/初/極)':''
  }]);
  const lastPlaceFor=k=>{
    const x=recsOf(w).find(r=>!r.deleted&&r.kills===k);
    return x?x.placeId:'(なし)';
  };
  importRows=rows(NEW,11);   w.importTable('d','csv','merge');
  T('取り込み：新名称 → 連隊戦', lastPlaceFor(11)==='rentai_natsu');
  importRows=rows(OLD,12);   w.importTable('d','csv','merge');
  T('取り込み：旧名「夏の連隊戦」 → 連隊戦', lastPlaceFor(12)==='rentai_natsu');
  importRows=rows(WAVE,13);  w.importTable('d','csv','merge');
  T('取り込み：波ダッシュ〜でも → 連隊戦', lastPlaceFor(13)==='rentai_natsu');
  importRows=rows(ASCII,14); w.importTable('d','csv','merge');
  T('取り込み：半角~でも → 連隊戦', lastPlaceFor(14)==='rentai_natsu');
  importRows=rows('連隊戦 ～海辺の陣～',15); w.importTable('d','csv','merge');
  T('取り込み：半角スペース入りでも → 連隊戦', lastPlaceFor(15)==='rentai_natsu');

  // 取り違えが起きないこと（ほかの場所は正しくそちらへ）
  importRows=[{'日付':D,'場所':'過去（恒常マップ）','階数':'8-4','マス(ボス/通常)':'ボス','男士':'今剣','件数':'1','撃破回数':'21'}];
  w.importTable('d','csv','merge');
  T('取り違えなし：過去はちゃんと kako へ', lastPlaceFor(21)==='kako');
  importRows=[{'日付':D,'場所':'大阪城（地下に眠る千両箱）','階数':'50階','マス(ボス/通常)':'ボス','男士':'鬼丸国綱','件数':'1','撃破回数':'22'}];
  w.importTable('d','csv','merge');
  T('取り違えなし：大阪城はちゃんと osaka へ', lastPlaceFor(22)==='osaka');
}

// 6) 書き出しは新名称で出る／期間しぼりこみとも噛み合う
{
  const seed={
    records:[{id:'r1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:1,date:D,updatedAt:1,deleted:false}],
    places:[{id:'rentai_natsu',name:OLD,type:'rentai',order:110,updatedAt:1,deleted:false}],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w=boot(seed,null);
  exportedRows=null;
  w.exportCSV();
  const row=exportedRows.find(r=>r['記録ID']==='r1');
  T('書き出し：場所が新名称で出る', row && row['場所']===NEW);

  // 集計の「この条件で書き出す」でも新名称・ファイル名が壊れない
  w.eval("aggState.placeId='rentai_natsu';aggState.floor='all';renderAggControls();renderAgg();");
  T('集計：新名称の場所が選べる（記録1件）', w.aggRecords().length===1);
  T('書き出し案内に新名称が出る', w.document.getElementById('aggExportNote').innerHTML.includes(NEW));
  const nm=w.aggExportName('csv');
  T('ファイル名は短い呼び名（記号が入らない）', nm==='邂逅録_夏の連隊戦_全期間.csv');
}

// 7) 移行ずみの端末に、旧名のデータが外から入ってきても旧名が復活しない
//    （2台持ちのクラウド同期／古いバックアップの復元でおきる）
{
  const seed={
    records:[],
    places:[
      {id:'rentai_natsu',name:NEW,type:'rentai',order:110,updatedAt:9,deleted:false},
      {id:'kako',name:'過去（恒常マップ）',type:'kako',order:0,updatedAt:1,deleted:false}
    ],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  // 旧バージョンで保存された「クラウドの中身」を模したデータ
  const oldCloud={
    records:[{id:'c1',placeId:'rentai_natsu',floor:'easy',swords:[{name:'村雲江',mass:'unknown',count:1}],kills:5,date:D,updatedAt:1,deleted:false}],
    places:[
      {id:'rentai_natsu',name:OLD,type:'rentai',order:110,updatedAt:1,deleted:false},
      {id:'kako',name:'過去（恒常マップ）',type:'kako',order:0,updatedAt:1,deleted:false}
    ],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:1
  };

  // クラウド読み込み経路
  const w1=boot(seed,{rentaiNameV1:true});
  T('前提：移行ずみで新名称になっている', rentai(w1).name===NEW);
  w1.applyCloudData(oldCloud);
  T('クラウド読み込み：旧名が入ってきても新名称に直る', w1.eval("UD.places.find(p=>p.id==='rentai_natsu').name")===NEW);
  T('クラウド読み込み：記録は入っている（クラウドの内容が反映される）', w1.eval('UD.records.length')===1);

  // JSON「置き換え」復元の経路
  const w2=boot(seed,{rentaiNameV1:true});
  w2.importJSON(JSON.stringify({app:'kaikouroku',version:1,UD:oldCloud}),'replace');
  T('JSON置き換え：旧名が入ってきても新名称に直る', rentai(w2).name===NEW);
  T('JSON置き換え：記録は復元される', recsOf(w2).filter(r=>!r.deleted).length===1);

  // JSON「追加」は場所を触らないので、そもそも旧名にならない
  const w3=boot(seed,{rentaiNameV1:true});
  w3.importJSON(JSON.stringify({app:'kaikouroku',version:1,UD:oldCloud}),'merge');
  T('JSON追加：場所名は新名称のまま', rentai(w3).name===NEW);

  // 自分でつけた名前は、外からデータが来ても守られる
  const seed2={
    records:[],
    places:[{id:'rentai_natsu',name:'わたしの連隊戦',type:'rentai',order:110,updatedAt:9,deleted:false}],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0
  };
  const w4=boot(seed2,{rentaiNameV1:true});
  w4.importJSON(JSON.stringify({app:'kaikouroku',version:1,UD:{
    records:[],places:[{id:'rentai_natsu',name:'わたしの連隊戦',type:'rentai',order:110,updatedAt:1,deleted:false}],
    featured:[],featuredByStage:{},kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:1
  }}),'replace');
  T('自分でつけた名前は外からのデータでも上書きされない', rentai(w4).name==='わたしの連隊戦');
}

console.log(`--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
