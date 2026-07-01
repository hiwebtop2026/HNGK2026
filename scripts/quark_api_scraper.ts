/**
 * 夸克高考专业分数线API采集脚本
 * 直接调用夸克API获取数据，不需要浏览器
 */

import * as fs from 'fs';
import * as path from 'path';

// API配置
const BASE_URL = 'https://gateway.quark.cn/api/v1';
const SCHOOL_LIST_URL = 'https://gateways.quark.cn/api/college/school/lists';

// 夸克sign计算（简化版，实际可能需要从页面获取）
function generateSignId(): string {
  return Date.now().toString() + '_' + Math.floor(Math.random() * 100000);
}

// 院校列表接口
interface SchoolListItem {
  id: string;
  name: string;
  province: string;
}

interface SchoolListResponse {
  status: number;
  code: string;
  msg: string;
  data: {
    list: SchoolListItem[];
    total: number;
  };
}

// 专业分数线接口
interface MajorScoreLine {
  major: string;
  low_score: string;
  low_rank: string;
  specialized: string;
}

interface MajorScoreLineResponse {
  status: number;
  code: string;
  msg: string;
  data: {
    cur_province: string;
    cur_genre: string;
    cur_year: string;
    major_jilian: string;
    major_scorelines: string; // JSON string
  };
}

// 从页面提取院校信息的脚本（需要用户先在浏览器中获取）
const USER_SCRIPT = `
// 请在夸克高考页面控制台运行以下代码来获取院校信息：
(function() {
  var info = {
    schoolId: '',
    schoolName: '',
    url: location.href
  };
  
  // 尝试从URL或页面获取院校ID和名称
  var titleEl = document.querySelector('.qk-title-text');
  if (titleEl) {
    info.schoolName = titleEl.innerText.trim();
  }
  
  // 从URL参数获取
  var params = new URLSearchParams(location.search);
  for (var pair of params.entries()) {
    if (pair[0].indexOf('school') >= 0 || pair[0].indexOf('id') >= 0) {
      info[pair[0]] = pair[1];
    }
  }
  
  console.log('院校信息:', JSON.stringify(info, null, 2));
  return info;
})();
`;

async function fetchSchoolList(): Promise<SchoolListItem[]> {
  console.log('📡 获取院校列表...');
  
  try {
    const response = await fetch(SCHOOL_LIST_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const data: SchoolListResponse = await response.json();
    
    if (data.status === 0 && data.data && data.data.list) {
      console.log(`✅ 获取到 ${data.data.list.length} 所院校`);
      return data.data.list;
    }
    
    console.log('❌ 院校列表获取失败:', data.msg);
    return [];
  } catch (error) {
    console.log('❌ 请求失败:', error);
    return [];
  }
}

async function fetchMajorScores(schoolId: string, year: string, province: string = '海南'): Promise<any[]> {
  console.log(`📡 获取 ${schoolId} ${year} 年专业分数线...`);
  
  const signId = generateSignId();
  const requestTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}?position=zhuanyefenshuxian&businessPath=gaokao_college_non_first`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'tsing-sign-id': signId,
        'clt-acs-reqt': requestTime.toString(),
        'clt-acs-request-params': 'businessPath,chid'
      },
      body: JSON.stringify({
        chid: schoolId,
        year: year,
        province: province,
        genre: ''
      })
    });
    
    const data: MajorScoreLineResponse = await response.json();
    
    if (data.status === 0 && data.data && data.data.major_scorelines) {
      const scorelines = JSON.parse(data.data.major_scorelines);
      console.log(`✅ 获取到 ${scorelines.data?.list?.length || 0} 条专业分数线`);
      return scorelines.data?.list || [];
    }
    
    console.log('❌ 专业分数线获取失败:', data.msg);
    return [];
  } catch (error) {
    console.log('❌ 请求失败:', error);
    return [];
  }
}

function saveToJson(data: any[], filename: string): void {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 已保存到: ${filepath}`);
}

async function main() {
  console.log('=== 夸克高考专业分数线采集 ===\n');
  
  // 获取院校列表
  const schools = await fetchSchoolList();
  
  if (schools.length === 0) {
    console.log('\n⚠️ 无法获取院校列表，请检查网络或认证状态');
    console.log('\n或者，您可以在浏览器中手动操作：');
    console.log('1. 打开夸克高考网站');
    console.log('2. 进入院校专业分数线页面');
    console.log('3. 打开浏览器控制台(F12)');
    console.log('4. 粘贴以下代码获取院校信息：');
    console.log(USER_SCRIPT);
    return;
  }
  
  // 测试获取北京大学的专业分数线
  const testSchool = schools.find(s => s.name.includes('北京'));
  if (testSchool) {
    console.log(`\n🧪 测试获取 ${testSchool.name} 的数据...`);
    
    const scores2025 = await fetchMajorScores(testSchool.id, '2025');
    if (scores2025.length > 0) {
      saveToJson(scores2025, `${testSchool.name}_2025_专业分数线.json`);
    }
    
    const scores2024 = await fetchMajorScores(testSchool.id, '2024');
    if (scores2024.length > 0) {
      saveToJson(scores2024, `${testSchool.name}_2024_专业分数线.json`);
    }
  }
  
  console.log('\n✅ 采集完成！');
}

main().catch(console.error);
