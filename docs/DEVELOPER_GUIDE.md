# 🚀 Anki MCP Server - Developer Guide

欢迎来到 Anki MCP Server 项目！这个指南将帮助你快速上手项目开发，了解架构设计，并参与贡献代码。

## 📋 目录

- [项目概述](#项目概述)
- [开发环境设置](#开发环境设置)
- [架构设计](#架构设计)
- [开发工作流](#开发工作流)
- [测试指南](#测试指南)
- [代码规范](#代码规范)
- [贡献指南](#贡献指南)
- [故障排除](#故障排除)

## 🎯 项目概述

### 项目简介
Anki MCP Server 是一个 Model Context Protocol (MCP) 服务器，允许大语言模型（LLM）通过 AnkiConnect 与 Anki 闪卡软件进行交互。

### 核心功能
- **卡片管理**：创建、更新、删除、搜索 Anki 卡片
- **牌组操作**：管理 Anki 牌组（deck）
- **笔记类型**：处理不同的笔记模板
- **学习分析**：提供学习进度和难度分析
- **缓存系统**：优化性能的智能缓存
- **错误处理**：完善的错误管理和恢复机制

### 技术栈
- **语言**：TypeScript 5.8.2
- **运行时**：Node.js >=18.0.0
- **构建工具**：tsup 8.4.0
- **测试框架**：Jest 29.7.0
- **代码质量**：Biome (格式化 & 代码检查)
- **协议**：Model Context Protocol (MCP)
- **外部依赖**：AnkiConnect, yanki-connect

## 🛠️ 开发环境设置

### 1. 环境要求
```bash
# Node.js 版本检查
node --version  # 应该 >= 18.0.0
npm --version   # 应该 >= 8.0.0
```

### 2. 克隆项目
```bash
git clone https://github.com/nailuoGG/anki-mcp-server.git
cd anki-mcp-server
```

### 3. 安装依赖
```bash
npm install
```

### 4. 环境变量配置
创建 `.env.development` 文件：
```bash
# Anki 连接配置
ANKI_CONNECT_URL=http://localhost:8765
ANKI_API_VERSION=6
ANKI_TIMEOUT=5000
ANKI_RETRY_ATTEMPTS=3
ANKI_RETRY_DELAY=1000
ANKI_DEFAULT_DECK=Default

# 服务器配置
SERVER_NAME=anki-mcp-server
SERVER_VERSION=0.2.0
NODE_ENV=development
LOG_LEVEL=debug

# 缓存配置
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300000
CACHE_MAX_SIZE=1000
CACHE_CLEANUP_INTERVAL=300000
CACHE_PERFORMANCE_MONITORING=true

# 日志配置
LOG_FORMAT=text
LOG_DESTINATION=console
LOG_INCLUDE_STACK_TRACE=true
```

### 5. 启动开发环境
```bash
# 构建项目
npm run build

# 启动开发模式（自动重新构建）
npm run watch

# 运行测试
npm test

# 代码检查和格式化
npm run lint
npm run format
```

## 🏗️ 架构设计

### 整体架构
项目采用分层架构设计，遵循 Clean Architecture 原则：

```
src/
├── core/                    # 核心业务规则
│   ├── errors/             # 错误处理系统
│   ├── types/              # 类型定义
│   └── entities/           # 业务实体（规划中）
├── infrastructure/         # 基础设施层
│   ├── anki/              # Anki API 适配器
│   ├── config/            # 配置管理
│   ├── cache/             # 缓存管理
│   └── mcp/               # MCP 协议处理
├── application/            # 应用层（规划中）
│   ├── services/          # 应用服务
│   └── usecases/          # 用例实现
├── presentation/           # 表现层
│   ├── tools/             # MCP 工具
│   ├── resources/         # MCP 资源
│   └── prompts/           # MCP 提示
└── shared/                # 共享工具
    ├── utils/             # 工具函数
    ├── constants/         # 常量定义
    └── helpers/           # 辅助函数
```

### 核心模块详解

#### 1. 错误处理系统 (`src/core/errors/`)
```typescript
// 层次化错误类设计
DomainError (基类)
├── AnkiConnectionError     # 连接错误
├── AnkiTimeoutError       # 超时错误
├── AnkiApiError           # API 错误
├── InvalidNoteError       # 笔记验证错误
├── InvalidDeckError       # 牌组验证错误
├── ConfigurationError     # 配置错误
├── McpProtocolError       # MCP 协议错误
└── BusinessLogicError     # 业务逻辑错误
```

**特点**：
- 错误分类和严重程度自动标记
- 统一的错误日志格式
- MCP 协议错误转换
- 可恢复性判断

#### 2. 配置管理系统 (`src/infrastructure/config/`)
```typescript
// 配置模块结构
ConfigLoader              # 主配置加载器（单例）
├── AnkiConfig           # Anki 相关配置
├── ServerConfig         # 服务器配置
├── CacheConfig          # 缓存配置
└── LoggingConfig        # 日志配置
```

**特点**：
- 环境变量自动加载和验证
- 类型安全的配置接口
- 支持配置覆盖（便于测试）
- 配置变更热重载

#### 3. Anki 客户端 (`src/infrastructure/anki/`)
```typescript
export class AnkiClient {
  // 核心功能
  async checkConnection(): Promise<boolean>
  async getDeckNames(): Promise<string[]>
  async createDeck(name: string): Promise<number>
  async addNote(params: NoteParams): Promise<number | null>
  async findNotes(query: string): Promise<number[]>
  async updateNoteFields(params: UpdateParams): Promise<void>
  
  // 私有方法
  private executeWithRetry<T>(operation, operationName, maxRetries)
  private executeWithCache<T>(cacheKey, operation, operationName, ttl)
  private normalizeError(error: unknown): Error
}
```

**特点**：
- 自动重试机制（指数退避）
- 智能缓存系统
- 错误标准化处理
- 性能监控集成

### 数据流向
```
MCP Client → AnkiMcpServer → McpToolHandler → SpecificTool → AnkiClient → AnkiConnect → Anki
     ↓                                                                                    ↑
ErrorHandler ← DomainError ← normalize() ← API Response ← HTTP Request ← yanki-connect
     ↓
McpErrorResponse → MCP Client
```

## 🔄 开发工作流

### 1. 新功能开发流程

#### Step 1: 需求分析
```bash
# 创建功能分支
git checkout -b feature/new-analysis-tool

# 分析需求，确定：
# - 涉及哪些 MCP 工具/资源/提示
# - 需要哪些 Anki API 调用
# - 错误处理策略
# - 缓存策略
```

#### Step 2: 实现工具类
```typescript
// src/presentation/tools/analysis/NewAnalysisTool.ts
import { BaseTool, IMcpTool } from '../../tools/baseTool.js';
import { AnkiClient } from '../../../infrastructure/anki/AnkiClient.js';

export class NewAnalysisTool extends BaseTool implements IMcpTool {
  public readonly name = 'new_analysis';
  public readonly description = 'Perform new type of analysis';
  
  public readonly inputSchema = {
    type: 'object',
    properties: {
      deckName: { type: 'string', description: 'Target deck name' }
    },
    required: ['deckName']
  };

  async execute(args: any) {
    try {
      this.validateRequiredArgs(args, ['deckName']);
      
      const deckName = this.getStringArg(args, 'deckName');
      
      // 业务逻辑实现
      const result = await this.performAnalysis(deckName);
      
      return this.formatSuccessResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private async performAnalysis(deckName: string) {
    // 具体分析逻辑
  }
}
```

#### Step 3: 注册工具
```typescript
// src/mcpTools.ts
import { NewAnalysisTool } from './tools/analysis/NewAnalysisTool.js';

private registerTools() {
  // ... 现有工具注册
  this.register(new NewAnalysisTool(this.ankiClient));
}
```

#### Step 4: 编写测试
```typescript
// tests/unit/presentation/tools/analysis/NewAnalysisTool.test.ts
import { NewAnalysisTool } from '../../../../../src/presentation/tools/analysis/NewAnalysisTool.js';
import { AnkiClient } from '../../../../../src/infrastructure/anki/AnkiClient.js';

describe('NewAnalysisTool', () => {
  let tool: NewAnalysisTool;
  let mockAnkiClient: jest.Mocked<AnkiClient>;
  
  beforeEach(() => {
    mockAnkiClient = createMockAnkiClient();
    tool = new NewAnalysisTool(mockAnkiClient);
  });
  
  it('should perform analysis correctly', async () => {
    // 测试用例实现
  });
});
```

### 2. Bug 修复流程

#### Step 1: 问题定位
```bash
# 检查错误日志
npm run build && node dist/index.js

# 查看错误类型和堆栈
[ERROR] AnkiConnectionError: Connection failed
  Code: ANKI_CONNECTION_ERROR
  Category: connection
  Severity: high
  Stack: ...
```

#### Step 2: 编写复现测试
```typescript
it('should handle connection failure gracefully', async () => {
  mockAnkiClient.checkConnection.mockRejectedValue(
    new Error('ECONNREFUSED')
  );
  
  const result = await tool.execute({ deckName: 'test' });
  
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Connection failed');
});
```

#### Step 3: 修复实现
- 修改相关代码
- 确保测试通过
- 验证不影响其他功能

### 3. 代码审查要点

#### 架构一致性
- [ ] 是否遵循分层架构原则
- [ ] 错误处理是否使用统一的 ErrorHandler
- [ ] 配置是否通过 ConfigLoader 获取
- [ ] 是否正确使用 BaseTool 基类

#### 代码质量
- [ ] TypeScript 类型定义完整
- [ ] 函数和类有清晰的注释
- [ ] 遵循单一职责原则
- [ ] 没有硬编码的配置值

#### 测试覆盖
- [ ] 核心功能有单元测试
- [ ] 错误场景有测试覆盖
- [ ] 边界条件有验证
- [ ] 测试描述清晰准确

## 🧪 测试指南

### 测试结构
```
tests/
├── unit/                   # 单元测试
│   ├── core/              # 核心模块测试
│   ├── infrastructure/    # 基础设施测试
│   └── presentation/      # 表现层测试
├── integration/           # 集成测试
├── e2e/                   # 端到端测试
├── fixtures/              # 测试数据
└── helpers/               # 测试工具
```

### 测试命令
```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- ErrorHandler.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式（开发时使用）
npm run test:watch
```

### 测试编写规范

#### 1. 单元测试示例
```typescript
describe('ErrorHandler', () => {
  describe('handle', () => {
    it('should handle domain errors correctly', () => {
      const error = new AnkiConnectionError('Connection failed');
      const response = ErrorHandler.handle(error);
      
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('CONNECTION Error');
    });
  });
});
```

#### 2. Mock 使用
```typescript
// 创建 Mock
const mockAnkiClient = {
  checkConnection: jest.fn(),
  getDeckNames: jest.fn(),
  createDeck: jest.fn(),
} as jest.Mocked<Partial<AnkiClient>>;

// 设置 Mock 行为
mockAnkiClient.getDeckNames.mockResolvedValue(['Default', 'Programming']);

// 验证调用
expect(mockAnkiClient.getDeckNames).toHaveBeenCalledWith();
```

#### 3. 异步测试
```typescript
it('should handle async operations', async () => {
  const promise = tool.execute({ deckName: 'test' });
  
  await expect(promise).resolves.toEqual(expectedResult);
});
```

## 📝 代码规范

### 1. TypeScript 规范
```typescript
// ✅ 好的写法
interface NoteParams {
  readonly deckName: string;
  readonly modelName: string;
  readonly fields: Record<string, string>;
  readonly tags?: string[];
}

// ❌ 避免的写法
function createNote(deck: any, model: any, fields: any) {
  // 缺少类型定义
}
```

### 2. 命名规范
```typescript
// 类名：PascalCase
class AnkiConnectionError extends DomainError {}

// 方法名：camelCase
async getDeckNames(): Promise<string[]> {}

// 常量：SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT = 5000;

// 文件名：camelCase.ts
// ankiClient.ts, errorHandler.ts
```

### 3. 错误处理规范
```typescript
// ✅ 正确的错误处理
try {
  const result = await this.ankiClient.getDeckNames();
  return this.formatSuccessResponse(result);
} catch (error) {
  return this.handleError(error); // 使用基类的错误处理
}

// ❌ 避免直接抛出
throw new Error('Something failed'); // 缺少错误分类
```

### 4. 注释规范
```typescript
/**
 * 创建新的 Anki 笔记
 * 
 * @param params 笔记参数
 * @param params.deckName 目标牌组名称
 * @param params.modelName 笔记模型名称
 * @param params.fields 字段内容映射
 * @returns 创建的笔记 ID，失败时返回 null
 * 
 * @throws {AnkiConnectionError} 当无法连接到 Anki 时
 * @throws {InvalidNoteError} 当笔记参数无效时
 * 
 * @example
 * ```typescript
 * const noteId = await ankiClient.addNote({
 *   deckName: 'Programming',
 *   modelName: 'Basic',
 *   fields: { Front: 'Question', Back: 'Answer' }
 * });
 * ```
 */
async addNote(params: NoteParams): Promise<number | null> {
  // 实现
}
```

## 🤝 贡献指南

### 1. 准备工作
```bash
# Fork 项目到你的 GitHub 账户
# 克隆你的 Fork
git clone https://github.com/YOUR_USERNAME/anki-mcp-server.git
cd anki-mcp-server

# 添加上游仓库
git remote add upstream https://github.com/nailuoGG/anki-mcp-server.git

# 同步最新代码
git fetch upstream
git checkout master
git merge upstream/master
```

### 2. 开发分支策略
```bash
# 功能开发
git checkout -b feature/description

# Bug 修复
git checkout -b fix/issue-number

# 文档更新
git checkout -b docs/improvement

# 重构
git checkout -b refactor/component-name
```

### 3. 提交规范
```bash
# 提交消息格式
git commit -m "type(scope): description"

# 示例
git commit -m "feat(tools): add progress analysis tool"
git commit -m "fix(config): handle missing environment variables"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(errors): add error handler test cases"
```

### 4. Pull Request 流程
1. 确保所有测试通过
2. 更新相关文档
3. 创建 PR 并填写模板
4. 等待代码审查
5. 根据反馈修改
6. 合并到主分支

### 5. PR 模板
```markdown
## 变更类型
- [ ] 新功能 (feature)
- [ ] Bug 修复 (fix)
- [ ] 文档更新 (docs)
- [ ] 重构 (refactor)
- [ ] 测试 (test)

## 变更描述
简要描述本次变更的内容和原因。

## 测试
- [ ] 添加了新的测试用例
- [ ] 所有现有测试通过
- [ ] 手动测试通过

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 更新了相关文档
- [ ] 没有破坏现有功能
```

## 🔧 故障排除

### 1. 常见问题

#### 问题：无法连接到 Anki
```bash
# 错误信息
[ERROR] AnkiConnectionError: Connection failed
  Code: ANKI_CONNECTION_ERROR
  Cause: ECONNREFUSED

# 解决方案
1. 确保 Anki 正在运行
2. 检查 AnkiConnect 插件是否已安装
3. 验证端口配置 (默认 8765)
4. 检查防火墙设置
```

#### 问题：测试失败
```bash
# 错误信息
FAIL tests/unit/core/errors/ErrorHandler.test.ts
● ErrorHandler › handle › should handle domain errors correctly
  TypeError: Cannot read property 'toBeValidConfiguration' of undefined

# 解决方案
确保测试设置正确：
npm test -- --setupFilesAfterEnv=<rootDir>/tests/setup.ts
```

#### 问题：构建失败
```bash
# 错误信息
src/core/errors/ErrorHandler.ts:1:31 - error TS2307: 
Cannot find module '@modelcontextprotocol/sdk/types.js'

# 解决方案
1. 重新安装依赖：npm ci
2. 检查 tsconfig.json 配置
3. 确保 Node.js 版本 >= 18.0.0
```

### 2. 调试技巧

#### 使用调试器
```typescript
// 在代码中添加断点
debugger;

// 运行调试模式
node --inspect-brk dist/index.js
```

#### 详细日志
```bash
# 设置详细日志级别
export LOG_LEVEL=debug
npm run build && node dist/index.js
```

#### 性能分析
```typescript
// 检查缓存命中率
console.log(globalCache.getStats());

// 监控操作性能
console.log(globalPerformanceMonitor.getMetrics());
```

### 3. 开发工具推荐

#### IDE 配置 (VS Code)
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll.eslint": true
  }
}
```

#### 有用的扩展
- TypeScript Hero
- Jest Runner
- Error Lens
- GitLens

## 📚 参考资源

### 架构文档
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

### MCP 协议
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)

### Anki 相关
- [AnkiConnect API](https://ankiweb.net/shared/info/2055492159)
- [Anki Manual](https://docs.ankiweb.net/)

### 开发工具
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Biome Linter](https://biomejs.dev/)

---

## 🙋‍♂️ 需要帮助？

如果你在开发过程中遇到问题：

1. **查阅文档**：先检查本指南和相关文档
2. **搜索 Issues**：查看 GitHub Issues 是否有类似问题
3. **创建 Issue**：描述问题，包含错误信息和复现步骤
4. **参与讨论**：在 Discussions 中与社区交流

欢迎参与到项目中来，让我们一起构建更好的 Anki MCP Server！🚀