// 红色地点详情页生成器：node generate-place-pages.mjs
// 在 red-culture-site/ 根目录产出 13 个 place-<slug>.html
import { writeFileSync } from "node:fs";

const STAR =
  '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.26 6.87.6-5.2 4.51 1.53 6.72L12 16.9l-6.1 3.19 1.53-6.72-5.2-4.51 6.87-.6L12 2z" fill="#C8102E"/></svg>';

const PLACES = [
  {
    slug: "nanhu",
    name: "嘉兴南湖",
    year: "1921",
    region: "浙江嘉兴",
    epithet: "红船启航 · 中国共产党的诞生地",
    lead:
      "1921 年 7 月底，中共一大在上海遭密探袭扰，代表们转移至嘉兴南湖，在一艘画舫上游船中完成了最后议程。中国共产党在这叶小船上正式宣告成立——一叶红船，从此载起了民族的命运。",
    quote: "开天辟地、敢为人先的首创精神；坚定理想、百折不挠的奋斗精神；立党为公、忠诚为民的奉献精神。",
    quoteNote: "—— 「红船精神」的深刻内涵",
    stories: [
      {
        t: "画舫上的闭幕",
        p: "1921 年 8 月初的一个上午，代表们分批乘火车抵达嘉兴，登上游船驶入湖中。会议在船上通过了党的第一个纲领和决议，选举产生中央领导机构。中午前后，大会庄严宣告中国共产党成立。",
      },
      {
        t: "从画舫到红船",
        p: "当年那条游船早已无迹可寻。1959 年，依据当事人回忆仿制了一艘纪念船，停泊在烟雨楼前水面，人们亲切地称它为「红船」。它不是最起眼的船，却是最不能忘记的船。",
      },
      {
        t: "烟雨楼下",
        p: "湖心岛上的烟雨楼始建于五代，因唐代诗人「南朝四百八十寺」一脉的烟雨意境得名。如今南湖革命纪念馆矗立湖畔，每年数以百万计的人们来到这里，回望一个百年大党出发的地方。",
      },
    ],
    legacy: "小小红船承载千钧，播下了中国革命的火种，开启了中国共产党的跨世纪航程。",
  },
  {
    slug: "jinggangshan",
    name: "井冈山",
    year: "1927 — 1930",
    region: "江西井冈山",
    epithet: "革命摇篮 · 第一个农村革命根据地",
    lead:
      "1927 年 10 月，毛泽东率秋收起义部队到达井冈山，创建了中国第一个农村革命根据地。在这里，「农村包围城市、武装夺取政权」的道路开始成形，中国革命的星星之火自此点燃。",
    quote: "星星之火，可以燎原。",
    quoteNote: "—— 毛泽东，1930 年",
    stories: [
      {
        t: "引兵井冈",
        p: "秋收起义受挫后，毛泽东在文家市果断转兵，经三湾改编把支部建在连上，率部向罗霄山脉中段进军。1927 年 10 月，根据地建设在井冈山拉开序幕——工农革命军第一次有了自己的「家」。",
      },
      {
        t: "朱毛会师",
        p: "1928 年 4 月，朱德、陈毅率南昌起义余部与湘南农军抵达宁冈砻市，与毛泽东领导的工农革命军会师，合编为工农革命军第四军。两双大手在龙江桥头握在一起，红军力量空前壮大。",
      },
      {
        t: "黄洋界上炮声隆",
        p: "1928 年 8 月，敌军四个团趁主力远在湘南进攻井冈山，留守不足一营的红军凭险据守黄洋界，用迫击炮和滚木礌石击退敌军。毛泽东闻讯写下「黄洋界上炮声隆，报道敌军宵遁」。",
      },
    ],
    legacy: "坚定执着追理想、实事求是闯新路、艰苦奋斗攻难关、依靠群众求胜利——井冈山精神，穿越近百年依然滚烫。",
  },
  {
    slug: "zunyi",
    name: "遵义",
    year: "1935 · 1",
    region: "贵州遵义",
    epithet: "生死转折 · 遵义会议召开地",
    lead:
      "1935 年 1 月，中央红军突破乌江天险占领遵义。15 日至 17 日，中共中央政治局扩大会议在城里一栋二层小楼里召开，三天时间，在极端危急的历史关头挽救了党、挽救了红军、挽救了中国革命。",
    quote: "雄关漫道真如铁，而今迈步从头越。",
    quoteNote: "—— 毛泽东《忆秦娥·娄山关》，1935 年 2 月",
    stories: [
      {
        t: "突破乌江",
        p: "1935 年 1 月初，红军强渡乌江天险，江面竹筏与对岸枪声织成一幅惊险画卷。1 月 7 日先头部队智取遵义城，为随后召开的会议赢得了一个难得的喘息窗口。",
      },
      {
        t: "三天会议",
        p: "遵义会议在柏辉章公馆二楼客厅召开。会议批判了「左」倾军事路线，增选毛泽东为政治局常委，事实上确立了他在党中央和红军的新的领导地位——这是党史上一个生死攸关的转折点。",
      },
      {
        t: "会后出奇兵",
        p: "会议之后，红军四渡赤水、南渡乌江、巧渡金沙江，在几十万敌军的缝隙间机动穿插，彻底跳出包围圈。遵义小楼里作出的抉择，在此后的行军路线上一步步得到验证。",
      },
    ],
    legacy: "会址木楼依旧，墙上挂钟停摆于历史的那一刻。转折之城的每一条街巷，都在提醒后来者：实事求是，是最大的勇气。",
  },
  {
    slug: "luding",
    name: "泸定桥",
    year: "1935 · 5",
    region: "四川泸定",
    epithet: "飞夺天险 · 十三根铁索上的冲锋",
    lead:
      "大渡河上十三根铁索横贯东西。1935 年 5 月 29 日，红四团昼夜奔袭二百四十里赶到桥头，二十二名突击队员冒着枪林弹雨攀着光溜溜的铁索冲向对岸，一举夺桥——北上通道就此打开。",
    quote: "大渡桥横铁索寒。",
    quoteNote: "—— 毛泽东《七律·长征》",
    stories: [
      {
        t: "昼夜二百四十里",
        p: "接到夺桥命令时，红四团距泸定桥还有二百四十里。战士们冒着大雨、摸黑翻山，一昼夜强行军赶到桥头，创造了世界陆军史上罕见的行军纪录，抢在敌军增援之前到达战场。",
      },
      {
        t: "二十二勇士",
        p: "5 月 29 日下午总攻打响，二连连长廖大珠率二十二名突击队员攀着悬空的铁索向对岸冲击，身后的战友铺板跟进。敌人在桥头燃起大火，勇士们穿过火海占领桥楼，为大部队撕开了生路。",
      },
      {
        t: "天堑变通途",
        p: "泸定桥始建于康熙四十四年，本是茶马古道上的交通要津。红军夺桥之后，主力由此跨过大渡河，摆脱了数十万追兵。「飞夺泸定桥」自此成为勇气的代名词，写入小学课本，代代相传。",
      },
    ],
    legacy: "今天走上泸定桥，桥板下大渡河水声轰鸣，铁索仍在微微晃动。走过这十三根铁索，才算读懂什么叫「狭路相逢勇者胜」。",
  },
  {
    slug: "yanan",
    name: "延安",
    year: "1935 — 1948",
    region: "陕西延安",
    epithet: "革命圣地 · 宝塔山下的十三载岁月",
    lead:
      "从 1935 到 1948，中共中央以延安为中心战斗生活了十三个春秋。宝塔山下、延河岸边、窑洞灯火之间，抗日战争的方略在这里运筹，延安精神在这里孕育，无数青年高唱着歌奔向这座城。",
    quote: "几回回梦里回延安，双手搂定宝塔山。",
    quoteNote: "—— 贺敬之《回延安》",
    stories: [
      {
        t: "窑洞里的灯光",
        p: "凤凰山、杨家岭、枣园……毛泽东等领导人在一孔孔土窑洞里写下了《论持久战》《实践论》《矛盾论》等大量著作。油灯下的笔耕不辍，为一个民族的战略相持提供了思想武器。",
      },
      {
        t: "自己动手，丰衣足食",
        p: "面对经济封锁，边区军民开展大生产运动，三五九旅开进南泥湾，把荒无人烟的烂泥湾变成「陕北的好江南」。纺车与锄头，成了那一代人共同的记忆。",
      },
      {
        t: "杨家岭的七大",
        p: "1945 年 4 月至 6 月，中共七大在杨家岭中央大礼堂举行，确立毛泽东思想为党的指导思想，选出新的中央委员会。礼堂两侧的旗座至今保留着当年的样子，「同心同德」四个字仍挂在主席台上方。",
      },
    ],
    legacy: "自力更生、艰苦奋斗——延安窑洞里长出来的精神，至今仍是这个政党最朴素的底色。",
  },
  {
    slug: "xibaipo",
    name: "西柏坡",
    year: "1948 — 1949",
    region: "河北平山",
    epithet: "赶考出发地 · 最后一个农村指挥所",
    lead:
      "太行山东麓、滹沱河北岸的小山村西柏坡，是党中央解放全中国的最后一个农村指挥所。三大战役在这里指挥运筹，具有历史转折意义的七届二中全会在这里召开，「进京赶考」从这里出发。",
    quote: "进京赶考去。……我们决不当李自成，我们都希望考个好成绩！",
    quoteNote: "—— 毛泽东离开西柏坡前夕",
    stories: [
      {
        t: "最小的指挥部",
        p: "1948 年 5 月，中共中央移驻西柏坡。作战室里的军用电话线和电报机，指挥了辽沈、淮海、平津三大战役——周恩来后来说：我们这个指挥部一不发人、二不发枪、三不发粮，就是天天发电报，就把国民党打败了。",
      },
      {
        t: "一百九十七封电报",
        p: "在西柏坡的日子里，毛泽东起草了大量电报指挥全国战局。三大战役期间发出的电报多达一百九十余封，字字千钧。土坯房里的灯光，照亮的是整个中国战场的地图。",
      },
      {
        t: "两个务必",
        p: "1949 年 3 月，七届二中全会在西柏坡机关食堂召开。毛泽东告诫全党：务必使同志们继续地保持谦虚、谨慎、不骄、不躁的作风，务必使同志们继续地保持艰苦奋斗的作风。会后第十天，中共中央动身离开西柏坡，「进京赶考」。",
      },
    ],
    legacy: "谦虚谨慎、艰苦奋斗的「两个务必」，与「赶考永远在路上」的清醒，从一个小山村传到了今天。",
  },
  {
    slug: "tiananmen",
    name: "天安门",
    year: "1949",
    region: "北京",
    epithet: "开国大典 · 新中国从这里站起来",
    lead:
      "1949 年 10 月 1 日下午三时，毛泽东在天安门城楼上向全世界庄严宣告：中华人民共和国中央人民政府今天成立了！三十万军民汇聚广场，礼炮齐鸣，五星红旗第一次作为国旗冉冉升起。",
    quote: "中华人民共和国中央人民政府今天成立了！",
    quoteNote: "—— 毛泽东在天安门城楼上宣告，1949 年 10 月 1 日",
    stories: [
      {
        t: "二十八响礼炮",
        p: "开国大典上五十四门礼炮齐鸣二十八响，象征中国共产党领导人民浴血奋战的二十八年。当第一面五星红旗由毛主席按动电钮升起，《义勇军进行曲》响彻广场上空。",
      },
      {
        t: "人民英雄纪念碑",
        p: "开国大典前一天，1949 年 9 月 30 日，人民英雄纪念碑在天安门广场奠基。毛泽东宣读碑文并执锹铲土奠基——「三年以来」「三十年以来」「由此上溯到一千八百四十年」，人民英雄永垂不朽。",
      },
      {
        t: "今天的广场",
        p: "每天清晨，天安门广场的升国旗仪式吸引成千上万的人驻足仰望。从 1949 年那个下午到今天，这里见证了共和国的每一次重要时刻，也见证着一个国家从站起来、富起来到强起来的历程。",
      },
    ],
    legacy: "城楼上那句宣告已经过去七十多年，广场上每天升起的国旗提醒着每一个人：这盛世来之不易。",
  },
  {
    slug: "shanghai-yida",
    name: "上海中共一大会址",
    year: "1921",
    region: "上海 · 黄浦",
    epithet: "开天辟地 · 中国共产党的诞生地",
    lead:
      "1921 年 7 月 23 日，中国共产党第一次全国代表大会在上海法租界石库门（今兴业路 76 号）召开，13 位代表出席，宣告中国共产党正式成立。会址由此成为党的诞生地。",
    quote: "作始也简，将毕也巨。",
    quoteNote: "—— 董必武题南湖革命纪念馆",
    stories: [
      {
        t: "石库门里的集结",
        p: "1921 年 7 月 23 日，各地代表汇聚上海法租界望志路 106 号，围绕党的名称、纲领和决议展开讨论，中国革命的新篇章在此翻开第一页。",
      },
      {
        t: "风雨中的转移",
        p: "会议进行中突遭法租界巡捕袭扰，代表们被迫转移，最后一天登上嘉兴南湖的画舫闭幕，完成了建党的历史使命。",
      },
      {
        t: "永恒的纪念",
        p: "会址经修缮保护，现为中国共产党第一次全国代表大会纪念馆，每年迎来无数瞻仰者，回望那个开天辟地的夏天。",
      },
    ],
    legacy: "从一叶画舫到巍巍巨轮，一切始于这栋石库门。",
  },
  {
    slug: "rujin",
    name: "瑞金",
    year: "1931 — 1934",
    region: "江西 · 瑞金",
    epithet: "红色故都 · 共和国摇篮",
    lead:
      "1931 年 11 月，中华苏维埃第一次全国代表大会在瑞金叶坪召开，宣告成立中华苏维埃共和国临时中央政府，瑞金成为中央革命根据地的中心。",
    quote: "唤起工农千百万，同心干。",
    quoteNote: "—— 毛泽东《渔家傲·反第一次大「围剿」》",
    stories: [
      {
        t: "红色故都",
        p: "1931 年 11 月「一苏大」在瑞金叶坪召开，毛泽东当选临时中央政府主席；1934 年「二苏大」在沙洲坝召开，瑞金因此被誉为「红色故都」「共和国摇篮」。",
      },
      {
        t: "治国理政的预演",
        p: "临时中央政府在瑞金开展土地革命、经济建设、文化教育等探索，是中国共产党领导和管理国家政权的首次伟大尝试。",
      },
      {
        t: "踏上了长征路",
        p: "1934 年 10 月，中央红军主力从瑞金等地出发，开始战略转移——长征。瑞金的红井水，至今清甜如初。",
      },
    ],
    legacy: "「毛主席挖的井」——红井精神，映照着为民初心。",
  },
  {
    slug: "gutian",
    name: "古田",
    year: "1929 · 12",
    region: "福建 · 上杭",
    epithet: "思想建党 · 政治建军",
    lead:
      "1929 年 12 月，红四军党的第九次代表大会（古田会议）在福建上杭古田召开，确立了思想建党、政治建军的原则，解决了新型人民军队建设的根本问题。",
    quote: "思想建党，政治建军。",
    quoteNote: "—— 古田会议决议（核心原则）",
    stories: [
      {
        t: "在转折关头",
        p: "红四军转战赣南闽西，党内对建军原则存在分歧。古田会议统一思想，通过毛泽东起草的决议案，明确红军是执行革命政治任务的武装集团。",
      },
      {
        t: "党指挥枪",
        p: "会议规定军队必须服从党的领导，实行政治工作制度，纠正了单纯军事观点等错误倾向，为人民军队建设指明方向。",
      },
      {
        t: "里程碑意义",
        p: "古田会议成为人民军队建设史上的重要里程碑，其确立的原则至今仍是人民军队的建军之基。",
      },
    ],
    legacy: "古田会议的光芒，照亮了人民军队的前行之路。",
  },
  {
    slug: "wayaobao",
    name: "瓦窑堡",
    year: "1935 · 12",
    region: "陕西 · 子长",
    epithet: "抗日民族统一战线 · 策略策源地",
    lead:
      "1935 年 12 月，中共中央政治局在陕北瓦窑堡召开会议，批判「左」倾关门主义，制定建立抗日民族统一战线的策略方针，实现了政治路线的重要转变。",
    quote: "党的任务就是把红军的活动和民众的抗日反蒋斗争结合起来。",
    quoteNote: "—— 瓦窑堡会议决议精神",
    stories: [
      {
        t: "北上的落脚点",
        p: "中央红军长征到达陕北后，中共中央机关进驻瓦窑堡，在这里运筹抗日大计，瓦窑堡成为陕北时期的红色中枢之一。",
      },
      {
        t: "统一战线的确立",
        p: "会议通过《关于目前政治形势与党的任务决议》，提出团结一切抗日力量，变「抗日反蒋」为「逼蒋抗日」。",
      },
      {
        t: "迎接全民族抗战",
        p: "瓦窑堡会议为抗日民族统一战线的形成奠定了政治基础，吹响了全民族抗战的号角。",
      },
    ],
    legacy: "从土地革命到抗日民族战争，瓦窑堡是转折的驿站。",
  },
  {
    slug: "chongqing-hongyan",
    name: "重庆红岩村",
    year: "1939 — 1946",
    region: "重庆 · 渝中",
    epithet: "红岩精神 · 雾都里的坚守",
    lead:
      "抗战时期和解放战争初期，中共中央南方局、八路军重庆办事处设在重庆红岩村（红岩嘴 13 号），周恩来等在此领导国统区和沦陷区的党的工作，开展抗日民族统一战线。",
    quote: "爱国、奋斗、团结、奉献。",
    quoteNote: "—— 红岩精神",
    stories: [
      {
        t: "雾都明灯",
        p: "1939 年起，周恩来等南方局领导人驻红岩村，在国民党统治中心的险恶环境中坚守阵地，团结各方力量共同抗日。",
      },
      {
        t: "红岩三岩",
        p: "红岩村与曾家岩周公馆、虎头岩《新华日报》馆并称「红色三岩」，构筑起党在国统区的坚强堡垒。",
      },
      {
        t: "不朽的红岩",
        p: "江竹筠（江姐）等烈士在重庆渣滓洞、白公馆坚贞不屈，用生命铸就了坚贞不屈、同舟共济的红岩精神。",
      },
    ],
    legacy: "红岩精神，是雾都岁月里不灭的信仰之光。",
  },
  {
    slug: "kangmei-jinianguan",
    name: "抗美援朝纪念馆",
    year: "1950 — 1953",
    region: "辽宁 · 丹东",
    epithet: "立国之战 · 保家卫国丰碑",
    lead:
      "抗美援朝纪念馆位于辽宁丹东鸭绿江畔，是全国唯一全面反映抗美援朝战争历史和志愿军事迹的专题纪念馆。1950 年 10 月，中国人民志愿军从丹东跨过鸭绿江入朝参战。",
    quote: "抗美援朝，保家卫国。",
    quoteNote: "—— 抗美援朝动员口号",
    stories: [
      {
        t: "跨过鸭绿江",
        p: "1950 年 10 月，应朝鲜党和政府请求，中国人民志愿军在彭德怀率领下从丹东（时称安东）跨过鸭绿江，抗美援朝、保家卫国。",
      },
      {
        t: "立国之战",
        p: "经过艰苦卓绝的作战，中朝军队把侵略者赶回三八线，迫使美军在停战协定上签字，新中国的国际地位由此奠定。",
      },
      {
        t: "不朽的丰碑",
        p: "纪念馆以大量实物、文献与场景，再现黄继光、邱少云等英雄事迹。丹东鸭绿江断桥，见证着那段峥嵘岁月。",
      },
    ],
    legacy: "打得一拳开，免得百拳来——和平来之不易。",
  },
];

// 每个地点的配图（优先复用已有素材，新增的用画布生成图）
const IMGS = {
  nanhu: { src: "assets/images/red-boat.jpg", alt: "晨雾中的嘉兴南湖红船" },
  jinggangshan: { src: "assets/images/hero-jinggangshan.jpg", alt: "井冈山群峰云海" },
  zunyi: { src: "assets/images/zunyi.jpg", alt: "遵义会议会址，木构小楼前红旗招展" },
  luding: { src: "assets/images/luding.jpg", alt: "云雾中的泸定桥铁索横跨大渡河" },
  yanan: { src: "assets/images/detail-yanan.jpg", alt: "延安宝塔山与延河夜景" },
  xibaipo: { src: "assets/images/xibaipo.jpg", alt: "西柏坡毛泽东旧居院落" },
  tiananmen: { src: "assets/images/detail-tiananmen.jpg", alt: "天安门城楼（历史资料图）" },
  "shanghai-yida": { src: "assets/images/shanghai-yida.jpg?v=20260830e", alt: "上海中共一大会址实景", figureClass: "figure-shanghai-yida", caption: `上海中共一大会址实景 · ScareCriterion12 / Wikimedia Commons（<a href="https://commons.wikimedia.org/wiki/File:%E4%B8%AD%E5%85%B1%E4%B8%80%E5%A4%A7%E4%BC%9A%E5%9D%80%E6%AD%A3%E9%9D%A22021_(2).jpg" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>）` },
  ruijin: { src: "assets/images/rujin.jpg?v=20260830d", alt: "瑞金沙洲坝红井实景", figureClass: "figure-rujin", caption: `瑞金沙洲坝红井实景 · Zhangzhugang / Wikimedia Commons（<a href="https://commons.wikimedia.org/wiki/File:Ruijin_Shazhouba_Geming_Jiuzhi_2014.05.30_16-41-43.jpg" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>）` },
  gutian: { src: "assets/images/gutian.jpg?v=20260830d", alt: "古田会议会址实景", figureClass: "figure-gutian", caption: `古田会议会址实景 · Rolfmueller / Wikimedia Commons（<a href="https://commons.wikimedia.org/wiki/File:Gutian_compound.jpg" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>）` },
  "chongqing-hongyan": { src: "assets/images/chongqing-hongyan.jpg?v=20260830e", alt: "重庆红岩革命纪念馆外景实景", figureClass: "figure-chongqing-hongyan", caption: `重庆红岩革命纪念馆外景实景 · Liuxingy / Wikimedia Commons（<a href="https://commons.wikimedia.org/wiki/File:%E6%B8%9D%E4%B8%AD_%E7%BA%A2%E5%B2%A9%E7%BA%AA%E5%BF%B5%E9%A6%86%E5%A4%96.jpg" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>）` },
  "kangmei-jinianguan": { src: "assets/images/kangmei-jinianguan.jpg?v=20260830d", alt: "抗美援朝纪念馆题词墙实景", figureClass: "figure-kangmei-jinianguan", caption: `抗美援朝纪念馆题词墙实景 · Azchael from Maichingen, Germany / Wikimedia Commons（<a href="https://commons.wikimedia.org/wiki/File:Korean_War_Museum_and_Memorial_of_Dandong_(14228137608).jpg" target="_blank" rel="noopener noreferrer">CC BY 2.0</a>）` },
};

function nav() {
  return `  <!-- 导航栏 -->
  <header class="nav" id="nav">
    <a class="nav-logo" href="index.html" aria-label="红色文化传播网">
      ${STAR}
      <span>红色文化传播网</span>
    </a>
    <nav class="nav-links" aria-label="主导航">
      <a href="heroes.html">英雄人物</a>
      <a href="places.html">红色地点</a>
      <a href="events.html">历史事件</a>
      <a href="index.html#quiz">知识考核</a>
      <a href="about.html">关于本站</a>
    </nav>
    <div class="nav-right">
      <div id="user-area" class="nav-user-area"></div>
      <button class="nav-search" aria-label="搜索">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M16.2 16.2L20.5 20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <button class="nav-burger" id="burger" aria-label="菜单" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
  <div class="nav-drawer" id="drawer">
    <a href="heroes.html">英雄人物</a>
    <a href="places.html">红色地点</a>
    <a href="events.html">历史事件</a>
    <a href="index.html#quiz">知识考核</a>
    <a href="about.html">关于本站</a>
  </div>`;
}

function footer() {
  return `  <!-- 页脚 -->
  <footer class="footer" id="footer">
    <div class="footer-top">
      <div class="footer-brand">
        <div class="footer-logo">
          ${STAR}
          <span>红色文化传播网</span>
        </div>
        <p>铭记历史，缅怀先烈。</p>
      </div>
      <div class="footer-col">
        <h4>走进历史</h4>
        <a href="heroes.html">英雄人物</a>
        <a href="places.html">红色地点</a>
        <a href="events.html">历史事件</a>
      </div>
      <div class="footer-col">
        <h4>学习更多</h4>
        <a href="index.html#quiz">知识考核</a>
        <a href="index.html#timeline">历史时间轴</a>
        <a href="red-literature.html">红色文学</a>
      </div>
      <div class="footer-col">
        <h4>关于本站</h4>
        <a href="about.html">关于与史料来源</a>
        <a href="contact.html">联系我们</a>
        <a href="faq.html">常见问题</a>
      </div>
    </div>
    <div class="footer-divider"></div>
    <div class="footer-bottom">
      <span class="footer-meta">本站点为红色文化宣传演示作品 · 铭记历史 · 缅怀先烈</span>
      <p class="ai-foot-note">本站部分配图为 AI 生成的「艺术再现」图像，非真实历史照片，请以权威史料为准。</p>
      <p class="icp-beian-note"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">ICP备案号：待填写</a> · <a href="https://www.beian.gov.cn/" target="_blank" rel="noopener">公网安备：待填写</a></p>
    </div>
  </footer>`;
}

function page(p, i) {
  const n = String(i + 1).padStart(2, "0");
  const total = String(PLACES.length).padStart(2, "0");
  const prev = PLACES[(i + PLACES.length - 1) % PLACES.length];
  const next = PLACES[(i + 1) % PLACES.length];
  const storiesHtml = p.stories
    .map(
      (s) =>
        `        <article class="story reveal">\n          <h3>${s.t}</h3>\n          <p>${s.p}</p>\n        </article>`
    )
    .join("\n\n");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${p.name}（${p.year}）—— ${p.epithet.replace(/"/g, "")}。红色文化传播网红色地点志。">
  <title>${p.name} · 红色地点 · 红色文化传播网</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="ai-assistant.css">
</head>
<body>

${nav()}

  <main>

    <!-- 页头 -->
    <section class="page-hero">
      <p class="kicker reveal">红色地点 · ${n} / ${total}</p>
      <h1 class="page-title reveal">${p.name}。</h1>
      <p class="page-tag reveal">${p.epithet}</p>
      <p class="page-sub reveal">${p.year} · ${p.region}</p>
    </section>

    <!-- 导语 -->
    <section class="bio-section">
      <p class="bio-lead reveal">${p.lead}</p>
${p.img ? `      <figure class="detail-figure reveal ${p.img.figureClass || ''}">\n        <img src="${p.img.src}" alt="${p.img.alt}" loading="lazy">\n${p.img.caption ? `        <figcaption>${p.img.caption}</figcaption>\n` : ''}      </figure>\n` : ""}    </section>

    <!-- 名句 -->
    <section class="quote-black">
      <blockquote class="quote-text reveal">「${p.quote}」</blockquote>
      <p class="quote-note reveal">${p.quoteNote}</p>
    </section>

    <!-- 历史现场 -->
    <section class="stories">
${storiesHtml}

        <article class="story story-legacy reveal">
          <p class="kicker sm">精神传承</p>
          <p class="story-legacy-text">${p.legacy}</p>
        </article>
    </section>

    <!-- 上一个 / 下一个 -->
    <nav class="person-nav" aria-label="地点切换">
      <a class="pn-link pn-prev" href="place-${prev.slug}.html">
        <span class="pn-kicker">← 上一个地点</span>
        <span class="pn-name">${prev.name}</span>
      </a>
      <a class="pn-mid" href="places.html">返回全部红色地点</a>
      <a class="pn-link pn-next" href="place-${next.slug}.html">
        <span class="pn-kicker">下一个地点 →</span>
        <span class="pn-name">${next.name}</span>
      </a>
    </nav>

  </main>

${footer()}

  <!-- 云能力 + 公共组件 -->
  <script src="script.js"></script>
  <script src="cloudbase-config.js"></script>
  <script src="auth-service.js"></script>
  <script src="account-ui.js"></script>
  <script src="ai-assistant.js"></script>
</body>
</html>
`;
}

PLACES.forEach((p) => { p.img = IMGS[p.slug]; });
PLACES.forEach((p, i) => {
  const file = `place-${p.slug}.html`;
  writeFileSync(file, page(p, i));
  console.log("wrote", file);
});
console.log("done:", PLACES.length, "pages");
