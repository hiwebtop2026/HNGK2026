import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HAINAN_DIR = path.join(__dirname, '..', 'data', 'hainan_scores');
const TIANJIN_DIR = path.join(__dirname, '..', 'data', 'tianjin_scores');

function findMixedFiles() {
  console.log('=== 查找混编数据文件 ===');
  const hainanFiles = fs.readdirSync(HAINAN_DIR).filter(f => f.endsWith('.json'));
  
  const mixedFiles = [];
  
  for (const hFile of hainanFiles) {
    const tFile = hFile;
    if (!fs.existsSync(path.join(TIANJIN_DIR, tFile))) continue;
    
    try {
      const hData = JSON.parse(fs.readFileSync(path.join(HAINAN_DIR, hFile), 'utf-8'));
      const tData = JSON.parse(fs.readFileSync(path.join(TIANJIN_DIR, tFile), 'utf-8'));
      
      if (!Array.isArray(hData) || !Array.isArray(tData)) continue;
      if (hData.length !== tData.length) continue;
      
      let isMixed = true;
      for (let i = 0; i < hData.length; i++) {
        const h = { ...hData[i] };
        const t = { ...tData[i] };
        delete h.province;
        delete t.province;
        
        if (JSON.stringify(h) !== JSON.stringify(t)) {
          isMixed = false;
          break;
        }
      }
      
      if (isMixed) {
        const match = hFile.match(/^(.+?)_(\d{4})_专业分数线/);
        if (match) {
          mixedFiles.push({
            school: match[1],
            year: parseInt(match[2]),
            file: hFile
          });
        }
      }
    } catch (e) {
      console.log(`  ⚠ 读取 ${hFile} 失败: ${e.message}`);
    }
  }
  
  console.log(`发现 ${mixedFiles.length} 个混编数据文件`);
  return mixedFiles;
}

function deleteMixedFiles(mixedFiles) {
  console.log(`\n=== 删除 ${mixedFiles.length} 个天津混编数据文件 ===`);
  let deleted = 0;
  
  for (const item of mixedFiles) {
    const filePath = path.join(TIANJIN_DIR, item.file);
    try {
      fs.unlinkSync(filePath);
      deleted++;
      console.log(`  ✅ 删除: ${item.file}`);
    } catch (e) {
      console.log(`  ❌ 删除失败: ${item.file} - ${e.message}`);
    }
  }
  
  console.log(`共删除 ${deleted} 个文件`);
}

function generateReScrapeList(mixedFiles) {
  console.log('\n=== 生成重新采集院校列表 ===');
  const schools = [...new Set(mixedFiles.map(f => f.school))];
  console.log(`需要重新采集的院校: ${schools.length} 所`);
  
  const outputPath = path.join(__dirname, '..', 'data', 'tianjin_rescrape_list.json');
  fs.writeFileSync(outputPath, JSON.stringify(schools, null, 2), 'utf-8');
  console.log(`列表已保存到: ${outputPath}`);
  
  return schools;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧹 清理混编数据工具');
  console.log('='.repeat(70));
  
  const mixedFiles = findMixedFiles();
  
  if (mixedFiles.length === 0) {
    console.log('\n✅ 未发现混编数据，无需清理');
    return;
  }
  
  console.log('\n混编数据文件列表（前20个）:');
  for (const item of mixedFiles.slice(0, 20)) {
    console.log(`  ${item.file}`);
  }
  if (mixedFiles.length > 20) {
    console.log(`  ... 还有 ${mixedFiles.length - 20} 个文件`);
  }
  
  console.log('\n⚠ 警告：删除后需要重新采集这些院校的天津数据');
  
  deleteMixedFiles(mixedFiles);
  generateReScrapeList(mixedFiles);
  
  console.log('\n' + '='.repeat(70));
  console.log('清理完成！');
  console.log('='.repeat(70));
  console.log('下一步：使用修复后的采集脚本重新采集');
  console.log('命令: node scripts/full_scrape_province.js');
}

main().catch(console.error);
