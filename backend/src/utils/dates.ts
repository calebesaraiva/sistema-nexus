export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function dueDateFrom(start: Date, monthOffset: number, day: number) {
  const due = addMonths(start, monthOffset);
  due.setDate(Math.min(Math.max(day, 1), 28));
  return due;
}
