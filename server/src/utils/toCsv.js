function cell(value) {
  if (value === null || value === undefined) return "";

  let text = value instanceof Date ? value.toISOString() : String(value);

  // stop Excel from running user text as a formula
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;

  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => cell(row[c.key])).join(","),
  );
  return [header, ...lines].join("\r\n");
}

module.exports = toCsv;
