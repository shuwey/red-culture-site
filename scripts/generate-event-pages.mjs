// 历史事件详情页生成器：node generate-event-pages.mjs
// 在 red-culture-site/ 根目录产出 7 个 event-<slug>.html
// 模板结构（nav/footer/page）复刻 generate-place-pages.mjs，增补相关阅读互链与事件翻页闭环。
import { writeFileSync } from "node:fs";

const STAR =
  '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.26 6.87.6-5.2 4.51 1.53 6.72L12 16.9l-6.1 3.19 1.53-6.72-5.2-4.51 6.87-.6L12 2z" fill="#C8102E"/></svg>';

const EVENTS = [
  {
    slug: "yida",
    name: "中共一大",
    year: "1921 · 7",
    place: "上海 · 浙江嘉兴",
    epithet: "开天辟地 · 中国共产党宣告成立",
    lead:
      "1921 年 7 月 23 日，中国共产党第一次全国代表大会在上海法租界石库门召开。会议最后一天遭巡捕袭扰，代表们转移至嘉兴南湖的画舫上闭幕，宣告中国共产党正式成立——中国革命的面貌从此焕然一新。",
    img: { src: "assets/images/red-boat.jpg", alt: "晨雾中的嘉兴南湖红船" },
    quote: "作始也简，将毕也巨。",
    quoteNote: "—— 董必武题南湖革命纪念馆",
    stories: [
      {
        t: "石库门里的集结",
        p: "1921 年 7 月 23 日，13 位代表从各地汇聚上海法租界望志路 106 号（今兴业路 76 号），代表全国 50 多名党员出席大会，围绕党的名称、纲领和决议展开热烈讨论。",
      },
      {
        t: "南湖画舫闭幕",
        p: "会议进行中突遭法租界巡捕袭扰，代表们被迫转移。最后一天，他们登上嘉兴南湖的一艘画舫，在湖光苇影间通过党的第一个纲领和决议，宣告中国共产党正式成立。",
      },
      {
        t: "星火自此燎原",
        p: "从一条画舫上的 50 多名党员，到今天的世界第一大执政党，这一切始于 1921 年那个夏天。南湖红船，由此成为「红船精神」的永恒象征。",
      },
    ],
    legacy: "从 50 多名党员到今天的世界第一大执政党，一切始于那条画舫。",
    related: [
      { type: "hero", slug: "lidazhao", name: "李大钊", desc: "党的早期主要创始人之一" },
      { type: "place", slug: "nanhu", name: "嘉兴南湖", desc: "一大闭幕地，红船启航" },
    ],
  },
  {
    slug: "nanchang",
    name: "南昌起义",
    year: "1927 · 8 · 1",
    place: "江西南昌",
    epithet: "枪杆子里出政权 · 武装反抗第一枪",
    lead:
      "1927 年 8 月 1 日，周恩来、贺龙、叶挺、朱德、刘伯承等领导南昌起义，打响了武装反抗国民党反动派的第一枪，标志着中国共产党独立领导革命战争、创建人民军队的开端。",
    img: { src: "assets/images/card-events.jpg", alt: "黎明中的红旗海洋" },
    quote: "枪杆子里面出政权。",
    quoteNote: "—— 毛泽东，1927 年八七会议",
    stories: [
      {
        t: "危局中的抉择",
        p: "大革命失败后，共产党人认识到「须知政权是由枪杆子中取得的」。在严重的白色恐怖下，中共中央决定在南昌发动武装起义，以革命的武装反抗反革命的武装。",
      },
      {
        t: "凌晨的枪声",
        p: "8 月 1 日凌晨，起义部队向南昌城内的守敌发起猛烈进攻，经过数小时激战，全歼守敌，占领南昌城。旗帜第一次插上南昌城头。",
      },
      {
        t: "南下的火种",
        p: "起义胜利后部队南下广东，虽遭挫折，但保留下来的骨干辗转上了井冈山，成为红军的源头。8 月 1 日，后来被定为中国人民解放军建军节。",
      },
    ],
    legacy: "8 月 1 日，后来成为中国人民解放军建军节。",
    related: [
      { type: "place", slug: "jinggangshan", name: "井冈山", desc: "起义余部在此会师" },
      { type: "event", slug: "jinggangshan-huish", name: "井冈山会师", desc: "朱毛会师壮大红军" },
    ],
  },
  {
    slug: "jinggangshan-huish",
    name: "井冈山会师",
    year: "1928 · 4",
    place: "江西 · 井冈山",
    epithet: "朱毛会师 · 红军力量空前壮大",
    lead:
      "1928 年 4 月，朱德、陈毅率南昌起义余部与湘南农军抵达井冈山宁冈砻市，与毛泽东领导的秋收起义部队胜利会师，合编为工农革命军第四军（后称红四军）。",
    img: { src: "assets/images/hero-jinggangshan.jpg", alt: "井冈山群峰云海" },
    quote: "星星之火，可以燎原。",
    quoteNote: "—— 毛泽东，1930 年",
    stories: [
      {
        t: "文家市转兵",
        p: "秋收起义受挫后，毛泽东果断放弃攻打大城市，率部向罗霄山脉中段进军，在三湾改编把支部建在连上，1927 年 10 月抵达井冈山，建起第一个农村革命根据地。",
      },
      {
        t: "龙江桥头握手",
        p: "1928 年 4 月，朱德、陈毅率南昌起义余部与湘南农军来到宁冈砻市，与毛泽东部胜利会师。两双大手在龙江桥头紧握，合编为工农革命军第四军，朱德任军长、毛泽东任党代表。",
      },
      {
        t: "割据一方",
        p: "会师后红军连打胜仗，巩固并扩大了根据地，「农村包围城市、武装夺取政权」的道路越走越宽，井冈山成为中国革命的摇篮。",
      },
    ],
    legacy: "朱毛会师巩固了全国第一个农村革命根据地，为中国革命开辟新路。",
    related: [
      { type: "place", slug: "jinggangshan", name: "井冈山", desc: "第一个农村革命根据地" },
      { type: "event", slug: "nanchang", name: "南昌起义", desc: "会师部队的源头" },
    ],
  },
  {
    slug: "zunyi",
    name: "遵义会议",
    year: "1935 · 1",
    place: "贵州 · 遵义",
    epithet: "生死转折 · 党史上伟大转折点",
    lead:
      "1935 年 1 月 15 日至 17 日，中共中央政治局扩大会议在遵义召开，集中纠正「左」倾军事路线错误，事实上确立毛泽东在党中央和红军的领导地位。",
    img: { src: "assets/images/zunyi.jpg", alt: "遵义会议会址，木构小楼前红旗招展" },
    quote: "雄关漫道真如铁，而今迈步从头越。",
    quoteNote: "—— 毛泽东《忆秦娥·娄山关》",
    stories: [
      {
        t: "突破乌江",
        p: "1935 年 1 月初，红军强渡乌江天险，1 月 7 日智取遵义城，为随后召开的会议赢得难得的喘息窗口。",
      },
      {
        t: "三天会议",
        p: "会议在柏辉章公馆二楼召开，批判了军事指挥上的「左」倾错误，增选毛泽东为政治局常委，取消三人团，事实上确立了毛泽东在党中央和红军的领导地位。",
      },
      {
        t: "出奇兵",
        p: "会议之后，红军四渡赤水、巧渡金沙江，在几十万敌军缝隙间机动穿插，彻底跳出包围圈。遵义小楼里的抉择，在行军路线上一步步得到验证。",
      },
    ],
    legacy: "遵义会议在极端危急的关头挽救了党、挽救了红军、挽救了中国革命。",
    related: [
      { type: "place", slug: "zunyi", name: "遵义", desc: "会议召开地" },
      { type: "event", slug: "changzheng", name: "长征", desc: "转折之后的征途" },
    ],
  },
  {
    slug: "changzheng",
    name: "长征",
    year: "1934 — 1936",
    place: "横跨十一省",
    epithet: "二万五千里 · 人类史上的英雄史诗",
    lead:
      "1934 年 10 月，中央红军从江西瑞金等地出发，开始战略大转移。血战湘江、四渡赤水、巧渡金沙江、强渡大渡河、飞夺泸定桥、翻雪山过草地，1936 年 10 月三大主力在甘肃会宁会师，长征胜利结束。",
    img: { src: "assets/images/long-march.jpg", alt: "红军队伍在风雪夜沿雪山脊线行进" },
    quote: "红军不怕远征难，万水千山只等闲。",
    quoteNote: "—— 毛泽东《七律·长征》",
    stories: [
      {
        t: "战略转移",
        p: "第五次反「围剿」失败后，中央红军主力被迫撤离中央苏区，踏上漫漫征途。出发时 8.6 万余人，一路突破四道封锁线，付出了巨大牺牲。",
      },
      {
        t: "遵义转折",
        p: "1935 年 1 月遵义会议实现伟大转折，确立了正确的军事路线。此后红军声东击西、机动灵活，四渡赤水、巧渡金沙江，彻底摆脱数十万追兵。",
      },
      {
        t: "飞夺泸定桥",
        p: "1935 年 5 月 29 日，红四团昼夜奔袭二百四十里赶到桥头，二十二名突击队员冒着枪林弹雨攀着铁索冲向对岸，一举夺下<a href=\"place-luding.html\">泸定桥</a>，打开北上通道。",
      },
      {
        t: "会师会宁",
        p: "1936 年 10 月，红一、二、四方面军在甘肃会宁胜利会师，历时两年、行程二万五千余里的长征宣告结束，保存了党和红军的基干力量。",
      },
    ],
    legacy: "长征是宣言书，是宣传队，是播种机。",
    related: [
      { type: "place", slug: "luding", name: "泸定桥", desc: "飞夺泸定桥，打开北上通道" },
      { type: "place", slug: "zunyi", name: "遵义", desc: "转折之城" },
    ],
  },
  {
    slug: "kangzhan",
    name: "抗日战争胜利",
    year: "1945 · 9",
    place: "全国 · 世界反法西斯东方主战场",
    epithet: "近代以来反侵略第一次完全胜利",
    lead:
      "从九一八到日本投降，中华儿女进行了十四年浴血奋战。东北抗联、八路军、新四军与正面战场同仇敌忾，1945 年 8 月 15 日日本宣布无条件投降，9 月 3 日为抗战胜利纪念日。",
    img: { src: "assets/images/card-events.jpg", alt: "黎明中的红旗海洋" },
    quote: "我们中华民族有同自己的敌人血战到底的气概。",
    quoteNote: "—— 毛泽东《论反对日本帝国主义的策略》",
    stories: [
      {
        t: "白山黑水",
        p: "九一八事变后，东北抗日联军在冰天雪地中坚持游击战争。杨靖宇、赵一曼等英烈以血肉之躯抵御外侮，谱写了气壮山河的壮歌。",
      },
      {
        t: "中流砥柱",
        p: "全面抗战爆发后，中国共产党倡导并建立抗日民族统一战线，领导八路军、新四军深入敌后，开展游击战争，成为全民族抗战的中流砥柱。",
      },
      {
        t: "胜利时刻",
        p: "1945 年 8 月 15 日，日本天皇宣布无条件投降；9 月 2 日签署投降书。中国人民经过十四年浴血奋战，终于取得近代以来反抗外敌入侵的第一次完全胜利。",
      },
    ],
    legacy: "抗战胜利洗刷了百年民族屈辱，是中华民族走向复兴的转折点。",
    related: [
      { type: "hero", slug: "zhaoyiman", name: "赵一曼", desc: "东北抗日联军女政委" },
      { type: "hero", slug: "yangjingyu", name: "杨靖宇", desc: "东北抗日联军总司令" },
      { type: "place", slug: "yanan", name: "延安", desc: "抗战时期的革命中枢" },
    ],
  },
  {
    slug: "kaiquo",
    name: "开国大典",
    year: "1949 · 10 · 1",
    place: "北京 · 天安门",
    epithet: "中国人民从此站起来了",
    lead:
      "1949 年 10 月 1 日下午三时，开国大典在天安门广场举行。毛泽东庄严宣告中华人民共和国中央人民政府成立，三十万军民欢聚，五星红旗冉冉升起。",
    img: { src: "assets/images/detail-kaiquo.jpg", alt: "1949 年 10 月 1 日，毛泽东在天安门城楼宣告中华人民共和国中央人民政府成立（历史资料图）", caption: "1949 年 10 月 1 日，毛泽东主席在天安门城楼宣告中华人民共和国中央人民政府成立。（历史资料图 · 来源：Wikimedia Commons，公有领域）", kaiquo: true },
    quote: "中华人民共和国中央人民政府今天成立了！",
    quoteNote: "—— 毛泽东，1949 年 10 月 1 日",
    stories: [
      {
        t: "筹备新政协",
        p: "1949 年 9 月，中国人民政治协商会议第一届全体会议在北平召开，通过了《共同纲领》，选举产生了中央人民政府委员会，为开国大典作好准备。",
      },
      {
        t: "二十八响礼炮",
        p: "大典上五十四门礼炮齐鸣二十八响，象征中国共产党领导人民浴血奋战的二十八年。第一面五星红旗由毛泽东亲自按动电钮升起，《义勇军进行曲》响彻广场。",
      },
      {
        t: "升旗时刻",
        p: "毛泽东在天安门城楼上向全世界庄严宣告：「中华人民共和国中央人民政府今天成立了！」广场上欢声雷动，中国历史从此翻开崭新的一页。",
      },
    ],
    legacy: "新中国从这里站起来，中国历史掀开崭新一页。",
    related: [
      { type: "place", slug: "tiananmen", name: "天安门", desc: "开国大典举办地" },
      { type: "hero", slug: "dongcunrui", name: "董存瑞", desc: "解放战争的爆破英雄" },
    ],
  },
  {
    slug: "wusi",
    name: "五四运动",
    year: "1919 · 5",
    place: "北京 · 全国",
    epithet: "反帝反封建 · 新民主主义革命的开端",
    lead:
      "1919 年 5 月 4 日，北京青年学生发起反帝反封建的爱国运动，抗议巴黎和会上列强把德国在山东的权益转让给日本。运动迅速席卷全国，工人阶级开始以独立姿态登上政治舞台。五四运动是中国旧民主主义革命走向新民主主义革命的转折点，促进了马克思主义在中国的传播，为中国共产党的成立作了思想上干部上的准备。",
    img: { src: "assets/images/card-events.jpg", alt: "黎明中的红旗海洋" },
    quote: "外争主权，内除国贼。",
    quoteNote: "—— 五四运动时期口号",
    stories: [
      {
        t: "巴黎和会的刺激",
        p: "1919 年 1 月，第一次世界大战的战胜国在巴黎召开和会。中国作为战胜国提出废除「二十一条」、收回德国在山东的权益等正当要求，却被列强操纵把德国在山东的特权转交给日本。消息传回国内，群情激愤。",
      },
      {
        t: "天安门前的怒吼",
        p: "5 月 4 日下午，北京大学等校三千余名学生在天安门前集会游行，高呼「外争主权，内除国贼」「废除二十一条」等口号，要求严惩亲日派官僚。随后运动迅速蔓延至全国各大城市。",
      },
      {
        t: "工人阶级登上舞台",
        p: "6 月 5 日起，上海工人率先举行大规模罢工声援学生，随后工人罢工、商人罢市席卷二十多个省一百多个城市。中国工人阶级开始以独立的姿态登上政治舞台，成为运动的主力。",
      },
    ],
    legacy: "五四运动是中国旧民主主义革命走向新民主主义革命的转折点，促进了马克思主义在中国的传播。",
    related: [
      { type: "hero", slug: "lidazhao", name: "李大钊", desc: "新文化运动先驱，五四运动的思想旗手" },
      { type: "hero", slug: "yun-daiying", name: "恽代英", desc: "青年运动领袖，《中国青年》主编" },
      { type: "event", slug: "yida", name: "中共一大", desc: "五四运动为建党作了思想准备" },
    ],
  },
  {
    slug: "qiushou",
    name: "秋收起义",
    year: "1927 · 9",
    place: "湖南 · 江西边界",
    epithet: "枪杆子里出政权 · 进军井冈山",
    lead:
      "1927 年 9 月，毛泽东在湖南、江西边界领导发动秋收起义，打出「工农革命军」旗帜，攻占醴陵、浏阳等地。起义受挫后，毛泽东在文家市果断放弃攻打大城市，转向敌人统治薄弱的农村山区，并进行三湾改编，把支部建在连上；部队随后进军井冈山，点燃了「工农武装割据」的星星之火。",
    img: { src: "assets/images/hero-jinggangshan.jpg", alt: "井冈山群峰云海" },
    quote: "枪杆子里面出政权。",
    quoteNote: "—— 毛泽东，1927 年八七会议",
    stories: [
      {
        t: "八七会议定方针",
        p: "1927 年 8 月 7 日，中共中央在汉口召开紧急会议，确立土地革命和武装反抗国民党反动派的总方针。毛泽东提出「须知政权是由枪杆子中取得的」，会议还派出干部到各地发动秋收起义。",
      },
      {
        t: "湘赣边界举义旗",
        p: "9 月，毛泽东以中央特派员身份领导湘赣边界秋收起义，组成工农革命军第一军第一师，第一次打出自己的旗帜。起义军分路进攻醴陵、浏阳、平江等地，一度攻占部分县城，但很快遭到优势敌人反扑。",
      },
      {
        t: "文家市转兵与三湾改编",
        p: "起义受挫后，毛泽东在文家市主持召开前委会议，决定放弃攻打长沙，向敌人力量薄弱的井冈山进军；途中进行著名的三湾改编，把党支部建在连上，确立了党对军队的绝对领导。",
      },
    ],
    legacy: "秋收起义点燃了「工农武装割据」的星星之火，为井冈山革命根据地的创建拉开序幕。",
    related: [
      { type: "place", slug: "jinggangshan", name: "井冈山", desc: "秋收起义部队进军地，第一个农村革命根据地" },
      { type: "hero", slug: "qiu-qiubai", name: "瞿秋白", desc: "八七会议主持人，确立武装反抗总方针" },
      { type: "event", slug: "jinggangshan-huish", name: "井冈山会师", desc: "秋收起义余部在此会师壮大" },
    ],
  },
  {
    slug: "wayaobao",
    name: "瓦窑堡会议",
    year: "1935 · 12",
    place: "陕西 · 瓦窑堡",
    epithet: "抗日民族统一战线 · 政治路线转折",
    lead:
      "1935 年 12 月 17 日至 25 日，中共中央政治局在陕北瓦窑堡召开会议，批判了「左」倾关门主义，制定了建立抗日民族统一战线的策略方针，提出团结一切抗日力量，变「抗日反蒋」为「逼蒋抗日」。会议决议标志着党的政治路线由土地革命战争向抗日民族战争转变，为迎接全民族抗战作了重要准备。",
    img: { src: "assets/images/card-events.jpg", alt: "黎明中的红旗海洋" },
    quote: "停止内战，一致抗日。",
    quoteNote: "—— 瓦窑堡会议确定的方针",
    stories: [
      {
        t: "长征落脚陕北",
        p: "1935 年 10 月中央红军长征到达陕北；11 月中共中央机关进驻瓦窑堡。面对日本侵华步步紧逼、民族危机空前严重的形势，党亟需制定正确的政治路线。",
      },
      {
        t: "制定统战方针",
        p: "12 月 17 日至 25 日，瓦窑堡会议通过《关于目前政治形势与党的任务决议》，批判「左」倾关门主义，确定建立最广泛的抗日民族统一战线的策略，提出「停止内战，一致抗日」。",
      },
      {
        t: "迎接全民族抗战",
        p: "会议后，党把「抗日反蒋」调整为「逼蒋抗日」，推动西安事变和平解决，促成以国共合作为基础的抗日民族统一战线，为全面抗战爆发后的全民族抗战奠定政治基础。",
      },
    ],
    legacy: "瓦窑堡会议实现了党的政治路线从土地革命战争到抗日民族战争的转变。",
    related: [
      { type: "place", slug: "wayaobao", name: "瓦窑堡", desc: "瓦窑堡会议召开地" },
      { type: "hero", slug: "zuo-quan", name: "左权", desc: "抗战中牺牲的八路军高级将领" },
      { type: "event", slug: "quanmian-kangzhan", name: "全面抗战爆发", desc: "统战方针促成全民族抗战" },
    ],
  },
  {
    slug: "quanmian-kangzhan",
    name: "全面抗战爆发",
    year: "1937 · 7",
    place: "北平 · 卢沟桥",
    epithet: "七七事变 · 全民族抗战的开始",
    lead:
      "1937 年 7 月 7 日夜，日军在北平卢沟桥附近演习时借口士兵「失踪」，炮轰宛平城，发动七七事变（卢沟桥事变）。中国守军奋起抵抗，全面抗日战争由此爆发。9 月，以国共合作为基础的抗日民族统一战线正式形成，中国进入全民族抗战阶段。七七事变是中华民族由局部抗战走向全民族抗战的标志性事件。",
    img: { src: "assets/images/card-events.jpg", alt: "黎明中的红旗海洋" },
    quote: "平津危急！华北危急！中华民族危急！",
    quoteNote: "—— 1937 年中共中央通电",
    stories: [
      {
        t: "卢沟桥的枪声",
        p: "1937 年 7 月 7 日夜，日军在卢沟桥附近军事演习中借口一名士兵「失踪」，无理要求进入宛平城搜查，遭拒后炮轰宛平城。中国守军第二十九军奋起还击，全民族抗战的序幕就此拉开。",
      },
      {
        t: "国共合作抗日",
        p: "事变后，中国共产党通电全国号召全民族抗战，并促成国共第二次合作。9 月，国民党中央通讯社发表《中共中央为公布国共合作宣言》，以国共合作为基础的抗日民族统一战线正式形成。",
      },
      {
        t: "两种战场配合",
        p: "正面战场与敌后战场相互配合：国民党军队在正面战场组织淞沪、太原、徐州等会战，共产党领导的八路军、新四军深入敌后开展游击战争，形成共同抗日的局面。",
      },
    ],
    legacy: "七七事变标志着中国由局部抗战走向全民族抗战，中华民族空前团结御侮。",
    related: [
      { type: "hero", slug: "zhaoyiman", name: "赵一曼", desc: "东北抗日联军女政委" },
      { type: "hero", slug: "yangjingyu", name: "杨靖宇", desc: "东北抗日联军总司令" },
      { type: "place", slug: "yanan", name: "延安", desc: "抗战时期的革命中枢" },
    ],
  },
];

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
      <a href="index.html#footer">关于本站</a>
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
    <a href="index.html#footer">关于本站</a>
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
        <a href="index.html#themes">主题导览</a>
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
      <span>红色文化传播网 · 本站点为红色文化宣传演示作品</span>
      <span>铭记历史 · 缅怀先烈</span>
    </div>
  </footer>`;
}

function relatedHtml(items) {
  const cards = (items || [])
    .map((it) => {
      const href =
        it.type === "hero"
          ? `hero-${it.slug}.html`
          : it.type === "place"
          ? `place-${it.slug}.html`
          : `event-${it.slug}.html`;
      const kicker = it.type === "hero" ? "英雄人物" : it.type === "place" ? "红色地点" : "历史事件";
      return `        <a class="rcs-related-card reveal" href="${href}">
          <span class="kicker sm">${kicker}</span>
          <h3 class="rcs-related-name">${it.name}</h3>
          <p class="rcs-related-desc">${it.desc}</p>
          <span class="text-link sm">进一步了解 ›</span>
        </a>`;
    })
    .join("\n");
  return `    <!-- 相关阅读 -->
    <section class="rcs-related">
      <p class="kicker sm reveal">相关阅读</p>
      <h2 class="h2 reveal">沿着线索，继续探寻。</h2>
      <div class="rcs-related-grid">
${cards}
      </div>
    </section>`;
}

function page(e, i) {
  const n = String(i + 1).padStart(2, "0");
  const total = String(EVENTS.length).padStart(2, "0");
  const prev = EVENTS[(i + EVENTS.length - 1) % EVENTS.length];
  const next = EVENTS[(i + 1) % EVENTS.length];
  const storiesHtml = e.stories
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
  <meta name="description" content="${e.name}（${e.year}）—— ${e.epithet.replace(/"/g, "")}。红色文化传播网历史事件志。">
  <title>${e.name} · 历史事件 · 红色文化传播网</title>
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
      <p class="kicker reveal">历史事件 · ${n} / ${total}</p>
      <h1 class="page-title reveal">${e.name}。</h1>
      <p class="page-tag reveal">${e.epithet}</p>
      <p class="page-sub reveal">${e.year} · ${e.place}</p>
    </section>

    <!-- 导语 -->
    <section class="bio-section">
      <p class="bio-lead reveal">${e.lead}</p>
${e.img ? `      <figure class="detail-figure reveal${e.img.kaiquo ? ' detail-figure--kaiquo' : ''}">\n        <img src="${e.img.src}" alt="${e.img.alt}" loading="lazy">\n        ${e.img.caption ? `        <figcaption>${e.img.caption}</figcaption>\n` : ""}      </figure>\n` : ""}    </section>

    <!-- 名句 -->
    <section class="quote-black">
      <blockquote class="quote-text reveal">「${e.quote}」</blockquote>
      <p class="quote-note reveal">${e.quoteNote}</p>
    </section>

    <!-- 事件经过 -->
    <section class="stories">
${storiesHtml}

        <article class="story story-legacy reveal">
          <p class="kicker sm">历史意义</p>
          <p class="story-legacy-text">${e.legacy}</p>
        </article>
    </section>

${relatedHtml(e.related)}

    <!-- 上一个 / 下一个 -->
    <nav class="person-nav" aria-label="事件切换">
      <a class="pn-link pn-prev" href="event-${prev.slug}.html">
        <span class="pn-kicker">← 上一个事件</span>
        <span class="pn-name">${prev.name}</span>
      </a>
      <a class="pn-mid" href="events.html">返回全部历史事件</a>
      <a class="pn-link pn-next" href="event-${next.slug}.html">
        <span class="pn-kicker">下一个事件 →</span>
        <span class="pn-name">${next.name}</span>
      </a>
    </nav>

  </main>

${footer()}

  <!-- 云能力 + 公共组件 -->
  <script src="script.js"></script>
  <script src="https://imgcache.qq.com/qcloud/tcbjs/1.7.2/tcb.js"></script>
  <script src="cloudbase-config.js"></script>
  <script src="auth-service.js"></script>
  <script src="account-ui.js"></script>
  <script src="ai-assistant.js"></script>
</body>
</html>
`;
}

EVENTS.forEach((e, i) => {
  const file = `event-${e.slug}.html`;
  writeFileSync(file, page(e, i));
  console.log("wrote", file);
});
console.log("done:", EVENTS.length, "pages");
