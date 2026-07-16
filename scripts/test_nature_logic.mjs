import { getUniversityNature } from '../dist/data/universityLevels.js';

const testCases = [
  { name: '复旦大学医学院', expected: '公办', desc: '真正的大学医学院' },
  { name: '上海交通大学医学院', expected: '公办', desc: '真正的大学医学院' },
  { name: '浙江大学医学院', expected: '公办', desc: '真正的大学医学院' },
  { name: '北京大学医学部', expected: '公办', desc: '真正的大学医学部' },
  
  { name: '浙江大学城市学院', expected: '公办', desc: '转设公办的独立学院' },
  { name: '浙江大学宁波理工学院', expected: '公办', desc: '转设公办的独立学院' },
  { name: '浙大城市学院', expected: '公办', desc: '转设后更名' },
  { name: '苏州城市学院', expected: '公办', desc: '转设后更名' },
  
  { name: '南京审计大学金审学院', expected: '民办', desc: '独立学院' },
  { name: '湖南科技大学潇湘学院', expected: '民办', desc: '独立学院' },
  { name: '厦门大学嘉庚学院', expected: '民办', desc: '独立学院' },
  { name: '石家庄铁道大学四方学院', expected: '民办', desc: '独立学院' },
  { name: '南昌航空大学科技学院', expected: '民办', desc: '独立学院' },
  { name: '河北医科大学临床学院', expected: '民办', desc: '独立学院' },
  { name: '南京师范大学泰州学院', expected: '民办', desc: '独立学院' },
  { name: '广西中医药大学赛恩斯新医药学院', expected: '民办', desc: '独立学院' },
  { name: '江西财经大学现代经济管理学院', expected: '民办', desc: '独立学院' },
  { name: '长江大学文理学院', expected: '民办', desc: '独立学院' },
  { name: '湖南农业大学东方科技学院', expected: '民办', desc: '独立学院' },
  { name: '扬州大学广陵学院', expected: '民办', desc: '独立学院' },
  { name: '电子科技大学成都学院', expected: '民办', desc: '独立学院' },
  { name: '四川大学锦江学院', expected: '民办', desc: '独立学院' },
  { name: '北京科技大学天津学院', expected: '民办', desc: '独立学院' },
  { name: '湖北大学知行学院', expected: '民办', desc: '独立学院' },
  { name: '武汉纺织大学外经贸学院', expected: '民办', desc: '独立学院' },
  { name: '温州医科大学仁济学院', expected: '民办', desc: '独立学院' },
  { name: '重庆工商大学派斯学院', expected: '民办', desc: '独立学院' },
  
  { name: '清华大学', expected: '公办', desc: '普通公办大学' },
  { name: '北京大学', expected: '公办', desc: '普通公办大学' },
  { name: '海南大学', expected: '公办', desc: '普通公办大学' },
  { name: '天津大学', expected: '公办', desc: '普通公办大学' },
  
  { name: '三亚学院', expected: '民办', desc: '纯民办学院' },
  { name: '上海建桥学院', expected: '民办', desc: '纯民办学院' },
  { name: '河北传媒学院', expected: '民办', desc: '纯民办学院' },
  
  { name: '浙江大学(中外合作办学)', expected: '中外合作办学', desc: '中外合作办学' },
];

console.log('Testing getUniversityNature function:\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = getUniversityNature(testCase.name);
  const status = result === testCase.expected ? '✓ PASS' : '✗ FAIL';
  
  if (result === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status}: ${testCase.name}`);
  console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
  console.log(`   ${testCase.desc}`);
  console.log();
}

console.log(`\nSummary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}