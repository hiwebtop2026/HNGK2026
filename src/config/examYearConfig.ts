/**
 * 考试年份口径配置
 *
 * 系统内所有“当年”概念集中在这里，避免年份散落在算法各处。
 *
 * 两个年份必须分开：
 * - TARGET_YEAR：产品服务的届别（用户当前要填报的年份）
 * - REFERENCE_YEAR：等效分折算的基准年，取“最新有官方一分一段表”的年份
 *
 * 等效分只能折算到有分布的年份。2027 年高考尚未公布一分一段表，
 * 因此基准年保持 2026；等 2027 分布入库后，把 REFERENCE_YEAR 改为 2027、
 * SCORE_DISTRIBUTION_YEARS 前移一年即可，算法无需改动。
 *
 * 注意：SchoolScore 的字段名固定为 score2026 / score2025 / score2024，
 * 表示最近三个招生年，换届时在数据层同步扩展即可。
 */
export const TARGET_YEAR = 2027;

/** 等效分折算基准年（最新有官方一分一段表的年份） */
export const REFERENCE_YEAR = 2026;

/** 参与参考分加权、趋势计算的最近三个招生年（由近到远） */
export const HISTORY_YEARS = [2026, 2025, 2024] as const;

/** 需要加载一分一段表的年份：基准年 + 基准年之前的两年 */
export const SCORE_DISTRIBUTION_YEARS = [REFERENCE_YEAR, 2025, 2024] as const;

/** 投档线加载覆盖的年份范围（含尚未入库的 2026） */
export const ADMISSION_YEARS = [2023, 2024, 2025, 2026] as const;

/** 界面上展示的最近三年投档线（与 HISTORY_YEARS 一致） */
export const DISPLAY_SCORE_YEARS = HISTORY_YEARS;

/**
 * 某年缺少官方一分一段表时，用相邻年份近似：
 * 2023 年海南未公布普通类一分一段表，用 2024 年分布近似换算。
 */
const DISTRIBUTION_FALLBACK_YEAR: Record<number, number> = {
  2023: 2024,
};

export function resolveDistributionYear(year: number): number {
  return DISTRIBUTION_FALLBACK_YEAR[year] ?? year;
}
