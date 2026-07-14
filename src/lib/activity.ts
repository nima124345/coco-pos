import { prisma } from "@/lib/db";
import { ensureSchemaExtras } from "@/lib/ensure-schema-extras";

/** Canonical action names for the audit log. */
export const ACTIVITY = {
  ORDER_VOID: "ORDER_VOID",
  ORDER_DELETE: "ORDER_DELETE",
  MENU_CREATE: "MENU_CREATE",
  MENU_UPDATE: "MENU_UPDATE",
  MENU_DELETE: "MENU_DELETE",
  STAFF_CREATE: "STAFF_CREATE",
  STAFF_UPDATE: "STAFF_UPDATE",
  STAFF_DELETE: "STAFF_DELETE",
  PROMOTION_DELETE: "PROMOTION_DELETE",
  EXPENSE_DELETE: "EXPENSE_DELETE",
  CASH_IN: "CASH_IN",
  CASH_OUT: "CASH_OUT",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
} as const;

export type ActivityAction = (typeof ACTIVITY)[keyof typeof ACTIVITY];

/** Thai labels for display in the activity log UI. */
export const ACTIVITY_LABELS: Record<string, string> = {
  ORDER_VOID: "ยกเลิกออเดอร์",
  ORDER_DELETE: "ลบออเดอร์",
  MENU_CREATE: "เพิ่มเมนู",
  MENU_UPDATE: "แก้ไขเมนู",
  MENU_DELETE: "ลบเมนู",
  STAFF_CREATE: "เพิ่มพนักงาน",
  STAFF_UPDATE: "แก้ไขพนักงาน",
  STAFF_DELETE: "ลบพนักงาน",
  PROMOTION_DELETE: "ลบโปรโมชั่น",
  EXPENSE_DELETE: "ลบรายจ่าย",
  CASH_IN: "เงินเข้าลิ้นชัก",
  CASH_OUT: "เงินออกลิ้นชัก",
  SETTINGS_UPDATE: "แก้ไขการตั้งค่า",
};

interface LogInput {
  userId?: string;
  userName?: string;
  action: ActivityAction | string;
  entity?: string;
  entityId?: string;
  detail?: string;
  branchId?: string | null;
}

/**
 * Append an entry to the audit log. Best-effort: any failure is swallowed so a
 * logging problem can never block or fail the underlying action.
 */
export async function logActivity(input: LogInput): Promise<void> {
  try {
    await ensureSchemaExtras();
    // Resolve a display name from the id when the caller didn't supply one, so
    // the log is readable without a join.
    let userName = input.userName;
    if (!userName && input.userId) {
      const u = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { name: true, username: true },
      });
      userName = u?.name || u?.username || "";
    }
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? "",
        userName: userName ?? "",
        action: input.action,
        entity: input.entity ?? "",
        entityId: input.entityId ?? "",
        detail: input.detail ?? "",
        branchId: input.branchId ?? null,
      },
    });
  } catch {
    // Audit logging must never break the request it is recording.
  }
}
