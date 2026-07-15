/**
 * 输入安全清洗工具
 * 防范LIKE通配符注入和输入验证
 */

/** 搜索关键词最大长度 */
export const MAX_SEARCH_LENGTH = 100;

/**
 * 转义SQL LIKE通配符，防止通配符注入
 * 将用户输入中的 % 和 _ 转义为字面量
 * 使用PostgreSQL的 ESCAPE 语法（默认转义符为 \）
 *
 * @param input 用户原始输入
 * @returns 转义后的安全字符串
 */
export function escapeLikePattern(input: string): string {
  if (!input) return '';
  // 转义反斜杠、% 和 _
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * 清洗搜索输入：去除首尾空白、控制字符，限制长度
 *
 * @param input 用户原始输入
 * @param maxLength 最大长度（默认100）
 * @returns 清洗后的安全字符串
 */
export function sanitizeSearchInput(input: string, maxLength: number = MAX_SEARCH_LENGTH): string {
  if (!input) return '';
  // 去除首尾空白
  let cleaned = input.trim();
  // 移除控制字符（ASCII 0-31 和 127）
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  // 限制长度
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  return cleaned;
}

/**
 * 构建安全的LIKE查询模式
 * 对用户输入进行清洗和转义后，包裹在 % % 中
 *
 * @param input 用户原始输入
 * @param maxLength 最大长度（默认100）
 * @returns 安全的LIKE模式字符串，如 "%安全输入%"
 */
export function buildSafeLikePattern(input: string, maxLength: number = MAX_SEARCH_LENGTH): string {
  const sanitized = sanitizeSearchInput(input, maxLength);
  const escaped = escapeLikePattern(sanitized);
  return `%${escaped}%`;
}
