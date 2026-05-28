import {
  FiscalYear,
  PaymentEntity,
  PaymentLens,
  PaymentSummary,
  paymentEntities,
  paymentSummaries,
} from "../data/paymentData";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatShare,
  formatSignedCurrency,
} from "./format";
import { logIntelligentComponentInput } from "./governance";

export type QuestionId =
  | "top-vendors"
  | "top-agencies"
  | "category-mix"
  | "year-over-year";

export type QuestionOption = {
  id: QuestionId;
  label: string;
};

export const questionOptions: QuestionOption[] = [
  { id: "top-vendors", label: "Who received the most payments?" },
  { id: "top-agencies", label: "Which agency spent the most?" },
  { id: "category-mix", label: "What kinds of spending dominated?" },
  { id: "year-over-year", label: "What changed year over year?" },
];

export type PaymentBriefing = {
  eyebrow: string;
  headline: string;
  summary: string;
  evidence: string[];
  nextStep: string;
};

export type InsightContext = {
  selectedYear: FiscalYear;
  lens: PaymentLens;
  summary: PaymentSummary;
  previousSummary: PaymentSummary | null;
  totalYoyAmount: number | null;
  totalYoyPercent: number | null;
  selectedRows: PaymentEntity[];
  topVendor: PaymentEntity;
  topAgency: PaymentEntity;
  topCategory: PaymentEntity;
  topEntity: PaymentEntity;
  biggestIncrease: PaymentEntity | null;
};

function getSummary(fiscalYear: FiscalYear): PaymentSummary {
  const summary = paymentSummaries.find((item) => item.fiscalYear === fiscalYear);

  if (!summary) {
    throw new Error(`Missing payment summary for FY${fiscalYear}`);
  }

  return summary;
}

function getEntities(
  fiscalYear: FiscalYear,
  lens: PaymentLens,
  limit = 15,
): PaymentEntity[] {
  return paymentEntities
    .filter((entity) => entity.fiscalYear === fiscalYear && entity.lens === lens)
    .sort((first, second) => first.rank - second.rank)
    .slice(0, limit);
}

function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function getBiggestIncrease(rows: PaymentEntity[]): PaymentEntity | null {
  const rowsWithChange = rows.filter((row) => row.yoyAmount !== null);

  if (rowsWithChange.length === 0) {
    return null;
  }

  return [...rowsWithChange].sort(
    (first, second) => (second.yoyAmount ?? 0) - (first.yoyAmount ?? 0),
  )[0];
}

export function buildInsightContext(
  selectedYear: FiscalYear,
  lens: PaymentLens,
): InsightContext {
  const summary = getSummary(selectedYear);
  const previousYear = (selectedYear - 1) as FiscalYear;
  const previousSummary = paymentSummaries.find(
    (item) => item.fiscalYear === previousYear,
  ) ?? null;
  const selectedRows = getEntities(selectedYear, lens);

  return {
    selectedYear,
    lens,
    summary,
    previousSummary,
    totalYoyAmount: previousSummary
      ? summary.totalAmount - previousSummary.totalAmount
      : null,
    totalYoyPercent: percentChange(
      summary.totalAmount,
      previousSummary?.totalAmount ?? null,
    ),
    selectedRows,
    topVendor: getEntities(selectedYear, "Vendor", 1)[0],
    topAgency: getEntities(selectedYear, "Agency", 1)[0],
    topCategory: getEntities(selectedYear, "Category", 1)[0],
    topEntity: selectedRows[0],
    biggestIncrease: getBiggestIncrease(selectedRows),
  };
}

export function generatePaymentBriefing(
  questionId: QuestionId,
  context: InsightContext,
): PaymentBriefing {
  logIntelligentComponentInput("vendor_payment_briefing_generator", {
    questionId,
    selectedYear: context.selectedYear,
    lens: context.lens,
    summary: context.summary,
    selectedRows: context.selectedRows.slice(0, 5),
  });

  if (questionId === "top-agencies") {
    return {
      eyebrow: `FY${context.selectedYear} agency view`,
      headline: `${context.topAgency.name} had the largest payment total.`,
      summary: `${context.topAgency.name} accounted for ${formatShare(
        context.topAgency.shareOfYear,
      )} of FY${context.selectedYear} payments, totaling ${formatCurrency(
        context.topAgency.amount,
      )}.`,
      evidence: [
        `${formatNumber(
          context.topAgency.recordCount,
        )} payment rows were tied to this agency.`,
        `The agency worked with ${formatNumber(
          context.topAgency.vendorCount,
        )} unique vendors in the embedded aggregate.`,
        `Total FY${context.selectedYear} payments were ${formatCurrency(
          context.summary.totalAmount,
        )}.`,
      ],
      nextStep:
        "Open the vendor view next to see whether the agency total is concentrated in a few recipients.",
    };
  }

  if (questionId === "category-mix") {
    return {
      eyebrow: `FY${context.selectedYear} spending category mix`,
      headline: `${context.topCategory.name} dominated the payment mix.`,
      summary: `${context.topCategory.name} represented ${formatShare(
        context.topCategory.shareOfYear,
      )} of FY${context.selectedYear} payments. That makes it the first place a non-technical reviewer should look before reading individual vendor rows.`,
      evidence: [
        `${context.topCategory.name}: ${formatCurrency(
          context.topCategory.amount,
        )}.`,
        `${formatNumber(
          context.topCategory.vendorCount,
        )} vendors appear in this category aggregate.`,
        `${formatNumber(
          context.summary.negativeRowCount,
        )} rows had negative amounts, likely adjustments or reversals.`,
      ],
      nextStep:
        "In production, I would add drill-down from category to agency to vendor.",
    };
  }

  if (questionId === "year-over-year") {
    const mover = context.biggestIncrease;

    return {
      eyebrow:
        context.previousSummary === null
          ? `FY${context.selectedYear} baseline year`
          : `FY${context.selectedYear} change from FY${context.previousSummary.fiscalYear}`,
      headline:
        context.previousSummary === null
          ? "This workbook starts in FY2022, so there is no prior-year comparison."
          : `Total payments changed by ${formatSignedCurrency(
              context.totalYoyAmount,
            )}.`,
      summary:
        context.previousSummary === null
          ? `FY${context.selectedYear} payments totaled ${formatCurrency(
              context.summary.totalAmount,
            )} across ${formatNumber(context.summary.recordCount)} rows.`
          : `Payments moved ${formatPercent(
              context.totalYoyPercent,
            )} year over year. ${
              mover
                ? `${mover.name} was the largest ${context.lens.toLowerCase()} mover in the selected view.`
                : "The selected view has no comparable prior-year rows."
            }`,
      evidence: [
        `FY${context.selectedYear}: ${formatCurrency(
          context.summary.totalAmount,
        )}.`,
        context.previousSummary
          ? `FY${context.previousSummary.fiscalYear}: ${formatCurrency(
              context.previousSummary.totalAmount,
            )}.`
          : "No prior fiscal year is included in the provided workbook.",
        mover
          ? `${mover.name}: ${formatSignedCurrency(
              mover.yoyAmount,
            )} (${formatPercent(mover.yoyPercent)}).`
          : "No ranked mover is available for this selection.",
      ],
      nextStep:
        "Use the chart below to separate broad payment growth from a single agency, category, or vendor spike.",
    };
  }

  return {
    eyebrow: `FY${context.selectedYear} top recipient`,
    headline: `${context.topVendor.name} received the largest total payments.`,
    summary: `${context.topVendor.name} received ${formatCurrency(
      context.topVendor.amount,
    )}, or ${formatShare(
      context.topVendor.shareOfYear,
    )} of the FY${context.selectedYear} payment total. The app shows this answer first so a non-technical user does not have to sort a spreadsheet manually.`,
    evidence: [
      `${formatNumber(
        context.topVendor.recordCount,
      )} payment rows are included for this vendor aggregate.`,
      `The top agency overall was ${context.topAgency.name}.`,
      `The top category overall was ${context.topCategory.name}.`,
    ],
    nextStep:
      "Compare the top vendor against the top agency and category before drawing a conclusion.",
  };
}
