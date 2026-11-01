export function tablePath(
  tableNumber: number,
  tableKey?: string,
  suffix = ""
) {
  const path = `/table/${tableNumber}${suffix}`;
  return tableKey ? `${path}?key=${encodeURIComponent(tableKey)}` : path;
}
