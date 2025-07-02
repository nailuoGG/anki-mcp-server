import { BaseTool, IMcpTool } from "./baseTool.js";
import { AnkiClient } from "../utils.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * Learning Progress Analyzer - Analyzes overall learning progress and performance
 */
export class LearningProgressAnalyzerTool extends BaseTool implements IMcpTool {
	name = "analyze_learning_progress";
	description =
		"Analyze learning progress and performance, provide personalized recommendations";

	inputSchema = {
		type: "object",
		properties: {
			deck_name: {
				type: "string",
				description:
					"Name of the deck to analyze (optional, analyzes all if not specified)",
			},
			time_period: {
				type: "string",
				enum: ["today", "week", "month", "all"],
				description: "Analysis time period",
				default: "week",
			},
			include_recommendations: {
				type: "boolean",
				description: "Whether to include learning recommendations",
				default: true,
			},
		},
	};

	async execute(args: any) {
		try {
			const {
				deck_name,
				time_period = "week",
				include_recommendations = true,
			} = args;

			// Get basic data
			const decks = deck_name
				? [deck_name]
				: await this.ankiClient.getDeckNames();
			const analysisResults = [];

			for (const deckName of decks.slice(0, 5)) {
				// Limit quantity to avoid performance issues
				try {
					const stats = await this.ankiClient.getDeckStats(deckName);
					const noteIds = await this.ankiClient.findNotes(`deck:"${deckName}"`);
					const cardIds = await this.ankiClient.findCards(`deck:"${deckName}"`);

					let cardsInfo = [];
					if (cardIds.length > 0) {
						const limitedCardIds = cardIds.slice(0, 50);
						cardsInfo = await this.ankiClient.cardsInfo(limitedCardIds);
					}

					// Calculate learning metrics
					const metrics = this.calculateLearningMetrics(stats, cardsInfo);
					const trends = this.analyzeTrends(cardsInfo, time_period);
					const difficulties = this.identifyDifficulties(cardsInfo);

					analysisResults.push({
						deckName,
						totalNotes: noteIds.length,
						totalCards: cardIds.length,
						metrics,
						trends,
						difficulties,
						...(include_recommendations && {
							recommendations: this.generateRecommendations(
								metrics,
								trends,
								difficulties,
							),
						}),
					});
				} catch (error) {
					analysisResults.push({
						deckName,
						error: `Analysis failed: ${
							error instanceof Error ? error.message : String(error)
						}`,
					});
				}
			}

			const overallAnalysis = {
				summary: {
					total_decks_analyzed: analysisResults.filter((r) => !r.error).length,
					analysis_period: time_period,
					generated_at: new Date().toISOString(),
				},
				deck_analyses: analysisResults,
				overall_recommendations:
					this.generateOverallRecommendations(analysisResults),
			};

			return this.formatSuccessResponse(overallAnalysis);
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Calculate learning metrics
	 */
	private calculateLearningMetrics(stats: any, cardsInfo: any[]) {
		const total = cardsInfo.length;
		if (total === 0) return { total: 0 };

		// Classify cards by queue
		const queues = { new: 0, learning: 0, review: 0, suspended: 0 };
		const intervals = { mature: 0, young: 0, learning: 0 };
		let totalReviews = 0;
		let totalLapses = 0;

		cardsInfo.forEach((card) => {
			const queue = card.queue || 0;
			const interval = card.interval || 0;

			if (queue === 0) queues.new++;
			else if (queue === 1 || queue === 3) queues.learning++;
			else if (queue === 2) queues.review++;
			else if (queue === -1) queues.suspended++;

			if (interval >= 21) intervals.mature++;
			else if (interval > 0) intervals.young++;
			else intervals.learning++;

			totalReviews += card.reps || 0;
			totalLapses += card.lapses || 0;
		});

		return {
			total,
			distribution: queues,
			maturity: intervals,
			retention_rate:
				totalReviews > 0
					? Math.round((1 - totalLapses / totalReviews) * 100)
					: 0,
			mature_rate: Math.round((intervals.mature / total) * 100),
			stats: {
				new_today: stats.new_count || 0,
				review_today: stats.review_count || 0,
				learning_today: stats.learn_count || 0,
			},
		};
	}

	/**
	 * Analyze learning trends
	 */
	private analyzeTrends(cardsInfo: any[], timePeriod: string) {
		const now = Date.now();
		const cutoff = this.getTimeCutoff(timePeriod);

		const recentCards = cardsInfo.filter((card) => {
			const lastReview = card.mod ? card.mod * 1000 : 0;
			return lastReview >= cutoff;
		});

		return {
			period: timePeriod,
			cards_reviewed: recentCards.length,
			avg_ease:
				recentCards.length > 0
					? Math.round(
							recentCards.reduce(
								(sum, card) => sum + (card.factor || 2500),
								0,
							) / recentCards.length,
					  )
					: 0,
			trend_indicator: this.calculateTrendIndicator(recentCards),
		};
	}

	/**
	 * Identify learning difficulties
	 */
	private identifyDifficulties(cardsInfo: any[]) {
		const difficulties = {
			high_lapse_cards: 0,
			low_ease_cards: 0,
			overdue_cards: 0,
			problem_areas: [] as string[],
		};

		cardsInfo.forEach((card) => {
			const lapses = card.lapses || 0;
			const ease = card.factor || 2500;
			const due = card.due || 0;

			if (lapses >= 3) difficulties.high_lapse_cards++;
			if (ease < 2000) difficulties.low_ease_cards++;
			if (due < 0) difficulties.overdue_cards++;
		});

		// Identify problem patterns
		if (difficulties.high_lapse_cards > cardsInfo.length * 0.1) {
			difficulties.problem_areas.push(
				"High forgetting rate, recommend adjusting review intervals",
			);
		}
		if (difficulties.low_ease_cards > cardsInfo.length * 0.2) {
			difficulties.problem_areas.push(
				"Some content difficult to understand, recommend adding supplementary materials",
			);
		}

		return difficulties;
	}

	/**
	 * Generate personalized recommendations
	 */
	private generateRecommendations(
		metrics: any,
		trends: any,
		difficulties: any,
	) {
		const recommendations = [];

		// Recommendations based on maturity
		if (metrics.mature_rate < 30) {
			recommendations.push({
				type: "learning_strategy",
				priority: "high",
				message: "成熟卡片比例较低，建议坚持日常复习以提高记忆巩固度",
			});
		}

		// 基于保持率的建议
		if (metrics.retention_rate < 80) {
			recommendations.push({
				type: "difficulty_adjustment",
				priority: "medium",
				message: "记忆保持率偏低，考虑降低学习难度或增加复习频率",
			});
		}

		// 基于趋势的建议
		if (trends.cards_reviewed < 10) {
			recommendations.push({
				type: "consistency",
				priority: "high",
				message:
					"Recent review volume is low, recommend maintaining regular learning rhythm",
			});
		}

		// Recommendations based on difficulties
		difficulties.problem_areas.forEach((area: string) => {
			recommendations.push({
				type: "problem_solving",
				priority: "medium",
				message: area,
			});
		});

		return recommendations;
	}

	/**
	 * Generate overall recommendations
	 */
	private generateOverallRecommendations(results: any[]) {
		const validResults = results.filter((r) => !r.error);
		if (validResults.length === 0) return [];

		const overallRecommendations = [];

		const avgMatureRate =
			validResults.reduce((sum, r) => sum + (r.metrics?.mature_rate || 0), 0) /
			validResults.length;
		const totalRecommendations = validResults.reduce(
			(sum, r) => sum + (r.recommendations?.length || 0),
			0,
		);

		if (avgMatureRate < 40) {
			overallRecommendations.push(
				"Overall learning progress is good, but recommend strengthening long-term memory consolidation",
			);
		}

		if (totalRecommendations > validResults.length * 2) {
			overallRecommendations.push(
				"Multiple areas for improvement found, recommend prioritizing high-priority issues",
			);
		}

		return overallRecommendations;
	}

	private getTimeCutoff(period: string): number {
		const now = Date.now();
		switch (period) {
			case "today":
				return now - 24 * 60 * 60 * 1000;
			case "week":
				return now - 7 * 24 * 60 * 60 * 1000;
			case "month":
				return now - 30 * 24 * 60 * 60 * 1000;
			default:
				return 0;
		}
	}

	private calculateTrendIndicator(cards: any[]): string {
		if (cards.length === 0) return "insufficient_data";

		const avgEase =
			cards.reduce((sum, card) => sum + (card.factor || 2500), 0) /
			cards.length;
		const avgLapses =
			cards.reduce((sum, card) => sum + (card.lapses || 0), 0) / cards.length;

		if (avgEase > 2300 && avgLapses < 1) return "improving";
		if (avgEase < 2000 || avgLapses > 2) return "declining";
		return "stable";
	}
}

/**
 * Knowledge Connection Analyzer - Analyzes correlations between knowledge points
 */
export class KnowledgeConnectionAnalyzerTool
	extends BaseTool
	implements IMcpTool
{
	name = "analyze_knowledge_connections";
	description =
		"Analyze knowledge point correlations and learning paths, optimize learning order";

	inputSchema = {
		type: "object",
		properties: {
			deck_name: {
				type: "string",
				description: "Name of the deck to analyze",
				required: true,
			},
			connection_type: {
				type: "string",
				enum: ["tags", "content", "temporal"],
				description:
					"Connection analysis type: tag connections, content connections, temporal connections",
				default: "tags",
			},
			min_connections: {
				type: "number",
				description: "Minimum connection count threshold",
				default: 2,
			},
		},
		required: ["deck_name"],
	};

	async execute(args: any) {
		try {
			const { deck_name, connection_type = "tags", min_connections = 2 } = args;

			// Get notes in the deck
			const noteIds = await this.ankiClient.findNotes(`deck:"${deck_name}"`);
			if (noteIds.length === 0) {
				throw new McpError(
					ErrorCode.InvalidParams,
					`No notes found in deck "${deck_name}"`,
				);
			}

			// Limit analysis quantity
			const limitedIds = noteIds.slice(0, 100);
			const notes = await this.ankiClient.notesInfo(limitedIds);

			// Perform connection analysis by type
			let connections = [];
			let analysis = {};

			switch (connection_type) {
				case "tags":
					analysis = this.analyzeTagConnections(notes, min_connections);
					break;
				case "content":
					analysis = this.analyzeContentConnections(notes, min_connections);
					break;
				case "temporal":
					analysis = this.analyzeTemporalConnections(notes, min_connections);
					break;
			}

			const result = {
				deck_name,
				analysis_type: connection_type,
				total_notes: noteIds.length,
				analyzed_notes: limitedIds.length,
				...analysis,
				learning_path_suggestions: this.generateLearningPath(analysis),
				optimization_recommendations:
					this.generateOptimizationRecommendations(analysis),
			};

			return this.formatSuccessResponse(result);
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Analyze tag connections
	 */
	private analyzeTagConnections(notes: any[], minConnections: number) {
		const tagCounts = new Map<string, number>();
		const tagCooccurrence = new Map<string, Map<string, number>>();
		const notesByTag = new Map<string, number[]>();

		// Count tags and co-occurrences
		notes.forEach((note, index) => {
			const tags = note.tags || [];

			tags.forEach((tag: any) => {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);

				if (!notesByTag.has(tag)) {
					notesByTag.set(tag, []);
				}
				notesByTag.get(tag)!.push(index);

				// Record tag co-occurrence
				tags.forEach((otherTag: any) => {
					if (tag !== otherTag) {
						if (!tagCooccurrence.has(tag)) {
							tagCooccurrence.set(tag, new Map());
						}
						const tagMap = tagCooccurrence.get(tag)!;
						tagMap.set(otherTag, (tagMap.get(otherTag) || 0) + 1);
					}
				});
			});
		});

		// Generate connection graph
		const connections = [];
		for (const [tag, coTags] of tagCooccurrence) {
			for (const [coTag, count] of coTags) {
				if (count >= minConnections) {
					connections.push({
						from: tag,
						to: coTag,
						strength: count,
						type: "tag_cooccurrence",
					});
				}
			}
		}

		return {
			tag_statistics: Object.fromEntries(tagCounts),
			connections,
			connection_clusters: this.findClusters(connections),
			coverage_analysis: this.analyzeTagCoverage(notesByTag, notes.length),
		};
	}

	/**
	 * Analyze content connections
	 */
	private analyzeContentConnections(notes: any[], minConnections: number) {
		// Simplified content connection analysis (based on keywords from field content)
		const keywordConnections = new Map<string, Set<number>>();

		notes.forEach((note, index) => {
			const content = this.extractTextContent(note.fields);
			const keywords = this.extractKeywords(content);

			keywords.forEach((keyword) => {
				if (!keywordConnections.has(keyword)) {
					keywordConnections.set(keyword, new Set());
				}
				keywordConnections.get(keyword)!.add(index);
			});
		});

		const connections = [];
		const strongKeywords = Array.from(keywordConnections.entries()).filter(
			([_, noteSet]) => noteSet.size >= minConnections,
		);

		// Find notes that share keywords
		for (let i = 0; i < strongKeywords.length; i++) {
			for (let j = i + 1; j < strongKeywords.length; j++) {
				const [keyword1, notes1] = strongKeywords[i];
				const [keyword2, notes2] = strongKeywords[j];

				const intersection = new Set([...notes1].filter((x) => notes2.has(x)));
				if (intersection.size >= minConnections) {
					connections.push({
						from: keyword1,
						to: keyword2,
						strength: intersection.size,
						type: "content_similarity",
						shared_notes: Array.from(intersection),
					});
				}
			}
		}

		return {
			keyword_frequency: Object.fromEntries(
				strongKeywords.map(([keyword, noteSet]) => [keyword, noteSet.size]),
			),
			connections,
			content_clusters: this.groupByContentSimilarity(
				notes,
				keywordConnections,
			),
		};
	}

	/**
	 * Analyze temporal connections
	 */
	private analyzeTemporalConnections(notes: any[], minConnections: number) {
		// Analysis based on note creation and modification times
		const timeGroups = new Map<string, number[]>();

		notes.forEach((note, index) => {
			const modTime = note.mod || 0;
			const date = new Date(modTime * 1000);
			const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

			if (!timeGroups.has(dayKey)) {
				timeGroups.set(dayKey, []);
			}
			timeGroups.get(dayKey)!.push(index);
		});

		const temporalPatterns = Array.from(timeGroups.entries())
			.filter(([_, noteIndices]) => noteIndices.length >= minConnections)
			.map(([date, noteIndices]) => ({
				date,
				note_count: noteIndices.length,
				note_indices: noteIndices,
			}));

		return {
			temporal_patterns: temporalPatterns,
			learning_sessions: this.identifyLearningSessions(temporalPatterns),
			study_frequency: this.calculateStudyFrequency(temporalPatterns),
		};
	}

	/**
	 * Generate learning path suggestions
	 */
	private generateLearningPath(analysis: any) {
		const suggestions = [];

		if (analysis.tag_statistics) {
			const sortedTags = Object.entries(analysis.tag_statistics)
				.sort(([, a]: any, [, b]: any) => b - a)
				.slice(0, 5);

			suggestions.push({
				type: "tag_based_path",
				recommendation: "Recommend learning by tag frequency",
				path: sortedTags.map(([tag]) => tag),
			});
		}

		if (analysis.connections && analysis.connections.length > 0) {
			const strongestConnections = analysis.connections
				.sort((a: any, b: any) => b.strength - a.strength)
				.slice(0, 3);

			suggestions.push({
				type: "connection_based_path",
				recommendation:
					"Prioritize learning strongly connected knowledge points",
				connections: strongestConnections,
			});
		}

		return suggestions;
	}

	/**
	 * Generate optimization recommendations
	 */
	private generateOptimizationRecommendations(analysis: any) {
		const recommendations = [];

		if (
			analysis.connection_clusters &&
			analysis.connection_clusters.length > 3
		) {
			recommendations.push({
				type: "structure",
				message:
					"Knowledge points are highly dispersed, recommend creating sub-decks for better categorization",
			});
		}

		if (
			analysis.coverage_analysis &&
			analysis.coverage_analysis.untagged_ratio > 0.3
		) {
			recommendations.push({
				type: "tagging",
				message:
					"Many notes lack tags, recommend adding tags to improve knowledge organization",
			});
		}

		return recommendations;
	}

	// Helper methods
	private extractTextContent(fields: any): string {
		return Object.values(fields || {})
			.map((field: any) => field.value || "")
			.join(" ");
	}

	private extractKeywords(text: string): string[] {
		// Simplified keyword extraction
		return text
			.toLowerCase()
			.replace(/[^\w\s\u4e00-\u9fff]/g, " ")
			.split(/\s+/)
			.filter((word) => word.length > 2)
			.slice(0, 10);
	}

	private findClusters(connections: any[]): any[] {
		// Simplified clustering algorithm
		const clusters: any[] = [];
		const visited = new Set();

		connections.forEach((conn) => {
			if (!visited.has(conn.from) && !visited.has(conn.to)) {
				const cluster = [conn.from, conn.to];
				visited.add(conn.from);
				visited.add(conn.to);
				clusters.push(cluster);
			}
		});

		return clusters;
	}

	private analyzeTagCoverage(
		notesByTag: Map<string, number[]>,
		totalNotes: number,
	) {
		const taggedNotes = new Set();
		notesByTag.forEach((noteIndices) => {
			noteIndices.forEach((index) => taggedNotes.add(index));
		});

		return {
			tagged_notes: taggedNotes.size,
			total_notes: totalNotes,
			coverage_ratio: taggedNotes.size / totalNotes,
			untagged_ratio: (totalNotes - taggedNotes.size) / totalNotes,
		};
	}

	private groupByContentSimilarity(
		notes: any[],
		keywordConnections: Map<string, Set<number>>,
	): any[] {
		// Simplified content clustering
		return Array.from(keywordConnections.entries())
			.filter(([_, noteSet]) => noteSet.size >= 2)
			.map(([keyword, noteSet]) => ({
				keyword,
				note_count: noteSet.size,
				notes: Array.from(noteSet).slice(0, 5),
			}));
	}

	private identifyLearningSessions(patterns: any[]): any[] {
		return patterns
			.filter((p) => p.note_count >= 3)
			.map((p) => ({
				date: p.date,
				intensity:
					p.note_count > 10 ? "high" : p.note_count > 5 ? "medium" : "low",
				note_count: p.note_count,
			}));
	}

	private calculateStudyFrequency(patterns: any[]): any {
		const dates = patterns.map((p) => new Date(p.date));
		const daysDiff =
			Math.max(...dates.map((d) => d.getTime())) -
			Math.min(...dates.map((d) => d.getTime()));
		const frequency = patterns.length / (daysDiff / (1000 * 60 * 60 * 24) || 1);

		return {
			sessions_per_day: Math.round(frequency * 100) / 100,
			total_sessions: patterns.length,
			date_range_days: Math.round(daysDiff / (1000 * 60 * 60 * 24)),
		};
	}
}
