import { readFileSync } from 'fs';
import { exec } from 'child_process';

const logPath = 'C:\\Users\\lhp\\AppData\\Local\\Temp\\trae-agent-toolhost\\jobs\\job-8f4a297226af430f932dc7b49381a218\\output.log';
const maxRetries = 5;
let retryCount = 0;

console.log('开始监控采集任务...');
console.log('日志文件:', logPath);

function getCurrentIndex(content) {
    const match = content.match(/\[(\d+)\/\d+\]/);
    if (match) {
        return parseInt(match[1]);
    }
    return 699;
}

function killProcesses() {
    return new Promise((resolve) => {
        exec('taskkill /F /IM node.exe /T', () => {
            exec('taskkill /F /IM chrome.exe /T', () => {
                setTimeout(resolve, 3000);
            });
        });
    });
}

async function restartTask(content) {
    const currentIndex = getCurrentIndex(content);
    console.log(`🔄 重启采集任务，从索引 ${currentIndex} 开始...`);
    
    await killProcesses();
    
    setTimeout(() => {
        exec('cd i:\\trae_projects\\GAOKAO2026 && node scripts\\full_scrape_province.js ' + currentIndex, {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
        });
        console.log('✅ 采集任务已重启');
    }, 5000);
}

function checkCompletion() {
    try {
        const content = readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').slice(-30);
        
        if (lines.some(line => line.includes('采集完成'))) {
            console.log('✅ 采集任务已完成！');
            console.log('准备执行关机...');
            setTimeout(() => {
                exec('shutdown /s /t 30 /c "数据采集任务已完成，系统将在30秒后关机"');
            }, 5000);
            return;
        }
        
        if (lines.some(line => line.includes('采集失败'))) {
            if (retryCount >= maxRetries) {
                console.log(`⚠️ 采集任务失败，已重试 ${maxRetries} 次，执行关机...`);
                setTimeout(() => {
                    exec('shutdown /s /t 30 /c "数据采集任务失败，已重试多次，系统将在30秒后关机"');
                }, 5000);
                return;
            }
            retryCount++;
            console.log(`⚠️ 采集任务失败！正在第 ${retryCount} 次重启...`);
            restartTask(content);
            setTimeout(checkCompletion, 120000);
            return;
        }
        
        exec('tasklist /FI "IMAGENAME eq node.exe"', (err, stdout) => {
            const nodeRunning = stdout.includes('node.exe');
            exec('tasklist /FI "IMAGENAME eq chrome.exe"', (err2, stdout2) => {
                const chromeRunning = stdout2.includes('chrome.exe');
                
                if (!nodeRunning && !chromeRunning) {
                    if (content.includes('采集完成')) {
                        console.log('✅ 采集任务已完成！');
                        console.log('准备执行关机...');
                        setTimeout(() => {
                            exec('shutdown /s /t 30 /c "数据采集任务已完成，系统将在30秒后关机"');
                        }, 5000);
                        return;
                    }
                    
                    if (retryCount >= maxRetries) {
                        console.log(`⚠️ 采集进程已停止，已重试 ${maxRetries} 次，执行关机...`);
                        setTimeout(() => {
                            exec('shutdown /s /t 30 /c "数据采集进程已停止，已重试多次，系统将在30秒后关机"');
                        }, 5000);
                        return;
                    }
                    
                    retryCount++;
                    console.log(`⚠️ 采集进程已停止！正在第 ${retryCount} 次重启...`);
                    restartTask(content);
                    setTimeout(checkCompletion, 120000);
                    return;
                }
                
                const lastLine = lines[lines.length - 1] || '';
                console.log('📊 监控中... 当前进度:', lastLine.substring(0, 50));
                setTimeout(checkCompletion, 60000);
            });
        });
    } catch (e) {
        console.log('⚠️ 读取日志失败:', e.message);
        setTimeout(checkCompletion, 60000);
    }
}

checkCompletion();