# 示例卡片功能

## 概述

示例卡片功能允许用户为特定的笔记类型创建示例卡片，这些卡片可以作为该笔记类型的模板和参考。与传统的模板注释解析方案相比，示例卡片方案更加灵活、易用且健壮。

## 功能特点

1. **易用性**: 用户可以直接在 Anki 中创建和管理示例卡片
2. **灵活性**: 支持多种标记方式和描述信息
3. **健壮性**: 不依赖于模板解析，避免解析错误
4. **可维护性**: 示例卡片作为普通卡片存储，受益于 Anki 的同步和备份机制

## 配置

示例卡片通过特定的标签进行识别，默认配置包括：

```typescript
exampleTags: ["example-card", "template-example", "示例卡片"];
```

## API 方法

### 1. 获取笔记类型示例

```typescript
const examples = await ankiClient.getModelExamples("Basic");
```

返回格式：

```json
{
  "modelName": "Basic",
  "fields": ["Front", "Back"],
  "examples": [
    {
      "description": "Basic TypeScript definition example",
      "fields": {
        "Front": "What is TypeScript?",
        "Back": "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript."
      },
      "noteId": 12345
    }
  ]
}
```

### 2. 创建示例卡片

```typescript
const noteId = await ankiClient.createExampleCard({
  modelName: "Basic",
  fields: {
    Front: "What is TypeScript?",
    Back: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
  },
  description: "Basic TypeScript definition example",
  deckName: "Programming::TypeScript",
});
```

### 3. 更新示例卡片

```typescript
await ankiClient.updateExampleCard({
  noteId: 12345,
  fields: {
    Front: "Updated question",
    Back: "Updated answer",
  },
  description: "Updated description",
});
```

## MCP 工具

### 1. `get_note_type_examples`

获取指定笔记类型的示例卡片。

**参数:**

- `modelName` (string): 笔记类型名称

**示例:**

```json
{
  "modelName": "Basic"
}
```

### 2. `create_example_card`

创建新的示例卡片。

**参数:**

- `modelName` (string): 笔记类型名称
- `fields` (object): 字段值
- `description` (string, 可选): 示例描述
- `deckName` (string, 可选): 目标笔记本名称

**示例:**

```json
{
  "modelName": "Basic",
  "fields": {
    "Front": "What is TypeScript?",
    "Back": "TypeScript is a typed superset of JavaScript."
  },
  "description": "Basic TypeScript definition example",
  "deckName": "Programming"
}
```

### 3. `update_example_card`

更新现有的示例卡片。

**参数:**

- `noteId` (number): 卡片 ID
- `fields` (object): 新的字段值
- `description` (string, 可选): 新的描述

**示例:**

```json
{
  "noteId": 12345,
  "fields": {
    "Front": "Updated question",
    "Back": "Updated answer"
  },
  "description": "Updated description"
}
```

### 4. `find_example_cards`

查找指定笔记类型的示例卡片。

**参数:**

- `modelName` (string): 笔记类型名称

**示例:**

```json
{
  "modelName": "Basic"
}
```

## 使用建议

1. **创建示例卡片**: 为每个笔记类型创建 2-3 个示例卡片，展示不同的使用场景
2. **描述信息**: 使用描述性标签或字段来标识示例的用途和特点
3. **组织管理**: 将示例卡片放在专门的笔记本中，便于管理和查找
4. **定期更新**: 随着笔记类型的变化，及时更新示例卡片

## 最佳实践

1. **标签管理**: 使用一致的标签来标识示例卡片
2. **描述策略**: 为每个示例提供清晰的描述
3. **字段完整性**: 确保所有字段都有有意义的内容
4. **定期维护**: 定期审查和更新示例卡片
5. **组织管理**: 将相关的示例卡片分组到专门的笔记本中

## 技术细节

### 示例卡片识别

系统通过以下方式识别示例卡片：

1. **特殊标签**: 带有 `example-card`、`template-example` 或 `示例卡片` 等标签的卡片
2. **笔记类型匹配**: 属于指定笔记类型的卡片
3. **描述提取**: 从标签或字段中自动提取描述信息

### 描述提取优先级

1. **描述标签**: 以 `description:` 开头的标签
2. **描述字段**: 名为 `Description`、`Note`、`Comment`、`描述`、`说明` 或 `注释` 的字段
3. **字段预览**: 第一个非空字段的前 50 个字符
4. **默认**: 基于卡片 ID 的描述

### 错误处理

- 优雅处理缺失的示例卡片
- 当提取失败时回退到默认描述
- 为无效操作提供适当的错误消息
- 网络相关问题的重试逻辑

## 注意事项

1. 示例卡片会占用 Anki 的存储空间
2. 建议定期清理不再需要的示例卡片
3. 示例卡片的标签会影响 Anki 的标签系统
4. 在同步时，示例卡片会与其他卡片一起同步
