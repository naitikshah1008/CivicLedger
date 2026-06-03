import {
  FiscalYear,
  PaymentDataSource,
  PaymentEntity,
  PaymentLens,
  PaymentSummary,
} from "../data/paymentData";

export type PaymentRecord = {
  fiscalYear: FiscalYear;
  agency: string;
  category: string;
  subCategory: string;
  vendor: string;
  amount: number;
};

type SourceInfo = {
  id: string;
  name: string;
  description: string;
  sourceLabel: string;
  uploadedAt?: string;
};

type EntityAccumulator = {
  fiscalYear: FiscalYear;
  lens: PaymentLens;
  name: string;
  amount: number;
  recordCount: number;
  vendors: Set<string>;
  agencies: Set<string>;
};

const lenses: Array<{ lens: PaymentLens; field: keyof PaymentRecord }> = [
  { lens: "Agency", field: "agency" },
  { lens: "Category", field: "category" },
  { lens: "Vendor", field: "vendor" },
];

function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function roundNumber(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

export function aggregatePaymentRecords(
  records: PaymentRecord[],
  sourceInfo: SourceInfo,
): PaymentDataSource {
  const summaryByYear = new Map<
    FiscalYear,
    {
      fiscalYear: FiscalYear;
      totalAmount: number;
      recordCount: number;
      vendors: Set<string>;
      agencies: Set<string>;
      categories: Set<string>;
      negativeRowCount: number;
      negativeAmount: number;
    }
  >();
  const entityMap = new Map<string, EntityAccumulator>();

  records.forEach((record) => {
    const summary = summaryByYear.get(record.fiscalYear) ?? {
      fiscalYear: record.fiscalYear,
      totalAmount: 0,
      recordCount: 0,
      vendors: new Set<string>(),
      agencies: new Set<string>(),
      categories: new Set<string>(),
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

    summaryByYear.set(record.fiscalYear, summary);

    lenses.forEach(({ lens, field }) => {
      const name = String(record[field] || "Unknown");
      const key = `${record.fiscalYear}::${lens}::${name}`;
      const entity = entityMap.get(key) ?? {
        fiscalYear: record.fiscalYear,
        lens,
        name,
        amount: 0,
        recordCount: 0,
        vendors: new Set<string>(),
        agencies: new Set<string>(),
      };

      entity.amount += record.amount;
      entity.recordCount += 1;
      entity.vendors.add(record.vendor);
      entity.agencies.add(record.agency);
      entityMap.set(key, entity);
    });
  });

  const summaries: PaymentSummary[] = [...summaryByYear.values()]
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

  const amountByYearLensName = new Map<string, number>();
  [...entityMap.values()].forEach((entity) => {
    amountByYearLensName.set(
      `${entity.fiscalYear}::${entity.lens}::${entity.name}`,
      entity.amount,
    );
  });

  const entities: PaymentEntity[] = [];

  summaries.forEach((summary) => {
    lenses.forEach(({ lens }) => {
      const ranked = [...entityMap.values()]
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
