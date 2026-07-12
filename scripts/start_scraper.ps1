Write-Host "================================================"
Write-Host "天津高考近三年专业分数线采集工具"
Write-Host "================================================"
Write-Host ""

Write-Host "[1/4] 正在启动Edge浏览器（远程调试模式）..." -ForegroundColor Cyan
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$arguments = "--remote-debugging-port=9222 --remote-allow-origins=* --no-first-run --no-default-browser-check"
Start-Process -FilePath $edgePath -ArgumentList $arguments
Write-Host "Edge浏览器已启动" -ForegroundColor Green

Write-Host ""
Write-Host "[2/4] 等待浏览器启动..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[3/4] 请手动操作：" -ForegroundColor Yellow
Write-Host "      1. 在浏览器中打开夸克高考页面" -ForegroundColor White
Write-Host "      2. 登录账号（如需要）" -ForegroundColor White
Write-Host "      3. 切换到专业分数线页面" -ForegroundColor White
Write-Host "      4. 确认页面显示正常后按任意键继续..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "[4/4] 启动全量数据采集脚本..." -ForegroundColor Cyan
cd $PSScriptRoot
python tianjin_selenium_scraper.py --all

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "采集完成！按任意键退出..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")