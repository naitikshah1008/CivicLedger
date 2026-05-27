export type FundType = "General Fund" | "Non-general funds";

export type FundFilter = "All funds" | FundType;

export type BudgetRecord = {
  fiscalYear: number;
  fundType: FundType;
  amountBillions: number;
};

type SourceYear = {
  fiscalYear: number;
  generalFundBillions: number;
  totalSpendingBillions: number;
};

export const sourceYears: SourceYear[] = [
  { fiscalYear: 2019, generalFundBillions: 22.9, totalSpendingBillions: 50.5 },
  { fiscalYear: 2020, generalFundBillions: 24.0, totalSpendingBillions: 54.5 },
  { fiscalYear: 2021, generalFundBillions: 24.6, totalSpendingBillions: 60.8 },
  { fiscalYear: 2022, generalFundBillions: 28.1, totalSpendingBillions: 66.4 },
  { fiscalYear: 2023, generalFundBillions: 30.9, totalSpendingBillions: 72.8 },
  { fiscalYear: 2024, generalFundBillions: 32.4, totalSpendingBillions: 74.7 },
  { fiscalYear: 2025, generalFundBillions: 35.6, totalSpendingBillions: 81.7 },
];

export const budgetRecords: BudgetRecord[] = sourceYears.flatMap((year) => [
  {
    fiscalYear: year.fiscalYear,
    fundType: "General Fund",
    amountBillions: year.generalFundBillions,
  },
  {
    fiscalYear: year.fiscalYear,
    fundType: "Non-general funds",
    amountBillions: Number(
      (year.totalSpendingBillions - year.generalFundBillions).toFixed(1),
    ),
  },
]);

export const fiscalYears = sourceYears.map((year) => year.fiscalYear);

export const fundTypes: FundType[] = ["General Fund", "Non-general funds"];

export const fundDescriptions: Record<FundType, string> = {
  "General Fund": "Core state operating dollars.",
  "Non-general funds": "Other state funds, bonds, and federal funds combined.",
};

export const dataSource =
  "Urban Institute state fiscal factsheet, citing NASBO State Expenditure Report. Non-general funds are calculated as total spending minus general fund spending.";
