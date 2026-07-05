# 安全加固实施方案

## Context（背景）

用户要求模拟外部攻击，找出安全薄弱环节并全面加固。经两路并行安全审计，发现 **3个严重、5个高危、6个中危、5个低危** 漏洞，其中最致命的是：
- **service_role 密钥硬编码在 40+ 个 Python 脚本中且已推送到 GitHub**（可绕过所有数据库安全策略）
- **核心业务表 RLS 被禁用**（anon key 即可任意篡改录取数据）
- **认证本地降级**（Supabase 失败时自动降级到弱哈希本地认证，可被身份绕过）

用户决策：①密钥改为环境变量+gitignore（用户自行在Supabase轮换）②移除本地降级 ③git标签备份。

---

## 实施步骤

### 步骤1：版本备份（git标签）

```bash
git tag -a v1.0.0-pre-security -m "安全加固前最后一个稳定版本"
```
回滚方法：`git reset --hard v1.0.0-pre-security`

### 步骤2：密钥外部化

1. **创建 `.env.example`**：提供 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 的模板
2. **更新 `.gitignore`**：确保 `.env` 被忽略，添加 `__pycache__/`、`*.pyc`
3. **修改 `src/lib/supabase.ts`**：移除硬编码 fallback，严格从环境变量读取，缺失时 `isSupabaseConfigured=false`
4. **改造 31 个 Python 脚本**：统一模式 `load_dotenv()` + `os.environ.get()` + 缺失时抛 EnvironmentError。涉及根目录 17 个和 scripts/ 下 5+ 个文件（fix_rls.py、clear_and_import.py、fast_import.py、import_complete.py、check_*.py 等）
5. **废弃 execute_sql RPC 调用**：在 11 个使用 `supabase.rpc('execute_sql')` 的脚本顶部添加安全警告注释；用户需在 Supabase 控制台删除该 RPC 函数

### 步骤3：移除本地降级认证

**文件**：`src/store/authStore.ts`

- 删除 `hashPassword`、`registerLocal`、`loginLocal`、`getLocalUsers`、`saveLocalUsers` 等本地认证函数和常量
- `register`：Supabase 失败时直接报错，不再降级；密码策略改为至少8位+必须含字母和数字
- `login`：Supabase 失败时直接报错，不再降级
- `logout`：删除本地登出分支，统一走 Supabase
- `checkAuth`：删除本地用户读取分支，Supabase 未配置时置为未认证

### 步骤4：RLS 修复 SQL

**新建文件**：`security_fix_rls.sql`（用户在 Supabase Dashboard → SQL Editor 执行）

- 对 `admission_scores`、`major_scores`、`score_distribution`、`subject_requirements`、`school_info` 5 张表 `ENABLE ROW LEVEL SECURITY`
- 删除所有旧策略（包括 score_distribution 允许任意认证用户 INSERT/UPDATE/DELETE 的危险策略）
- 仅创建 `FOR SELECT USING (true)` 策略（前端匿名读取需要）
- 在历史 SQL 文件（fix_rls.sql、enable_rls_score_distribution.sql 等）顶部添加告警注释

### 步骤5：前端认证守卫

1. **新建 `src/components/ProtectedRoute.tsx`**：未认证时重定向到 `/auth`，携带来源路径
2. **改造 `src/App.tsx`**：
   - `/result`、`/analysis`、`/majorscore` 用 `<ProtectedRoute>` 包裹
   - 添加 `ErrorBoundary` 类组件捕获渲染异常
   - 添加 `NotFoundPage` 404 兜底路由（`path="*"`）
3. **`src/pages/AuthPage.tsx`**：登录后优先跳回来源页（`location.state.from`）

### 步骤6：移除前端写入功能

1. **`src/pages/MajorScorePage.tsx`**：删除 `saveToDatabase` 函数、"保存到数据库"按钮、相关状态变量
2. **`src/services/scoreDistributionService.ts`**：删除 `clearYear` 和 `insertBatch` 方法（数据导入通过 Python 脚本用 service_role 完成）

### 步骤7：Excel 上传加固

**文件**：`src/pages/HomePage.tsx`

- 添加 `MAX_FILE_SIZE=5MB`、`ALLOWED_MIME_TYPES`、`ALLOWED_EXTENSIONS` 常量
- `handleFileUpload` 增加文件大小校验、MIME 类型校验、文件名长度校验
- input 的 `accept` 属性增加 MIME 类型

### 步骤8：生产构建加固

**文件**：`vite.config.ts`：`sourcemap: 'hidden'` → `sourcemap: false`

### 步骤9：清理 console 日志

**涉及文件**：`supabaseDataLoader.ts`、`scoreDistributionService.ts`、`majorScoreService.ts`、`admissionScoreService.ts`、`appStore.ts`、`dataUtils.ts`、`usageStore.ts`

- 删除纯调试的 `[DEBUG]` 日志
- 保留的日志用 `if (import.meta.env.DEV)` 包裹
- catch 块中输出原始错误的改为 DEV 模式下才输出

### 步骤10：密码策略与文案同步

**文件**：`src/pages/AuthPage.tsx`
- 密码校验从 6 位改为 8 位+必须含字母和数字
- 注册指引弹窗文案同步更新
- 移除"系统会自动启用本地模式登录"的说明

---

## 关键文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/store/authStore.ts` | 移除本地降级、密码策略加强（改动最大） |
| `src/App.tsx` | 路由守卫、ErrorBoundary、404 |
| `src/lib/supabase.ts` | 移除硬编码 fallback |
| `src/components/ProtectedRoute.tsx` | 新建：认证守卫组件 |
| `src/pages/MajorScorePage.tsx` | 移除 saveToDatabase |
| `src/pages/AuthPage.tsx` | 密码策略、文案、跳回来源页 |
| `src/pages/HomePage.tsx` | Excel 上传加固 |
| `src/services/scoreDistributionService.ts` | 移除 clearYear/insertBatch、清理日志 |
| `vite.config.ts` | sourcemap: false |
| `security_fix_rls.sql` | 新建：RLS 修复脚本 |
| `.env.example` | 新建：环境变量模板 |
| `.gitignore` | 更新 |
| 31 个 Python 脚本 | 密钥改为环境变量 |

## 用户需手动操作（代码外）

1. **在 Supabase 控制台轮换 service_role 密钥**（Dashboard → Settings → API → Rotation）
2. **在 Supabase SQL Editor 执行 `security_fix_rls.sql`**
3. **在 Supabase 控制台删除 `execute_sql` RPC 函数**（Database → Functions）
4. **创建 `.env` 文件**填入轮换后的真实密钥
5. **安装 Python 依赖**：`pip install python-dotenv`

## 验证方法

1. `npx tsc --noEmit`：TypeScript 编译无错误
2. `npm test`：39 个测试全部通过
3. `npm run build`：构建成功，`dist/assets/` 下无 `.map` 文件
4. 手动验证：
   - 未登录访问 `/result` 应跳转 `/auth`
   - Supabase 断网时登录直接报错（不降级）
   - 上传 >5MB 文件被拒绝
   - 生产环境控制台无 `[DEBUG]` 日志

## 风险评估
- **中风险**：移除本地降级后，已有本地账号用户需重新注册（但本地账号本就是临时方案）
- **低风险**：RLS 修复后前端无法写入数据库（本应如此，数据导入由 Python 脚本完成）
- **缓解**：所有改动向后兼容读取逻辑，Excel 上传仅用于前端临时计算不写库
