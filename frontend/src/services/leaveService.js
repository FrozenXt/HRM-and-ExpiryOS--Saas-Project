import { getLeaveRequests } from "./leaveRequestService";

/**
 * Counts *approved* leave-request days for one employee that overlap
 * [startDate, endDate]. Built on your real /leave-requests/list endpoint
 * (employeeId, status, fromDate, toDate) via leaveRequestService.js.
 *
 * Overlap is inclusive on both ends, matching the "Days" column math in
 * LeaveRequests.jsx: Math.round((to - from) / 86400000) + 1.
 */
export async function getApprovedLeaveDays(employeeId, startDate, endDate) {
  try {
    const fields = [
      { field: "employeeId", operator: "eq", value: employeeId },
      { field: "status", operator: "eq", value: "approved" },
    ];
    const res = await getLeaveRequests({ limit: 100, fields });
    const requests = res.data.data.data;

    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);

    let days = 0;
    for (const lr of requests) {
      if (!lr.fromDate || !lr.toDate) continue;
      const s = new Date(Math.max(new Date(lr.fromDate), periodStart));
      const e = new Date(Math.min(new Date(lr.toDate), periodEnd));
      if (e >= s) days += Math.round((e - s) / 86_400_000) + 1;
    }
    return days;
  } catch {
    // Network/permissions hiccup — fail soft so the rest of the payroll
    // auto-calculation still runs; the admin can adjust payableDays by hand.
    return 0;
  }
}
