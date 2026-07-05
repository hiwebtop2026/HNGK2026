# 安全加固执行计划（续）

## Summary（摘要）

本计划接续上一次会话的安全加固工作。用户要求模拟外部攻击、找出安全薄弱环节并全面加固。经审计发现 3 个严重、5 个高危漏洞。已完成版本备份（git tag `v1.0.0-pre-security`）和部分密钥外部化，剩余工作为本计划范围。

**用户已确认的关键决策：**
1. 76 个含硬编码密钥的脚本**全部改为环境变量**模式（`load_dotenv()` + `os.environ.get()`）
2. **移除本地降级认证**（Supabase 失败时不再降级到 localStorage 弱哈希）

## Current State Analysis（当前状态分析）

### 已完成（上一会话）
- ✅ git tag `v1.0.0-pre-security` 已创建（回滚：`git reset --hard v1.0.0-pre-security`）
- ✅ `.env.example` 已创建（含 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY、SUPABASE_ANON_KEY）
- ✅ `.gitignore` 已添加 `__pycache__/`、`*.pyc`、`*.pyo`
- ✅ `src/lib/supabase.ts` 已移除硬编码 fallback，严格从环境变量读取

### 待完成（本计划范围）
经 Grep 确认，**76 个文件**仍硬编码 `SERVICE_ROLE_KEY` 或 `eyJhbGci`（JWT 特征）。前端认证、路由、写入接口、构建配置等均未加固。

## Proposed Changes（变更方案）

### 步骤 1：批量改造 Python/JS 脚本密钥外部化

**目标文件**：根目录及 `scripts/` 下共 76 个含硬编码密钥的 `.py`/`.mjs`/`.ts`/`.js` 文件。

**统一改造模式（Python）**：
```python
import os
from dotenv import load_dotenv
load_dotenv()
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    raise EnvironmentError("缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请在项目根目录 .env 文件中配置")
```

**统一改造模式（JS/MJS/TS）**：
```javascript
import dotenv from 'dotenv';
dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请在 .env 中配置');
}
```

**执行策略**：编写一次性 Node.js 脚本 `scripts/_externalize_keys.mjs`（用完即删），自动扫描所有命中文件，用正则替换硬编码行。脚本逻辑：
1. Grep 找出所有命中文件
2. 对每个文件，识别 `SUPABASE_URL = "..."`、`SERVICE_ROLE_KEY = "..."`、`SUPABASE_ANON_KEY = "..."`、`ANON_KEY = "..."` 赋值行
3. 在文件顶部插入 `import os` / `from dotenv import load_dotenv` / `load_dotenv()`（若不存在）
4. 将硬编码赋值替换为 `os.environ.get(...)` 形式
5. 在赋值后插入环境变量缺失校验

**execute_sql RPC 安全告警**：对 11 个调用 `supabase.rpc('execute_sql')` 或 `/rest/v1/rpc/execute_sql` 的脚本，在文件顶部 docstring 添加告警：
```python
"""
⚠️ 安全告警：本脚本使用 execute_sql RPC，该 RPC 可执行任意 SQL，存在 SQL 注入风险。
请在使用后于 Supabase Dashboard → Database → Functions 删除 execute_sql 函数。
"""
```

### 步骤 2：移除本地降级认证

**文件**：`src/store/authStore.ts`

**删除内容**：
- 常量 `USERS_KEY`、`CURRENT_USER_KEY`
- 函数 `getLocalUsers`、`saveLocalUsers`、`getLocalCurrentUser`、`saveLocalCurrentUser`、`hashPassword`、`registerLocal`、`loginLocal`
- `translateSupabaseError` 中 "Password should be at least 6 characters" 改为 "8"

**改造 `register`**：
- 密码策略：`password.length < 6` → `password.length < 8` 且必须含字母和数字（正则 `/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/`）
- 删除本地用户重复注册检查（`localUsers[email]`）
- 删除所有 `registerLocal` 调用分支（rate limit、空数据、catch 降级）
- Supabase `signUp` 失败直接 `set({ isLoading: false, error: translatedError })` 返回 false
- 删除"保存到本地作为备份"逻辑（`localUsers[email] = {...}`、`saveLocalUsers`、`saveLocalCurrentUser`）
- 保留 usage_logs 记录逻辑

**改造 `login`**：
- 密码校验同步改为 8 位
- 删除所有 `loginLocal` 调用分支（Email not confirmed、Invalid credentials、空数据、catch 降级）
- Supabase 失败直接报错
- 删除"保存到本地作为备份"逻辑

**改造 `logout`**：
- 删除 `else` 分支（本地模式登出）
- 保留 Supabase `signOut` + usage_logs 记录

**改造 `checkAuth`**：
- 删除 `else` 分支（`getLocalCurrentUser`）
- Supabase 未配置时 `set({ isAuthenticated: false, user: null, isLoading: false })`

### 步骤 3：RLS 修复 SQL

**新建文件**：`security_fix_rls.sql`（用户在 Supabase SQL Editor 执行）

```sql
-- 安全加固：修复 RLS 策略
-- 执行前请确认已轮换 service_role 密钥

-- 1. 启用 RLS
ALTER TABLE admission_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_info ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有旧策略（含危险的任意写策略）
DROP POLICY IF EXISTS "Enable select for all" ON admission_scores;
DROP POLICY IF EXISTS "Enable insert for all" ON admission_scores;
DROP POLICY IF EXISTS "Enable update for all" ON admission_scores;
DROP POLICY IF EXISTS "Enable delete for all" ON admission_scores;
-- (对 5 张表均执行 DROP POLICY IF EXISTS ...)

-- 3. 仅创建匿名 SELECT 策略（前端读取需要）
CREATE POLICY "Enable anonymous select" ON admission_scores FOR SELECT USING (true);
CREATE POLICY "Enable anonymous select" ON major_scores FOR SELECT USING (true);
CREATE POLICY "Enable anonymous select" ON score_distribution FOR SELECT USING (true);
CREATE POLICY "Enable anonymous select" ON subject_requirements FOR SELECT USING (true);
CREATE POLICY "Enable anonymous select" ON school_info FOR SELECT USING (true);
```

**历史 SQL 文件告警**：在 `fix_rls.sql`、`supabase_setup.sql`、`enable_rls_score_distribution.sql` 等历史 SQL 顶部添加：
```sql
-- ⚠️ 历史脚本，勿直接执行。RLS 策略已更新，请使用 security_fix_rls.sql
```

### 步骤 4：前端路由守卫与错误兜底

**新建文件**：`src/components/ProtectedRoute.tsx`
```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
```

**新建文件**：`src/components/ErrorBoundary.tsx`（类组件，捕获渲染异常，显示友好错误页 + "返回首页"按钮）

**改造 `src/App.tsx`**：
- 导入 `ProtectedRoute`、`ErrorBoundary`
- `/result`、`/analysis`、`/majorscore` 用 `<ProtectedRoute>` 包裹
- 整个 `<Router>` 用 `<ErrorBoundary>` 包裹
- 新增 `<Route path="*" element={<NotFoundPage />} />`（内联简单 404 组件）

**改造 `src/pages/AuthPage.tsx`**：
- 登录成功后跳回来源页：`const location = useLocation(); const from = (location.state as any)?.from || '/';`
- `useEffect` 中 `if (isAuthenticated) navigate(from, { replace: true });`

### 步骤 5：移除前端数据库写入接口

**文件**：`src/pages/MajorScorePage.tsx`
- 删除 `saveToDatabase` 函数（132-177 行）
- 删除"保存到数据库"按钮（314-323 行）
- 删除 `savedCount`、`showSaveSuccess` 状态变量
- 删除 `showSaveSuccess` 提示 UI
- 删除底部"点击保存到数据库"说明项

**文件**：`src/services/scoreDistributionService.ts`
- 删除 `insertBatch` 方法（310-325 行）
- 删除 `clearYear` 方法（327-344 行）
- 这两个方法允许前端匿名写/删数据库，数据导入应由 Python 脚本用 service_role 完成

### 步骤 6：Excel 上传加固

**文件**：`src/pages/HomePage.tsx`

新增常量（文件顶部或组件内）：
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
```

改造 `handleFileUpload`（317 行）：
```typescript
const handleFileUpload = async (uploadedFile: File) => {
  // 文件大小校验
  if (uploadedFile.size > MAX_FILE_SIZE) {
    setError('文件大小不能超过 5MB');
    return;
  }
  // 扩展名校验
  const ext = uploadedFile.name.toLowerCase().slice(uploadedFile.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    setError('仅支持 .xlsx 和 .xls 格式文件');
    return;
  }
  // 文件名长度校验
  if (uploadedFile.name.length > 200) {
    setError('文件名过长');
    return;
  }
  // MIME 类型校验（若浏览器提供）
  if (uploadedFile.type && !ALLOWED_MIME_TYPES.includes(uploadedFile.type)) {
    setError('文件类型不正确，仅支持 Excel 文件');
    return;
  }
  setFile(uploadedFile);
  setLoading(true);
  // ... 原有逻辑
};
```

input 的 `accept` 属性（722 行）：`accept=".xlsx,.xls"` → `accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"`

### 步骤 7：生产构建加固

**文件**：`vite.config.ts` 第 10 行
- `sourcemap: 'hidden'` → `sourcemap: false`
- 原因：`hidden` 仍生成 .map 文件（仅不在 bundle 引用），可能泄露源码；`false` 完全不生成

### 步骤 8：清理调试 console 日志

**目标文件**：`supabaseDataLoader.ts`、`scoreDistributionService.ts`、`majorScoreService.ts`、`admissionScoreService.ts`、`appStore.ts`、`dataUtils.ts`、`usageStore.ts`

**策略**：
- 删除纯调试的 `console.debug('[DEBUG]...')`、`console.log('[DEBUG]...')`
- 保留的 `console.warn`/`console.error` 用 `if (import.meta.env.DEV)` 包裹（仅开发环境输出）
- catch 块中 `console.error('原始错误', error)` 改为 DEV 模式才输出
- `scoreDistributionService.ts` 中的 `[getRankByScore]`、`[getStats]` 调试日志全部用 `import.meta.env.DEV` 包裹

### 步骤 9：密码策略与文案同步

**文件**：`src/pages/AuthPage.tsx`
- 第 104 行：`password.length < 6` → `password.length < 8`
- 新增字母+数字组合校验：`if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password)) { setError('密码至少8位，必须包含字母和数字'); return; }`
- 第 426 行注册指引文案："密码至少6位" → "密码至少8位，必须含字母和数字"
- 第 437 行邮箱验证说明：删除"系统会自动启用本地模式登录"句子，改为"部分邮箱可能收到验证邮件，请按邮件提示完成验证。如未收到，请检查垃圾邮件箱或稍后重试。"

## Assumptions & Decisions（假设与决策）

1. **密钥已泄露**：硬编码密钥已在 GitHub 历史，**用户必须在 Supabase 控制台轮换 service_role 和 anon key**（Dashboard → Settings → API → Rotation）。代码改造仅为后续防护。
2. **.env 不提交**：`.env` 已在 `.gitignore`，用户需在本地和部署环境手动创建并填入轮换后的真实密钥。
3. **Python 依赖**：脚本改造后需 `pip install python-dotenv`，用户需在本地环境安装。
4. **RLS 影响读取**：RLS 修复后前端只能 SELECT，写入由 Python 脚本用 service_role 完成（本应如此）。
5. **本地账号废弃**：移除本地降级后，已有 localStorage 本地账号将失效，用户需用 Supabase 重新注册。
6. **route guard 不影响首页**：`/`（首页）和 `/auth` 保持公开，`/result`、`/analysis`、`/majorscore` 需认证。
7. **76 个脚本改造用自动化脚本**：手动改造易出错，编写一次性 Node 脚本批量处理，用完删除。

## 用户需手动操作（代码外）

1. **在 Supabase 控制台轮换 service_role 和 anon 密钥**（Dashboard → Settings → API → Rotation）
2. **在 Supabase SQL Editor 执行 `security_fix_rls.sql`**
3. **在 Supabase 控制台删除 `execute_sql` RPC 函数**（Database → Functions）
4. **创建 `.env` 文件**填入轮换后的真实密钥（VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY、SUPABASE_ANON_KEY）
5. **安装 Python 依赖**：`pip install python-dotenv`
6. **GitHub 历史密钥无法擦除**：轮换即失效，无需重写历史

## 验证步骤

1. `npx tsc --noEmit`：TypeScript 编译无错误
2. `npm test`：所有测试通过（注意：authStore 测试若涉及本地降级需同步更新）
3. `npm run build`：构建成功，检查 `dist/assets/` 下无 `.map` 文件
4. 手动验证：
   - 未登录访问 `/result` 应跳转 `/auth`，登录后跳回 `/result`
   - Supabase 断网时登录直接报错（不降级）
   - 上传 >5MB 文件被拒绝
   - 上传 .txt 文件被拒绝
   - 生产环境控制台无 `[DEBUG]` 日志
   - MajorScorePage 无"保存到数据库"按钮
5. Python 脚本验证：任选一个脚本运行，无 .env 时报 EnvironmentError，有 .env 时正常

## 关键文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| 76 个 Python/JS 脚本 | 改造 | 硬编码密钥 → 环境变量 |
| `src/store/authStore.ts` | 重构 | 移除本地降级、密码 8 位+字母数字 |
| `src/components/ProtectedRoute.tsx` | 新建 | 认证守卫 |
| `src/components/ErrorBoundary.tsx` | 新建 | 错误边界 |
| `src/App.tsx` | 改造 | 路由守卫、ErrorBoundary、404 |
| `src/pages/AuthPage.tsx` | 改造 | 密码策略、跳回来源、文案 |
| `src/pages/MajorScorePage.tsx` | 改造 | 移除 saveToDatabase |
| `src/pages/HomePage.tsx` | 改造 | Excel 上传加固 |
| `src/services/scoreDistributionService.ts` | 改造 | 移除 insertBatch/clearYear、清理日志 |
| `vite.config.ts` | 改造 | sourcemap: false |
| `security_fix_rls.sql` | 新建 | RLS 修复脚本 |
| 7 个 service/util 文件 | 改造 | 清理 console 日志 |
| `scripts/_externalize_keys.mjs` | 新建+删除 | 一次性批量改造工具 |

## 风险评估

- **中风险**：移除本地降级后，Supabase 不可用时无法登录（可接受，本应如此）
- **中风险**：76 脚本批量改造可能遗漏个别文件（用 Grep 二次验证）
- **低风险**：RLS 修复后前端无法写库（本应如此）
- **低风险**：sourcemap: false 影响生产调试（可临时改回）
- **缓解**：所有改动向后兼容读取逻辑，git tag 可一键回滚
