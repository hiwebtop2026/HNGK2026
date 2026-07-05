# 安全加固收尾计划

## Summary（摘要）

本计划接续上一会话的安全加固工作，完成**尚未真正落地**的收尾步骤并提交推送。经 Phase 1 探索核实，上一次会话总结中标记为"已完成"的部分步骤实际存在缺口（UI 按钮已删但函数残留、`handleFileUpload` 校验未加入、AuthPage 跳回来源未实现、console 日志清理脚本未运行）。本计划仅覆盖这些真实缺口 + 验证 + 提交推送。

## Current State Analysis（核实后的真实状态）

### 已确认完成（未提交，105 个文件改动）
- ✅ 步骤 1：76 个脚本密钥外部化（Grep 确认无 `eyJhbGciOiJIUzI1NiIsInR5cCI` 硬编码 JWT、无 `SERVICE_ROLE_KEY = "..."` 硬编码赋值）
- ✅ 步骤 2：`src/store/authStore.ts` 已移除本地降级（无 `hashPassword`/`registerLocal`/`loginLocal`/`USERS_KEY`），新增 `isPasswordStrong()` 导出
- ✅ 步骤 3：`security_fix_rls.sql` 已创建；`fix_rls.sql`、`enable_rls_all_tables.sql`、`enable_rls_score_distribution.sql`、`enable_rls_score_distribution_view.sql` 已添加 ⚠️ 告警头
- ✅ 步骤 4（部分）：`src/components/ProtectedRoute.tsx`、`src/components/ErrorBoundary.tsx` 已创建；`src/App.tsx` 已用 `<ErrorBoundary>` 包裹、`/result`/`/analysis`/`/majorscore` 用 `<ProtectedRoute>` 包裹、新增 404 路由
- ✅ 步骤 5（部分）：`src/services/scoreDistributionService.ts` 已删除 `insertBatch`/`clearYear` 方法
- ✅ 步骤 7：`vite.config.ts` 已设 `sourcemap: false`
- ✅ 步骤 9（部分）：`src/pages/AuthPage.tsx` 密码校验已改为 8 位+字母数字，邮箱验证文案已更新
- ✅ 版本备份：git tag `v1.0.0-pre-security` 已创建

### 真实缺口（本计划范围）

| 缺口 | 核实依据 |
|------|----------|
| **A. AuthPage 跳回来源页未实现** | `src/pages/AuthPage.tsx` 中无 `useLocation` 导入、无 `location.state.from` 逻辑（Grep 仅命中 CSS 类名）|
| **B. MajorScorePage 残留死代码** | `src/pages/MajorScorePage.tsx` 第 54-55 行 `savedCount`/`showSaveSuccess` 状态、第 132-177 行 `saveToDatabase` 函数仍在（UI 按钮已删，函数未删）|
| **C. HomePage Excel 上传校验未加入** | `src/pages/HomePage.tsx` 第 317-339 行 `handleFileUpload` 直接 `setFile` 无任何校验；diff 仅改了 `accept` 属性 |
| **D. console 日志清理脚本未运行** | `scripts/_clean_logs.mjs` 已存在但未执行；6 个目标文件共 46 处 `console.debug/log` 仍未包裹（appStore 4、dataUtils 8、admissionScoreService 3、supabaseDataLoader 18、majorScoreService 2、scoreDistributionService 11）|
| **E. 验证 + 提交推送未做** | git log 显示最新提交仍为 `896d305`（安全加固前），105 个文件改动全部未提交 |

## Proposed Changes（变更方案）

### 变更 A：AuthPage 跳回来源页（步骤 4 收尾）

**文件**：`src/pages/AuthPage.tsx`

1. 第 2 行 `import { useNavigate } from 'react-router-dom';` → `import { useNavigate, useLocation } from 'react-router-dom';`
2. 在组件函数体顶部（`const navigate = useNavigate();` 之后）新增：
   ```typescript
   const location = useLocation();
   const from = (location.state as { from?: string } | null)?.from || '/';
   ```
3. 在 `register` 和 `login` 成功后的 `navigate('/', { replace: true })` 调用中，将 `'/'` 替换为 `from`（共 2 处，需用 Read 确认具体行号后精确替换）

### 变更 B：清理 MajorScorePage 死代码（步骤 5 收尾）

**文件**：`src/pages/MajorScorePage.tsx`

1. 删除第 54 行 `const [savedCount, setSavedCount] = useState(0);`
2. 删除第 55 行 `const [showSaveSuccess, setShowSaveSuccess] = useState(false);`
3. 删除第 132-177 行整个 `saveToDatabase` 函数（含前后空行）
4. 检查是否还有 `CheckCircle` 等仅被该函数/UI 使用的未使用 import，按需清理（避免 TS6133 noUnusedLocals 报错）

### 变更 C：HomePage Excel 上传校验（步骤 6 真正落地）

**文件**：`src/pages/HomePage.tsx`

1. 在文件顶部（`majorIcons` 定义附近或组件外）新增常量：
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
   const ALLOWED_MIME_TYPES = [
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'application/vnd.ms-excel',
   ];
   const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
   ```
2. 改造第 317 行 `handleFileUpload`，在 `setFile(uploadedFile)` 之前插入四道校验（大小 / 扩展名 / 文件名长度 / MIME），任一不满足则 `setError(...)` 并 `return`：
   ```typescript
   const handleFileUpload = async (uploadedFile: File) => {
     if (uploadedFile.size > MAX_FILE_SIZE) {
       setError('文件大小不能超过 5MB');
       return;
     }
     const lowerName = uploadedFile.name.toLowerCase();
     const ext = lowerName.slice(lowerName.lastIndexOf('.'));
     if (!ALLOWED_EXTENSIONS.includes(ext)) {
       setError('仅支持 .xlsx 和 .xls 格式文件');
       return;
     }
     if (uploadedFile.name.length > 200) {
       setError('文件名过长，请重命名后再上传');
       return;
     }
     if (uploadedFile.type && !ALLOWED_MIME_TYPES.includes(uploadedFile.type)) {
       setError('文件类型不正确，仅支持 Excel 文件');
       return;
     }
     setFile(uploadedFile);
     setLoading(true);
     // ... 原有 try/catch/finally 逻辑保持不变
   };
   ```

### 变更 D：运行 console 日志清理脚本（步骤 8）

1. 执行 `node scripts/_clean_logs.mjs`（cwd = 项目根目录）
2. 用 Grep 验证 6 个目标文件中 `console.(debug|log)(` 仅出现在 `if (import.meta.env.DEV)` 包裹后
3. 额外对 6 个目标文件中的 `console.error`/`console.warn`（约若干处，主要在 catch 块）也用 `if (import.meta.env.DEV)` 包裹——这些日志可能泄露内部错误细节，按原计划"保留的 warn/error 用 DEV 包裹"执行
4. `src/store/usageStore.ts` 中 3 处 `console.error`（usage 记录失败、stats 失败）一并包裹
5. 删除一次性脚本 `scripts/_clean_logs.mjs`

**注意**：包裹多行 `console.error(...)` 时，若一条语句跨多行，需用块语句 `if (import.meta.env.DEV) { ... }` 包裹，不能用单行 `if (...) console.error(...)`。

### 变更 E：验证 + 提交推送

1. `npx tsc --noEmit`：TypeScript 编译无错误（重点关注 MajorScorePage 删除死代码后的未使用 import、AuthPage 新增 useLocation 的类型）
2. `npm test`：所有测试通过（预期 39 个，若 authStore 测试涉及本地降级需确认已适配）
3. `npm run build`：构建成功
4. 验证 `dist/assets/` 下无 `.map` 文件（`Get-ChildItem dist/assets/*.map` 应为空）
5. `git add -A` → `git commit -m "安全加固：移除本地降级认证、密钥外部化、RLS修复、路由守卫、上传校验、日志清理"` → `git push origin main`

## Assumptions & Decisions（假设与决策）

1. **遵循原计划**：本收尾计划严格遵循上一会话已批准的 `security-hardening-execution-plan.md`，不新增功能、不改变决策
2. **console.error 一并包裹**：原计划明确"保留的 warn/error 用 DEV 包裹"，`_clean_logs.mjs` 仅处理 debug/log，需手动补齐 error/warn
3. **不删除纯调试日志**：采用包裹而非删除，降低误删风险，DEV 模式仍可调试
4. **AuthPage 跳回逻辑用 from 变量**：register 和 login 成功后都跳 `from`（默认 `/`），与 ProtectedRoute 的 `state={{ from: location.pathname }}` 配对
5. **提交前不修改 git tag**：`v1.0.0-pre-security` 保留作为回滚点

## 验证步骤

1. `npx tsc --noEmit` 零错误
2. `npm test` 全部通过
3. `npm run build` 成功，`dist/assets/` 无 `.map` 文件
4. Grep 确认 6 个目标文件 + usageStore 中无未包裹的 `console.(debug|log|warn|error)(`
5. Grep 确认 MajorScorePage 中无 `saveToDatabase`/`savedCount`/`showSaveSuccess`
6. Grep 确认 AuthPage 中存在 `useLocation` 和 `location.state`
7. Grep 确认 HomePage `handleFileUpload` 中存在 `MAX_FILE_SIZE`/`ALLOWED_EXTENSIONS` 校验
8. git log 确认新提交已推送至 `origin/main`

## 用户需手动操作（代码外，提醒不变）

1. 在 Supabase 控制台轮换 service_role 和 anon 密钥
2. 在 Supabase SQL Editor 执行 `security_fix_rls.sql`
3. 在 Supabase 控制台删除 `execute_sql` RPC 函数
4. 创建 `.env` 文件填入轮换后的真实密钥
5. 安装 Python 依赖：`pip install python-dotenv`

## 风险评估

- **低风险**：MajorScorePage 删除死代码可能触发未使用 import 报错 → tsc 验证可捕获，按需清理
- **低风险**：console.error 包裹成块语句时缩进/语法错误 → tsc 验证可捕获
- **低风险**：AuthPage `from` 变量类型断言 → 使用 `as { from?: string } | null` 安全断言
