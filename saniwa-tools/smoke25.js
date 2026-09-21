// smoke25: 夜花2026年の開催回から「予想」を外す移行の検証
// 1) まっさらな人：種データから予想なしで入る
// 2) すでに開いた人：termsSeeded が立っていても、一度きりの移行で予想が外れる
//    （日付・回数・名前は変えない／updatedAt が動いてクラウド同期に乗る）
// 3) 自分で直した回（mine）には触らない
// 4) 二度目は走らない／ほかの場所に影響しない
// ※ 「もう開いたことがある人」の再現に pub/kaikouroku.html（公開版）を使う
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('kaikouroku.html','utf8');
function boot(seed,st){
 return new JSDOM(html,{runScripts:'dangerously',url:'https://example.com/k.html',
  beforeParse(w){w.gtag=function(){};
   w.XLSX={read:()=>({SheetNames:[],Sheets:{}}),utils:{sheet_to_json:()=>[],json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
   w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
   w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
   w.HTMLElement.prototype.scrollIntoView=function(){};
   if(seed)w.localStorage.setItem('kk_data_v1',JSON.stringify(seed));
   if(st)w.localStorage.setItem('kk_set_v1',JSON.stringify(st));}}).window;
}
const UD=w=>JSON.parse(w.localStorage.getItem('kk_data_v1'));
const ST=w=>JSON.parse(w.localStorage.getItem('kk_set_v1')||'{}');
const yb=w=>UD(w).places.find(p=>p.id==='yobana');
const t26=w=>(yb(w).terms||[]).find(t=>t.from==='2026-08-25');
let pass=0,fail=0; const T=(n,c)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('  NG  '+n));};

console.log('--- smoke25 ---');
console.log('■ まっさらな人（種データから直接）');
{
 const w=boot(null,null);
 T('2026年の回がある', !!t26(w));
 T('予想が付かない', t26(w).est===false || t26(w).est===undefined);
 T('日付はそのまま 8/25〜9/8', t26(w).to==='2026-09-08');
 T('開催回は7回のまま', yb(w).terms.length===7);
 T('予想の回は0件', yb(w).terms.filter(t=>t.est).length===0);
}
console.log('\n■ もう開いたことがある人（termsSeededが立っている＝今回の本命）');
{
 // 公開版で一度開いた状態を再現：予想つきの開催回が入っていて、移行フラグも立っている
 const base=new JSDOM(fs.readFileSync('pub/kaikouroku.html','utf8'),{runScripts:'dangerously',url:'https://example.com/k.html',
  beforeParse(w){w.gtag=function(){};
   w.XLSX={read:()=>({SheetNames:[],Sheets:{}}),utils:{sheet_to_json:()=>[],json_to_sheet:()=>({}),sheet_to_csv:()=>'',book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{},write:()=>''};
   w.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}}),revoke:()=>{}}}};
   w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
   w.HTMLElement.prototype.scrollIntoView=function(){};}}).window;
 const oldUD=JSON.parse(base.localStorage.getItem('kk_data_v1'));
 const oldST=JSON.parse(base.localStorage.getItem('kk_set_v1'));
 const before=oldUD.places.find(p=>p.id==='yobana').terms.find(t=>t.from==='2026-08-25');
 T('前提：公開版では予想が付いている', before.est===true);
 T('前提：termsSeeded.yobana が立っている', oldUD.termsSeeded.yobana===true);
 const w=boot(oldUD,oldST);
 T('移行で予想が外れる', t26(w).est===false);
 T('日付は変わらない', t26(w).from==='2026-08-25' && t26(w).to==='2026-09-08');
 T('回の数も名前も変わらない', yb(w).terms.length===7 && t26(w).name==='2026年8月');
 T('ほかの6回は無傷', yb(w).terms.filter(t=>t.est).length===0);
 T('移行フラグが立つ', ST(w).yobanaEstV1===true);
 T('同期に乗るよう updatedAt が動く', yb(w).updatedAt>0);
 // 二度目は走らない
 const w2=boot(UD(w),ST(w));
 T('二度目は走らない（フラグ済み）', ST(w2).yobanaEstV1===true && t26(w2).est===false);
}
console.log('\n■ 自分で日付を直していた人（mine）は触らない');
{
 const base=boot(null,null);
 const ud=UD(base);
 const p=ud.places.find(x=>x.id==='yobana');
 p.terms.find(t=>t.from==='2026-08-25').est=true;
 p.terms.find(t=>t.from==='2026-08-25').mine=true;
 const w=boot(ud,{});
 T('mine の回は予想のまま残る', t26(w).est===true);
 T('それでもフラグは立つ（毎回走らない）', ST(w).yobanaEstV1===true);
}
console.log('\n■ ほかの場所に影響していない');
{
 const w=boot(null,null);
 const cnt=id=>(UD(w).places.find(p=>p.id===id).terms||[]).length;
 T('大阪城39・海辺8・冬11・初夏2・百鬼3',
   cnt('osaka')===39&&cnt('rentai_natsu')===8&&cnt('rentai_fuyu')===11&&cnt('rentai_shoka')===2&&cnt('hyakki')===3);
 T('どの場所にも予想は無い', UD(w).places.every(p=>!(p.terms||[]).some(t=>t.est)));
}
console.log(`\n--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
