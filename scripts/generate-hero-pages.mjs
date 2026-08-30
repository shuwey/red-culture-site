// 英雄人物详情页生成器：node generate-hero-pages.mjs
// 在 red-culture-site/ 根目录产出 14 个 hero-<slug>.html
import { writeFileSync } from "node:fs";

const STAR =
  '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.26 6.87.6-5.2 4.51 1.53 6.72L12 16.9l-6.1 3.19 1.53-6.72-5.2-4.51 6.87-.6L12 2z" fill="#C8102E"/></svg>';

const HEROES = [
  {
    slug: "lidazhao",
    name: "李大钊",
    years: "1889 — 1927",
    native: "河北乐亭",
    epithet: "播火者 · 中国最早的马克思主义传播者",
    lead:
      "李大钊，字守常，河北乐亭人。他是中国最早的马克思主义传播者、中国共产党主要创始人之一。在至暗年代，他把「铁肩担道义」作为一生的注脚，为中国播下了革命的火种。",
    quote: "铁肩担道义，妙手著文章。",
    quoteNote: "—— 李大钊书赠友人联语",
    stories: [
      {
        t: "传播马克思主义的先驱",
        p: "1918 年，他在《新青年》上发表《庶民的胜利》《布尔什维主义的胜利》，率先在中国礼赞十月革命；次年发表《我的马克思主义观》，系统介绍马克思主义学说，成为这一思想在中国传播的标志性文献。",
      },
      {
        t: "培养青年的导师",
        p: "任北京大学图书馆主任期间，他倾囊相助进步青年，把图书馆变成传播新思想的阵地。「南陈北李，相约建党」，他与陈独秀南北呼应，共同筹划了中国共产党的创建。",
      },
      {
        t: "慷慨就义",
        p: "1927 年 4 月 28 日，李大钊被奉系军阀处以绞刑。临刑前他从容不迫、第一个走上绞架，英勇就义，时年 38 岁。他预言的「青春之中国」，在此后的岁月里一步步成为现实。",
      },
    ],
    legacy: "他播下的火种，终成燎原之势。",
  },
  {
    slug: "fangzhimin",
    name: "方志敏",
    years: "1899 — 1935",
    native: "江西弋阳",
    epithet: "清贫本色 · 《可爱的中国》作者",
    lead:
      "方志敏，江西弋阳人，赣东北革命根据地和红十军的创建者。他身居要职而一生清贫，被俘时敌人从他身上只搜出一块怀表和一支钢笔，没有一枚铜板。",
    quote: "敌人只能砍下我们的头颅，决不能动摇我们的信仰！",
    quoteNote: "—— 方志敏狱中文稿",
    stories: [
      {
        t: "创建赣东北苏区",
        p: "1928 年初，他领导弋横起义，逐步创建起赣东北革命根据地，组建红十军，探索出被毛泽东称赞的「方志敏式」根据地道路，苏区被誉为「方志敏式的坚强苏区」。",
      },
      {
        t: "狱中的绝笔",
        p: "1935 年 1 月，红军北上抗日先遣队陷入重围，方志敏不幸被俘。在狱中半年多的时间里，他以敌人劝降的纸笔写下《可爱的中国》《清贫》等约十四万字文稿，描绘出他坚信必将到来的光明中国。",
      },
      {
        t: "就义",
        p: "1935 年 8 月 6 日，方志敏在南昌下沙窝英勇就义，时年 36 岁。刑场上，他昂首挺立，如同走向一次普通的行军。",
      },
    ],
    legacy: "《清贫》里那块怀表和钢笔，成了共产党人廉洁奉公最生动的教材。",
  },
  {
    slug: "zhaoyiman",
    name: "赵一曼",
    years: "1905 — 1936",
    native: "四川宜宾",
    epithet: "巾帼英雄 · 白山黑水间的抗联女政委",
    lead:
      "赵一曼，四川宜宾人，原名李坤泰。她告别尚在襁褓中的幼子远赴东北抗日，出任东北人民革命军第三军二团政委，珠河的乡亲们亲切地称她「我们的女政委」。",
    quote: "未惜头颅新故国，甘将热血沃中华。",
    quoteNote: "—— 赵一曼《滨江述怀》",
    stories: [
      {
        t: "从川南到白山黑水",
        p: "大革命失败后，她受党组织派遣奔赴东北，先在沈阳、哈尔滨领导工人反日斗争，后投身抗日游击战争，纵马持枪、驰骋于林海雪原之间。",
      },
      {
        t: "酷刑之下坚贞不屈",
        p: "1935 年 11 月，为掩护部队突围，她身负重伤被俘。日军对她施以长达数月的酷刑，用马鞭戳腿伤口、电刑轮番折磨，她始终没有吐露任何机密。",
      },
      {
        t: "写给儿子的绝笔",
        p: "1936 年 8 月 2 日，就义前她在开往珠河刑场的火车上给儿子写下绝笔信：「母亲不用千言万语来教育你，就用实行来教育你。」当日，她在珠河县小北门外英勇就义，时年 31 岁。",
      },
    ],
    legacy: "那封写给「宁儿」的绝笔信，今天陈列在博物馆里，读来仍令人动容。",
  },
  {
    slug: "yangjingyu",
    name: "杨靖宇",
    years: "1905 — 1940",
    native: "河南确山",
    epithet: "雪原忠魂 · 东北抗日联军总司令",
    lead:
      "杨靖宇，河南确山人，原名马尚德。他是东北抗日联军第一路军总司令兼政委，在冰天雪地中与日本侵略者周旋近十年，最后孤身一人战斗到生命的尽头。",
    quote: "我们中国人都投降了，还有中国吗？",
    quoteNote: "—— 杨靖宇对劝降者的回答",
    stories: [
      {
        t: "创建抗联一路军",
        p: "九一八事变后，他受党组织派遣奔赴东北，历任磐石游击队政委、东北人民革命军第一军军长，后任抗联第一路军总司令，在东南满的崇山峻岭间坚持抗日游击战争，令日军闻风丧胆。",
      },
      {
        t: "孤身战斗至最后一刻",
        p: "1940 年 2 月，在日军的重重围困与严密封锁下，他断粮多日、孤身一人，仍在濛江县三道崴子一带且战且走，直至 2 月 23 日壮烈殉国，时年 35 岁。",
      },
      {
        t: "胃里的草根棉絮",
        p: "敌人剖验他的遗体后发现，他的胃里没有一粒粮食，只有枯草、树皮和棉絮。连参与围剿的日军也不禁为之震撼与敬畏。",
      },
    ],
    legacy: "濛江县后来更名为靖宇县——以英雄之名，纪念不朽的忠魂。",
  },
  {
    slug: "liuhulan",
    name: "刘胡兰",
    years: "1932 — 1947",
    native: "山西文水",
    epithet: "生的伟大 · 死的光荣",
    lead:
      "刘胡兰，山西文水县云周西村人。十岁参加儿童团，十四岁成为中国共产党候补党员，十五岁面对敌人的铡刀慷慨就义，是全国已知革命烈士中年龄最小的共产党员之一。",
    quote: "怕死不当共产党！",
    quoteNote: "—— 刘胡兰就义前的回答",
    stories: [
      {
        t: "云周西村的小战士",
        p: "抗日战争时期，她在村里参加儿童团，站岗放哨、掩护八路军干部；抗战胜利后投身土地改革运动，发动群众支援前线，很快成长为村里最年轻的骨干。",
      },
      {
        t: "铡刀面前不低头",
        p: "1947 年 1 月 12 日，因叛徒出卖，她被阎锡山部队抓捕。敌人当着她的面铡死六位民兵威逼她「自白」，她斩钉截铁地回绝，昂首走向铡刀，壮烈牺牲，年仅 15 岁。",
      },
      {
        t: "领袖题词",
        p: "毛泽东得知她的事迹后，挥笔写下「生的伟大，死的光荣」。短短八字，成为这个十五岁生命最庄重的注脚。",
      },
    ],
    legacy: "十五岁的生命，定格成一座精神的丰碑。",
  },
  {
    slug: "dongcunrui",
    name: "董存瑞",
    years: "1929 — 1948",
    native: "河北怀来",
    epithet: "舍身为国 · 用身体做支架的爆破英雄",
    lead:
      "董存瑞，河北怀来人。十六岁参加八路军，作战机智勇敢，多次立功受奖。解放隆化的战斗中，他用十九岁的生命为部队炸开了一条通向胜利的路。",
    quote: "为了新中国，前进！",
    quoteNote: "—— 电影《董存瑞》中的经典呐喊",
    stories: [
      {
        t: "从儿童团长到爆破英雄",
        p: "他十三岁就担任儿童团团长，掩护区委书记躲过日军搜捕；十六岁参加八路军，先后立三次大功、四次小功，获三枚勇敢奖章和一枚毛泽东奖章。",
      },
      {
        t: "隆化战斗",
        p: "1948 年 5 月 25 日，解放隆化的战斗打响。部队冲锋被一座伪装的桥型暗堡火力死死压制，伤亡不断增加。他挺身而出：「我是共产党员，请准许我去！」",
      },
      {
        t: "举起炸药包的那一刻",
        p: "他冲到桥下，却发现光滑的桥身无处安放炸药包。总攻号角吹响的瞬间，他毅然用手托起炸药包顶住桥底，拉燃导火索，高喊口号，壮烈牺牲，年仅 19 岁。",
      },
    ],
    legacy: "「为了新中国，前进！」——这声呐喊穿越七十余年，依然滚烫。",
  },
  {
    slug: "jiangzhujun",
    name: "江竹筠",
    years: "1920 — 1949",
    native: "四川自贡",
    epithet: "红岩傲雪 · 人们叫她「江姐」",
    lead:
      "江竹筠，四川自贡人。长期在重庆从事地下工作，丈夫彭咏梧牺牲后，她强忍悲痛接替丈夫的工作继续战斗。难友们和后人们，都亲切地称她「江姐」。",
    quote: "竹签子是竹子做的，共产党员的意志是钢铁！",
    quoteNote: "—— 江姐在渣滓洞狱中的话语",
    stories: [
      {
        t: "隐蔽战线上的坚守",
        p: "她化名辗转重庆等地，负责地下市委机关和《挺进报》的组织联络工作，在白色恐怖中建立起可靠的秘密交通线，像一根看不见的针，把散落的线穿在一起。",
      },
      {
        t: "渣滓洞的铁骨",
        p: "1948 年 6 月，因叛徒出卖她被捕，关押于重庆渣滓洞监狱。面对竹签钉手指等种种酷刑，她宁死不屈。难友们敬称她是「中华儿女革命的典型」。",
      },
      {
        t: "黎明前的牺牲",
        p: "1949 年 11 月 14 日，重庆解放前夕，她与三十余位难友被杀害于歌乐山电台岚垭刑场，时年 29 岁。十六天后，重庆迎来解放。",
      },
    ],
    legacy: "她没能看到黎明，但她坚信的黎明，如约而至。",
  },
  {
    slug: "qiushaoyun",
    name: "邱少云",
    years: "1926 — 1952",
    native: "四川铜梁",
    epithet: "烈火中永生 · 纪律重于生命的战士",
    lead:
      "邱少云，四川铜梁人，中国人民志愿军第十五军二十九师八十七团九连战士。在朝鲜战场上，他用生命回答了什么是「纪律重于生命」。",
    quote: "宁愿自己牺牲，决不暴露目标。",
    quoteNote: "—— 邱少云入党申请书中写下的话",
    stories: [
      {
        t: "跨过鸭绿江",
        p: "1951 年 3 月，他随部队入朝参战。平康前线反击 391 高地作战前，他向党支部递交了入党申请书，写下这句誓言，并接受了最艰巨的潜伏任务。",
      },
      {
        t: "烈火中的坚守",
        p: "1952 年 10 月 12 日夜，五百余名战士潜伏在敌军阵地前沿的草丛中。敌机投下的燃烧弹落在他身旁，飞迸的火星溅上他的棉衣。为了不暴露全连目标，他咬紧牙关一动不动，直至壮烈牺牲，时年 26 岁。",
      },
      {
        t: "特等功臣",
        p: "当晚反击战胜利，391 高地飘扬起红旗。战后，邱少云被追记特等功，授予「一级英雄」称号，朝鲜方面亦授予他英雄称号和金星奖章。他所在连队至今保留着「邱少云连」的番号。",
      },
    ],
    legacy: "上甘岭的松柏常青，烈火中永生的名字永存。",
  },
  {
    slug: "yun-daiying",
    name: "恽代英",
    years: "1895 — 1931",
    native: "江苏常州",
    epithet: "青年领袖 · 中国青年运动的先驱",
    lead:
      "恽代英，江苏常州人，中国共产党早期领导人之一，杰出的青年运动领袖。他创办和主编《中国青年》，以犀利文字唤醒无数青年投身革命，被誉为「中国革命青年的楷模」。",
    quote: "已摈忧患寻常事，留得豪情作楚囚。",
    quoteNote: "—— 恽代英《狱中诗》",
    stories: [
      {
        t: "唤起青年的笔",
        p: "他主编《中国青年》，撰写大量通俗易懂、犀利有力的文章，引导青年树立正确的人生观与家国情怀，成为一代青年精神上的引路人。",
      },
      {
        t: "武装斗争的闯将",
        p: "大革命失败后，他参与领导南昌起义和广州起义，在血与火中探索武装反抗国民党反动派的道路，从书生成长为坚定的革命战士。",
      },
      {
        t: "从容就义",
        p: "1930 年恽代英在上海被捕，次年 4 月 29 日在南京英勇就义，时年 36 岁。就义前他留下豪情满怀的诗句，正气凛然。",
      },
    ],
    legacy: "他点燃的火种，在无数青年心中化作改天换地的力量。",
  },
  {
    slug: "qiu-qiubai",
    name: "瞿秋白",
    years: "1899 — 1935",
    native: "江苏常州",
    epithet: "文献巨子 · 党早期主要领导人",
    lead:
      "瞿秋白，江苏常州人，中国共产党早期主要领导人之一，卓越的马克思主义理论家、文学家和翻译家。他译介大量苏俄文学与革命著作，为中国革命提供思想滋养。",
    quote: "为大家辟一条光明的路。",
    quoteNote: "—— 瞿秋白",
    stories: [
      {
        t: "传播真理的译笔",
        p: "他是最早系统译介俄语文学与马克思主义文献的先驱之一，将《国际歌》等作品译介到中国，让革命的旋律在神州回响。",
      },
      {
        t: "危局中的担当",
        p: "1927 年大革命失败后的八七会议上，他批判右倾错误，确定土地革命和武装反抗国民党反动派的总方针，临危受命主持党中央工作。",
      },
      {
        t: "从容赴死",
        p: "1934 年中央红军长征后他留守苏区，次年 2 月在转移途中被俘，6 月 18 日在福建长汀高唱《国际歌》从容就义，时年 36 岁。",
      },
    ],
    legacy: "他留下的译著与文章，至今仍是宝贵的精神财富。",
  },
  {
    slug: "zuo-quan",
    name: "左权",
    years: "1905 — 1942",
    native: "湖南醴陵",
    epithet: "八路军副参谋长 · 抗战殉国的将星",
    lead:
      "左权，湖南醴陵人，黄埔一期毕业，后赴苏联学习军事。抗日战争中任八路军副参谋长、前方总部参谋长，协助指挥华北抗战，是抗战中牺牲的八路军最高级别将领。",
    quote: "愿拼热血卫吾华。",
    quoteNote: "—— 朱德《吊左权同志》（挽诗）",
    stories: [
      {
        t: "从黄埔到伏龙芝",
        p: "他考入黄埔一期，后赴莫斯科中山大学、伏龙芝军事学院深造，学成归国后成为红军中难得的军事人才，能征善谋。",
      },
      {
        t: "太行山上",
        p: "抗战爆发后他任八路军副参谋长，与朱德、彭德怀并肩战斗，开辟太行山抗日根据地，参与指挥百团大战等重大作战。",
      },
      {
        t: "十字岭殉国",
        p: "1942 年 5 月日军对太行根据地大「扫荡」，他在山西辽县十字岭指挥部队突围时身负重伤，壮烈殉国，时年 37 岁，辽县后改名左权县以志纪念。",
      },
    ],
    legacy: "太行浩气传千古，清漳河畔铭记将军。",
  },
  {
    slug: "peng-xuefeng",
    name: "彭雪枫",
    years: "1907 — 1944",
    native: "河南镇平",
    epithet: "儒将本色 · 新四军第四师师长",
    lead:
      "彭雪枫，河南镇平人，中国工农红军和新四军高级将领。他创建并领导新四军第四师，开辟豫皖苏抗日根据地，军政兼优，深受军民爱戴。",
    quote: "对党要忠实，对人民要热爱。",
    quoteNote: "—— 彭雪枫",
    stories: [
      {
        t: "文武双全的指挥员",
        p: "他既善做政治工作，又精通军事指挥，从红军时期到新四军时期屡建战功，以儒将风范著称，所部纪律严明、士气高昂。",
      },
      {
        t: "驰骋豫皖苏",
        p: "他率部东进，创建并巩固豫皖苏抗日根据地，组建令敌闻风丧胆的骑兵团，在平原水网地带开创了游击战争的新局面。",
      },
      {
        t: "将星陨落",
        p: "1944 年 9 月，在指挥收复河南夏邑八里庄的战斗中他不幸中流弹牺牲，时年 37 岁。毛泽东等题挽：「功垂祖国，泽被长淮」。",
      },
    ],
    legacy: "「功垂祖国，泽被长淮」——人民永远怀念这位儒将。",
  },
  {
    slug: "zhang-side",
    name: "张思德",
    years: "1915 — 1944",
    native: "四川仪陇",
    epithet: "为人民服务 · 普通战士的不普通",
    lead:
      "张思德，四川仪陇人，中共中央警备团战士。他参加过长征，作战勇敢，一贯吃苦耐劳、服从组织需要，1944 年因炭窑塌方为救战友牺牲。",
    quote: "我们这个队伍完全是为着解放人民的，是彻底地为人民的利益工作的。",
    quoteNote: "—— 毛泽东《为人民服务》",
    stories: [
      {
        t: "长征中的硬骨头",
        p: "他随红四方面军参加长征，两次翻雪山过草地，作战勇敢、工作踏实，多次出色完成任务，从不叫苦叫累。",
      },
      {
        t: "哪里需要去哪里",
        p: "当过班长也乐意当战士，组织让去烧炭就去烧炭。他常说：「班长和战士职责不同，但都是为党工作。」",
      },
      {
        t: "炭窑前的牺牲",
        p: "1944 年 9 月 5 日，在陕北安塞烧炭时炭窑突然塌方，他奋力将战友推出窑外，自己不幸牺牲，时年 29 岁。",
      },
    ],
    legacy: "毛泽东发表《为人民服务》，让他的名字与「为人民服务」一同铭刻人心。",
  },
  {
    slug: "huang-jiguang",
    name: "黄继光",
    years: "1931 — 1952",
    native: "四川中江",
    epithet: "特级英雄 · 用胸膛堵住枪眼",
    lead:
      "黄继光，四川中江人，中国人民志愿军第十五军四十五师一三五团二营通信员。上甘岭战役中，他用胸膛堵住敌地堡机枪射孔，为部队冲锋扫清障碍，壮烈牺牲。",
    quote: "让祖国人民听我们胜利的消息吧！",
    quoteNote: "—— 黄继光（战前寄语）",
    stories: [
      {
        t: "祖国的召唤",
        p: "1951 年他报名参军，成为志愿军战士，跨过鸭绿江奔赴抗美援朝前线，在训练中刻苦，在战斗中勇敢。",
      },
      {
        t: "上甘岭的决然一扑",
        p: "1952 年 10 月 20 日，部队进攻被敌中心地堡火力压制，他身负重伤、手雷用尽，毅然扑向射孔，用胸膛堵住机枪枪眼，为冲锋打开通路。",
      },
      {
        t: "特级英雄",
        p: "战后他被追记特等功、授「特级英雄」称号。上甘岭的硝烟散去，那纵身一扑化作永恒的雕像。",
      },
    ],
    legacy: "他用二十一岁的生命，诠释了什么是舍生忘死、保家卫国。",
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

// 每位人物的意境配图（不用人物肖像，用与其精神相关的场景意象）
const IMGS = {
  lidazhao: { pair: [
    { src: "assets/images/lidazhao-portrait.jpg?v=20260830i", alt: "李大钊任北京大学图书馆主任时的肖像" },
    { src: "assets/images/lidazhao-signed.png?v=20260830i", alt: "1920 年李大钊题赠同志的签名照" },
  ], caption: "李大钊历史照片 · 左：北京大学图书馆主任肖像（1917）· 公有领域 / Wikimedia Commons（File:李大釗.jpg）；右：1920 年题赠同志签名照 · 公有领域 / Wikimedia Commons（File:李大钊.png）" },
  fangzhimin: { pair: [
    { src: "assets/images/fangzhimin-portrait.jpg?v=20260830g", alt: "方志敏肖像" },
    { src: "assets/images/fangzhimin-manuscript.jpg?v=20260830g", alt: "《可爱的中国》手稿" },
  ], caption: "方志敏历史照片与手稿 · 左：肖像；右：《可爱的中国》手稿 · 公有领域 / Wikimedia Commons" },
  zhaoyiman: { pair: [
    { src: "assets/images/zhaoyiman-portrait.jpg?v=20260830g", alt: "赵一曼肖像" },
    { src: "assets/images/zhaoyiman-letter.jpg?v=20260830g", alt: "赵一曼写给儿子的遗书" },
  ], caption: "赵一曼历史照片与遗书 · 左：肖像；右：写给儿子的遗书 · 公有领域 / Wikimedia Commons" },
  yangjingyu: { pair: [
    { src: "assets/images/yangjingyu-portrait.jpg?v=20260830g", alt: "杨靖宇肖像" },
    { src: "assets/images/yangjingyu-relic.jpg?v=20260830g", alt: "杨靖宇在哈尔滨做地下工作时用过的褥子" },
  ], caption: "杨靖宇历史照片与遗物 · 左：肖像；右：哈尔滨地下工作时用过的褥子 · 左为公有领域 / 右为 Huanokinhejo / Wikimedia Commons（CC BY-SA 4.0）" },
  liuhulan: { pair: [
    { src: "assets/images/liuhulan-cemetery.jpg?v=20260830g", alt: "刘胡兰烈士陵园（1962）" },
    { src: "assets/images/liuhulan-home.png?v=20260830g", alt: "刘胡兰家（1952）" },
  ], caption: "刘胡兰历史影像 · 左：烈士陵园（1962）；右：刘胡兰家（1952）· 公有领域（《人民画报》） / Wikimedia Commons" },
  jiangzhujun: { pair: [
    { src: "assets/images/jiangzhujun-letter.jpg?v=20260830g", alt: "江竹筠狱中家书" },
    { src: "assets/images/jiangzhujun-residence.jpg?v=20260830g", alt: "江竹筠故居" },
  ], caption: "江竹筠（江姐）狱中家书与故居 · 左：狱中致亲友信；右：自贡江姐故居 · 左为公有领域 / 右为 N509FZ / Wikimedia Commons（CC BY-SA 4.0）" },
  qiushaoyun: { pair: [
    { src: "assets/images/qiushaoyun-portrait.png?v=20260830g", alt: "邱少云肖像" },
    { src: "assets/images/qiushaoyun-clothes.jpg?v=20260830g", alt: "邱少云烈士牺牲后残存的棉衣" },
  ], caption: "邱少云历史照片与遗物 · 左：肖像；右：牺牲后残存的棉衣 · 左为公有领域 / 右为 N509FZ / Wikimedia Commons（CC BY-SA 4.0）" },
};

function page(h, i) {
  const n = String(i + 1).padStart(2, "0");
  const total = String(HEROES.length).padStart(2, "0");
  const prev = HEROES[(i + HEROES.length - 1) % HEROES.length];
  const next = HEROES[(i + 1) % HEROES.length];
  const storiesHtml = h.stories
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
  <meta name="description" content="${h.name}（${h.years}）—— ${h.epithet.replace(/"/g, "")}。红色文化传播网英雄人物志。">
  <title>${h.name} · 英雄人物 · 红色文化传播网</title>
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
      <p class="kicker reveal">英雄人物 · ${n} / ${total}</p>
      <h1 class="page-title reveal">${h.name}。</h1>
      <p class="page-tag reveal">${h.epithet}</p>
      <p class="page-sub reveal">${h.years} · ${h.native}</p>
    </section>

    <!-- 生平导语 -->
    <section class="bio-section">
      <p class="bio-lead reveal">${h.lead}</p>
${h.img ? (h.img.pair ? `      <figure class="detail-figure detail-figure--portrait-pair reveal">\n        <img src="${h.img.pair[0].src}" alt="${h.img.pair[0].alt}" loading="lazy">\n        <img src="${h.img.pair[1].src}" alt="${h.img.pair[1].alt}" loading="lazy">\n        <figcaption>${h.img.caption}</figcaption>\n      </figure>\n` : `      <figure class="detail-figure reveal">\n        <img src="${h.img.src}" alt="${h.img.alt}" loading="lazy">\n      </figure>\n`) : ""}    </section>

    <!-- 名言 -->
    <section class="quote-black">
      <blockquote class="quote-text reveal">「${h.quote}」</blockquote>
      <p class="quote-note reveal">${h.quoteNote}</p>
    </section>

    <!-- 生平事迹 -->
    <section class="stories">
${storiesHtml}

        <article class="story story-legacy reveal">
          <p class="kicker sm">纪念与传承</p>
          <p class="story-legacy-text">${h.legacy}</p>
        </article>
    </section>

    <!-- 上一位 / 下一位 -->
    <nav class="person-nav" aria-label="人物切换">
      <a class="pn-link pn-prev" href="hero-${prev.slug}.html">
        <span class="pn-kicker">← 上一位</span>
        <span class="pn-name">${prev.name}</span>
      </a>
      <a class="pn-mid" href="heroes.html">返回全部英雄人物</a>
      <a class="pn-link pn-next" href="hero-${next.slug}.html">
        <span class="pn-kicker">下一位 →</span>
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

HEROES.forEach((h) => { h.img = IMGS[h.slug]; });
HEROES.forEach((h, i) => {
  const file = `hero-${h.slug}.html`;
  writeFileSync(file, page(h, i));
  console.log("wrote", file);
});
console.log("done:", HEROES.length, "pages");
