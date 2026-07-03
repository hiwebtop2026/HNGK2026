# 高考志愿自动生成程序 - 开发说明书（优化版）

## 1. 项目概述

### 1.1 项目简介

本项目是一款面向**海南省高考考生**的智能志愿填报辅助系统，基于海南省考试局官方数据和夸克高考大数据，为考生提供科学、精准的志愿推荐服务。系统核心价值在于帮助考生和家长**降低志愿填报风险、提高录取概率、实现分数价值最大化**。

### 1.2 产品定位

| 维度 | 定位 |
|------|------|
| 目标用户 | 海南省高考考生（物理类/历史类）及家长、高中升学指导老师 |
| 核心价值 | 科学志愿规划，精准定位院校，降低落榜风险 |
| 产品形态 | Web应用（支持PC端和移动端） |
| 数据来源 | 海南省考试局官方数据 + 夸克高考大数据 |

### 1.3 核心功能

| 功能模块 | 功能描述 | 用户价值 |
|---------|---------|---------|
| **智能志愿生成** | 根据考生分数、选科、偏好自动生成冲稳保梯度志愿方案 | 快速生成科学的志愿填报方案 |
| **专业精准推荐** | 基于院校投档线和专业热度，推荐适合的专业 | 帮助选择理想专业，匹配个人兴趣 |
| **一分一段分析** | 基于海南省官方一分一段表计算考生位次和百分位 | 精准定位考生全省排名位置 |
| **趋势分析** | 展示院校历年投档线变化趋势和位次波动 | 帮助判断院校录取难度变化 |
| **风险评估** | 评估志愿方案的整体风险，给出优化建议 | 降低落榜风险，提高录取把握 |
| **志愿对比** | 支持多所院校/专业横向对比 | 帮助做出更优选择 |
| **数据管理** | 支持从Excel导入和从Supabase云端加载数据 | 灵活的数据获取方式 |
| **志愿导出** | 将生成的志愿方案导出为Excel文件 | 方便线下打印和分享 |

### 1.4 产品愿景

> **让每个海南考生都能填报出科学、合理、无悔的志愿方案**

---

## 2. 技术架构

### 2.1 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | React | 18.3.1 | UI组件构建 |
| 语言 | TypeScript | ~5.8.3 | 类型安全开发 |
| 构建工具 | Vite | 6.3.5 | 开发服务器和打包 |
| 路由 | React Router DOM | 7.3.0 | 页面路由管理 |
| 状态管理 | Zustand | 5.0.3 | 全局状态管理 |
| UI样式 | Tailwind CSS | 3.4.17 | 原子化CSS框架 |
| 图标 | Lucide React | 0.511.0 | 图标库 |
| 数据库 | Supabase | 2.108.2 | PostgreSQL云数据库 |
| Excel处理 | xlsx | 0.18.5 | Excel文件读写 |
| 图表 | Recharts | 2.12.7 | 数据可视化图表 |
| 测试 | Vitest | 4.1.9 | 单元测试框架 |

### 2.2 项目目录结构

```
GAOKAO2026/
├── src/                    # 前端源代码
│   ├── components/         # 通用组件（表单、卡片、图表等）
│   ├── data/               # 静态数据（院校数据、专业数据、一分一段表）
│   ├── hooks/              # 自定义Hooks（数据加载、表单处理等）
│   ├── lib/                # 基础设施（Supabase配置、工具函数）
│   ├── pages/              # 页面组件
│   ├── services/           # 数据服务层（Supabase API封装）
│   ├── store/              # Zustand状态管理
│   ├── utils/              # 业务工具函数（志愿算法、数据处理）
│   ├── types/              # 全局类型定义
│   ├── App.tsx             # 根组件
│   ├── main.tsx            # 入口文件
│   └── index.css           # 全局样式
├── scripts/                # 数据导入脚本
├── data/                   # 爬虫脚本和临时数据
├── public/                 # 静态资源
├── supabase_*.sql          # 数据库建表脚本
├── package.json            # 依赖配置
├── vite.config.ts          # Vite配置
└── tailwind.config.js      # Tailwind配置
```

### 2.3 核心模块说明

| 模块 | 路径 | 职责 | 关键函数 |
|------|------|------|---------|
| 志愿算法 | `src/utils/volunteerUtils.ts` | 志愿筛选、冲稳保分配、录取概率计算 | `generateVolunteerPlan()`、`calculateAdmissionProbability()` |
| 专业推荐 | `src/utils/majorRecommender.ts` | 专业分数预估、热度评估、推荐排序 | `recommendMajors()`、`estimateMajorScore()` |
| 数据工具 | `src/utils/dataUtils.ts` | 选科匹配、参考分计算、位次查询 | `matchSubjects()`、`calculateRank()`、`getReferenceScore()` |
| 趋势分析 | `src/utils/trendAnalyzer.ts` | 历年趋势计算、位次波动分析 | `calculateTrend()`、`analyzeRankChange()` |
| 院校数据服务 | `src/services/admissionScoreService.ts` | 投档分数线数据CRUD | `getByYear()`、`getBySchool()`、`searchSchools()` |
| 专业数据服务 | `src/services/majorScoreService.ts` | 专业分数线数据CRUD | `getBySchool()`、`searchMajors()`、`getAllSchools()` |
| 状态管理 | `src/store/appStore.ts` | 应用状态（输入参数、结果、加载状态） | - |
| 认证状态 | `src/store/authStore.ts` | 用户登录/注册状态 | - |
| Supabase配置 | `src/lib/supabase.ts` | 数据库连接配置 | - |

---

## 3. 用户体验设计

### 3.1 用户旅程图

```
考生进入首页
  ↓
输入分数和选科（智能提示引导）
  ↓
查看位次分析（实时计算）
  ↓
设置筛选条件（院校层次、性质、区域、专业类别）
  ↓
调整冲稳保策略（可视化滑块）
  ↓
生成志愿方案（一键生成）
  ↓
查看志愿列表（按冲稳保分组展示）
  ↓
查看详情（投档线、趋势、专业推荐）
  ↓
调整排序（拖拽排序）
  ↓
导出Excel（一键导出）
  ↓
保存方案（登录后保存）
```

### 3.2 核心交互优化

#### 3.2.1 输入体验优化

**分数输入**：
- 默认值为空，必须手动输入（符合项目约束）
- 输入时实时显示位次和百分位
- 超出合理范围（0-900）时给出警告

**选科选择**：
- 支持数字代码和文字描述两种格式
- 提供选科对照说明（1物理、2化学、3生物、4政治、5历史、6地理）
- 输入时实时验证选科格式

**筛选条件**：
- 采用折叠式面板，默认只显示核心条件
- 提供"智能推荐"按钮，根据分数自动设置合理筛选条件
- 筛选条件变更时实时预览可选院校数量

#### 3.2.2 结果展示优化

**志愿列表**：
- 按冲稳保分组，每组用不同颜色标识
- 显示录取概率的可视化进度条
- 支持按分数、概率、院校名称排序
- 支持快速筛选和搜索

**院校详情卡片**：
- 展示院校基本信息（名称、层次、省份、批次）
- 展示历年投档线趋势图
- 展示推荐专业列表
- 显示风险评估指标

#### 3.2.3 智能引导

- 首次使用时提供操作指引
- 根据分数给出合理的冲稳保比例建议
- 当可选院校数量过少/过多时给出提示
- 志愿方案生成后提供优化建议

### 3.3 响应式设计

| 设备 | 布局策略 | 关键适配 |
|------|---------|---------|
| 桌面端（≥1200px） | 双栏布局，左侧筛选，右侧结果 | 完整功能展示 |
| 平板端（768-1199px） | 单栏布局，筛选面板可折叠 | 核心功能保留 |
| 移动端（<768px） | 单栏布局，精简筛选条件 | 仅保留关键功能 |

---

## 4. 核心算法说明

### 4.1 志愿筛选流程

```
输入: 考生分数、选科、志愿数量、筛选条件
  ↓
1. 选科匹配（subject字段匹配）
  ↓
2. 院校层次筛选（985/211/双一流/普通本科）
  ↓
3. 院校性质筛选（公办/民办）
  ↓
4. 省份/区域筛选
  ↓
5. 专业类别筛选（基于关键词匹配）
  ↓
6. 分数范围筛选（考生分数 ± scoreRange）
  ↓
7. 参考分计算（优先2025年，其次2024/2023年加权）
  ↓
8. 位次匹配（基于一分一段表计算院校位次）
  ↓
9. 趋势分析（计算历年位次变化趋势）
  ↓
10. 按参考分排序（降序）
  ↓
11. 分配冲稳保档次
  ↓
12. 生成专业推荐
  ↓
13. 风险评估
  ↓
输出: 志愿方案数组（含录取概率、趋势、专业推荐）
```

### 4.2 冲稳保档次算法

#### 4.2.1 档次划分规则

| 档次 | 条件 | 默认比例 | 颜色标识 |
|------|------|---------|---------|
| **冲** | 参考分 > 考生分数 + 冲分数差 | 30% | 🔴 红色 |
| **稳** | 考生分数 - 稳分数差 ≤ 参考分 ≤ 考生分数 + 冲分数差 | 40% | 🟡 黄色 |
| **保** | 参考分 < 考生分数 - 稳分数差 | 30% | 🟢 绿色 |

#### 4.2.2 默认参数

```typescript
// 默认分数差配置
const DEFAULT_CONFIG = {
  chongScoreDiff: 10,   // 冲：高于考生分数10分以内
  wenScoreDiff: 5,      // 稳：上下5分
  baoScoreDiff: 15,     // 保：低于考生分数15分以上
  
  // 默认数量分配（30个志愿）
  chongCount: 9,        // 9个冲刺（30%）
  wenCount: 12,         // 12个稳妥（40%）
  baoCount: 9,          // 9个保底（30%）
};

// 智能推荐参数（根据分数区间自动调整）
const SMART_CONFIGS = {
  highScore: {          // 高分段（≥700分）
    chongScoreDiff: 8,
    wenScoreDiff: 4,
    baoScoreDiff: 12,
  },
  middleScore: {        // 中分段（500-700分）
    chongScoreDiff: 10,
    wenScoreDiff: 5,
    baoScoreDiff: 15,
  },
  lowScore: {           // 低分段（<500分）
    chongScoreDiff: 12,
    wenScoreDiff: 6,
    baoScoreDiff: 18,
  },
};
```

### 4.3 录取概率计算

基于**考生位次**与**院校历年最低位次**的差值计算，同时考虑趋势因素：

```
录取概率 = 基础概率 × 趋势系数 × 波动系数

基础概率：基于位次差的分段函数
趋势系数：根据历年位次变化调整（上升趋势降低概率，下降趋势提高概率）
波动系数：根据历年分数波动幅度调整（波动大则降低概率）
```

**基础概率表**（基于位次差）：

| 位次差 | 录取概率 |
|--------|---------|
| 位次优于院校 | 99% |
| 位次差 ≤ 5% | 95% |
| 位次差 ≤ 10% | 88% |
| 位次差 ≤ 15% | 78% |
| 位次差 ≤ 20% | 65% |
| 位次差 ≤ 25% | 50% |
| 位次差 ≤ 30% | 35% |
| 位次差 ≤ 40% | 20% |
| 位次差 > 40% | ≤ 5% |

**趋势系数**：

| 历年位次变化 | 趋势系数 |
|------------|---------|
| 持续下降（录取难度降低） | 1.05 |
| 基本稳定 | 1.00 |
| 持续上升（录取难度增加） | 0.95 |

**波动系数**：

| 波动幅度 | 波动系数 |
|---------|---------|
| ≤ 3% | 1.00 |
| 3%-8% | 0.97 |
| 8%-15% | 0.94 |
| > 15% | 0.90 |

### 4.4 专业推荐算法

专业录取分预估公式：
```
专业最低录取分 = 院校投档线 + 专业热度分差 + 学科实力调整 + 院校层次调整
```

**专业热度分差参考**：

| 热度等级 | 平均分差 | 范围 | 判断依据 |
|---------|---------|------|---------|
| top（顶尖） | +15分 | [+10, +25] | 国家级重点学科、双一流学科 |
| hot（热门） | +7分 | [+3, +15] | 行业热门专业、就业前景好 |
| warm（中等） | +2分 | [-2, +6] | 普通专业、就业一般 |
| cool（冷门） | -5分 | [-12, 0] | 传统专业、就业困难 |

**学科实力影响**：
- 每比C级高10分，加约1.2分录取分差

**院校层次调整系数**：
- 985：1.15
- 211：1.10
- 双一流：1.05
- 普通本科：1.00

### 4.5 选科匹配算法

支持两种格式的选科要求解析：

**数字代码格式**（如 54, 45, 0）：
- 科目代码映射：1=物理、2=化学、3=生物、4=政治、5=历史、6=地理
- 0 = 不限
- 单位数 = 单科必选（如 1 = 物理必选）
- 多位数升序 = 选一门即可（如 45 = 物理或化学）
- 多位数降序 = 均须选考（如 54 = 物理+化学）

**文字描述格式**（如 "必选物理", "不限", "物理或化学"）：
- 含"必选" = 均须选考
- 含"+"或"均须" = 均须选考
- 含"/"或"或"或"选" = 选一门即可
- 含"不限" = 无限制

### 4.6 趋势分析算法

```
趋势值 = (当年位次 - 去年位次) / 去年位次 × 100%

趋势判断：
  趋势值 < -5%  → 下降趋势（录取难度降低）
  -5% ≤ 趋势值 ≤ 5% → 稳定
  趋势值 > 5%  → 上升趋势（录取难度增加）
```

### 4.7 风险评估算法

```
整体风险指数 = Σ(每个志愿的风险权重) / 志愿总数

风险权重：
  冲志愿：1.0（高风险）
  稳志愿：0.5（中风险）
  保志愿：0.2（低风险）

风险等级：
  < 0.4 → 低风险（偏保守）
  0.4-0.6 → 中风险（平衡）
  > 0.6 → 高风险（偏激进）
```

---

## 5. 数据库设计

### 5.1 数据表概览

| 表名 | 用途 | RLS状态 | 数据量 |
|------|------|---------|--------|
| `profiles` | 用户信息表 | 启用 | 少量 |
| `volunteer_plans` | 志愿方案保存 | 启用 | 中等 |
| `admission_scores` | 投档分数线 | **禁用** | 约2000条/年 |
| `subject_requirements` | 科目要求配置 | **禁用** | 约30条 |
| `major_scores` | 专业分数线 | **禁用** | 约2000条 |
| `score_distribution` | 一分一段表 | **禁用** | 约900条/年 |
| `school_info` | 院校基础信息 | **禁用** | 约500条 |

### 5.2 admission_scores 表结构

| 字段名 | 类型 | 说明 | 是否索引 |
|--------|------|------|---------|
| `id` | UUID | 主键 | PK |
| `year` | INTEGER | 年份（2023-2025） | 索引 |
| `group_code` | TEXT | 院校专业组代码 | 索引 |
| `group_name` | TEXT | 院校专业组名称 | - |
| `school_name` | TEXT | 院校名称 | 索引 |
| `school_code` | TEXT | 院校代码 | - |
| `group_number` | TEXT | 专业组编号 | - |
| `subject_requirement` | TEXT | 选科要求 | 索引 |
| `score` | INTEGER | 投档分数线 | 索引 |
| `min_rank` | INTEGER | 最低位次 | 索引 |
| `plan_count` | INTEGER | 计划人数 | - |
| `admission_count` | INTEGER | 实际录取人数 | - |
| `batch_type` | TEXT | 批次类型 | 索引 |
| `school_level` | TEXT | 院校层次（985/211/双一流） | 索引 |
| `school_nature` | TEXT | 院校性质（公办/民办） | 索引 |
| `province` | TEXT | 省份 | 索引 |
| `created_at` | TIMESTAMPTZ | 创建时间 | - |
| `updated_at` | TIMESTAMPTZ | 更新时间 | - |

### 5.3 major_scores 表结构

| 字段名 | 类型 | 说明 | 是否索引 |
|--------|------|------|---------|
| `id` | UUID | 主键 | PK |
| `school_name` | TEXT | 院校名称 | 索引 |
| `school_code` | TEXT | 院校代码 | - |
| `year` | INTEGER | 年份 | 索引 |
| `major_name` | TEXT | 专业名称 | 索引 |
| `major_group` | TEXT | 专业组 | - |
| `min_score` | INTEGER | 最低录取分 | 索引 |
| `min_rank` | INTEGER | 最低位次 | 索引 |
| `avg_score` | INTEGER | 平均录取分 | - |
| `person_count` | INTEGER | 招生人数 | - |
| `batch` | TEXT | 批次 | 索引 |
| `subject_requirement` | TEXT | 选科要求 | 索引 |
| `province` | TEXT | 省份 | 索引 |
| `level` | TEXT | 院校层次 | - |
| `major_description` | TEXT | 专业描述 | - |
| `source` | TEXT | 数据来源 | - |
| `created_at` | TIMESTAMPTZ | 创建时间 | - |
| `updated_at` | TIMESTAMPTZ | 更新时间 | - |

### 5.4 score_distribution 表结构（新增）

| 字段名 | 类型 | 说明 | 是否索引 |
|--------|------|------|---------|
| `id` | UUID | 主键 | PK |
| `year` | INTEGER | 年份 | 索引 |
| `score` | INTEGER | 分数 | 索引 |
| `cumulative_count` | INTEGER | 累计人数 | - |
| `rank` | INTEGER | 对应位次 | 索引 |
| `category` | TEXT | 类别（全体/物理/历史） | 索引 |
| `created_at` | TIMESTAMPTZ | 创建时间 | - |

### 5.5 school_info 表结构（新增）

| 字段名 | 类型 | 说明 | 是否索引 |
|--------|------|------|---------|
| `id` | UUID | 主键 | PK |
| `school_name` | TEXT | 院校名称 | 索引 |
| `school_code` | TEXT | 院校代码 | 索引 |
| `province` | TEXT | 所在省份 | 索引 |
| `level` | TEXT | 院校层次 | 索引 |
| `nature` | TEXT | 院校性质 | 索引 |
| `type` | TEXT | 院校类型（综合/理工/师范等） | 索引 |
| `founded_year` | INTEGER | 建校年份 | - |
| `campus_count` | INTEGER | 校区数量 | - |
| `description` | TEXT | 院校简介 | - |
| `website` | TEXT | 院校官网 | - |
| `created_at` | TIMESTAMPTZ | 创建时间 | - |
| `updated_at` | TIMESTAMPTZ | 更新时间 | - |

---

## 6. 页面功能说明

### 6.1 页面路由

| 路径 | 页面 | 说明 | 权限 |
|------|------|------|------|
| `/` | HomePage | 主页，志愿生成入口 | 公开 |
| `/result` | ResultPage | 志愿结果展示页 | 公开 |
| `/auth` | AuthPage | 用户登录/注册页 | 公开 |
| `/majorscore` | MajorScorePage | 专业分数线查询页 | 公开 |
| `/analysis` | AnalysisPage | 数据分析和趋势对比页 | 公开 |
| `/saved` | SavedPlansPage | 已保存的志愿方案 | 登录 |

### 6.2 HomePage 功能

**核心输入区**：
- 输入考生分数（必填，实时显示位次）
- 选择选科组合（数字代码/文字描述）
- 选择考生类别（物理类/历史类）
- 设置志愿总数（默认30个，可调整）

**筛选条件区**：
- 按院校层次筛选（985/211/双一流/普通本科）
- 按院校性质筛选（公办/民办）
- 按省份/区域筛选（华北、华东、华南等）
- 按专业类别筛选（计算机类、电子信息类、师范类等）
- 按批次筛选（本科提前批、本科批、专科批）

**冲稳保设置区**：
- 可视化滑块调整冲稳保数量比例
- 调整冲稳保分数差参数
- "智能推荐"按钮自动设置合理参数

**辅助功能**：
- 一分一段位次查询（实时计算）
- 数据来源切换（本地Excel/云端Supabase）
- 历史记录快速加载

### 6.3 ResultPage 功能

**志愿列表**：
- 按冲稳保分组展示（每组不同颜色）
- 显示每个志愿的关键信息（院校名称、投档线、录取概率、趋势）
- 支持按分数、概率、院校名称排序
- 支持快速筛选和搜索
- 支持拖拽调整排序

**院校详情卡片**：
- 院校基本信息（名称、层次、省份、批次）
- 历年投档线趋势图
- 推荐专业列表（含预估分数）
- 风险评估指标

**操作功能**：
- 导出Excel功能
- 返回重新生成
- 保存方案（登录后）
- 分享方案

### 6.4 MajorScorePage 功能

- 按院校名称搜索专业分数线
- 按年份筛选（2023/2024/2025）
- 按批次筛选
- 按选科要求筛选
- 按专业类别筛选
- 查看专业详情（分数、位次、人数、描述）
- 专业对比功能

### 6.5 AnalysisPage 功能（新增）

- 历年投档线趋势对比图表
- 同一院校不同专业组对比
- 同分数段院校横向对比
- 一分一段表可视化
- 录取概率分布分析

---

## 7. API 设计

### 7.1 Supabase API 封装

#### admissionScoreService

| 方法名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| `getByYear(year)` | 获取某年份投档线 | year: number | AdmissionScore[] |
| `getBySchool(schoolName)` | 获取某院校投档线 | schoolName: string | AdmissionScore[] |
| `getByScoreRange(min, max, year?)` | 获取分数段投档线 | min, max: number | AdmissionScore[] |
| `getBySubjectRequirement(requirement)` | 获取符合选科要求的投档线 | requirement: string | AdmissionScore[] |
| `getSchoolStats(schoolName?)` | 获取院校统计 | schoolName?: string | SchoolScoreStats[] |
| `getGroupScoreChanges(schoolName?)` | 获取专业组分数变化 | schoolName?: string | GroupScoreChange[] |
| `searchSchools(keyword, year?)` | 搜索院校 | keyword: string | AdmissionScore[] |

#### majorScoreService

| 方法名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| `getBySchool(schoolName)` | 获取某院校专业分数线 | schoolName: string | MajorScore[] |
| `getBySchoolAndYear(schoolName, year)` | 获取院校年度专业线 | schoolName: string, year: number | MajorScore[] |
| `getByScoreRange(min, max)` | 获取分数段专业线 | min, max: number | MajorScore[] |
| `getByMajorName(majorName)` | 获取某专业分数线 | majorName: string | MajorScore[] |
| `searchMajors(keyword)` | 搜索专业 | keyword: string | MajorScore[] |
| `getAllSchools()` | 获取所有院校列表 | - | string[] |
| `getMajorsBySchool(schoolName)` | 获取院校专业列表 | schoolName: string | string[] |

#### scoreDistributionService（新增）

| 方法名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| `getByYear(year, category?)` | 获取某年份一分一段表 | year: number, category?: string | ScoreDistribution[] |
| `getRankByScore(score, year, category?)` | 根据分数查询位次 | score: number, year: number | number |
| `getScoreByRank(rank, year, category?)` | 根据位次查询分数 | rank: number, year: number | number |

---

## 8. 数据管理

### 8.1 数据来源

| 数据类型 | 来源 | 更新频率 | 数据量 |
|---------|------|---------|--------|
| 投档分数线 | 海南省考试局官网 | 每年6-7月 | ~2000条/年 |
| 专业分数线 | 夸克高考（网页爬虫） | 每年6-7月 | ~2000条 |
| 一分一段表 | 海南省考试局官网 | 每年6月 | ~900条/年 |
| 院校基础信息 | 掌上高考/夸克高考 | 按需更新 | ~500条 |

### 8.2 数据导入流程

**投档分数线导入**：
1. 从海南省考试局下载Excel文件
2. 手动整理为三表结构（2023/2024/2025）
3. 使用 `scripts/import_major_scores.js` 或 `loadSchoolDataFromExcel()` 导入

**专业分数线导入**：
1. 使用 `data/quark_scraper_v6.js` 在浏览器中采集数据
2. 生成按院校+年份命名的JSON文件
3. 使用 `scripts/import_major_scores_from_files.js` 批量导入到Supabase

**一分一段表导入**：
1. 从海南省考试局下载官方一分一段表
2. 使用 `scripts/import_score_distribution.js` 导入到 `score_distribution` 表

### 8.3 数据加载策略

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **本地模式** | 从 `src/data/schoolData.ts` 加载预定义数据 | 快速启动、离线使用 |
| **云端模式** | 从Supabase动态加载最新数据 | 数据更新及时、网络良好 |
| **混合模式** | 本地数据作为缓存，云端数据作为补充 | 兼顾速度和数据新鲜度 |

### 8.4 数据验证机制

| 验证项 | 规则 | 处理方式 |
|--------|------|---------|
| 分数范围 | 0-900分 | 超出范围标记为无效 |
| 位次合理性 | 位次应大于0 | 无效位次设为null |
| 选科格式 | 数字代码或文字描述 | 不匹配格式标记为"格式错误" |
| 年份范围 | 2023-2025 | 超出范围标记为无效 |
| 院校名称 | 非空 | 空值标记为"未知院校" |

---

## 9. 部署流程

### 9.1 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm run test

# 类型检查
npm run check
```

### 9.2 GitHub Pages 部署

项目使用 GitHub Actions 自动部署到 GitHub Pages，配置文件：`.github/workflows/deploy.yml`

部署流程：
1. 推送代码到 `main` 分支
2. GitHub Actions 自动触发 `build-and-deploy` 任务
3. 使用 `peaceiris/actions-gh-pages@v4` 将 `dist` 目录部署到 `gh-pages` 分支
4. 访问地址：`https://hiwebtop2026.github.io/HNGK2026/`

### 9.3 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_SUPABASE_URL` | Supabase项目URL | 内置项目URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase匿名密钥 | 内置密钥 |
| `VITE_APP_VERSION` | 应用版本号 | 当前版本 |

---

## 10. 用户体验优化方案

### 10.1 交互体验优化

| 优化项 | 当前状态 | 优化方案 | 优先级 |
|--------|---------|---------|--------|
| 输入引导 | 简单表单 | 添加智能提示、输入验证、实时反馈 | 高 |
| 结果展示 | 列表形式 | 添加分组、颜色标识、可视化进度条 | 高 |
| 数据加载 | 全量加载 | 实现分页加载、骨架屏、加载动画 | 高 |
| 移动端适配 | 基础适配 | 优化移动端布局、精简筛选条件 | 高 |
| 操作指引 | 无指引 | 添加首次使用引导、操作提示 | 中 |
| 错误提示 | 简单提示 | 添加友好的错误提示和解决方案 | 中 |

### 10.2 功能体验优化

| 优化项 | 当前状态 | 优化方案 | 优先级 |
|--------|---------|---------|--------|
| 智能推荐 | 基础推荐 | 添加基于分数区间的智能参数推荐 | 高 |
| 趋势分析 | 无 | 添加历年投档线趋势图、位次波动分析 | 高 |
| 风险评估 | 无 | 添加志愿方案整体风险评估和优化建议 | 高 |
| 志愿对比 | 无 | 支持多所院校横向对比 | 中 |
| 专业组分析 | 无 | 分析同一院校不同专业组差异 | 中 |
| 收藏功能 | 无 | 添加院校/专业收藏功能 | 低 |

### 10.3 性能体验优化

| 优化项 | 当前状态 | 优化方案 | 优先级 |
|--------|---------|---------|--------|
| 数据缓存 | 无缓存 | 添加localStorage缓存，减少重复请求 | 高 |
| 批量查询 | 逐个查询 | 实现专业数据批量查询或预加载 | 高 |
| 虚拟滚动 | 全量渲染 | 使用react-window实现虚拟滚动 | 中 |
| 图片优化 | 无优化 | 添加图片懒加载、压缩优化 | 中 |
| 代码分割 | 无分割 | 实现路由级别代码分割 | 低 |

---

## 11. 安全注意事项

### 11.1 密钥管理

- **Never hardcode service_role key** in client-side code
- 生产环境使用环境变量传递敏感配置
- 导入脚本使用环境变量 `SUPABASE_SERVICE_ROLE_KEY`

### 11.2 RLS策略

- 用户私有数据（`profiles`, `volunteer_plans`）启用RLS
- 公开数据（`admission_scores`, `major_scores`, `subject_requirements`, `score_distribution`, `school_info`）禁用RLS（数据导入需要）

### 11.3 输入验证

- 所有用户输入必须进行类型和范围验证
- SQL查询使用参数化查询（Supabase SDK自动处理）
- 防止XSS攻击（React自动处理）

### 11.4 数据安全

- 禁止在客户端暴露敏感数据（如service_role key）
- 数据传输使用HTTPS
- 定期备份数据库

---

## 12. 代码规范

### 12.1 命名规范

- 组件名：大驼峰命名（PascalCase），如 `HomePage.tsx`
- 函数名：小驼峰命名（camelCase），如 `filterSchools()`
- 变量名：小驼峰命名（camelCase），如 `baseScore`
- 类型/接口名：大驼峰命名（PascalCase），如 `SchoolScore`
- 常量：全大写+下划线（UPPER_SNAKE_CASE），如 `SCHOOL_DATA`
- 文件目录：小写+连字符（kebab-case），如 `major-score-page`

### 12.2 文件组织

- 页面组件放在 `src/pages/`
- 可复用组件放在 `src/components/`
- 数据服务放在 `src/services/`
- 工具函数放在 `src/utils/`
- 状态管理放在 `src/store/`
- 类型定义放在 `src/types/`
- 自定义Hooks放在 `src/hooks/`

### 12.3 错误处理

- 所有异步操作必须有 try-catch
- 错误信息通过状态管理传递给UI
- 关键操作（如数据导入）需要日志记录
- 用户友好的错误提示

### 12.4 性能规范

- 避免不必要的重渲染（使用React.memo、useMemo、useCallback）
- 大数据列表使用虚拟滚动
- 图片使用懒加载
- API请求添加防抖和节流

---

## 13. 版本历史

| 版本 | 日期 | 变更说明 | 核心改进 |
|------|------|---------|---------|
| v1.0 | 2026-06 | 基础版本 | 志愿生成、Excel导入导出 |
| v1.1 | 2026-06 | 用户认证版 | 添加用户登录注册、志愿保存 |
| v1.2 | 2026-06 | 算法优化版 | 优化专业匹配算法，基于分数差确定冲稳保档次 |
| v1.3 | 2026-07 | 专业数据版 | 添加专业分数线查询页面，导入夸克高考专业数据（28所院校，2080条记录） |
| v2.0 | 待开发 | 用户体验优化版 | 趋势分析、风险评估、志愿对比、智能推荐 |

---

## 附录：常用命令

### 数据导入

```bash
# 导入专业分数线JSON文件
node scripts/import_major_scores_from_files.js

# 设置Supabase密钥（PowerShell）
$env:SUPABASE_SERVICE_ROLE_KEY = "你的service_role_key"

# 导入一分一段表
node scripts/import_score_distribution.js
```

### 开发调试

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 类型检查
npm run check

# 构建
npm run build
```

### Git操作

```bash
# 提交代码
git add .
git commit -m "描述变更"

# 推送到远程
git push origin main
```