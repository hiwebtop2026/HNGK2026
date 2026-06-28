# 夸克高考专业分数线数据手动导出指南

## 方案一：使用Edge浏览器开发者工具导出

### 步骤1：打开夸克高考页面
在Edge浏览器中打开以下URL：
```
https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=华东理工大学&params={"province":"海南","year":"2025","batch":"本科批"}&type=luqu
```

### 步骤2：打开开发者工具
1. 按 **F12** 打开开发者工具
2. 点击 **Network（网络）** 标签
3. 勾选 **Preserve log（保留日志）**
4. 选择 **Fetch/XHR** 过滤器

### 步骤3：触发数据加载
1. 在页面中切换年份为 **2025**
2. 点击 **查看全部** 或 **加载更多** 按钮
3. 在Network中找到类似 `fen_shu_xian` 或 `majorScore` 的请求

### 步骤4：复制数据
1. 点击找到的API请求
2. 查看 **Response** 标签
3. 右键点击响应内容 → **Copy response**
4. 将内容保存为JSON文件，命名为 `major_scores_2025.json`

### 步骤5：重复操作
1. 切换年份为 **2024**，保存为 `major_scores_2024.json`
2. 切换年份为 **2023**，保存为 `major_scores_2023.json`

---

## 方案二：使用夸克浏览器（需要开启远程调试）

### 步骤1：开启夸克浏览器远程调试
1. 关闭夸克浏览器
2. 右键夸克浏览器快捷方式 → **属性**
3. 在"目标"后添加：`--remote-debugging-port=9222`
4. 点击确定并重启夸克浏览器

### 步骤2：运行自动化脚本
```bash
cd "C:\Users\lhp\Documents\trae_projects\GAOKAO2026\scripts"
python scrape_with_edge.py
```

---

## 方案三：批量院校查询脚本

如果您需要查询多个院校的专业分数线，可以使用以下URL模板：
```
https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name={院校名称}&params={"province":"海南","year":"2025","batch":"本科批"}&type=luqu
```

将 `{院校名称}` 替换为您要查询的院校名称。

---

## 重要提示

1. **数据保存位置**：将导出的JSON文件保存到：
   ```
   C:\Users\lhp\Documents\trae_projects\GAOKAO2026\data\
   ```

2. **文件名格式**：
   - `major_scores_2025.json` - 2025年数据
   - `major_scores_2024.json` - 2024年数据
   - `major_scores_2023.json` - 2023年数据

3. **JSON格式示例**：
   ```json
   {
     "data": {
       "list": [
         {
           "school_name": "华东理工大学",
           "major_name": "化学工程与工艺",
           "major_group": "物理组",
           "min_score": 680,
           "min_rank": 5000,
           "avg_score": 690,
           "batch": "本科批",
           "subject_requirement": "物理+化学",
           "year": 2025
         }
       ]
     }
   }
   ```

4. **数据库导入**：导出完数据后，运行以下命令导入到数据库：
   ```bash
   cd "C:\Users\lhp\Documents\trae_projects\GAOKAO2026\scripts"
   python import_major_scores_db.py
   ```

---

## 常见问题

**Q: 找不到API请求怎么办？**
A: 在Network面板中，清除现有记录，然后刷新页面。查找包含 `score`、`major`、`fen_shu` 等关键词的请求。

**Q: Response是空的怎么办？**
A: 确保页面已经完全加载，并且已经点击了"查看全部"按钮加载完整数据。

**Q: 导出的数据格式不对？**
A: 确保复制的是完整的JSON响应，而不是截断的内容。
