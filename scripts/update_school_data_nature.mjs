import fs from 'fs';
import path from 'path';

function extractBaseName(name) {
  return name.replace(/\(.*?\)/g, '').trim();
}

const PRIVATE_COLLEGES = new Set([
  '三亚学院', '上海建桥学院', '北京工业大学耿丹学院', '北京中医药大学东方学院',
  '天津体育学院运动与文化艺术学院', '天津医科大学临床医学院', '天津商业大学宝德学院',
  '天津外国语大学滨海外事学院', '天津大学仁爱学院', '天津天狮学院', '河北传媒学院',
  '河北科技学院', '河北工程技术学院', '河北美术学院', '河北外国语学院',
  '沧州交通学院', '保定理工学院', '燕京理工学院', '山西应用科技学院', '山西工商学院',
  '辽宁传媒学院', '辽宁科技学院', '辽宁理工学院', '辽宁何氏医学院',
  '大连财经学院', '大连艺术学院', '大连科技学院', '大连工业大学艺术与信息工程学院',
  '大连理工大学城市学院', '大连交通大学信息工程学院', '东北财经大学津桥商学院',
  '辽宁石油化工大学顺华能源学院', '辽宁师范大学海华学院', '辽宁中医药大学杏林学院',
  '吉林动画学院', '吉林建筑科技学院', '长春光华学院', '长春财经学院',
  '长春人文学院', '黑龙江财经学院', '哈尔滨信息工程学院', '齐齐哈尔工程学院',
  '上海杉达学院', '上海视觉艺术学院', '上海兴伟学院', '上海师范大学天华学院',
  '上海外国语大学贤达经济人文学院', '东华大学上海国际时尚创意学院',
  '苏州科技大学天平学院', '江苏科技大学苏州理工学院', '江苏师范大学科文学院',
  '南京信息工程大学滨江学院', '南京师范大学泰州学院', '南京理工大学泰州科技学院',
  '南京工业大学浦江学院', '南京邮电大学通达学院', '南京财经大学红山学院',
  '南京审计大学金审学院', '扬州大学广陵学院', '江苏大学京江学院', '无锡太湖学院',
  '中国矿业大学徐海学院', '常州大学怀德学院', '南通大学杏林学院',
  '浙江树人学院', '浙江越秀外国语学院', '宁波财经学院', '温州商学院',
  '浙江工业大学之江学院', '浙江师范大学行知学院', '杭州电子科技大学信息工程学院',
  '浙江理工大学科技与艺术学院', '浙江农林大学暨阳学院', '浙江中医药大学滨江学院',
  '宁波大学科学技术学院', '安徽新华学院', '安徽三联学院',
  '安徽信息工程学院', '安徽文达信息工程学院', '安徽外国语学院',
  '安徽艺术学院', '合肥城市学院', '合肥经济学院', '安徽建筑大学城市建设学院',
  '安徽农业大学经济技术学院', '安徽医科大学临床医学院', '安徽师范大学皖江学院',
  '淮北师范大学信息学院', '福州外语外贸学院', '闽南理工学院',
  '泉州信息工程学院', '仰恩大学', '阳光学院', '集美大学诚毅学院',
  '福建师范大学协和学院', '福建农林大学金山学院', '福建中医药大学康复医学院',
  '江西科技学院', '南昌理工学院', '江西应用科技学院', '江西服装学院',
  '江西工程学院', '南昌工学院', '南昌大学科学技术学院', '江西师范大学科学技术学院',
  '江西农业大学南昌商学院', '江西财经大学现代经济管理学院', '华东交通大学理工学院',
  '东华理工大学长江学院', '景德镇陶瓷大学科技艺术学院', '赣南师范大学科技学院',
  '山东协和学院', '山东现代学院', '山东华宇工学院', '山东工程职业技术大学',
  '山东艺术设计职业学院', '青岛恒星科技学院', '青岛黄海学院', '青岛求实职业技术大学',
  '烟台理工学院', '潍坊理工学院', '山东财经大学燕山学院', '山东师范大学历山学院',
  '聊城大学东昌学院', '济南大学泉城学院', '河南科技学院新科学院',
  '河南大学民生学院', '河南师范大学新联学院', '郑州财经学院', '郑州工商学院',
  '郑州科技学院', '郑州轻工业大学易斯顿国际美术学院', '郑州工业应用技术学院',
  '武汉传媒学院', '武汉设计工程学院', '武汉华夏理工学院', '武汉晴川学院',
  '武汉生物工程学院', '武昌工学院', '武昌理工学院', '武汉工程科技学院',
  '武汉纺织大学外经贸学院', '武汉体育学院体育科技学院', '湖北工程学院新技术学院',
  '湖北工业大学工程技术学院', '湖北经济学院法商学院', '湖北师范大学文理学院',
  '华中农业大学楚天学院', '长江大学文理学院', '三峡大学科技学院',
  '湖南涉外经济学院', '湖南应用技术学院', '湖南信息学院', '湖南科技学院',
  '湖南工程学院应用技术学院', '湖南农业大学东方科技学院', '湖南师范大学树达学院',
  '湘潭大学兴湘学院', '衡阳师范学院南岳学院', '湖南科技大学潇湘学院',
  '广东白云学院', '广东培正学院', '广东科技学院', '广东理工学院',
  '广州商学院', '广州华立学院', '广州软件学院', '广州理工学院',
  '广州应用科技学院', '广州城市理工学院', '广州工商学院', '广东财经大学华商学院',
  '广东外语外贸大学南国商学院', '广东工业大学华立学院', '华南农业大学珠江学院',
  '东莞理工学院城市学院', '北京理工大学珠海学院',
  '吉林大学珠海学院', '珠海科技学院', '湛江科技学院', '广东技术师范大学天河学院',
  '广西外国语学院', '南宁理工学院', '桂林学院', '北海艺术设计学院',
  '广西中医药大学赛恩斯新医药学院', '云南工商学院', '云南经济管理学院',
  '云南艺术学院文华学院', '昆明城市学院', '贵州财经大学商务学院',
  '贵阳信息科技学院', '贵阳人文科技学院',
  '重庆人文科技学院', '重庆工程学院', '重庆工商大学派斯学院', '重庆邮电大学移通学院',
  '重庆工商大学融智学院', '四川工商学院', '四川传媒学院', '四川文化艺术学院',
  '四川工业科技学院', '成都东软学院', '成都文理学院', '成都银杏酒店管理学院',
  '成都信息工程大学银杏酒店管理学院', '四川大学锦城学院', '西南交通大学希望学院',
  '电子科技大学成都学院', '成都理工大学工程技术学院', '西南财经大学天府学院',
  '陕西国际商贸学院', '陕西科技大学镐京学院', '西安财经大学行知学院',
  '西安科技大学高新学院', '西安理工大学高科学院', '西安建筑科技大学华清学院',
  '西安工业大学北方信息工程学院', '西北大学现代学院', '延安大学西安创新学院',
  '西京学院', '西安翻译学院', '西安思源学院', '西安欧亚学院',
  '兰州信息科技学院', '兰州财经大学长青学院',
  '宁夏理工学院', '银川能源学院', '新疆理工学院', '新疆天山职业技术大学',
]);

const PUBLIC_COLLEGES = new Set([
  '浙江大学城市学院', '浙江大学宁波理工学院', '苏州大学文正学院',
  '嘉兴南湖学院', '湖州学院', '无锡学院', '绍兴理工学院',
  '浙大城市学院', '浙大宁波理工学院', '苏州城市学院',
  '北京师范大学珠海校区',
  '湖南城市学院', '兰州城市学院', '贵州工程应用技术学院',
  '湖南科技学院',
]);

const UNIVERSITY_COLLEGE_KEYWORDS = [
  '医学院', '临床医学院', '口腔医学院', '药学院', '公共卫生学院',
  '人文学院', '文学院', '外国语学院', '法学院', '商学院', '经济学院',
  '管理学院', '工程学院', '工学院', '理工学院', '理学院', '计算机学院',
  '信息学院', '电子信息学院', '电气学院', '建筑学院', '土木学院',
  '艺术学院', '美术学院', '音乐学院', '体育学院', '师范学院', '教育学院',
  '生命科学学院', '农学院', '林学院', '海洋学院', '环境学院', '能源学院',
  '材料学院', '化工学院', '机械学院', '交通学院', '汽车学院', '航空学院',
  '航天学院', '医学院', '护理学院', '中医学院', '中医药学院',
];

const NATURE_INDICATORS = {
  '民办': ['城市学院', '信息技术学院', '应用技术学院',
           '设计学院', '影视学院', '华商学院', '南国商学院',
           '宝德学院', '滨海学院', '仁爱学院', '天狮学院', '津桥商学院', '银杏酒店管理学院',
           '顺华能源学院', '海华学院', '杏林学院', '东方学院', '珠江学院', '派斯学院',
           '树达学院', '东方科技学院', '南岳学院', '科技艺术学院',
           '华立学院', '京江学院', '泰州科技学院', '广陵学院', '独立学院',
           '国际学院', '国际教育学院'],
  '中外合作办学': ['中外合作办学'],
};

function isRealUniversityCollege(name) {
  for (const keyword of UNIVERSITY_COLLEGE_KEYWORDS) {
    if (name.includes(keyword)) {
      return true;
    }
  }
  return false;
}

function getUniversityNature(schoolName) {
  if (!schoolName) return '公办';

  const baseName = extractBaseName(schoolName);
  
  if (PUBLIC_COLLEGES.has(baseName)) {
    return '公办';
  }
  
  if (PRIVATE_COLLEGES.has(baseName)) {
    return '民办';
  }
  
  for (const indicator of NATURE_INDICATORS['中外合作办学']) {
    if (schoolName.includes(indicator)) {
      return '中外合作办学';
    }
  }
  
  const universityMatch = schoolName.match(/(.+大学)(.+学院)/);
  if (universityMatch) {
    const collegePart = universityMatch[2];
    
    if (!isRealUniversityCollege(collegePart)) {
      return '民办';
    }
  }
  
  for (const indicator of NATURE_INDICATORS['民办']) {
    if (schoolName.includes(indicator)) {
      return '民办';
    }
  }
  
  return '公办';
}

const filePath = path.join('src', 'data', 'schoolData.ts');
const content = fs.readFileSync(filePath, 'utf-8');

console.log(`原始文件行数: ${content.split('\n').length}`);

const natureMatches = content.match(/nature:\s*'([^']+)'/g);
const natureValues = [...new Set((natureMatches || []).map(m => m.match(/'([^']+)'/)[1]))];
console.log(`\n修复前 nature 值分布:`);
natureValues.forEach(v => {
  const count = (content.match(new RegExp(`nature:\\s*'${v}'`, 'g')) || []).length;
  console.log(`  ${v}: ${count} 次`);
});

let fixedContent = content;
let fixCount = 0;
let skipCount = 0;

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("name: '")) {
    const nameMatch = line.match(/name:\s*'([^']+)'/);
    if (nameMatch) {
      const schoolName = nameMatch[1];
      const expectedNature = getUniversityNature(schoolName);
      
      let objStart = i;
      let braceCount = 0;
      
      for (let j = i; j >= 0; j--) {
        if (lines[j].includes('{')) {
          objStart = j;
          break;
        }
      }
      
      let foundNature = false;
      for (let j = objStart; j <= Math.min(objStart + 15, lines.length - 1); j++) {
        const natureMatch = lines[j].match(/nature:\s*'([^']+)'/);
        if (natureMatch) {
          const currentNature = natureMatch[1];
          if (currentNature !== expectedNature) {
            lines[j] = lines[j].replace(/nature:\s*'[^']+'/, `nature: '${expectedNature}'`);
            fixCount++;
            console.log(`  修复第 ${j + 1} 行: ${schoolName} 的 nature 从 '${currentNature}' 改为 '${expectedNature}'`);
          } else {
            skipCount++;
          }
          foundNature = true;
          break;
        }
      }
      
      if (!foundNature) {
        console.log(`  ⚠️ 第 ${i + 1} 行: ${schoolName} 未找到 nature 字段`);
      }
    }
  }
}

fixedContent = lines.join('\n');

console.log(`\n修复完成，共修复 ${fixCount} 处，跳过 ${skipCount} 处`);

const fixedNatureMatches = fixedContent.match(/nature:\s*'([^']+)'/g);
const fixedNatureValues = [...new Set((fixedNatureMatches || []).map(m => m.match(/'([^']+)'/)[1]))];
console.log(`\n修复后 nature 值分布:`);
fixedNatureValues.forEach(v => {
  const count = (fixedContent.match(new RegExp(`nature:\\s*'${v}'`, 'g')) || []).length;
  console.log(`  ${v}: ${count} 次`);
});

fs.writeFileSync(filePath, fixedContent, 'utf-8');
console.log(`\n文件已写入: ${filePath}`);