
/* 人物数据 */
const PERSONS = [
  {n:"江姐（江雪琴）",r:"hero",rl:"英雄·女共产党员",id:"原型 江竹筠（1920—1949）",ev:"城头见丈夫头颅后强忍悲痛；竹签钉十指仍坚贞不屈；1949.11.14 牺牲于电台岚垭。",sp:"坚贞不屈、视死如归"},
  {n:"许云峰",r:"hero",rl:"英雄·地下党工运书记",id:"原型 许建业（主）、许晓轩、罗世文、车耀先",ev:"识破郑克昌、劝甫志高转移未果；狱中赤手挖地道留予战友，从容就义。",sp:"大智大勇、勇于献身"},
  {n:"成岗",r:"hero",rl:"英雄·《挺进报》负责人",id:"原型 陈然（1923—1949）",ev:"印刷发行《挺进报》；被捕后写下《我的「自白」书》；1949.10.28 大坪就义。",sp:"气节凛然、乐观豪迈"},
  {n:"刘思扬",r:"hero",rl:"英雄·出身地主家庭的党员",id:"原型 刘国鋕（刘国志）",ev:"出身富贵却投身革命；狱中自我改造、拒绝签悔过书；11·27 白公馆遇难。",sp:"背叛出身、信仰坚定"},
  {n:"华子良",r:"hero",rl:"英雄·潜伏最深的党员",id:"原型 韩子栋",ev:"白公馆装疯多年，被唤「疯老头」；借磁器口买菜联络，送情报、带解放军越狱。",sp:"忍辱负重、忠贞不屈"},
  {n:"小萝卜头（宋振中）",r:"youth",rl:"少年烈士",id:"真实人物 宋振中（1941—1949）",ev:"出生8个月入狱，狱中8年；黄将军帮助下刻苦求学；1949.9.6 松林坡遇难，不满9岁。",sp:"渴望光明、天真顽强"},
  {n:"双枪老太婆",r:"hero",rl:"英雄·华蓥山游击队司令",id:"原型 陈联诗、邓惠中、刘隆华",ev:"接应江姐、在华蓥山开展武装斗争；小说中击毙叛徒甫志高。",sp:"传奇英勇、爱憎分明"},
  {n:"余新江",r:"hero",rl:"英雄·工人出身党员",id:"综合原型",ev:"沙坪书店店员；被捕入狱坚持斗争；狱中团结难友。",sp:"工人阶级、勇敢质朴"},
  {n:"李敬原",r:"hero",rl:"英雄·地下党领导",id:"综合原型",ev:"部署《挺进报》工作；安排成瑶化名陈静当记者，保存革命力量。",sp:"沉着老练、顾全大局"},
  {n:"龙光华",r:"hero",rl:"英雄·新四军战士（小说）",id:"文学形象（注：叶挺《囚歌》史实有误置）",ev:"为争取饮水与特务抗争牺牲；难友绝食迫令为其举行追悼会。",sp:"为民请命、英勇牺牲"},
  {n:"老大哥",r:"hero",rl:"英雄·狱中领袖",id:"综合原型（余新江的老师）",ev:"团结、领导难友，组织绝食与越狱，是狱中主心骨。",sp:"沉稳坚毅、众望所归"},
  {n:"齐晓轩",r:"hero",rl:"英雄·白公馆党员",id:"综合原型",ev:"主动承认《挺进报》来源以保护胡浩；越狱时站上岩石吸引火力，血染红岩。",sp:"舍生取义、从容赴死"},
  {n:"成瑶（陈静）",r:"youth",rl:"青年·成岗妹妹、记者",id:"综合原型",ev:"受兄长与革命影响觉醒；化名记者，以笔为枪继续斗争。",sp:"成长觉醒、勇敢坚定"},
  {n:"华为",r:"hero",rl:"英雄·游击队队员",id:"综合原型",ev:"双枪老太婆之子；护送江姐进山，连接山外游击队与狱中。",sp:"革命后代、机智忠诚"},
  {n:"彭松涛（彭咏梧）",r:"hero",rl:"英雄·华蓥山纵队政委",id:"原型 彭咏梧（1915—1948）",ev:"江姐丈夫；1948.1 在下川东武装起义中牺牲，头颅被挂城头示众。",sp:"英勇善战、献身理想"},
  {n:"甫志高",r:"trait",rl:"叛徒·原地下党员",id:"虚构（综合任达哉、蒲华辅等）",ev:"擅自设沙坪书店被渗透；不听许云峰劝阻回家被捕后叛变，出卖大批同志；后被双枪老太婆击毙。",sp:"自私软弱、背叛信仰"},
  {n:"徐鹏飞",r:"enemy",rl:"敌人·军统/保密局特务头子",id:"原型 徐远举",ev:"审讯、设宴诱降、制造大屠杀；性格复杂（凶残而善攻心），反衬革命者崇高。",sp:"凶残狡诈（反面）"},
  {n:"杨虎城",r:"history",rl:"史实·爱国将领",id:"真实人物（1893—1949）",ev:"1949.9.6 与宋绮云一家等6人于松林坡被害，是大屠杀开端。",sp:"爱国殉难、青史留名"}
];
const clsMap={hero:"c-hero",trait:"c-trait",enemy:"c-enemy",youth:"c-youth",history:"c-history"};
const rlMap={hero:"英雄群像",trait:"叛徒",enemy:"敌人",youth:"少年/青年",history:"史实人物"};
const box=document.getElementById('pcards');
function render(f){
  box.innerHTML='';
  PERSONS.filter(p=>f==='all'||p.r===f).forEach(p=>{
    const d=document.createElement('div');
    d.className='pcard';
    d.innerHTML=`<div class="top ${clsMap[p.r]}"><div class="nm">${p.n}</div><div class="rl">${p.rl}　·　${rlMap[p.r]}</div></div>
      <div class="body"><p><span class="k">历史原型：</span>${p.id}</p><p><span class="k">关键事件：</span>${p.ev}</p><p><span class="k">精神品质：</span>${p.sp}</p></div>`;
    box.appendChild(d);
  });
}
render('all');
document.getElementById('pfilters').addEventListener('click',e=>{
  if(e.target.tagName!=='BUTTON')return;
  document.querySelectorAll('#pfilters button').forEach(b=>b.classList.remove('on'));
  e.target.classList.add('on');
  render(e.target.dataset.f);
});
