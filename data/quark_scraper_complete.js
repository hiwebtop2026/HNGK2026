(function() {
  'use strict';

  const CONFIG = {
    years: [2025, 2024, 2023],
    province: '海南',
    batch: '本科批',
    genre: '综合',
    delayBetweenSchools: 8000,
    delayBetweenYears: 5000,
    maxSchools: 0,
    pageLoadWait: 8000,
    maxLoadWait: 20000,
  };

  const SCHOOLS = [
    "三亚学院", "三峡大学", "三峡大学科技学院", "三明学院", "上海中侨职业技术大学",
    "上海交通大学", "上海交通大学医学院", "上海体育大学", "上海健康医学院",
    "上海商学院", "上海外国语大学", "上海外国语大学贤达经济人文学院",
    "上海对外经贸大学", "上海工程技术大学", "上海师范大学", "上海师范大学天华学院",
    "上海建桥学院", "上海政法学院", "上海杉达学院", "上海海事大学", "上海海关学院",
    "上海海洋大学", "上海理工大学", "上海电力大学", "上海电机学院",
    "上海立信会计金融学院", "上海立达学院", "上海第二工业大学", "上海财经大学",
    "上海财经大学浙江学院", "上饶师范学院", "东北农业大学", "东北大学",
    "东北大学秦皇岛分校", "东北师范大学", "东北林业大学", "东北电力大学",
    "东北石油大学", "东北财经大学", "东华大学", "东华理工大学", "东南大学",
    "东莞城市学院", "东莞理工学院", "中北大学", "中南大学", "中南林业科技大学",
    "中南林业科技大学涉外学院", "中南民族大学", "中南财经政法大学", "中原工学院",
    "中原科技学院", "中国人民公安大学", "中国人民大学", "中国人民警察大学",
    "中国传媒大学", "中国农业大学", "中国劳动关系学院", "中国医科大学",
    "中国地质大学", "中国政法大学", "中国民用航空飞行学院", "中国民航大学",
    "中国海洋大学", "中国石油大学", "中国石油大学克拉玛依校区", "中国矿业大学",
    "中国科学技术大学", "中国药科大学", "中国计量大学", "中央民族大学",
    "中央美术学院", "中央财经大学", "中山大学", "丽江文化旅游学院", "乐山师范学院",
    "九江学院", "云南中医药大学", "云南农业大学", "云南大学", "云南大学滇池学院",
    "云南工商学院", "云南师范大学", "云南民族大学", "云南经济管理学院",
    "云南警官学院", "云南财经大学", "五邑大学", "井冈山大学", "仰恩大学",
    "仲恺农业工程学院", "伊犁师范大学", "佛山大学", "佛山科学技术学院",
    "佳木斯大学", "保定学院", "保定理工学院", "信阳农林学院", "信阳学院",
    "信阳师范大学", "六盘水师范学院", "兰州交通大学", "兰州信息科技学院",
    "兰州博文科技学院", "兰州城市学院", "兰州大学", "兰州工商学院", "兰州文理学院",
    "兰州理工大学", "兰州石化职业技术大学", "兰州财经大学", "兴义民族师范学院",
    "内江师范学院", "内蒙古农业大学", "内蒙古医科大学", "内蒙古大学",
    "内蒙古工业大学", "内蒙古师范大学", "内蒙古民族大学", "内蒙古科技大学",
    "内蒙古财经大学", "凯里学院", "北京中医药大学", "北京中医药大学东方学院",
    "北京交通大学", "北京体育大学", "北京信息科技大学", "北京化工大学",
    "北京印刷学院", "北京城市学院", "北京外国语大学", "北京大学", "北京大学医学部",
    "北京工业大学", "北京工业大学耿丹学院", "北京工商大学", "北京工商大学嘉华学院",
    "北京师范大学", "北京师范大学-香港浸会大学联合国际学院", "北京建筑大学",
    "北京林业大学", "北京物资学院", "北京理工大学", "北京理工大学珠海学院",
    "北京石油化工学院", "北京科技大学", "北京科技大学天津学院", "北京第二外国语学院",
    "北京第二外国语学院中瑞酒店管理学院", "北京联合大学", "北京航空航天大学",
    "北京语言大学", "北京邮电大学", "北京邮电大学世纪学院", "北京金融科技学院",
    "北华大学", "北华航天工业学院", "北师香港浸会大学", "北方工业大学",
    "北方民族大学", "北海艺术设计学院", "北部湾大学", "华东交通大学",
    "华东师范大学", "华东政法大学", "华东理工大学", "华中农业大学", "华中师范大学",
    "华中科技大学", "华侨大学", "华北水利水电大学", "华北理工大学",
    "华北理工大学冀唐学院", "华北理工大学轻工学院", "华北电力大学", "华北科技学院",
    "华南农业大学", "华南农业大学珠江学院", "华南师范大学", "华南理工大学",
    "南京信息工程大学", "南京农业大学", "南京医科大学", "南京大学", "南京审计大学",
    "南京审计大学金审学院", "南京工业大学", "南京工程学院", "南京师范大学",
    "南京师范大学泰州学院", "南京林业大学", "南京特殊教育师范学院", "南京理工大学",
    "南京理工大学泰州科技学院", "南京航空航天大学", "南京航空航天大学金城学院",
    "南京艺术学院", "南京财经大学", "南京邮电大学", "南京邮电大学通达学院",
    "南华大学", "南华大学船山学院", "南宁学院", "南宁师范大学", "南宁师范大学师园学院",
    "南宁理工学院", "南宁职业技术大学", "南开大学", "南方医科大学", "南昌交通学院",
    "南昌医学院", "南昌大学", "南昌大学共青学院", "南昌大学科学技术学院",
    "南昌工学院", "南昌工程学院", "南昌师范学院", "南昌理工学院", "南昌职业大学",
    "南昌航空大学", "南昌航空大学科技学院", "南通大学", "南阳师范学院", "南阳理工学院",
    "厦门医学院", "厦门华厦学院", "厦门大学", "厦门大学嘉庚学院", "厦门工学院",
    "厦门理工学院", "右江民族医学院", "合肥城市学院", "合肥大学", "合肥学院",
    "合肥工业大学", "吉利学院", "吉林农业科技学院", "吉林动画学院", "吉林医药学院",
    "吉林外国语大学", "吉林大学", "吉林工商学院", "吉林工程技术师范学院",
    "吉林师范大学", "吉林师范大学博达学院", "吉林建筑大学", "吉林建筑科技学院",
    "吉林财经大学", "吉首大学", "同济大学", "吕梁学院", "咸阳师范学院",
    "哈尔滨医科大学", "哈尔滨华德学院", "哈尔滨商业大学", "哈尔滨学院",
    "哈尔滨工业大学", "哈尔滨工程大学", "哈尔滨师范大学", "哈尔滨理工大学",
    "哈尔滨石油学院", "哈尔滨金融学院", "唐山师范学院", "商丘学院", "商丘工学院",
    "商洛学院", "喀什大学", "嘉兴南湖学院", "嘉兴大学", "嘉兴学院", "嘉应学院",
    "四川传媒学院", "四川农业大学", "四川外国语大学", "四川外国语大学成都学院",
    "四川大学", "四川大学锦江学院", "四川工商学院", "四川工程职业技术大学",
    "四川师范大学", "四川文理学院", "四川旅游学院", "四川民族学院", "四川美术学院",
    "四川轻化工大学", "四川音乐学院", "塔里木大学", "复旦大学", "复旦大学医学院",
    "大理大学", "大连东软信息学院", "大连交通大学", "大连医科大学", "大连外国语大学",
    "大连大学", "大连工业大学艺术与信息工程学院", "大连民族大学", "大连海事大学",
    "大连海洋大学", "大连理工大学", "大连科技学院", "大连财经学院", "天水师范大学",
    "天水师范学院", "天津中医药大学", "天津仁爱学院", "天津农学院", "天津医科大学",
    "天津商业大学", "天津商业大学宝德学院", "天津城建大学", "天津外国语大学",
    "天津外国语大学滨海外事学院", "天津大学", "天津天狮学院", "天津工业大学",
    "天津师范大学", "天津理工大学", "天津理工大学中环信息学院", "天津科技大学",
    "天津职业技术师范大学", "天津财经大学", "天津财经大学珠江学院", "太原学院",
    "太原工业学院", "太原师范学院", "太原理工大学", "太原科技大学", "宁夏大学",
    "宁夏师范大学", "宁夏师范学院", "宁波大学", "宁波诺丁汉大学", "宁波财经学院",
    "安庆师范大学", "安徽农业大学", "安徽医科大学", "安徽大学", "安徽师范大学",
    "安徽建筑大学", "安徽新华学院", "安徽理工大学", "安徽财经大学", "安阳学院",
    "安阳工学院", "安顺学院", "宜宾学院", "宜春学院", "宝鸡文理学院",
    "对外经济贸易大学", "山东中医药大学", "山东交通学院", "山东农业大学",
    "山东协和学院", "山东大学", "山东大学威海分校", "山东工商学院", "山东师范大学",
    "山东建筑大学", "山东理工大学", "山东科技大学", "山东第一医科大学",
    "山东第二医科大学", "山东航空学院", "山东英才学院", "山东财经大学",
    "山西中医药大学", "山西传媒学院", "山西农业大学", "山西医科大学", "山西大同大学",
    "山西大学", "山西工学院", "山西工程技术学院", "山西师范大学", "山西晋中理工学院",
    "山西科技学院", "山西财经大学", "岭南师范学院", "岳阳学院", "川北医学院",
    "常州大学", "常州大学怀德学院", "常德学院", "常熟理工学院", "平顶山学院",
    "广东东软学院", "广东医科大学", "广东培正学院", "广东外语外贸大学",
    "广东外语外贸大学南国商学院", "广东工业大学", "广东工商职业技术大学",
    "广东技术师范大学", "广东海洋大学", "广东理工学院", "广东白云学院",
    "广东石油化工学院", "广东科技学院", "广东第二师范学院", "广东药科大学",
    "广东警官学院", "广东财经大学", "广东轻工职业技术大学", "广东金融学院",
    "广州中医药大学", "广州体育学院", "广州医科大学", "广州华商学院", "广州华立学院",
    "广州南方学院", "广州商学院", "广州城市理工学院", "广州大学", "广州工商学院",
    "广州应用科技学院", "广州新华学院", "广州理工学院", "广州科技职业技术大学",
    "广州航海学院", "广州软件学院", "广西中医药大学", "广西中医药大学赛恩斯新医药学院",
    "广西医科大学", "广西城市职业大学", "广西外国语学院", "广西大学", "广西师范大学",
    "广西民族大学", "广西民族大学相思湖学院", "广西民族师范学院", "广西科技大学",
    "广西科技师范学院", "广西财经学院", "廊坊师范学院", "延安大学", "延边大学",
    "徐州工程学院", "德州学院", "忻州师范学院", "怀化学院", "惠州学院",
    "成都东软学院", "成都中医药大学", "成都体育学院", "成都信息工程大学", "成都医学院",
    "成都外国语学院", "成都大学", "成都工业学院", "成都师范学院", "成都文理学院",
    "成都理工大学", "成都理工大学工程技术学院", "成都银杏酒店管理学院", "成都锦城学院",
    "扬州大学", "扬州大学广陵学院", "承德医学院", "攀枝花学院", "文华学院",
    "文山学院", "新乡医学院", "新乡学院", "新余学院", "新疆农业大学", "新疆医科大学",
    "新疆和田学院", "新疆大学", "新疆天山职业技术大学", "新疆工程学院", "新疆政法学院",
    "新疆理工学院", "新疆财经大学", "无锡太湖学院", "无锡学院", "昆明传媒学院",
    "昆明医科大学", "昆明医科大学海源学院", "昆明城市学院", "昆明学院", "昆明文理学院",
    "昆明理工大学", "昆明理工大学津桥学院", "昌吉学院", "昭通学院", "晋中学院",
    "普洱学院", "景德镇学院", "景德镇艺术职业大学", "景德镇陶瓷大学", "暨南大学",
    "曲阜师范大学", "曲靖师范学院", "杭州电子科技大学", "枣庄学院", "柳州工学院",
    "柳州职业技术大学", "桂林信息科技学院", "桂林医学院", "桂林医科大学", "桂林学院",
    "桂林师范学院", "桂林旅游学院", "桂林理工大学", "桂林电子科技大学", "桂林航天工业学院",
    "梧州学院", "楚雄师范学院", "武夷学院", "武昌理工学院", "武昌首义学院",
    "武汉东湖学院", "武汉体育学院", "武汉华夏理工学院", "武汉商学院", "武汉城市学院",
    "武汉大学", "武汉学院", "武汉工商学院", "武汉工程大学", "武汉工程大学邮电与信息工程学院",
    "武汉工程科技学院", "武汉文理学院", "武汉晴川学院", "武汉理工大学", "武汉生物工程学院",
    "武汉科技大学", "武汉纺织大学", "武汉纺织大学外经贸学院", "武汉轻工大学", "汉口学院",
    "汕头大学", "江南大学", "江汉大学", "江苏大学", "江苏师范大学", "江苏海洋大学",
    "江苏理工学院", "江苏科技大学", "江西中医药大学", "江西农业大学",
    "江西农业大学南昌商学院", "江西工程学院", "江西师范大学", "江西师范大学科学技术学院",
    "江西应用科技学院", "江西服装学院", "江西水利电力大学", "江西理工大学", "江西科技学院",
    "江西科技师范大学", "江西财经大学", "江西财经大学现代经济管理学院", "沈阳农业大学",
    "沈阳化工大学", "沈阳大学", "沈阳工业大学", "沈阳工程学院", "沈阳师范大学",
    "沈阳建筑大学", "沈阳理工大学", "沈阳药科大学", "沧州交通学院", "沧州师范学院",
    "河北东方学院", "河北传媒学院", "河北农业大学", "河北北方学院", "河北医科大学",
    "河北医科大学临床学院", "河北地质大学", "河北外国语学院", "河北大学", "河北工业大学",
    "河北工程大学", "河北工程大学科信学院", "河北师范大学", "河北建筑工程学院",
    "河北石油职业技术大学", "河北科技大学", "河北科技工程职业技术大学", "河北科技师范学院",
    "河北经贸大学", "河北金融学院", "河南中医药大学", "河南农业大学", "河南医药大学",
    "河南城建学院", "河南大学", "河南工业大学", "河南工学院", "河南工程学院",
    "河南师范大学", "河南开封科技传媒学院", "河南理工大学", "河南科技大学", "河南科技学院",
    "河南财政金融学院", "河南财经政法大学", "河池学院", "河海大学", "泉州信息工程学院",
    "泉州师范学院", "泉州职业技术大学", "泰山学院", "洛阳师范学院", "洛阳理工学院",
    "济南大学", "济宁医学院", "浙江万里学院", "浙江中医药大学", "浙江传媒学院",
    "浙江农林大学", "浙江农林大学暨阳学院", "浙江大学", "浙江大学医学院", "浙江工业大学",
    "浙江工商大学", "浙江师范大学", "浙江海洋大学", "浙江理工大学", "浙江财经大学",
    "海军军医大学", "海南医学院", "海南医科大学", "海南大学", "海南师范大学",
    "海南比勒费尔德应用科学大学", "海南洛桑旅游大学", "海南热带海洋学院", "海南科技职业大学",
    "海南警察学院", "海口经济学院", "淮北师范大学", "淮阴工学院", "深圳大学", "清华大学",
    "渤海大学", "温州医科大学", "温州医科大学仁济学院", "温州大学", "渭南师范学院",
    "湖北中医药大学", "湖北医药学院", "湖北医药学院药护学院", "湖北商贸学院", "湖北大学",
    "湖北大学知行学院", "湖北工业大学", "湖北工业大学工程技术学院", "湖北师范大学",
    "湖北师范大学文理学院", "湖北恩施学院", "湖北文理学院", "湖北文理学院理工学院",
    "湖北民族大学", "湖北汽车工业学院", "湖北理工学院", "湖北科技学院", "湖北第二师范学院",
    "湖北经济学院", "湖北经济学院法商学院", "湖北警官学院", "湖南中医药大学",
    "湖南人文科技学院", "湖南信息学院", "湖南农业大学", "湖南农业大学东方科技学院",
    "湖南医药学院", "湖南城市学院", "湖南大学", "湖南女子学院", "湖南工业大学",
    "湖南工业大学科技学院", "湖南工商大学", "湖南工学院", "湖南工程学院",
    "湖南工程学院应用技术学院", "湖南师范大学", "湖南文理学院", "湖南文理学院芙蓉学院",
    "湖南汽车工程职业大学", "湖南涉外经济学院", "湖南理工学院", "湖南理工学院南湖学院",
    "湖南科技大学", "湖南科技大学潇湘学院", "湖南科技学院", "湖南第一师范学院",
    "湖南警察学院", "湖南财政经济学院", "湖南软件职业技术大学", "湘南学院", "湘潭大学",
    "湘潭大学兴湘学院", "湘潭理工学院", "湛江科技学院", "滇池学院", "滇西应用技术大学",
    "滨州医学院", "滨州学院", "潍坊医学院", "潍坊学院", "烟台南山学院", "烟台大学",
    "烟台理工学院", "烟台科技学院", "燕京理工学院", "燕山大学", "牡丹江医学院",
    "牡丹江医科大学", "玉林师范学院", "玉溪师范学院", "珠海科技学院", "琼台师范学院",
    "甘肃农业大学", "甘肃政法大学", "甘肃民族师范学院", "电子科技大学", "电子科技大学中山学院",
    "电子科技大学成都学院", "白城师范学院", "百色学院", "盐城工学院", "盐城师范学院",
    "石家庄铁道大学", "石家庄铁道大学四方学院", "石河子大学", "福州外语外贸学院",
    "福州大学", "福建农林大学", "福建师范大学", "福建理工大学", "红河学院", "绵阳城市学院",
    "绵阳师范学院", "聊城大学", "聊城大学东昌学院", "肇庆医学院", "肇庆学院", "苏州大学",
    "苏州工学院", "苏州科技大学", "荆州学院", "荆楚理工学院", "莆田学院", "菏泽学院",
    "萍乡学院", "蚌埠医学院", "蚌埠医科大学", "蚌埠学院", "衡水学院", "衡阳师范学院",
    "衡阳师范学院南岳学院", "衢州学院", "西交利物浦大学", "西京学院", "西北农林科技大学",
    "西北大学", "西北工业大学", "西北师范大学", "西北政法大学", "西北民族大学",
    "西华大学", "西华师范大学", "西南交通大学", "西南医科大学", "西南大学", "西南政法大学",
    "西南林业大学", "西南民族大学", "西南石油大学", "西南科技大学", "西南财经大学",
    "西南财经大学天府学院", "西安交通大学", "西安交通大学城市学院", "西安医学院",
    "西安培华学院", "西安外事学院", "西安外国语大学", "西安工业大学", "西安工商学院",
    "西安工程大学", "西安建筑科技大学", "西安建筑科技大学华清学院", "西安思源学院",
    "西安文理学院", "西安明德理工学院", "西安欧亚学院", "西安理工大学", "西安电子科技大学",
    "西安石油大学", "西安科技大学", "西安翻译学院", "西安财经大学", "西安财经大学行知学院",
    "西安邮电大学", "西昌学院", "许昌学院", "豫章师范学院", "贵州中医药大学", "贵州医科大学",
    "贵州大学", "贵州工程应用技术学院", "贵州师范学院", "贵州理工学院", "贵州财经大学",
    "贵州黔南经济学院", "贵阳信息科技学院", "贵阳学院", "贵阳康养职业大学", "贺州学院",
    "赣东学院", "赣南医学院", "赣南医科大学", "赣南师范大学", "赣南科技学院",
    "辽宁中医药大学", "辽宁中医药大学杏林学院", "辽宁大学", "辽宁对外经贸学院",
    "辽宁师范大学", "辽宁石油化工大学", "辽宁科技大学", "辽宁财贸学院", "运城学院",
    "通化师范学院", "遵义医科大学", "遵义医科大学医学与科技学院", "遵义师范学院",
    "邢台医学院", "邢台学院", "邯郸学院", "邵阳学院", "郑州升达经贸管理学院", "郑州商学院",
    "郑州大学", "郑州工业应用技术学院", "郑州工商学院", "郑州工程技术学院", "郑州师范学院",
    "郑州经贸学院", "郑州航空工业管理学院", "郑州财经学院", "郑州轻工业大学", "重庆三峡学院",
    "重庆交通大学", "重庆人文科技学院", "重庆医科大学", "重庆城市科技学院", "重庆外语外事学院",
    "重庆大学", "重庆对外经贸学院", "重庆工商大学", "重庆工商大学派斯学院", "重庆工程学院",
    "重庆师范大学", "重庆文理学院", "重庆理工大学", "重庆科技大学", "重庆科技学院",
    "重庆移通学院", "重庆第二师范学院", "重庆财经学院", "重庆邮电大学", "金陵科技学院",
    "锦州医科大学", "长安大学", "长春中医药大学", "长春人文学院", "长春光华学院",
    "长春大学", "长春大学旅游学院", "长春工业大学", "长春工业大学人文信息学院", "长春工程学院",
    "长春师范大学", "长春建筑学院", "长春汽车职业技术大学", "长春理工大学", "长春电子科技学院",
    "长春科技学院", "长春财经学院", "长江大学", "长江大学文理学院", "长江师范学院",
    "长沙医学院", "长沙学院", "长沙工业学院", "长沙师范学院", "长沙理工大学",
    "长沙理工大学城南学院", "长治医学院", "闽南师范大学", "闽南理工学院", "闽南科技学院",
    "闽江学院", "防灾科技学院", "阿坝师范学院", "陆军工程大学", "陇东学院", "陕西中医药大学",
    "陕西国际商贸学院", "陕西师范大学", "陕西理工大学", "陕西科技大学", "集美大学",
    "集美大学诚毅学院", "青岛农业大学", "青岛城市学院", "青岛大学", "青岛工学院",
    "青岛理工大学", "青岛科技大学", "青岛黄海学院", "青海大学", "青海师范大学",
    "青海民族大学", "青海理工学院", "鞍山师范学院", "韩山师范学院", "韶关学院",
    "首都师范大学科德学院", "首都经济贸易大学", "鲁东大学", "黄冈师范学院", "黄河科技学院",
    "黄淮学院", "黑河学院", "黑龙江中医药大学", "黑龙江外国语学院", "黑龙江大学",
    "黑龙江工商学院", "黑龙江工程学院", "黑龙江科技大学", "黑龙江财经学院",
    "黔南民族师范学院", "齐鲁医药学院", "齐鲁工业大学", "齐齐哈尔医学院", "齐齐哈尔大学"
  ];

  let allData = [];
  let globalDataKeys = new Set();
  let currentSchoolIndex = 0;
  let isRunning = false;
  let startTime = 0;
  let successCount = 0;
  let failCount = 0;
  let completedSchools = new Set();

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function buildSchoolUrl(schoolName, year) {
    const params = JSON.stringify({
      province: CONFIG.province,
      year: String(year),
      batch: CONFIG.batch,
      genre: CONFIG.genre
    });

    return (
      'https://vt.quark.cn/blm/gaokao-college-794/tab' +
      '?app=fen_shu_xian' +
      `&university_name=${encodeURIComponent(schoolName)}` +
      `&q=${encodeURIComponent(schoolName)}` +
      `&params=${encodeURIComponent(params)}` +
      '&uc_biz_str=qk_enable_gesture%3Atrue%7COPT%3AW_ENTER_ANI%401%7COPT%3ATOOLBAR_STYLE%400%7COPT%3AW_PAGE_REFRESH%400%7COPT%3ABACK_BTN_STYLE%400%7COPT%3AIMMERSIVE%401%7COPT%3AW_PAGE_REFRESH%400' +
      '&device=mobile' +
      '&bar=pure' +
      '&by=tuijian' +
      '&by2=general_entity_college' +
      '&from=kkframenew_gaokaopd_chadaxue' +
      '&uc_param_str=ntnwvepffrbiprsvchutosstxskp'
    );
  }

  function extractMajorScores(schoolName, year) {
    const text = document.body.innerText;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const results = [];

    const nonMajorNames = new Set([
      '普通类', '物理类', '历史类', '综合类', '艺术类', '体育类',
      '国家专项', '地方专项', '高校专项', '中外合作', '民族班',
      '预科班', '定向', '专项计划', '提前批', '本科批', '专科批',
      '专业组', '院校专业组', '海南'
    ]);

    const majorCategoryKeywords = ['类', '班', '专业', '试验', '工程', '技术', 
                                   '管理', '经济', '文学', '理学', '法学',
                                   '医学', '教育', '艺术', '历史', '哲学',
                                   '农学', '军事', '学', '系'];

    for (let i = 0; i < lines.length - 4; i++) {
      const line = lines[i];
      
      if (line.length < 2 || line.length > 30) continue;
      if (/^\d+$/.test(line)) continue;
      
      const skipWords = ['最低分', '最低位次', '人数', '批次线差', '平均分', '最高分', 
                        '招生类型', '院校分数线', '专业分数线', '省控线', '查看全部',
                        '录取线差', '院校名称', '专业名称', '学历层次', '综合改革',
                        '物理+化学', '物理+生物', '历史+政治'];
      if (skipWords.some(w => line.includes(w))) continue;

      if (nonMajorNames.has(line)) continue;
      if (/^专业组\s*\(\d+\)/.test(line)) continue;
      if (/^\d+批次?$/.test(line)) continue;
      
      const scoreMatch = lines[i + 1]?.match(/^(\d{2,3})$/);
      if (!scoreMatch) continue;
      
      const rankMatch = lines[i + 2]?.match(/^(\d{3,7})$/);
      if (!rankMatch) continue;
      
      const minScore = parseInt(scoreMatch[1]);
      const minRank = parseInt(rankMatch[1]);
      
      if (minScore < 100 || minScore > 900) continue;
      if (minRank < 10 || minRank > 100000) continue;

      let hasMajorDesc = false;
      let hasSubjectReq = false;
      let personCount = null;
      let batchLineDiff = null;
      let batch = '';
      let subjectReq = '';
      let majorDesc = '';
      
      if (lines[i + 3] && /^\d+$/.test(lines[i + 3])) {
        personCount = parseInt(lines[i + 3]);
      }
      
      if (lines[i + 4] && /^\d+$/.test(lines[i + 4])) {
        batchLineDiff = parseInt(lines[i + 4]);
      }
      
      for (let j = i + 3; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].includes('本科') || lines[j].includes('专科')) {
          if (!batch) batch = lines[j];
        }
        if (lines[j].includes('选科') || lines[j].includes('科目') || 
            (lines[j].includes('要求') && lines[j].length < 30)) {
          subjectReq = lines[j].replace(/^(选科要求|科目要求|选课要求|选科)[：:]\s*/, '');
          hasSubjectReq = true;
        }
        if ((lines[j].startsWith('(') || lines[j].includes('包含专业') || 
             lines[j].includes('专业:')) && lines[j].length > 5) {
          if (!majorDesc) {
            majorDesc = lines[j];
            hasMajorDesc = true;
          }
        }
      }
      
      const majorName = line;
      const looksLikeMajor = majorCategoryKeywords.some(kw => majorName.includes(kw)) ||
                            hasMajorDesc || hasSubjectReq ||
                            (personCount !== null && personCount > 0);

      if (majorName && majorName.length > 1 && majorName.length < 35 && 
          /[\u4e00-\u9fa5]/.test(majorName) && looksLikeMajor) {
        const record = {
          school_name: schoolName,
          major_name: majorName,
          major_description: majorDesc || undefined,
          min_score: minScore,
          min_rank: minRank,
          person_count: personCount,
          batch_line_diff: batchLineDiff,
          batch: batch || CONFIG.batch,
          subject_requirement: subjectReq || undefined,
          province: CONFIG.province,
          year: year,
          source: '夸克高考'
        };
        results.push(record);
      }
    }

    const uniqueResults = [];
    const seen = new Map();
    for (const r of results) {
      const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || '');
      if (!seen.has(key)) {
        seen.set(key, r);
        uniqueResults.push(r);
      } else {
        const existing = seen.get(key);
        if (!existing.major_description && r.major_description) {
          existing.major_description = r.major_description;
        }
        if (!existing.subject_requirement && r.subject_requirement) {
          existing.subject_requirement = r.subject_requirement;
        }
        if (existing.person_count === null && r.person_count !== null) {
          existing.person_count = r.person_count;
        }
      }
    }

    return uniqueResults;
  }

  function isLoading() {
    const loaders = document.querySelectorAll('[class*="loading"], [class*="loading"], [class*="spinner"], [class*="spin"]');
    for (const loader of loaders) {
      if (loader.offsetWidth > 0 && loader.offsetHeight > 0) {
        return true;
      }
    }
    const text = document.body.innerText;
    return text.includes('加载中') || text.includes('加载中...');
  }

  async function waitForLoad(maxWait = CONFIG.maxLoadWait) {
    const startTime = Date.now();
    const checkInterval = 500;
    
    while (Date.now() - startTime < maxWait) {
      if (!isLoading()) {
        return true;
      }
      await sleep(checkInterval);
    }
    console.warn('⚠️ 页面加载超时');
    return false;
  }

  function hasMajorScoreData() {
    const text = document.body.innerText;
    if (text.includes('暂无数据') || text.includes('没有相关数据') || 
        text.includes('暂无专业分数线') || text.includes('暂无录取分数线')) {
      return false;
    }
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let scoreCount = 0;
    let rankCount = 0;
    for (const line of lines) {
      if (/^\d{2,3}$/.test(line) && parseInt(line) >= 100 && parseInt(line) <= 900) {
        scoreCount++;
      }
      if (/^\d{3,7}$/.test(line) && parseInt(line) >= 100) {
        rankCount++;
      }
    }
    return scoreCount >= 2 && rankCount >= 2;
  }

  async function scrapeSchool(schoolName) {
    console.log(`\n%c📚 处理院校: ${schoolName}`, 'color:#3b82f6;font-weight:bold');
    const schoolData = [];

    for (const year of CONFIG.years) {
      console.log(`  📅 ${year}年`);
      
      const url = buildSchoolUrl(schoolName, year);
      console.log(`    🔗 访问: ${url}`);
      
      window.location.href = url;
      
      await waitForLoad();
      
      const schoolTitle = document.querySelector('.qk-title-text')?.innerText || '';
      if (!schoolTitle.includes(schoolName)) {
        console.log(`    ⚠ 页面标题不匹配，跳过${year}年`);
        await sleep(2000);
        continue;
      }
      
      if (!hasMajorScoreData()) {
        console.log(`    ⏭ ${year}年无数据，跳过`);
        await sleep(2000);
        continue;
      }
      
      const records = extractMajorScores(schoolName, year);
      console.log(`    提取到 ${records.length} 条数据`);
      
      if (records.length > 0) {
        schoolData.push(...records);
        if (records.length <= 3) {
          records.forEach(r => {
            console.log(`      • ${r.major_name}: ${r.min_score}分 / ${r.min_rank}位次`);
          });
        } else {
          records.slice(0, 3).forEach(r => {
            console.log(`      • ${r.major_name}: ${r.min_score}分 / ${r.min_rank}位次`);
          });
          console.log(`      ... 共 ${records.length} 条`);
        }
      } else {
        console.log(`    ⏭ ${year}年无专业数据，跳过`);
      }
      
      await sleep(CONFIG.delayBetweenYears);
    }

    return schoolData;
  }

  function saveProgress() {
    try {
      localStorage.setItem('quark_scraper_progress', JSON.stringify({
        currentSchoolIndex,
        completedSchools: Array.from(completedSchools),
        allData: allData,
        successCount,
        failCount,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('⚠️ 保存进度失败（可能localStorage空间不足）', e.message);
    }
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('quark_scraper_progress');
      if (saved) {
        const data = JSON.parse(saved);
        completedSchools = new Set(data.completedSchools || []);
        currentSchoolIndex = data.currentSchoolIndex || 0;
        allData = data.allData || [];
        globalDataKeys = new Set();
        allData.forEach(r => {
          globalDataKeys.add(r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || ''));
        });
        return data;
      }
    } catch (e) {
    }
    return null;
  }

  function deduplicateData() {
    const seen = new Map();
    const unique = [];
    for (const r of allData) {
      const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || '');
      if (!seen.has(key)) {
        seen.set(key, r);
        unique.push(r);
      } else {
        const existing = seen.get(key);
        if (!existing.major_description && r.major_description) {
          existing.major_description = r.major_description;
        }
        if (!existing.subject_requirement && r.subject_requirement) {
          existing.subject_requirement = r.subject_requirement;
        }
        if (existing.person_count === null && r.person_count !== null) {
          existing.person_count = r.person_count;
        }
      }
    }
    const removed = allData.length - unique.length;
    allData = unique;
    globalDataKeys = new Set(unique.map(r => r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || '')));
    console.log(`✅ 去重完成，移除 ${removed} 条重复数据，剩余 ${allData.length} 条`);
    return removed;
  }

  function downloadData() {
    if (allData.length === 0) {
      console.log('❌ 没有数据可下载');
      return;
    }
    
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `夸克高考专业分数线_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log('%c💾 数据已下载！', 'color:#22c55e;font-weight:bold');
  }

  function showStats() {
    const schools = new Set(allData.map(d => d.school_name));
    const years = new Set(allData.map(d => d.year));
    const majors = new Set(allData.map(d => d.major_name));
    
    console.log('\n%c📊 数据统计', 'color:#f59e0b;font-size:16px;font-weight:bold');
    console.log(`  总数据量: ${allData.length} 条`);
    console.log(`  院校数: ${schools.size} 所`);
    console.log(`  专业数: ${majors.size} 个`);
    console.log(`  年份: ${Array.from(years).sort().join(', ')}`);
    
    const byYear = {};
    allData.forEach(d => {
      byYear[d.year] = (byYear[d.year] || 0) + 1;
    });
    console.log('  按年份统计:');
    Object.entries(byYear).sort().forEach(([year, count]) => {
      console.log(`    ${year}年: ${count} 条`);
    });
    
    const bySchool = {};
    allData.forEach(d => {
      bySchool[d.school_name] = (bySchool[d.school_name] || 0) + 1;
    });
    console.log(`  数据最多的10所院校:`);
    Object.entries(bySchool).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([name, count], i) => {
      console.log(`    ${i + 1}. ${name}: ${count} 条`);
    });
  }

  async function startScraping(startIndex = 0) {
    if (isRunning) {
      console.log('⚠️  已经在运行中...');
      return;
    }

    if (SCHOOLS.length === 0) {
      console.log('❌ 没有院校列表！');
      return;
    }

    isRunning = true;
    startTime = Date.now();
    
    if (startIndex > 0) {
      currentSchoolIndex = startIndex;
    }

    const totalSchools = CONFIG.maxSchools > 0 
      ? Math.min(CONFIG.maxSchools, SCHOOLS.length - currentSchoolIndex)
      : SCHOOLS.length - currentSchoolIndex;

    console.log('\n' + '='.repeat(60));
    console.log('%c🚀 开始批量抓取专业分数线数据', 'color:#22c55e;font-size:18px;font-weight:bold');
    console.log('='.repeat(60));
    console.log(`  📊 共 ${totalSchools} 所院校, ${CONFIG.years.length} 个年份`);
    console.log(`  📍 从第 ${currentSchoolIndex + 1} 所开始: ${SCHOOLS[currentSchoolIndex]}`);
    console.log(`  ⏱ 预计时间: ${Math.ceil(totalSchools * (CONFIG.years.length * 6 + 3) / 60)} 分钟`);
    console.log('='.repeat(60));

    for (let i = currentSchoolIndex; i < SCHOOLS.length; i++) {
      if (!isRunning) {
        console.log('\n⏹ 已停止抓取');
        break;
      }

      currentSchoolIndex = i;
      const school = SCHOOLS[i];

      if (completedSchools.has(school)) {
        console.log(`\n⏭ 跳过已完成: ${school}`);
        continue;
      }

      try {
        const data = await scrapeSchool(school);
        
        if (data.length > 0) {
          let newCount = 0;
          for (const record of data) {
            const key = record.school_name + '|' + record.major_name + '|' + record.year + '|' + (record.major_description || '');
            if (!globalDataKeys.has(key)) {
              globalDataKeys.add(key);
              allData.push(record);
              newCount++;
            }
          }
          successCount++;
          completedSchools.add(school);
          if (newCount < data.length) {
            console.log(`  📊 新增 ${newCount} 条 (去重前 ${data.length} 条)`);
          }
        } else {
          failCount++;
          console.log(`  ⚠ 未获取到数据`);
        }
      } catch (e) {
        failCount++;
        console.log(`  ❌ 抓取出错: ${e.message}`);
      }

      saveProgress();

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const progress = ((i + 1 - (CONFIG.maxSchools > 0 ? 0 : currentSchoolIndex)) / totalSchools * 100).toFixed(1);
      
      console.log(`\n%c📈 进度: ${i + 1}/${SCHOOLS.length} (${progress}%) | 成功: ${successCount} | 失败: ${failCount} | 总数据: ${allData.length}条 | 用时 ${Math.floor(elapsed/60)}分${elapsed%60}秒`, 
        'color:#3b82f6;font-weight:bold');

      if (i < SCHOOLS.length - 1) {
        await sleep(CONFIG.delayBetweenSchools);
      }
    }

    isRunning = false;
    
    console.log('\n' + '='.repeat(60));
    console.log('%c✅ 抓取完成！', 'color:#22c55e;font-size:18px;font-weight:bold');
    console.log('='.repeat(60));
    console.log(`  📊 共获取 ${allData.length} 条专业分数线数据`);
    console.log(`  ✅ 成功: ${successCount} 所 | ❌ 失败: ${failCount} 所`);
    console.log('='.repeat(60));
    
    showStats();
    
    console.log('\n%c💾 输入 downloadData() 下载JSON文件', 'color:#8b5cf6;font-weight:bold');
    console.log('%c📊 输入 showStats() 查看统计', 'color:#8b5cf6;font-weight:bold');
  }

  function stopScraping() {
    isRunning = false;
    console.log('⏹ 正在停止...');
  }

  function testCurrent() {
    console.log('%c🧪 测试当前页面数据提取...', 'color:#f59e0b;font-weight:bold');
    
    const url = location.href;
    const schoolMatch = url.match(/university_name=([^&]+)/);
    const schoolName = schoolMatch ? decodeURIComponent(schoolMatch[1]) : '当前院校';
    
    const yearMatch = url.match(/year[":]\s*["']?(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2025;
    
    const data = extractMajorScores(schoolName, year);
    
    console.log(`\n✅ 测试完成，提取到 ${data.length} 条数据`);
    
    if (data.length > 0) {
      console.table(data.slice(0, 10));
      window.__testData = data;
    }
    
    return data;
  }

  function getProgress() {
    const saved = loadProgress();
    if (saved) {
      console.log(`\n📍 上次进度: 第 ${saved.currentSchoolIndex + 1} 所`);
      console.log(`   已完成: ${saved.completedSchools?.length || 0} 所`);
      console.log(`   时间: ${new Date(saved.timestamp).toLocaleString()}`);
    } else {
      console.log('没有保存的进度');
    }
    return saved;
  }

  function addSchools(schoolArray) {
    const before = SCHOOLS.length;
    schoolArray.forEach(s => {
      if (s && s.trim() && !SCHOOLS.includes(s.trim())) {
        SCHOOLS.push(s.trim());
      }
    });
    console.log(`✅ 已添加 ${SCHOOLS.length - before} 所院校，共 ${SCHOOLS.length} 所`);
  }

  function clearProgress() {
    localStorage.removeItem('quark_scraper_progress');
    currentSchoolIndex = 0;
    completedSchools = new Set();
    allData = [];
    globalDataKeys = new Set();
    successCount = 0;
    failCount = 0;
    console.log('🗑 进度已清除');
  }

  console.log('\n' + '='.repeat(60));
  console.log('%c🎓 夸克高考专业分数线自动抓取工具', 'color:#3b82f6;font-size:20px;font-weight:bold');
  console.log('='.repeat(60));
  console.log(`  📚 内置院校: ${SCHOOLS.length} 所`);
  console.log(`  📅 抓取年份: ${CONFIG.years.join(', ')}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('%c📖 使用方法:', 'color:#f59e0b;font-weight:bold');
  console.log('');
  console.log('  1️⃣  测试当前页面:');
  console.log('     QuarkScraper.test()');
  console.log('');
  console.log('  2️⃣  开始批量抓取:');
  console.log('     QuarkScraper.start()');
  console.log('');
  console.log('  3️⃣  从指定位置继续:');
  console.log('     QuarkScraper.resume()');
  console.log('');
  console.log('  4️⃣  其他命令:');
  console.log('     QuarkScraper.stats()      - 查看统计');
  console.log('     QuarkScraper.download()   - 下载数据');
  console.log('     QuarkScraper.dedup()      - 手动去重');
  console.log('     QuarkScraper.stop()       - 停止抓取');
  console.log('     QuarkScraper.progress()   - 查看进度');
  console.log('     QuarkScraper.clear()      - 清除进度');
  console.log('');
  console.log('='.repeat(60));
  console.log('%c💡 建议先运行 QuarkScraper.test() 测试当前页面', 'color:#22c55e;font-weight:bold');
  console.log('='.repeat(60) + '\n');

  window.QuarkScraper = {
    config: CONFIG,
    schools: SCHOOLS,
    allData: allData,
    isRunning: () => isRunning,
    currentIndex: () => currentSchoolIndex,

    test: testCurrent,
    start: startScraping,
    resume: () => {
      const saved = loadProgress();
      const idx = saved ? saved.currentSchoolIndex : 0;
      console.log(`🔄 从第 ${idx + 1} 所继续...`);
      startScraping(idx);
    },
    stop: stopScraping,
    download: downloadData,
    stats: showStats,
    progress: getProgress,
    clear: clearProgress,
    dedup: deduplicateData,
    addSchools: addSchools
  };

})();
