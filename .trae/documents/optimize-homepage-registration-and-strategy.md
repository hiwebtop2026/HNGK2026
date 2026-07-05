# 首页布局调整+注册优化+冲稳保策略修复 实施方案

## Context（背景）

用户反馈两个问题：
1. 首页提示注册的 banner 与"选择地区和科目"栏位置需互换；注册功能需增加昵称设置，并增加注册指引弹窗。
2. 一键生成志愿方案时，冲稳保院校数量没有遵守所选策略的分值及数量配置。

经探索发现核心问题：
- **策略配置重复定义且不一致**：`strategyConfig.ts`（逻辑用）与 `appStore.ts`（UI显示用）两处定义，"保守"和"个性化"策略数值不一致，导致用户看到的数量与实际生成不符。
- **分数范围筛选与策略分值脱节**（最严重）：用固定 `scoreRange±15` 筛选候选院校，但海南高分制下保档要求院校分低于考生分 20+，超出了筛选范围，导致保档院校数量严重不足甚至为 0。
- **冲档不足时无反向再平衡**：只有"保不足→稳""稳不足→冲"，缺少"冲不足→稳/保"，高分考生总数会少于配置。
- 注册功能缺少昵称字段，无注册指引弹窗。

---

## 任务1：首页布局与注册优化

### 1.1 首页 banner 与地区/选科栏位置互换

**文件**：`src/pages/HomePage.tsx`

- 将行 661-690 的未认证提示 banner JSX 块从 `<main>` 内移出
- 插入到行 545（地区/选科栏）**之前**，置于页首固定区域
- 最终顺序：`</header>` → banner → 地区/选科栏 → `<main>`（数据上传卡片...）
- 调整 margin：banner 改为 `mb-4`（避免与地区栏间距过大）

### 1.2 注册功能增加昵称

**文件**：`src/store/authStore.ts` + `src/pages/AuthPage.tsx`

1. **authStore.ts**：
   - `User` 接口增加 `nickname: string` 字段（行 4-8）
   - `register` 方法签名增加 `nickname` 参数（行 18）
   - 本地存储类型 `getLocalUsers/saveLocalUsers` 增加 nickname 字段（行 30-37）
   - `registerLocal` 函数增加 nickname 参数与校验（行 87-113）
   - Supabase `signUp` 调用传 `options.data: { nickname }`（行 178-181）
   - `loginLocal`/`login`/`checkAuth` 读取 nickname（兼容旧数据用 `email.split('@')[0]` 兜底）

2. **AuthPage.tsx**：
   - 新增 `nickname` state（行 53-56）
   - 在邮箱字段前插入昵称输入框（仅 register 模式显示，maxLength=20）
   - `handleSubmit` 增加昵称校验（2-20字符）
   - 已登录视图显示"欢迎回来，{nickname}"（行 122-126）
   - 提交按钮 disabled 条件增加 `!nickname.trim()` 校验

### 1.3 注册指引弹窗

**文件**：`src/pages/AuthPage.tsx`

- 新增 `showGuide` state（boolean）
- 首次进入注册页时自动弹出（用 `sessionStorage.hngk_guide_shown` 防重复打扰）
- 在模式切换区域增加"注册指引"按钮（带 Info 图标）可手动唤起
- 复用 `AnalysisPage.tsx` 行 384-490 的内联 Modal 模式：`fixed inset-0 bg-black/50 backdrop-blur-sm z-50`
- 弹窗内容：4 个步骤卡片（设置昵称→填写邮箱→设置密码→邮箱验证说明）
- 关闭方式：右上角 × 按钮或底部"我已了解，开始注册"按钮

---

## 任务2：冲稳保策略数量修复

### 2.1 统一策略配置（消除重复定义）

**文件**：`src/config/strategyConfig.ts` + `src/store/appStore.ts`

1. **strategyConfig.ts** 行 49-59：修正"个性化"配置，使其真正不同于"稳妥"：
   ```
   chongRatio: 0.3, wenRatio: 0.4, baoRatio: 0.3
   chongScoreDiff: 15, wenScoreDiff: 5, baoScoreDiff: 15
   ```
2. **appStore.ts** 行 9-68：删除本地 `StrategyType`/`StrategyConfig`/`STRATEGY_CONFIGS` 重复定义
3. 改为从 `strategyConfig.ts` 导入并重新导出（保持 HomePage.tsx 行 16 的 `import { STRATEGY_CONFIGS } from '../store/appStore'` 引用不变）：
   ```typescript
   import { STRATEGY_CONFIGS } from '../config/strategyConfig';
   export { STRATEGY_CONFIGS };
   export type { StrategyType } from '../config/strategyConfig';
   ```

### 2.2 修复分数范围筛选与策略分值脱节（核心修复）

**文件**：`src/utils/volunteerUtils.ts` 行 461-465

将固定 `scoreRange` 改为"用户 scoreRange 与策略所需范围取较大值"：

```typescript
const isHighScore = isHighScoreSystem(province);
const strategyMaxDiff = Math.max(
  strategyConfig.chongScoreDiff,
  strategyConfig.wenScoreDiff,
  strategyConfig.baoScoreDiff
);
// 海南高分制下 scoreDiff/2 才是 adjustedDiff，筛选范围需 ×2
const strategyRequiredRange = isHighScore ? strategyMaxDiff * 2 : strategyMaxDiff;
const effectiveRange = Math.max(scoreRange, strategyRequiredRange);

const inRange = filtered.filter(s => {
  const refScore = getRefScore(s.score2025, s.score2024, s.score2023);
  return refScore >= baseScore - effectiveRange && refScore <= baseScore + effectiveRange;
});
```

**效果**：海南保守策略下，筛选范围从 ±15 扩大到 ±40（max(15, 20×2)），覆盖保档区间。

### 2.3 增加冲档不足时的反向再平衡

**文件**：`src/utils/volunteerUtils.ts` 行 492-507

在模块顶层（`getSmartTier` 之前）新增辅助函数：

```typescript
function transferOverflow(
  overflow: number,
  priorities: Array<'chong' | 'wen' | 'bao'>,
  current: { chong: number; wen: number; bao: number },
  pools: { chong: number; wen: number; bao: number }
): void {
  let remaining = overflow;
  for (const tier of priorities) {
    if (remaining <= 0) break;
    const room = pools[tier] - current[tier];
    const add = Math.min(remaining, Math.max(0, room));
    current[tier] += add;
    remaining -= add;
  }
}
```

替换行 492-507 为完整的四轮双向再平衡：
1. 保不足 → 让给稳，再让给冲
2. 稳不足 → 让给冲，再让给保
3. **冲不足 → 让给稳，再让给保**（新增）
4. **兜底补足**：剩余配额按"保→稳→冲"优先级填补（新增）

### 2.4 UI 显示同步

**文件**：`src/pages/HomePage.tsx` 行 1042-1046、1095-1112

- 行 1042-1046：UI 计算的 chongCount/wenCount/baoCount 是"理论目标数"，因 2.1 已统一配置源，显示数值与实际逻辑一致
- 行 1095-1112：显示的 `chongScoreDiff/wenScoreDiff/baoScoreDiff` 因 2.1 统一配置源，自动与实际逻辑同步

---

## 验证方法

### 功能验证
1. `npm test`：确保现有 39 个测试全部通过
2. `npx tsc --noEmit`：TypeScript 编译无错误
3. **首页布局**：未登录时 banner 在地区栏上方；登录后 banner 消失
4. **注册流程**：填写昵称/邮箱/密码 → 注册成功 → 显示"欢迎回来，{nickname}"
5. **注册指引弹窗**：首次进入注册页自动弹出，关闭后不再自动弹出，可手动唤起
6. **策略一致性**：切换 4 种策略，UI 显示的分差 = 实际生成逻辑使用的分差
7. **保档数量**：海南保守策略下，保档院校数量 ≥ 1（数据存在前提下）
8. **总数满足**：高分考生激进策略下，志愿总数接近 totalVolunteers

### 兼容性验证
1. 旧 localStorage 用户登录无障碍（nickname 缺失时回退到 email 前缀）
2. 4 种策略切换后生成的志愿数量分布符合预期

---

## 关键文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/pages/HomePage.tsx` | banner/地区栏位置互换；UI 显示同步 |
| `src/pages/AuthPage.tsx` | 昵称字段；注册指引弹窗；已登录视图 |
| `src/store/authStore.ts` | User 接口扩展；register/login/checkAuth 全套更新 |
| `src/config/strategyConfig.ts` | 修正"个性化"配置 |
| `src/store/appStore.ts` | 删除重复策略配置，改为重新导出 |
| `src/utils/volunteerUtils.ts` | 修复筛选范围(行461-465)；增加反向再平衡(行492-507)；新增 transferOverflow 函数 |

## 风险评估
- **中风险**：authStore 状态结构变更，需保证向后兼容（旧 localStorage 数据无 nickname）
- **中风险**：扩大筛选范围会增加候选集，可能轻微影响性能（更多院校参与位次分析）
- **低风险**：首页布局和弹窗为纯 UI 改动
- **缓解**：所有变更向后兼容，旧数据通过兜底逻辑处理
