import { PaymentDataSource } from "../data/paymentData";
import { PaymentRecord, aggregatePaymentRecords } from "./aggregatePayments";

type RawRow = Record<string, unknown>;
type SheetRow = unknown[];

const fieldAliases = {
  fiscalYear: ["fy", "fiscalyear", "fiscal year", "year"],
  agency: ["agency", "agyname", "department", "office"],
  category: ["category", "object", "spending category", "expense category"],
  subCategory: ["subcategory", "sub category", "subobj", "subobject", "sub object"],
  vendor: ["vendor", "supplier", "payee", "recipient", "company"],
  amount: ["amount", "payment", "payment amount", "spend", "spending", "value"],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findValue(row: RawRow, aliases: string[]): unknown {
  const normalizedAliases = aliases.map(normalizeHeader);
  const entry = Object.entries(row).find(([key]) =>
    normalizedAliases.includes(normalizeHeader(key)),
  );

  return entry?.[1];
}

function toText(value: unknown, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const negative = /^\(.*\)$/.test(trimmed);
  const parsed = Number(trimmed.replace(/[($),\s]/g, ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return negative ? -parsed : parsed;
}

function normalizeRow(row: RawRow): PaymentRecord | null {
  const fiscalYear = toNumber(findValue(row, fieldAliases.fiscalYear));
  const amount = toNumber(findValue(row, fieldAliases.amount));

  if (!fiscalYear || amount === null) {
    return null;
  }

  return {
    fiscalYear: fiscalYear < 100 ? 2000 + fiscalYear : Math.trunc(fiscalYear),
    agency: toText(findValue(row, fieldAliases.agency), "Unknown agency"),
    category: toText(findValue(row, fieldAliases.category), "Uncategorized"),
    subCategory: toText(findValue(row, fieldAliases.subCategory), "Uncategorized"),
    vendor: toText(findValue(row, fieldAliases.vendor), "Unknown vendor"),
    amount,
  };
}

function rowsToRawRows(rows: SheetRow[]): RawRow[] {
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((header, index) =>
    toText(header, `Column ${index + 1}`),
  );

  return dataRows.map((row) =>
    headers.reduce<RawRow>((record, header, index) => {
      record[header] = row[index] ?? null;
      return record;
    }, {}),
  );
}

function parseCsv(text: string): SheetRow[] {
  const rows: SheetRow[] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((candidate) =>
    candidate.some((cell) => String(cell ?? "").trim().length > 0),
  );
}

async function fileToRawRows(file: File): Promise<RawRow[]> {
  if (/\.csv$/i.test(file.name)) {
    return rowsToRawRows(parseCsv(await file.text()));
  }

  const { default: readXlsxFile } = await import("read-excel-file/browser");
  const sheets = await readXlsxFile(file);

  return sheets.flatMap((sheet) => rowsToRawRows(sheet.data));
}

export async function importPaymentFile(file: File): Promise<PaymentDataSource> {
  const rawRows = await fileToRawRows(file);
  const records = rawRows
    .map(normalizeRow)
    .filter((record): record is PaymentRecord => record !== null);

  if (records.length === 0) {
    throw new Error(
      "No payment rows found. Expected fiscal year, agency, category, vendor, and amount columns.",
    );
  }

  return aggregatePaymentRecords(records, {
    id: `upload-${Date.now()}`,
    name: file.name.replace(/\.[^.]+$/, ""),
    description: `Imported ${records.length.toLocaleString()} normalized payment rows.`,
    sourceLabel: file.name,
    uploadedAt: new Date().toISOString(),
  });
}
