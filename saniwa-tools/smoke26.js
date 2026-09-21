// smoke26: 夜花の目玉をボス／苦無で分ける
// 1) エリア設定タブに夜花の欄が出る（敵ボタン・目玉編集・まとめて入れる）
// 2) 保存キーが yobana@boss / yobana@kunai に分かれる（旧 yobana@ ・ yobana@edo は作らない）
// 3) featuredList：ボス／苦無は敵ごと、不明・すべて・指定なしは両方を合わせる（重複は除く）
// 4) 記録画面・サイドバーが、選んでいる敵の目玉を出す
// 5) 記録カードの★は「その男士が出た敵」の目玉で判定する
// 6) ほかの場所（過去・大阪城・連隊戦・百鬼夜行）に影響していない
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
let pass=0,fail=0; const T=(n,c)=>{c?(pass++,console.log('  ok  '+n)):(fail++,console.log('  NG  '+n));};
const UD=w=>JSON.parse(w.localStorage.getItem('kk_data_v1'));
const ST=w=>JSON.parse(w.localStorage.getItem('kk_set_v1')||'{}');

console.log('--- smoke26 ---');
console.log('■ エリア設定タブに夜花の欄が出る');
{
 const w=boot(null,null), d=w.document;
 w.scfgSetPlace('yobana');
 const body=d.getElementById('scfgBody').innerHTML;
 T('設定欄が空でなくなった', body.length>0);
 T('敵ボタンが2つ出る', (body.match(/scfgPickMass/g)||[]).length===2);
 T('ボスと苦無の両方がある', /🔴 ボス/.test(body) && /🗡 苦無/.test(body));
 T('目玉の編集欄が出る', !!d.getElementById('scfgAddList'));
 T('検索欄も出る', !!d.getElementById('scfgSearch'));
 T('「まとめて入れる」ボタンが出る', !!d.getElementById('scfgCopyAllBtn') && /ボスと苦無 の両方に入れる/.test(body));
 T('検非違使の欄は出ない', !/検非違使/.test(body));
 T('既定はボス', w.eval('scfgMass')==='boss');
 T('見出しが「ボス の目玉」', /⭐ <span>ボス<\/span> の目玉/.test(body));

 console.log('\n■ 保存キーが敵ごとに分かれる');
 T('ボスのキー', w.scfgKey()==='yobana@boss');
 w.scfgPickMass('kunai');
 T('苦無のキー', w.scfgKey()==='yobana@kunai');
 T('見出しが「苦無 の目玉」', /⭐ <span>苦無<\/span> の目玉/.test(d.getElementById('scfgBody').innerHTML));
 T('覚えている', ST(w).scfgMass==='kunai');
 const w2=boot(UD(w),ST(w));
 w2.scfgSetPlace('yobana');
 T('開き直しても苦無のまま', w2.eval('scfgMass')==='kunai');
}

console.log('\n■ 目玉を入れて、敵ごとに分かれること');
{
 const w=boot(null,null), d=w.document;
 w.scfgSetPlace('yobana');
 w.scfgPickMass('boss'); w.scfgAdd('今剣'); w.scfgAdd('五虎退');
 w.scfgPickMass('kunai'); w.scfgAdd('村雲江');
 const fb=UD(w).featuredByStage;
 T('yobana@boss に2人', (fb['yobana@boss']||[]).join()==='今剣,五虎退');
 T('yobana@kunai に1人', (fb['yobana@kunai']||[]).join()==='村雲江');
 T('古い yobana@ / yobana@edo は作られない', !fb['yobana@'] && !fb['yobana@edo']);
 T('⭐印が両方に付く', (d.getElementById('scfgBody').innerHTML.match(/scfg-has/g)||[]).length===2);

 console.log('\n■ featuredList の引きかた');
 T('ボス → 今剣・五虎退', w.featuredList('yobana',null,'boss').join()==='今剣,五虎退');
 T('苦無 → 村雲江', w.featuredList('yobana',null,'kunai').join()==='村雲江');
 T('不明 → 両方を合わせる', w.featuredList('yobana','edo','unknown').join()==='今剣,五虎退,村雲江');
 T('すべて → 両方を合わせる', w.featuredList('yobana','edo','all').join()==='今剣,五虎退,村雲江');
 T('渡さない → 両方を合わせる', w.featuredList('yobana','edo').join()==='今剣,五虎退,村雲江');
 T('重複は取り除かれる', (()=>{w.eval("UD.featuredByStage['yobana@kunai'].push('今剣');");
   return w.featuredList('yobana','edo').filter(n=>n==='今剣').length===1;})());
 w.eval("UD.featuredByStage['yobana@kunai']=['村雲江'];save();");

 console.log('\n■ 記録画面：選んだ敵の目玉が出る');
 w.eval("recState.placeId='yobana';renderRecPlace();");
 d.getElementById('recPlace').value='yobana'; w.onRecPlaceChange();
 w.setMass('boss');  T('ボス選択中', w.curFeatured().join()==='今剣,五虎退');
 w.setMass('kunai'); T('苦無選択中', w.curFeatured().join()==='村雲江');
 w.setMass('unknown');T('不明選択中は両方', w.curFeatured().join()==='今剣,五虎退,村雲江');
 w.eval('renderSbNow();');
 T('サイドバーに両方出る', /今剣・五虎退・村雲江/.test(d.getElementById('sbNow').innerHTML));
 w.setMass('boss'); w.eval('renderSbNow();');
 T('ボスにするとボスの分だけ', /★ 目玉: 今剣・五虎退</.test(d.getElementById('sbNow').innerHTML));

 console.log('\n■ まとめて入れる');
 w.scfgSetPlace('yobana'); w.scfgPickMass('boss');
 w.scfgCopyToAllYobana();
 d.getElementById('cfOk').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 T('苦無にもボスの目玉が入る', (UD(w).featuredByStage['yobana@kunai']||[]).join()==='今剣,五虎退');
 T('ボス側は変わらない', (UD(w).featuredByStage['yobana@boss']||[]).join()==='今剣,五虎退');
}

console.log('\n■ 記録カードの★は、その男士が出た敵で判定する');
{
 const seed={records:[{id:'y1',placeId:'yobana',floor:'edo',swords:[
   {name:'今剣',mass:'boss',count:1},{name:'今剣',mass:'kunai',count:1},{name:'村雲江',mass:'kunai',count:1}],
   kills:3,date:'2026-08-26',updatedAt:1,deleted:false}],
  places:[],featured:[],featuredByStage:{'yobana@boss':['今剣'],'yobana@kunai':['村雲江']},
  featuredByStage2:null,kebiByStage:{},onkeikoByStage:{},wishlist:[],updatedAt:0};
 delete seed.featuredByStage2;
 const w=boot(seed,null), d=w.document;
 w.eval("ST.recentView='rec';saveST();renderRecent();");
 const card=d.getElementById('reccard-y1').innerHTML;
 const rows=card.split('<').filter(x=>x.includes('今剣')||x.includes('村雲江'));
 T('★の数は2つ（ボスの今剣＋苦無の村雲江）', (card.match(/class="star">★/g)||[]).length===2);
 T('苦無から出た今剣には★が付かない', (()=>{
   const m=card.match(/★<\/span> 今剣/g)||[];
   return m.length===1;   // ボスの1行だけ
 })());
}

console.log('\n■ ほかの場所に影響していない');
{
 const w=boot(null,null), d=w.document;
 [['kako','8-4'],['osaka',99],['rentai_fuyu','easy'],['hyakki','hi_kou']].forEach(([p,f])=>{
   w.scfgSetPlace(p);
   T(p+' の設定欄が出る', d.getElementById('scfgBody').innerHTML.length>0);
 });
 w.scfgSetPlace('rentai_fuyu'); w.scfgAdd('今剣');
 T('連隊戦のキーは従来どおり', !!UD(w).featuredByStage['rentai_fuyu@easy']);
 T('連隊戦のまとめて入れるも健在', /8つの難易度 すべてに入れる/.test(d.getElementById('scfgBody').innerHTML));
 T('過去の目玉は従来どおり', (()=>{w.scfgSetPlace('kako');w.scfgAdd('五虎退');
   return (UD(w).featuredByStage['kako@8-4']||[]).includes('五虎退');})());
}
console.log(`\n--- ${pass} ok / ${fail} NG ---`);
process.exit(fail?1:0);
