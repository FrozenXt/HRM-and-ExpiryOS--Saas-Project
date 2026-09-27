function timeToHours(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

export function dailyWorkingHours(workingHours) {
  const diff =
    timeToHours(workingHours?.endTime) - timeToHours(workingHours?.startTime);
  return diff > 0 ? Math.round(diff * 100) / 100 : 8;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function workingDaysInMonth(year, monthIndex, weekOff = []) {
  const offSet = new Set(weekOff);
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const total = daysInMonth(year, monthIndex);
  let count = 0;
  for (let d = 1; d <= total; d++) {
    if (!offSet.has(dayKeys[new Date(year, monthIndex, d).getDay()])) count++;
  }
  return count;
}

export function standardMonthlyHours(settings, date = new Date()) {
  const daily = dailyWorkingHours(settings?.workingHours);
  const days = workingDaysInMonth(
    date.getFullYear(),
    date.getMonth(),
    settings?.weekOff || [],
  );
  return Math.round(daily * days * 100) / 100;
}
