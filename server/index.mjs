import http from "node:http";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readXlsxFile from "read-excel-file/node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const storageDir = path.join(rootDir, ".civicledger");
const uploadsDir = path.join(storageDir, "uploads");
const datasetsDir = path.join(storageDir, "datasets");
const port = Number(process.env.CIVICLEDGER_API_PORT ?? 8787);

const fieldAliases = {
  fiscalYear: ["fy", "fiscalyear", "fiscal year", "year"],
  agency: ["agency", "agyname", "department", "office"],
  category: ["category", "object", "spending category", "expense category"],
  subCategory: ["subcategory", "sub category", "subobj", "subobject", "sub object"],
  vendor: ["vendor", "supplier", "payee", "recipient", "company"],
  amount: ["amount", "payment", "payment amount", "spend", "spending", "value"],
};

const lensFields = [
  ["Agency", "agency"],
  ["Category", "category"],
  ["Vendor", "vendor"],
];

function normalizeHeader(header) {
  return String(header).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findValue(row, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const key = Object.keys(row).find((candidate) =>
    normalizedAliases.includes(normalizeHeader(candidate)),
  );

  return key ? row[key] : undefined;
}

function toText(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value) {
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

function normalizeRow(row) {
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

function rowsToRawRows(rows) {
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((header, index) =>
    toText(header, `Column ${index + 1}`),
  );

  return dataRows.map((row) =>
    headers.reduce((record, header, index) => {
      record[header] = row[index] ?? null;
      return record;
    }, {}),
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
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

function roundNumber(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function percentChange(current, previous) {
  if (previous === null || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function aggregatePaymentRecords(records, sourceInfo) {
  const summariesByYear = new Map();
  const entitiesByKey = new Map();

  records.forEach((record) => {
    const summary = summariesByYear.get(record.fiscalYear) ?? {
      fiscalYear: record.fiscalYear,
      totalAmount: 0,
      recordCount: 0,
      vendors: new Set(),
      agencies: new Set(),
      categories: new Set(),
      negativeRowCount: 0,
      negativeAmount: 0,
    };

    summary.totalAmount += record.amount;
    summary.recordCount += 1;
    summary.vendors.add(record.vendor);
    summary.agencies.add(record.agency);
    summary.categories.add(record.category);

    if (record.amount < 0) {
      summary.negativeRowCount += 1;
      summary.negativeAmount += record.amount;
    }

    summariesByYear.set(record.fiscalYear, summary);

    lensFields.forEach(([lens, field]) => {
      const name = record[field] || "Unknown";
      const key = `${record.fiscalYear}::${lens}::${name}`;
      const entity = entitiesByKey.get(key) ?? {
        fiscalYear: record.fiscalYear,
        lens,
        name,
        amount: 0,
        recordCount: 0,
        vendors: new Set(),
        agencies: new Set(),
      };

      entity.amount += record.amount;
      entity.recordCount += 1;
      entity.vendors.add(record.vendor);
      entity.agencies.add(record.agency);
      entitiesByKey.set(key, entity);
    });
  });

  const summaries = [...summariesByYear.values()]
    .sort((first, second) => first.fiscalYear - second.fiscalYear)
    .map((summary) => ({
      fiscalYear: summary.fiscalYear,
      totalAmount: roundNumber(summary.totalAmount),
      recordCount: summary.recordCount,
      vendorCount: summary.vendors.size,
      agencyCount: summary.agencies.size,
      categoryCount: summary.categories.size,
      negativeRowCount: summary.negativeRowCount,
      negativeAmount: roundNumber(summary.negativeAmount),
    }));

  const amountByYearLensName = new Map();
  [...entitiesByKey.values()].forEach((entity) => {
    amountByYearLensName.set(
      `${entity.fiscalYear}::${entity.lens}::${entity.name}`,
      entity.amount,
    );
  });

  const entities = [];

  summaries.forEach((summary) => {
    lensFields.forEach(([lens]) => {
      const ranked = [...entitiesByKey.values()]
        .filter((entity) => entity.fiscalYear === summary.fiscalYear && entity.lens === lens)
        .sort((first, second) => second.amount - first.amount)
        .slice(0, 25);

      ranked.forEach((entity, index) => {
        const priorAmount =
          amountByYearLensName.get(
            `${summary.fiscalYear - 1}::${lens}::${entity.name}`,
          ) ?? null;
        const yoyAmount = priorAmount === null ? null : entity.amount - priorAmount;

        entities.push({
          fiscalYear: entity.fiscalYear,
          lens,
          rank: index + 1,
          name: entity.name,
          amount: roundNumber(entity.amount),
          shareOfYear:
            summary.totalAmount === 0
              ? 0
              : roundNumber((entity.amount / summary.totalAmount) * 100, 3),
          recordCount: entity.recordCount,
          vendorCount: entity.vendors.size,
          agencyCount: entity.agencies.size,
          yoyAmount: yoyAmount === null ? null : roundNumber(yoyAmount),
          yoyPercent: percentChange(entity.amount, priorAmount),
        });
      });
    });
  });

  return {
    ...sourceInfo,
    summaries,
    entities,
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "dataset";
}

function safeFileName(value) {
  return path.basename(value || "upload.csv").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function parseFileToRecords(filePath, filename, body) {
  const rawRows = /\.csv$/i.test(filename)
    ? rowsToRawRows(parseCsv(body.toString("utf8")))
    : (await readXlsxFile(filePath)).flatMap((sheet) => rowsToRawRows(sheet.data));

  return rawRows
    .map(normalizeRow)
    .filter((record) => record !== null);
}

function collectRequestBody(request, maxBytes = 125 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    request.on("data", (chunk) => {
      total += chunk.length;

      if (total > maxBytes) {
        reject(new Error("Upload exceeds the 125MB local API limit."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function ensureStorage() {
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(datasetsDir, { recursive: true });
}

async function listDatasets() {
  await ensureStorage();
  const files = await readdir(datasetsDir);
  const datasets = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) =>
        JSON.parse(await readFile(path.join(datasetsDir, file), "utf8")),
      ),
  );

  return datasets.sort((first, second) =>
    String(second.uploadedAt ?? "").localeCompare(String(first.uploadedAt ?? "")),
  );
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

async function handleImport(request, response, url) {
  await ensureStorage();

  const filename = safeFileName(url.searchParams.get("filename"));
  const body = await collectRequestBody(request);
  const uploadedAt = new Date().toISOString();
  const id = `${slugify(filename.replace(/\.[^.]+$/, ""))}-${Date.now()}`;
  const uploadPath = path.join(uploadsDir, `${id}-${filename}`);

  await writeFile(uploadPath, body);

  const records = await parseFileToRecords(uploadPath, filename, body);

  if (records.length === 0) {
    throw new Error(
      "No payment rows found. Expected fiscal year, agency, category, vendor, and amount columns.",
    );
  }

  const dataset = aggregatePaymentRecords(records, {
    id,
    name: filename.replace(/\.[^.]+$/, ""),
    description: `Imported ${records.length.toLocaleString()} normalized payment rows.`,
    sourceLabel: filename,
    uploadedAt,
  });

  await writeFile(
    path.join(datasetsDir, `${id}.json`),
    JSON.stringify(dataset, null, 2),
  );

  sendJson(response, 201, dataset);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/datasets") {
      sendJson(response, 200, await listDatasets());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/datasets/import") {
      await handleImport(request, response, url);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CivicLedger API listening at http://127.0.0.1:${port}`);
});
