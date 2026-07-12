@echo off
chcp 65001 >nul
echo ================================================
echo 天津高考近三年专业分数线采集工具
echo ================================================
echo.

echo [1/4] 正在启动Edge浏览器（远程调试模式）...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --remote-allow-origins=* --no-first-run --no-default-browser-check

echo [2/4] 等待浏览器启动...
timeout /t 10 /nobreak >nul

echo.
echo [3/4] 请手动操作：
echo       1. 在浏览器中打开夸克高考页面
echo       2. 登录账号（如需要）
echo       3. 切换到专业分数线页面
echo       4. 确认页面显示正常后按任意键继续...
pause >nul

echo.
echo [4/4] 启动数据采集脚本...
cd /d "%~dp0"
python tianjin_auto_scraper.py --missing

echo.
echo ================================================
echo 采集完成！按任意键退出...
pause >nul