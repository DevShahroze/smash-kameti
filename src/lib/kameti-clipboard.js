export function kametiTableToClipboardText(headers, rows) {
  return [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
}
