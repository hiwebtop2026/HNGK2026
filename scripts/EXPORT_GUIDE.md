# 夸克高考专业分数线数据导出指南

## 步骤1: 打开夸克高考页面

1. 在夸克浏览器中访问: https://vt.quark.cn/blm/pc-gaokao-1089/index
2. 确保地区已切换为"海南"
3. 年份选择为"2025"

## 步骤2: 打开开发者工具

1. 按 **F12** 打开开发者工具
2. 或者右键点击页面 → 选择"检查"
3. 点击 **Network（网络）** 标签页
4. 勾选 **Preserve log（保留日志）**

## 步骤3: 搜索院校触发API请求

1. 在页面搜索框输入院校名称（如"清华大学"）
2. 点击搜索或按Enter
3. 在Network面板中找到类似 `getSchoolMajorScore` 的请求
4. 点击该请求，查看 **Response（响应）** 标签页

## 步骤4: 复制API响应数据

1. 点击请求 → **Response** 标签
2. 右键点击响应内容 → 选择 **Copy response**（复制响应）
3. 将复制的JSON数据粘贴到下方

## 步骤5: 切换年份重复操作

1. 将年份切换为"2024"
2. 重复步骤3-4，获取2024年数据
3. 将年份切换为"2023"
4. 重复步骤3-4，获取2023年数据

## 重要提示

- 每次查询后，请将复制的JSON数据保存到文本文件中
- 文件命名格式: `major_scores_2025.json`, `major_scores_2024.json`, `major_scores_2023.json`
- 复制完成后，请将文件放到项目目录的 `data` 文件夹中

## API响应数据格式示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "school_name": "清华大学",
        "school_code": "10003",
        "major_name": "计算机类",
        "major_group_name": "物理组",
        "min_score": 851,
        "min_rank": 100,
        "avg_score": 865,
        "batch_name": "本科批",
        "subject_requirement": "物理+化学",
        "year": 2025
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

## 数据字段说明

| 字段名 | 说明 |
|--------|------|
| school_name | 院校名称 |
| school_code | 院校代码 |
| major_name | 专业名称 |
| major_group_name | 专业组名称 |
| min_score | 最低分 |
| min_rank | 最低位次 |
| avg_score | 平均分 |
| batch_name | 批次名称 |
| subject_requirement | 科目要求 |
| year | 年份 |

---

**注意**: 如果您在导出数据时遇到任何问题，请将开发者工具的截图或控制台错误信息发给我，我会帮助您解决。
