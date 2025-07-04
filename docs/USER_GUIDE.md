# 📚 Anki MCP Server - 用户指南

欢迎使用 Anki MCP Server！这个指南将帮助你快速上手，在你喜欢的 AI 工具中集成 Anki 闪卡功能。

## 📋 目录

- [什么是 Anki MCP Server](#什么是-anki-mcp-server)
- [快速开始](#快速开始)
- [支持的客户端](#支持的客户端)
- [功能概览](#功能概览)
- [使用示例](#使用示例)
- [配置指南](#配置指南)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

## 🤔 什么是 Anki MCP Server

### 简介
Anki MCP Server 是一个桥梁工具，让你的 AI 助手（如 Claude、GPT 等）能够直接与 Anki 闪卡软件交互。通过 Model Context Protocol (MCP)，AI 可以帮你：

- 📝 创建和管理 Anki 卡片
- 📊 分析学习进度和难度
- 🗂️ 组织和管理牌组
- 💡 提供个性化学习建议

### 使用场景
- **语言学习**：让 AI 帮你制作词汇卡片、语法练习
- **考试复习**：自动生成知识点问答卡片
- **技能提升**：创建编程、数学等领域的练习卡片
- **知识管理**：将学习笔记转换为可复习的卡片格式

## 🚀 快速开始

### 第一步：安装必要软件

#### 1. 安装 Anki
```bash
# 下载并安装 Anki
# 访问：https://apps.ankiweb.net/
```

#### 2. 安装 AnkiConnect 插件
1. 打开 Anki
2. 选择 `工具` → `插件`
3. 点击 `获取插件`
4. 输入代码：`2055492159`
5. 重启 Anki

#### 3. 验证 AnkiConnect 工作正常
在浏览器中访问：`http://localhost:8765`
应该看到 "AnkiConnect" 文字。

### 第二步：安装 Anki MCP Server

#### 方法一：通过 NPM（推荐）
```bash
# 全局安装
npm install -g anki-mcp-server

# 验证安装
anki-mcp-server --version
```

#### 方法二：通过 NPX（无需安装）
```bash
# 直接运行
npx anki-mcp-server
```

### 第三步：配置 MCP 客户端

根据你使用的 AI 客户端进行配置：

## 🔧 支持的客户端

### Claude Desktop

1. 找到配置文件：
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. 添加配置：
```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes", "anki-mcp-server"]
    }
  }
}
```

3. 重启 Claude Desktop

### Cline (VS Code)

1. 在 VS Code 中打开设置文件 `cline_mcp_settings.json`

2. 添加配置：
```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes", "anki-mcp-server"]
    }
  }
}
```

### 其他支持 MCP 的客户端

对于其他支持 MCP 的 AI 客户端，通常配置格式类似：

```json
{
  "mcpServers": {
    "anki": {
      "command": "anki-mcp-server"
    }
  }
}
```

## ⚡ 功能概览

### 🛠️ 可用工具 (Tools)

#### 牌组管理
- `list_decks` - 列出所有牌组
- `create_deck` - 创建新牌组
- `delete_deck` - 删除牌组
- `get_deck_stats` - 获取牌组统计信息

#### 卡片操作
- `create_note` - 创建新卡片（基础或填空题）
- `batch_create_notes` - 批量创建卡片
- `search_notes` - 搜索卡片
- `get_note_info` - 获取卡片详细信息
- `update_note` - 更新卡片内容
- `delete_note` - 删除卡片

#### 笔记类型管理
- `list_note_types` - 列出所有笔记类型
- `create_note_type` - 创建自定义笔记类型
- `get_note_type_info` - 获取笔记类型详细信息

#### 卡片状态管理
- `list_cards` - 列出卡片
- `get_card_info` - 获取卡片信息
- `suspend_cards` - 暂停卡片
- `unsuspend_cards` - 取消暂停卡片
- `forget_cards` - 重置卡片学习进度
- `relearn_cards` - 重新学习卡片

#### 学习分析
- `learning_progress_analyzer` - 分析学习进度
- `knowledge_connection_analyzer` - 分析知识点关联

### 📄 可用资源 (Resources)

#### 牌组信息
- `anki://decks/all` - 完整的牌组列表

#### 笔记类型信息
- `anki://note-types/all` - 所有笔记类型列表
- `anki://note-types/all-with-schemas` - 包含详细结构的笔记类型信息
- `anki://note-types/{modelName}` - 特定笔记类型的详细信息

### 💬 可用提示模板 (Prompts)

#### 学习相关
- `create_study_plan` - 创建个性化学习计划
- `analyze_weak_areas` - 分析薄弱知识点
- `suggest_review_strategy` - 建议复习策略

#### 内容创建
- `generate_flashcards` - 从文本生成闪卡
- `create_cloze_cards` - 创建填空题卡片
- `improve_card_quality` - 改进卡片质量建议

## 💡 使用示例

### 示例 1：创建基础单词卡片

**对话示例**：
```
你：请帮我在"英语词汇"牌组中创建一张卡片，正面是"serendipity"，背面是"意外发现美好事物的能力"

AI：我来帮你创建这张英语词汇卡片。

[AI 使用 create_note 工具]

完成！我已经在"英语词汇"牌组中创建了卡片：
- 正面：serendipity
- 背面：意外发现美好事物的能力
- 标签：已自动添加"英语"、"词汇"标签

这张卡片现在可以在 Anki 中进行复习了。
```

### 示例 2：批量创建编程概念卡片

**对话示例**：
```
你：我正在学习 JavaScript，请帮我创建一些关于异步编程的卡片

AI：我来为你创建 JavaScript 异步编程相关的卡片集合。

[AI 使用 batch_create_notes 工具]

我已经为你创建了 8 张关于 JavaScript 异步编程的卡片：

1. Promise 的三种状态
2. async/await 语法
3. Promise.all() 和 Promise.race() 的区别
4. 回调地狱的解决方案
5. 微任务和宏任务的区别
6. setTimeout 和 setImmediate 的区别
7. Promise 链式调用
8. 错误处理的最佳实践

所有卡片都已添加到"编程学习"牌组中，标签为"JavaScript"、"异步编程"。
```

### 示例 3：学习进度分析

**对话示例**：
```
你：分析一下我的 Anki 学习情况

AI：让我分析你的 Anki 学习数据。

[AI 使用 learning_progress_analyzer 工具]

## 📊 学习进度报告

### 整体情况
- 总卡片数：1,247 张
- 已学习：892 张 (71.5%)
- 待学习：355 张 (28.5%)

### 各牌组表现
1. **英语词汇** (485 张)
   - 掌握率：78%
   - 平均复习间隔：12.3 天
   - 建议：增加困难词汇的复习频率

2. **编程概念** (312 张)  
   - 掌握率：65%
   - 平均复习间隔：8.7 天
   - 建议：专注于算法和数据结构部分

3. **历史知识** (450 张)
   - 掌握率：83%
   - 平均复习间隔：15.2 天
   - 表现优秀！

### 💡 改进建议
1. 建议每天复习 20-25 张卡片
2. 重点关注编程概念牌组
3. 可以适当增加新卡片的学习量
```

### 示例 4：创建填空题

**对话示例**：
```
你：把这段文本转换为填空题："光合作用是植物利用阳光、二氧化碳和水制造葡萄糖和氧气的过程"

AI：我来将这段关于光合作用的文本转换为填空题卡片。

[AI 使用 create_note 工具，类型为 Cloze]

已创建填空题卡片：

**原文**：光合作用是植物利用阳光、二氧化碳和水制造葡萄糖和氧气的过程

**填空题**：{{c1::光合作用}}是{{c2::植物}}利用{{c3::阳光}}、{{c4::二氧化碳}}和{{c5::水}}制造{{c6::葡萄糖}}和{{c7::氧气}}的过程

这张卡片包含 7 个填空点，会生成 7 张相关的复习卡片，帮助你全面掌握光合作用的概念。

卡片已添加到"生物学"牌组，标签为"光合作用"、"植物生物学"。
```

### 示例 5：个性化学习计划

**对话示例**：
```
你：我要准备下个月的日语 N2 考试，请帮我制定学习计划

AI：我来基于你的 Anki 数据为你制定 N2 考试学习计划。

[AI 使用 create_study_plan 提示模板和相关工具]

## 🎌 日语 N2 考试 30 天学习计划

### 第一周：词汇强化
- **目标**：掌握 N2 核心词汇 800 个
- **每日任务**：
  - 新词汇：40 个/天
  - 复习词汇：60 个/天
  - 重点：动词变位、敬语表达

### 第二周：语法突破  
- **目标**：掌握 N2 语法点 120 个
- **每日任务**：
  - 新语法：6 个/天
  - 例句练习：20 个/天
  - 重点：条件表达、时态变化

### 第三周：阅读理解
- **目标**：提高阅读速度和理解能力
- **每日任务**：
  - 短文阅读：3 篇/天
  - 长文阅读：1 篇/天
  - 重点：关键词识别、逻辑关系

### 第四周：综合复习
- **目标**：模拟考试，查漏补缺
- **每日任务**：
  - 错误卡片重点复习
  - 模拟测试：1 套/天
  - 重点：时间管理、答题技巧

### 📈 学习追踪
我会每周为你分析学习进度，调整计划难度，确保你在考试前达到最佳状态！
```

## ⚙️ 配置指南

### 环境变量配置

你可以通过环境变量自定义 Anki MCP Server 的行为：

```bash
# Anki 连接配置
export ANKI_CONNECT_URL=http://localhost:8765  # AnkiConnect 地址
export ANKI_API_VERSION=6                      # API 版本
export ANKI_TIMEOUT=5000                       # 连接超时时间(毫秒)
export ANKI_RETRY_ATTEMPTS=3                   # 重试次数
export ANKI_DEFAULT_DECK=Default               # 默认牌组

# 缓存配置  
export CACHE_ENABLED=true                      # 启用缓存
export CACHE_DEFAULT_TTL=300000                # 缓存过期时间(毫秒)
export CACHE_MAX_SIZE=1000                     # 最大缓存条目数

# 日志配置
export LOG_LEVEL=info                          # 日志级别
export LOG_FORMAT=text                         # 日志格式
```

### AnkiConnect 配置

编辑 AnkiConnect 配置文件（通常在 Anki 的插件文件夹中）：

```json
{
    "apiKey": null,
    "apiLogPath": null,
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOrigin": "http://localhost",
    "webCorsOriginList": ["http://localhost", "https://ankiweb.net"]
}
```

### 性能优化配置

对于大量卡片的用户，可以调整以下设置：

```bash
# 提高缓存大小
export CACHE_MAX_SIZE=5000

# 延长缓存过期时间
export CACHE_DEFAULT_TTL=600000  # 10分钟

# 减少重试次数以提高响应速度
export ANKI_RETRY_ATTEMPTS=1
```

## 🔧 故障排除

### 常见问题及解决方案

#### 问题 1：无法连接到 Anki
```
错误：Connection Error [ANKI_CONNECTION_ERROR]: Connection failed
```

**解决步骤**：
1. ✅ 确保 Anki 正在运行
2. ✅ 验证 AnkiConnect 插件已安装并启用
3. ✅ 检查端口 8765 是否被占用
4. ✅ 尝试在浏览器访问 `http://localhost:8765`
5. ✅ 重启 Anki 和 AI 客户端

#### 问题 2：MCP 服务器无法启动
```
错误：npm ERR! command not found: anki-mcp-server
```

**解决步骤**：
```bash
# 重新安装
npm uninstall -g anki-mcp-server
npm install -g anki-mcp-server

# 或使用 npx（推荐）
npx --yes anki-mcp-server
```

#### 问题 3：卡片创建失败
```
错误：Validation Error [INVALID_NOTE_ERROR]: Invalid note format
```

**解决步骤**：
1. ✅ 检查牌组名称是否存在
2. ✅ 验证笔记类型是否正确
3. ✅ 确保必填字段都有内容
4. ✅ 检查字段名称是否匹配

#### 问题 4：权限错误
```
错误：Permission denied
```

**解决步骤**：
```bash
# Linux/macOS
sudo npm install -g anki-mcp-server

# Windows（以管理员身份运行）
npm install -g anki-mcp-server
```

#### 问题 5：配置文件找不到
不同系统的 MCP 配置文件位置：

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Claude Desktop (Linux)**: `~/.config/Claude/claude_desktop_config.json`

### 调试模式

如果问题持续存在，可以启用详细日志：

```bash
# 设置详细日志级别
export LOG_LEVEL=debug

# 在单独终端中运行服务器查看日志
anki-mcp-server
```

### 获取帮助

如果问题仍未解决：

1. **查看日志**：检查详细的错误信息
2. **搜索 Issues**：访问 [GitHub Issues](https://github.com/nailuoGG/anki-mcp-server/issues) 查找类似问题
3. **创建 Issue**：提供详细的错误信息和系统环境
4. **社区支持**：在项目的 Discussions 页面寻求帮助

## 💡 最佳实践

### 卡片制作建议

#### 1. 单一概念原则
```
❌ 不好的例子：
正面：JavaScript 中的 var、let、const 有什么区别？它们的作用域如何？
背面：（冗长的解释）

✅ 好的例子：
卡片1 - 正面：var 的作用域特点？
卡片2 - 正面：let 和 const 的区别？
卡片3 - 正面：什么是块级作用域？
```

#### 2. 使用图片和示例
```
✅ 推荐做法：
正面：这个 CSS 布局叫什么？
背面：Flexbox 布局
[附上代码示例图片]
```

#### 3. 渐进式难度
```
初级：什么是 Promise？
中级：Promise 的三种状态是什么？
高级：Promise.all() 和 Promise.allSettled() 的区别？
```

### 学习策略建议

#### 1. 每日学习量
- **新手**：15-20 张新卡片/天
- **中级**：25-30 张新卡片/天  
- **高级**：35+ 张新卡片/天
- **复习**：保持在 80-120 张/天

#### 2. 牌组组织
```
📚 推荐结构：
- 语言学习
  └── 英语
      ├── 词汇-基础
      ├── 词汇-高级
      ├── 语法
      └── 口语表达
- 编程学习
  └── JavaScript
      ├── 基础语法
      ├── ES6+ 特性
      ├── 异步编程
      └── 框架相关
```

#### 3. 标签使用
```
✅ 有效的标签策略：
- 难度标签：easy, medium, hard
- 类型标签：concept, example, syntax
- 优先级：high-priority, exam-focus
- 状态标签：needs-review, well-known
```

### AI 协作技巧

#### 1. 明确指令
```
❌ 模糊指令：帮我学英语
✅ 清晰指令：从这篇文章中提取 20 个重要词汇，创建英语单词卡片，包含音标和例句
```

#### 2. 批量操作
```
✅ 高效做法：
"请从以下 10 个编程概念中创建卡片：
1. 闭包 2. 原型链 3. 事件循环..."

比逐个创建更高效
```

#### 3. 定期分析
```
✅ 建议频率：
- 每周：请分析我的学习进度
- 每月：请帮我调整学习计划
- 考前：请分析我的薄弱点并制定复习策略
```

### 数据备份建议

#### 1. Anki 数据备份
```bash
# 定期备份 Anki 集合
# 在 Anki 中：文件 → 导出 → 包含调度信息
```

#### 2. 配置备份
保存你的 MCP 配置文件，以便在新设备上快速恢复。

#### 3. 学习记录
定期让 AI 为你生成学习报告，保存重要的学习里程碑。

---

## 🎉 开始你的智能学习之旅

现在你已经掌握了 Anki MCP Server 的使用方法！记住：

- 🎯 **保持一致性**：每天使用，养成习惯
- 📈 **跟踪进度**：定期分析学习数据
- 🔄 **持续改进**：根据效果调整策略
- 🤖 **善用 AI**：让 AI 成为你的学习伙伴

祝你学习愉快，知识满满！🚀

---

**需要更多帮助？**
- 📖 [开发者文档](./DEVELOPER_GUIDE.md)
- 🐛 [问题反馈](https://github.com/nailuoGG/anki-mcp-server/issues)
- 💬 [社区讨论](https://github.com/nailuoGG/anki-mcp-server/discussions)