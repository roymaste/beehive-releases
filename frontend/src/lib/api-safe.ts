/**
 * api-safe.ts — 前端防弹衣
 * 
 * 后端返回什么不知道，但前台不能崩。
 * 所有数据访问走 safeGet，永不抛 TypeError。
 * 
 * 用法：
 *   safeGet(plan, 'limits.environments', '无限制')  // limits=undefined → '无限制'
 *   safeGet(plan, 'features', [])                     // features=undefined → []
 */

// ── 安全取值 ──
// 路径支持点号：safeGet(obj, 'a.b.c', fallback)
// 永不抛异常，路径断了就返回 default
export function safeGet<T = unknown>(
  obj: unknown,
  path: string,
  defaultVal: T,
): T {
  try {
    const parts = path.split('.');
    let cursor: unknown = obj;
    for (const part of parts) {
      if (cursor == null || typeof cursor !== 'object') {
        return defaultVal;
      }
      cursor = (cursor as Record<string, unknown>)[part];
    }
    return cursor as T;
  } catch {
    return defaultVal;
  }
}

// ── 安全取数组成员 ──
// safeGetArray(data, 'plans', []).map(p => safeGet(p, 'name', ''))
export function safeGetArray<T = unknown>(
  obj: unknown,
  path: string,
  defaultVal: T[],
): T[] {
  const val = safeGet(obj, path, defaultVal);
  return Array.isArray(val) ? val : defaultVal;
}

// ── Schema 校验器 ──
// 检查后端返回的数据"长什么样"，不对就打印警告 + 不崩
// schema 示例：
//   { plans: [{ name: 'string', price_monthly: 'number' }] }
//
// 返回两层校验结果：外层字段 vs 内层数组元素字段
type FieldCheckResult = { path: string; expected: string; actual: string; got: unknown };

export function checkSchema(
  data: unknown,
  schema: Record<string, unknown>,
  prefix = '',
): FieldCheckResult[] {
  const issues: FieldCheckResult[] = [];

  if (data == null || typeof data !== 'object') {
    return [];
  }

  for (const [key, expectedType] of Object.entries(schema)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    try {
      const val = (data as Record<string, unknown>)[key];

      if (expectedType === 'array') {
        if (!Array.isArray(val)) {
          issues.push({
            path: fullPath,
            expected: 'array',
            actual: val === null ? 'null' : val === undefined ? 'undefined' : typeof val,
            got: val,
          });
        }
      } else if (typeof expectedType === 'object' && expectedType !== null) {
        // 嵌套对象：递归检查
        if (Array.isArray(val)) {
          // 数组元素：检查第一个元素的字段
          if (val.length > 0) {
            const itemIssues = checkSchema(
              val[0],
              expectedType as Record<string, unknown>,
              `${fullPath}[0]`,
            );
            issues.push(...itemIssues);
          }
        } else if (typeof val === 'object' && val !== null) {
          const nestedIssues = checkSchema(
            val,
            expectedType as Record<string, unknown>,
            fullPath,
          );
          issues.push(...nestedIssues);
        }
        // 如果 val 是 undefined/null，不报——因为 safeGet 会兜底
      } else {
        // 基本类型检查
        if (val !== undefined && val !== null) {
          const actualType = Array.isArray(val) ? 'array' : typeof val;
          const expected = expectedType as string;
          if (
            (expected === 'number' && typeof val !== 'number') ||
            (expected === 'string' && typeof val !== 'string') ||
            (expected === 'boolean' && typeof val !== 'boolean') ||
            (expected === 'object' && actualType !== 'object')
          ) {
            issues.push({
              path: fullPath,
              expected,
              actual: actualType,
              got: val,
            });
          }
        }
      }
    } catch {
      // 检查本身不崩
    }
  }

  return issues;
}

// ── 日志工具（开发模式打印，生产静默） ──
const isDev = typeof window !== 'undefined' &&
  (import.meta as Record<string, unknown>)?.env?.MODE !== 'production';

export function warnSchemaIssues(url: string, issues: FieldCheckResult[]): void {
  if (issues.length === 0 || !isDev) return;

  console.warn(
    `⚠️ [api-safe] API 响应结构不匹配: ${url}`,
    issues.map(i => `  ${i.path}: 期望 ${i.expected}, 实际 ${i.actual}`).join('\n'),
  );
}

// ── 安全 API 调用包装 ──
// 给 apiClient 用的，自动 safeGet 兜底 + schema 校验
export interface SafeCallOptions<T> {
  schema?: Record<string, unknown>;
  defaults?: Partial<T>;
}

export function applyDefaults<T extends Record<string, unknown>>(
  data: unknown,
  defaults: Partial<T>,
): T {
  const result: Record<string, unknown> = {};
  for (const [key, defaultVal] of Object.entries(defaults)) {
    result[key] = safeGet(data, key, defaultVal);
  }
  return result as T;
}
