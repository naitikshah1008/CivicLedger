import {
  BudgetRecord,
  FundFilter,
  FundType,
  budgetRecords,
  fiscalYears,
  fundDescriptions,
  fundTypes,
} from "../data/budgetData";
import {
  formatBillions,
  formatPercent,
  formatShare,
  formatSignedBillions,
} from "./format";
import { logIntelligentComponentInput } from "./governance";

export type QuestionId =
  | "changed-most"
  | "where-money-went"
  | "non-general-dependence"
  | "compare-last-year";

export type QuestionOption = {
  id: QuestionId;
  label: string;
};

export const questionOptions: QuestionOption[] = [
  { id: "changed-most", label: "What changed most this year?" },
  { id: "where-money-went", label: "Where did spending go?" },
  {
    id: "non-general-dependence",
    label: "How much depends on non-general funds?",
  },
  { id: "compare-last-year", label: "Compare this year to last year" },
];

export type FundBreakdown = {
  fundType: FundType;
  amountBillions: number;
  shareOfYear: number;
  yoyAmount: number | null;
  yoyPercent: number | null;
  description: string;
};

export type InsightContext = {
  selectedYear: number;
  previousYear: number | null;
  fundFilter: FundFilter;
  selectedTotal: number;
  selectedPreviousTotal: number | null;
  selectedShareOfYear: number;
  totalForYear: number;
  previousTotalForYear: number | null;
  yoyAmount: number | null;
  yoyPercent: number | null;
  totalYoyAmount: number | null;
  totalYoyPercent: number | null;
  fundBreakdown: FundBreakdown[];
  largestFund: FundBreakdown;
  largestIncrease: FundBreakdown | null;
  largestDecrease: FundBreakdown | null;
  nonGeneralShare: number;
};

export type BudgetBriefing = {
  eyebrow: string;
  headline: string;
  summary: string;
  evidence: string[];
  nextStep: string;
};

function rowsForYear(records: BudgetRecord[], fiscalYear: number): BudgetRecord[] {
  return records.filter((record) => record.fiscalYear === fiscalYear);
}

function sumRecords(records: BudgetRecord[], fundFilter: FundFilter): number {
  return records
    .filter((record) => fundFilter === "All funds" || record.fundType === fundFilter)
    .reduce((sum, record) => sum + record.amountBillions, 0);
}

function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function findFundAmount(
  records: BudgetRecord[],
  fundType: FundType,
): number | null {
  return (
    records.find((record) => record.fundType === fundType)?.amountBillions ?? null
  );
}

export function buildInsightContext(
  selectedYear: number,
  fundFilter: FundFilter,
): InsightContext {
  const currentRows = rowsForYear(budgetRecords, selectedYear);
  const previousYear = fiscalYears.includes(selectedYear - 1)
    ? selectedYear - 1
    : null;
  const previousRows = previousYear ? rowsForYear(budgetRecords, previousYear) : [];
  const totalForYear = sumRecords(currentRows, "All funds");
  const previousTotalForYear = previousYear
    ? sumRecords(previousRows, "All funds")
    : null;
  const selectedTotal = sumRecords(currentRows, fundFilter);
  const selectedPreviousTotal = previousYear
    ? sumRecords(previousRows, fundFilter)
    : null;

  const fundBreakdown = fundTypes.map((fundType) => {
    const amountBillions = findFundAmount(currentRows, fundType) ?? 0;
    const previousAmount = findFundAmount(previousRows, fundType);
    const yoyAmount =
      previousAmount === null ? null : amountBillions - previousAmount;

    return {
      fundType,
      amountBillions,
      shareOfYear: totalForYear === 0 ? 0 : (amountBillions / totalForYear) * 100,
      yoyAmount,
      yoyPercent: percentChange(amountBillions, previousAmount),
      description: fundDescriptions[fundType],
    };
  });

  const largestFund = [...fundBreakdown].sort(
    (first, second) => second.amountBillions - first.amountBillions,
  )[0];

  const fundsWithPrior = fundBreakdown.filter(
    (fund) => fund.yoyAmount !== null,
  );
  const largestIncrease =
    fundsWithPrior.length === 0
      ? null
      : [...fundsWithPrior].sort(
          (first, second) => (second.yoyAmount ?? 0) - (first.yoyAmount ?? 0),
        )[0];
  const largestDecrease =
    fundsWithPrior.length === 0
      ? null
      : [...fundsWithPrior].sort(
          (first, second) => (first.yoyAmount ?? 0) - (second.yoyAmount ?? 0),
        )[0];
  const nonGeneralAmount =
    fundBreakdown.find((fund) => fund.fundType === "Non-general funds")
      ?.amountBillions ?? 0;

  return {
    selectedYear,
    previousYear,
    fundFilter,
    selectedTotal,
    selectedPreviousTotal,
    selectedShareOfYear:
      totalForYear === 0 ? 0 : (selectedTotal / totalForYear) * 100,
    totalForYear,
    previousTotalForYear,
    yoyAmount:
      selectedPreviousTotal === null
        ? null
        : selectedTotal - selectedPreviousTotal,
    yoyPercent: percentChange(selectedTotal, selectedPreviousTotal),
    totalYoyAmount:
      previousTotalForYear === null ? null : totalForYear - previousTotalForYear,
    totalYoyPercent: percentChange(totalForYear, previousTotalForYear),
    fundBreakdown,
    largestFund,
    largestIncrease,
    largestDecrease,
    nonGeneralShare:
      totalForYear === 0 ? 0 : (nonGeneralAmount / totalForYear) * 100,
  };
}

export function generateBudgetBriefing(
  questionId: QuestionId,
  context: InsightContext,
): BudgetBriefing {
  logIntelligentComponentInput("budget_briefing_generator", {
    questionId,
    selectedYear: context.selectedYear,
    fundFilter: context.fundFilter,
    selectedTotal: context.selectedTotal,
    previousYear: context.previousYear,
    yoyAmount: context.yoyAmount,
    yoyPercent: context.yoyPercent,
    fundBreakdown: context.fundBreakdown,
  });

  const selectedLabel =
    context.fundFilter === "All funds"
      ? "total spending"
      : context.fundFilter.toLowerCase();
  const selectedLabelSentence =
    context.fundFilter === "All funds" ? "Total spending" : context.fundFilter;
  const priorText = context.previousYear
    ? `from FY${context.previousYear} to FY${context.selectedYear}`
    : `in FY${context.selectedYear}`;
  const biggestMover = context.largestIncrease ?? context.largestFund;
  const nonGeneralShare = formatShare(context.nonGeneralShare);

  if (questionId === "where-money-went") {
    return {
      eyebrow: `FY${context.selectedYear} spending mix`,
      headline: `The largest spending bucket was ${context.largestFund.fundType}.`,
      summary: `Washington recorded ${formatBillions(
        context.totalForYear,
      )} in total spending. ${context.largestFund.fundType} accounted for ${formatShare(
        context.largestFund.shareOfYear,
      )}, while non-general funds accounted for ${nonGeneralShare}.`,
      evidence: context.fundBreakdown.map(
        (fund) =>
          `${fund.fundType}: ${formatBillions(fund.amountBillions)} (${formatShare(
            fund.shareOfYear,
          )} of FY${context.selectedYear} total).`,
      ),
      nextStep:
        "Check whether the largest fund bucket is also the fastest growing bucket.",
    };
  }

  if (questionId === "non-general-dependence") {
    return {
      eyebrow: `FY${context.selectedYear} funding exposure`,
      headline: `${nonGeneralShare} of spending came from non-general funds.`,
      summary: `That bucket combines other state funds, federal funds, and bonds. It is useful for a non-technical reviewer because it separates the core General Fund story from dollars that may depend on federal rules, dedicated accounts, or borrowing authority.`,
      evidence: [
        `Non-general funds: ${formatBillions(
          context.fundBreakdown.find(
            (fund) => fund.fundType === "Non-general funds",
          )?.amountBillions ?? 0,
        )}.`,
        `General Fund: ${formatBillions(
          context.fundBreakdown.find((fund) => fund.fundType === "General Fund")
            ?.amountBillions ?? 0,
        )}.`,
        `Total spending: ${formatBillions(context.totalForYear)}.`,
      ],
      nextStep:
        "In production, split this bucket into federal funds, other state funds, and bonds.",
    };
  }

  if (questionId === "compare-last-year") {
    return {
      eyebrow: `${selectedLabel} comparison`,
      headline: `${selectedLabelSentence} changed by ${formatSignedBillions(
        context.yoyAmount,
      )} ${priorText}.`,
      summary: `The selected view was ${formatBillions(
        context.selectedTotal,
      )} in FY${context.selectedYear}, a ${formatPercent(
        context.yoyPercent,
      )} change from the prior fiscal year.`,
      evidence: [
        `FY${context.selectedYear}: ${formatBillions(context.selectedTotal)}.`,
        context.selectedPreviousTotal === null
          ? "No prior year is included in this embedded dataset."
          : `FY${context.previousYear}: ${formatBillions(
              context.selectedPreviousTotal,
            )}.`,
        `Share of FY${context.selectedYear} total: ${formatShare(
          context.selectedShareOfYear,
        )}.`,
      ],
      nextStep:
        "Use the fund breakdown to see whether the movement came from core state dollars or non-general funds.",
    };
  }

  return {
    eyebrow: `FY${context.selectedYear} budget movement`,
    headline: `${biggestMover.fundType} ${
      biggestMover.fundType === "Non-general funds" ? "were" : "was"
    } the biggest dollar mover.`,
    summary: `Washington's ${selectedLabel} was ${formatBillions(
      context.selectedTotal,
    )}. Across all funds, total spending changed by ${formatSignedBillions(
      context.totalYoyAmount,
    )} (${formatPercent(context.totalYoyPercent)}) ${priorText}.`,
    evidence: [
      `${biggestMover.fundType} changed by ${formatSignedBillions(
        biggestMover.yoyAmount,
      )} (${formatPercent(biggestMover.yoyPercent)}).`,
      `The largest FY${context.selectedYear} bucket was ${
        context.largestFund.fundType
      } at ${formatBillions(context.largestFund.amountBillions)}.`,
      `Non-general funds represented ${nonGeneralShare} of the spending mix.`,
    ],
    nextStep:
      "Review the fund mix before drawing a policy conclusion from the top-line increase.",
  };
}
