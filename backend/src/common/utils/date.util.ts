// backend/src/common/utils/date.util.ts

/**
 * Múi giờ Việt Nam (UTC+7, không có DST).
 */
export const VN_TIMEZONE_OFFSET_HOURS = 7;

/**
 * Kết quả parse 1 ngày theo giờ Việt Nam thành khoảng UTC.
 */
export interface VnDayRange {
  /** Chuỗi YYYY-MM-DD (giữ nguyên input) */
  dateStr: string;

  /** 00:00:00 giờ VN = 17:00:00 UTC ngày hôm trước */
  startUtc: Date;

  /** 24:00:00 giờ VN = 17:00:00 UTC ngày hôm đó (exclusive) */
  endUtc: Date;

  /** Date object ở UTC midnight — dùng để lưu vào cột @db.Date */
  dateOnly: Date;
}

/**
 * Regex validate format ngày.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse 'YYYY-MM-DD' (giờ VN) → khoảng [startUtc, endUtc).
 *
 * Ví dụ: '2026-10-07' (giờ VN)
 *   → startUtc = 2026-10-06T17:00:00.000Z
 *   → endUtc   = 2026-10-07T17:00:00.000Z
 *
 * @throws Error nếu format sai hoặc ngày không tồn tại.
 */
export function parseVnDay(dateStr: string): VnDayRange {
  if (!DATE_RE.test(dateStr)) {
    throw new Error(`Ngày không hợp lệ: "${dateStr}". Định dạng đúng: YYYY-MM-DD`);
  }

  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  if (m < 1 || m > 12) throw new Error(`Tháng không hợp lệ: ${m}`);
  if (d < 1 || d > 31) throw new Error(`Ngày không hợp lệ: ${d}`);

  // Kiểm tra ngày thực sự tồn tại (VD: 2026-02-30 không hợp lệ)
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    throw new Error(`Ngày không tồn tại: ${dateStr}`);
  }

  // 00:00 VN = 17:00 UTC ngày hôm trước → UTC(y, m-1, d, -7)
  const startUtc = new Date(Date.UTC(y, m - 1, d, -VN_TIMEZONE_OFFSET_HOURS));
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  // Cho cột @db.Date: dùng UTC midnight của ngày đó
  const dateOnly = new Date(Date.UTC(y, m - 1, d));

  return { dateStr, startUtc, endUtc, dateOnly };
}

/**
 * Lấy 'YYYY-MM-DD' theo giờ VN từ một Date bất kỳ.
 * Dùng cho default "hôm nay" ở API dashboard.
 */
export function toVnDateString(input: Date = new Date()): string {
  // Cộng offset 7h rồi lấy UTC part
  const shifted = new Date(input.getTime() + VN_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Kiểm tra chuỗi có phải YYYY-MM-DD không (không throw).
 */
export function isValidDateString(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  if (!DATE_RE.test(dateStr)) return false;
  try {
    parseVnDay(dateStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format ngày VN thành hiển thị (dùng cho log).
 */
export function formatVnDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}