import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "./utils.js";

/**
 * MCP Prompt Template Handler - Provides predefined Anki interaction templates
 */
export class McpPromptHandler {
	private ankiClient: AnkiClient;

	constructor(ankiClient: AnkiClient) {
		this.ankiClient = ankiClient;
	}

	/**
	 * List all available prompt templates
	 */
	async listPrompts(): Promise<{
		prompts: {
			name: string;
			description: string;
			arguments?: {
				name: string;
				description: string;
				required?: boolean;
			}[];
		}[];
	}> {
		const prompts = [
			{
				name: "study-helper",
				description:
					"Study Assistant - Assists in analyzing learning progress and providing study recommendations",
				arguments: [
					{
						name: "deck_name",
						description: "Name of the deck to analyze",
						required: false,
					},
					{
						name: "analysis_type",
						description: "Analysis type: overview, progress, recommendations",
						required: false,
					},
				],
			},
			{
				name: "note-creator",
				description:
					"Note Creation Wizard - Helps users create structured Anki notes",
				arguments: [
					{
						name: "topic",
						description: "Learning topic or subject area",
						required: true,
					},
					{
						name: "note_type",
						description:
							"Specified note type, will recommend suitable type if not specified",
						required: false,
					},
					{
						name: "source_content",
						description: "Source content or reference materials",
						required: false,
					},
				],
			},
			{
				name: "review-analyzer",
				description:
					"Review Analyst - Analyzes review performance and optimizes learning strategies",
				arguments: [
					{
						name: "time_period",
						description: "Analysis time period: today, week, month",
						required: false,
					},
					{
						name: "focus_area",
						description:
							"Focus area: difficulty (difficult cards), retention (memory retention), efficiency",
						required: false,
					},
				],
			},
			{
				name: "deck-organizer",
				description:
					"Deck Organizer Assistant - Helps optimize deck structure and content",
				arguments: [
					{
						name: "deck_name",
						description: "Name of the deck to organize",
						required: true,
					},
					{
						name: "organization_goal",
						description:
							"Organization goal: structure (structure optimization), content (content cleanup), tags (tag management)",
						required: false,
					},
				],
			},
			{
				name: "content-enhancer",
				description:
					"Content Enhancer - Improves the quality and learning effectiveness of existing notes",
				arguments: [
					{
						name: "note_id",
						description: "ID of the note to enhance",
						required: false,
					},
					{
						name: "enhancement_type",
						description:
							"Enhancement type: clarity, examples, mnemonics (memory techniques), connections",
						required: false,
					},
				],
			},
			{
				name: "learning-planner",
				description:
					"Learning Planner - Creates personalized study plans and review schedules",
				arguments: [
					{
						name: "goal",
						description: "Learning goal description",
						required: true,
					},
					{
						name: "time_available",
						description: "Available study time (minutes/day)",
						required: false,
					},
					{
						name: "difficulty_preference",
						description: "Difficulty preference: easy, moderate, challenging",
						required: false,
					},
				],
			},
			{
				name: "knowledge-mapper",
				description:
					"Knowledge Map Builder - Analyzes and visualizes connections between knowledge points",
				arguments: [
					{
						name: "subject",
						description: "Subject or topic area",
						required: true,
					},
					{
						name: "connection_type",
						description: "Connection type: conceptual, hierarchical, temporal",
						required: false,
					},
				],
			},
			{
				name: "spaced-repetition-optimizer",
				description:
					"Spaced Repetition Optimizer - Optimizes review intervals and learning efficiency",
				arguments: [
					{
						name: "performance_data",
						description: "Recent learning performance data or description",
						required: false,
					},
					{
						name: "optimization_focus",
						description:
							"Optimization focus: retention (memory retention), speed (learning speed), difficulty (tackling difficult points)",
						required: false,
					},
				],
			},
		];

		return { prompts };
	}

	/**
	 * Get the complete content of the specified prompt template
	 */
	async getPrompt(
		name: string,
		args?: Record<string, string>,
	): Promise<{
		prompt: {
			name: string;
			description: string;
			messages: {
				role: "user" | "assistant";
				content: {
					type: string;
					text: string;
				};
			}[];
		};
	}> {
		switch (name) {
			case "study-helper":
				return await this.getStudyHelperPrompt(args);

			case "note-creator":
				return await this.getNoteCreatorPrompt(args);

			case "review-analyzer":
				return await this.getReviewAnalyzerPrompt(args);

			case "deck-organizer":
				return await this.getDeckOrganizerPrompt(args);

			case "content-enhancer":
				return await this.getContentEnhancerPrompt(args);

			case "learning-planner":
				return await this.getLearningPlannerPrompt(args);

			case "knowledge-mapper":
				return await this.getKnowledgeMapperPrompt(args);

			case "spaced-repetition-optimizer":
				return await this.getSpacedRepetitionOptimizerPrompt(args);

			default:
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Unknown prompt template: ${name}`,
				);
		}
	}

	/**
	 * Study helper prompt template
	 */
	private async getStudyHelperPrompt(args?: Record<string, string>) {
		const deckName = args?.deck_name;
		const analysisType = args?.analysis_type || "overview";

		// Get actual data to provide context
		let contextData = "";
		if (deckName) {
			try {
				const stats = await this.ankiClient.getDeckStats(deckName);
				contextData = `\n\nCurrent deck "${deckName}" data:\n${JSON.stringify(
					stats,
					null,
					2,
				)}`;
			} catch (error) {
				contextData = `\n\nNote: Unable to retrieve data for deck "${deckName}", the name might be incorrect or the deck does not exist.`;
			}
		}

		const basePrompt = `你是一个专业的 Anki 学习助手。你的任务是帮助用户分析他们的学习进度，识别学习模式，并提供个性化的学习建议。

你可以访问用户的 Anki 数据，包括：
- 卡片组统计信息
- 学习进度数据
- 复习表现
- 卡片分布情况

分析重点：${
			analysisType === "overview"
				? "整体学习概况"
				: analysisType === "progress"
				  ? "学习进度详情"
				  : "具体学习建议"
		}

请根据用户的数据提供：
1. 学习现状分析
2. 强项和需要改进的领域
3. 具体的学习建议
4. 优化建议和行动计划

使用温暖、鼓励的语调，提供实用且可操作的建议。${contextData}`;

		return {
			prompt: {
				name: "study-helper",
				description: "学习助手 - 分析学习进度并提供建议",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}

	/**
	 * Note creation wizard prompt template
	 */
	private async getNoteCreatorPrompt(args?: Record<string, string>) {
		const topic = args?.topic || "[Please specify topic]";
		const noteType = args?.note_type;
		const sourceContent = args?.source_content || "";

		// Get available note types
		let availableNoteTypes = "";
		try {
			const noteTypes = await this.ankiClient.getModelNames();
			availableNoteTypes = `\n\nAvailable note types: ${noteTypes.join(", ")}`;
		} catch (error) {
			availableNoteTypes = "\n\nNote: Unable to retrieve note type list.";
		}

		const basePrompt = `你是一个专业的 Anki 笔记创建专家。你的任务是帮助用户创建高质量、结构化的学习笔记。

当前创建任务：
主题：${topic}
${noteType ? `指定笔记类型：${noteType}` : ""}
${sourceContent ? `参考内容：\n${sourceContent}` : ""}

请帮助用户：
1. 分析主题内容，确定关键知识点
2. 推荐最适合的笔记类型（如果未指定）
3. 设计卡片正面问题（简洁、明确、具有测试性）
4. 编写卡片背面答案（完整、准确、包含关键细节）
5. 建议相关的标签
6. 提供记忆技巧或助记方法

笔记设计原则：
- 原子化：每张卡片只包含一个知识点
- 清晰性：问题和答案都要清楚明了
- 可测试性：问题要能准确测试知识掌握程度
- 关联性：与相关知识点建立连接

${availableNoteTypes}

请为此主题创建高质量的 Anki 笔记。`;

		return {
			prompt: {
				name: "note-creator",
				description: "笔记创建向导 - 创建结构化的 Anki 笔记",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}

	/**
	 * 复习分析师提示模板
	 */
	private async getReviewAnalyzerPrompt(args?: Record<string, string>) {
		const timePeriod = args?.time_period || "recent";
		const focusArea = args?.focus_area || "overall";

		const basePrompt = `你是一个专业的 Anki 复习分析专家。你的任务是分析用户的复习表现，识别学习模式，并提供优化建议。

分析时间段：${timePeriod}
关注领域：${focusArea}

请从以下角度进行分析：

1. **复习表现分析**
   - 答对率趋势
   - 困难卡片识别
   - 学习效率评估

2. **学习模式识别**
   - 学习时间分布
   - 遗忘曲线特征
   - 复习频率模式

3. **问题诊断**
   - 知识薄弱环节
   - 学习方法问题
   - 时间管理问题

4. **优化建议**
   - 复习策略调整
   - 学习计划优化
   - 具体改进措施

请使用数据驱动的方法，提供具体、可行的改进建议。关注长期学习效果的提升。`;

		return {
			prompt: {
				name: "review-analyzer",
				description: "复习分析师 - 分析复习表现并优化学习策略",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}

	/**
	 * 卡片组整理助手提示模板
	 */
	private async getDeckOrganizerPrompt(args?: Record<string, string>) {
		const deckName = args?.deck_name || "[请指定卡片组名称]";
		const organizationGoal = args?.organization_goal || "comprehensive";

		// 获取卡片组数据
		let deckData = "";
		if (deckName !== "[请指定卡片组名称]") {
			try {
				const noteIds = await this.ankiClient.findNotes(`deck:"${deckName}"`);
				const stats = await this.ankiClient.getDeckStats(deckName);
				deckData = `\n\n卡片组 "${deckName}" 现状：\n- 笔记数量：${
					noteIds.length
				}\n- 统计信息：${JSON.stringify(stats, null, 2)}`;
			} catch (error) {
				deckData = `\n\n注意：无法获取卡片组 "${deckName}" 的数据。`;
			}
		}

		const basePrompt = `你是一个专业的 Anki 卡片组整理专家。你的任务是帮助用户优化卡片组的结构、内容和管理方式。

整理目标：${organizationGoal}
目标卡片组：${deckName}

请提供以下方面的整理建议：

1. **结构优化**
   - 卡片组层次结构
   - 子卡片组划分建议
   - 内容分类方案

2. **内容质量改进**
   - 重复内容识别
   - 低质量卡片筛选
   - 内容一致性检查

3. **标签管理**
   - 标签体系设计
   - 标签标准化建议
   - 标签使用策略

4. **学习效率优化**
   - 卡片难度分层
   - 复习优先级设置
   - 学习路径规划

5. **维护策略**
   - 定期维护计划
   - 质量监控方法
   - 持续改进机制

请提供具体、可操作的整理方案和实施步骤。${deckData}`;

		return {
			prompt: {
				name: "deck-organizer",
				description: "卡片组整理助手 - 优化卡片组结构和内容",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}

	/**
	 * 内容增强器提示模板
	 */
	private async getContentEnhancerPrompt(args?: Record<string, string>) {
		const noteId = args?.note_id;
		const enhancementType = args?.enhancement_type || "comprehensive";

		// 获取笔记数据
		let noteData = "";
		if (noteId) {
			try {
				const notes = await this.ankiClient.notesInfo([parseInt(noteId)]);
				if (notes.length > 0) {
					noteData = `\n\n当前笔记内容：\n${JSON.stringify(notes[0], null, 2)}`;
				}
			} catch (error) {
				noteData = `\n\n注意：无法获取笔记 ID ${noteId} 的数据。`;
			}
		}

		const basePrompt = `你是一个专业的 Anki 内容增强专家。你的任务是改进现有笔记的质量，提高学习效果和记忆保持率。

增强重点：${enhancementType}
${noteId ? `目标笔记 ID：${noteId}` : ""}

请从以下维度提供增强建议：

1. **内容清晰度提升**
   - 语言表达优化
   - 逻辑结构改进
   - 关键信息突出

2. **学习效果增强**
   - 添加实例和案例
   - 提供记忆技巧
   - 增加视觉化元素

3. **知识关联建设**
   - 与相关概念的连接
   - 上下文信息补充
   - 交叉引用建议

4. **测试效果改进**
   - 问题设计优化
   - 答案完整性检查
   - 难度级别调整

5. **个性化定制**
   - 根据学习目标调整
   - 考虑知识背景
   - 适应学习风格

请提供具体的改进方案和修改建议。${noteData}`;

		return {
			prompt: {
				name: "content-enhancer",
				description: "内容增强器 - 改进笔记质量和学习效果",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}

	/**
	 * 学习计划师提示模板
	 */
	private async getLearningPlannerPrompt(args?: Record<string, string>) {
		const goal = args?.goal || "[请描述学习目标]";
		const timeAvailable = args?.time_available || "未指定";
		const difficultyPreference = args?.difficulty_preference || "moderate";

		// 获取当前学习状态
		let currentStatus = "";
		try {
			const decks = await this.ankiClient.getDeckNames();
			currentStatus = `\n\n当前卡片组：${decks.join(", ")}`;
		} catch (error) {
			currentStatus = "\n\n注意：无法获取当前学习状态。";
		}

		const basePrompt = `你是一个专业的个性化学习计划师。你的任务是根据用户的目标、时间安排和偏好，制定科学有效的 Anki 学习计划。

学习目标：${goal}
可用时间：${timeAvailable} 分钟/天
难度偏好：${difficultyPreference}

请制定包含以下要素的学习计划：

1. **目标分解**
   - 长期目标拆分
   - 阶段性里程碑
   - 可量化指标

2. **时间规划**
   - 日常学习安排
   - 复习时间分配
   - 进度检查节点

3. **内容组织**
   - 学习序列设计
   - 知识模块划分
   - 难度递进安排

4. **复习策略**
   - 间隔重复计划
   - 困难内容处理
   - 巩固复习安排

5. **监控调整**
   - 进度跟踪方法
   - 效果评估标准
   - 计划调整机制

6. **动机维持**
   - 成就感培养
   - 挑战性平衡
   - 奖励机制设计

请提供详细、可执行的学习计划，包括具体的时间安排和操作步骤。${currentStatus}`;

		return {
			prompt: {
				name: "learning-planner",
				description: "学习计划师 - 制定个性化学习计划",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}

	/**
	 * 知识图谱构建器提示模板
	 */
	private async getKnowledgeMapperPrompt(args?: Record<string, string>) {
		const subject = args?.subject || "[请指定学科领域]";
		const connectionType = args?.connection_type || "comprehensive";

		const basePrompt = `你是一个专业的知识图谱构建专家。你的任务是分析和可视化知识点之间的关联，帮助用户建立系统化的知识结构。

分析领域：${subject}
关联类型：${connectionType}

请从以下角度构建知识图谱：

1. **核心概念识别**
   - 基础概念提取
   - 重要性权重分析
   - 概念层次划分

2. **关联关系分析**
   - 因果关系
   - 包含关系
   - 对比关系
   - 依赖关系

3. **知识路径规划**
   - 学习先后顺序
   - 知识点依赖链
   - 最优学习路径

4. **gap 分析**
   - 知识空白识别
   - 薄弱环节诊断
   - 补强建议

5. **应用场景映射**
   - 实际应用连接
   - 跨领域关联
   - 综合运用案例

6. **Anki 组织建议**
   - 卡片组结构设计
   - 标签体系规划
   - 复习策略匹配

请提供系统化的知识图谱和具体的 Anki 组织方案。`;

		return {
			prompt: {
				name: "knowledge-mapper",
				description: "知识图谱构建器 - 分析知识关联并优化学习结构",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}

	/**
	 * 间隔重复优化器提示模板
	 */
	private async getSpacedRepetitionOptimizerPrompt(
		args?: Record<string, string>,
	) {
		const performanceData = args?.performance_data || "请提供近期学习表现数据";
		const optimizationFocus = args?.optimization_focus || "comprehensive";

		const basePrompt = `你是一个专业的间隔重复优化专家。你的任务是分析学习表现数据，优化复习间隔和学习策略，最大化学习效率和记忆保持率。

学习表现数据：${performanceData}
优化重点：${optimizationFocus}

请提供以下方面的优化建议：

1. **复习间隔优化**
   - 个性化间隔调整
   - 遗忘曲线分析
   - 最优复习时机

2. **难度管理**
   - 困难卡片策略
   - 简单卡片处理
   - 难度梯度设计

3. **学习负荷平衡**
   - 日常复习量控制
   - 新学习与复习比例
   - 认知负荷管理

4. **记忆强化技术**
   - 多重编码策略
   - 联想记忆方法
   - 情境依赖学习

5. **效率监控指标**
   - 关键绩效指标
   - 改进效果测量
   - 调整触发条件

6. **个性化调优**
   - 学习风格适配
   - 时间偏好考虑
   - 认知特点匹配

请提供科学、可操作的优化方案，包括具体的参数调整建议。`;

		return {
			prompt: {
				name: "spaced-repetition-optimizer",
				description: "间隔重复优化器 - 优化复习策略和学习效率",
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text",
							text: basePrompt,
						},
					},
				],
			},
		};
	}
}
