import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ParsedNation {
  region: string;
  name: string;
  startYear: number;
  startPopulation: number;
  isArchived: boolean;
  eras: {
    startYear: number;
    endYear: number;
    rate: number;
    startPop: number;
    endPop: number;
  }[];
  additions: {
    year: number;
    amount: number;
  }[];
}

interface ImportStore {
  csvData: string;
  importedNations: ParsedNation[];
  error: string;
  isSubmitting: boolean;
  success: string;
  setCsvData: (data: string) => void;
  setImportedNations: (nations: ParsedNation[]) => void;
  setError: (error: string) => void;
  parseCsvData: () => void;
  submitNations: () => Promise<void>;
  reset: () => void;
}

/**
 * Parses CSV data into a structured format for nations, eras, and additions
 * The CSV format is expected to be:
 * REGION,NAME,START YEAR,START POP,ADD Y1,RATE Y1,Y1,ADD Y2,RATE Y2,Y2,...
 * Where each triplet (ADD, RATE, YEAR) represents a population point in time
 */
function parseNationsFromCsv(csvData: string): ParsedNation[] {
  const lines = csvData
    .split("\n")
    .filter((line: string) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("CSV must contain at least a header row and one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const nations: ParsedNation[] = [];

  // Extract years from headers (every third column after Start Pop)
  const years: number[] = [];
  for (let i = 4; i < headers.length; i += 3) {
    // Extract year from the column name (e.g., "ADD 375" -> 375)
    const yearStr = headers[i].split(" ")[1];
    const year = parseInt(yearStr);
    if (isNaN(year)) {
      throw new Error(`Invalid year in header: ${headers[i]}`);
    }
    years.push(year);
  }

  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());

    if (values.length !== headers.length) {
      throw new Error(`Line ${i + 1} has incorrect number of columns`);
    }

    const region = values[0];
    const name = values[1]
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
    const startYear = parseInt(values[2]);
    const startPopulation = parseInt(values[3]);
    if (
      !region ||
      !name ||
      !Number.isInteger(startYear) ||
      !Number.isInteger(startPopulation) ||
      startPopulation < 0
    )
      throw new Error(`Invalid founding details on line ${i + 1}`);
    const eras: Array<{
      startYear: number;
      endYear: number;
      rate: number;
      startPop: number;
      endPop: number;
    }> = [];
    const additions: Array<{ year: number; amount: number }> = [];

    // Process each era (triplets of ADD, RATE, and population)
    for (let j = 0; j < years.length; j++) {
      const year = years[j];
      const addIndex = 4 + j * 3; // ADD column
      const rateIndex = 5 + j * 3; // RATE column
      const popIndex = 6 + j * 3; // YEAR column

      const endPop = parseInt(values[popIndex]);
      const rate = parseFloat(values[rateIndex]);
      const amount = Number(values[addIndex]);
      if (!values[addIndex].trim() || !Number.isInteger(amount))
        throw new Error(`Invalid addition on line ${i + 1}`);

      // Skip this era if the nation doesn't exist yet (has 0 population)
      if (endPop === 0 && rate === 0) {
        continue;
      }

      if (isNaN(endPop)) {
        throw new Error(
          `Invalid population value for nation "${name}" in line ${i + 1} for year ${year}`,
        );
      }

      if (isNaN(rate)) {
        throw new Error(
          `Invalid growth rate value for nation "${name}" in line ${i + 1} for year ${year}`,
        );
      }

      // For the first era or after a gap, start year is the nation's start year
      let eraStartYear;
      let startPop;

      if (j === 0 || eras.length === 0) {
        eraStartYear = startYear;
        startPop = startPopulation;
      } else {
        // For subsequent eras, start from the last known era's end year
        const lastEra = eras[eras.length - 1];
        eraStartYear = lastEra.endYear;
        startPop = lastEra.endPop;
      }

      const eraEndYear = year;

      eras.push({
        startYear: eraStartYear,
        endYear: eraEndYear,
        rate,
        startPop,
        endPop: endPop,
      });

      // Add the addition if it's non-zero and for this era
      if (!isNaN(amount) && amount !== 0) {
        additions.push({ year, amount });
      }
    }

    // Check if nation should be archived based on latest era
    const latestEra = eras[eras.length - 1];
    const isArchived = Boolean(latestEra && latestEra.rate === -1);

    nations.push({
      region,
      name,
      startYear,
      startPopulation,
      isArchived,
      eras,
      additions,
    });
  }

  return nations;
}

export const useImportStore = create<ImportStore>()(
  persist(
    (set, get) => ({
      csvData: "",
      importedNations: [],
      error: "",
      isSubmitting: false,
      success: "",

      setCsvData: (data: string) => set({ csvData: data }),
      setImportedNations: (nations: ParsedNation[]) =>
        set({ importedNations: nations }),
      setError: (error: string) => set({ error }),

      parseCsvData: () => {
        try {
          const { csvData } = get();
          set({ error: "", success: "" });
          const nations = parseNationsFromCsv(csvData);
          set({ importedNations: nations });
        } catch (err) {
          console.error("Error parsing CSV:", err);
          set({
            error:
              err instanceof Error
                ? err.message
                : "Error parsing CSV data. Please check the format.",
            importedNations: [],
          });
        }
      },

      submitNations: async () => {
        if (get().isSubmitting) return;
        set({ isSubmitting: true, error: "", success: "" });
        try {
          const response = await fetch("/api/nations/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(get().importedNations),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Import failed");
          set({
            importedNations: [],
            success: result.imported + " nations imported successfully.",
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Import failed. Please try again.",
          });
        } finally {
          set({ isSubmitting: false });
        }
      },

      reset: () =>
        set({
          csvData: "",
          importedNations: [],
          error: "",
          success: "",
        }),
    }),
    {
      name: "import-store",
      partialize: (state) => ({
        csvData: state.csvData,
        importedNations: state.importedNations,
      }),
    },
  ),
);
