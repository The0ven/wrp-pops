import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  const lines = csvData.split("\n").filter((line: string) => line.trim() !== "");
  
  if (lines.length < 2) {
    throw new Error("CSV must contain at least a header row and one data row");
  }

  const headers = lines[0].split(",").map(h => h.trim());
  const nations: ParsedNation[] = [];

  // Extract years from headers (every third column after Start Pop)
  const years: number[] = [];
  for (let i = 4; i < headers.length; i += 3) {
    // Extract year from the column name (e.g., "ADD 375" -> 375)
    const yearStr = headers[i].split(' ')[1];
    const year = parseInt(yearStr);
    if (isNaN(year)) {
      throw new Error(`Invalid year in header: ${headers[i]}`);
    }
    years.push(year);
  }

  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    
    if (values.length !== headers.length) {
      throw new Error(`Line ${i + 1} has incorrect number of columns`);
    }

    const region = values[0];
    const name = values[1].toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    const startYear = parseInt(values[2]);
    const startPopulation = parseInt(values[3]);
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
      const addIndex = 4 + (j * 3); // ADD column
      const rateIndex = 5 + (j * 3); // RATE column
      const popIndex = 6 + (j * 3); // YEAR column

      const endPop = parseInt(values[popIndex]);
      const rate = parseFloat(values[rateIndex]);
      const amount = parseInt(values[addIndex]);

      // Skip this era if the nation doesn't exist yet (has 0 population)
      if (endPop === 0 && rate === 0) {
        continue;
      }

      if (isNaN(endPop)) {
        throw new Error(`Invalid population value for nation "${name}" in line ${i + 1} for year ${year}`);
      }
      
      if (isNaN(rate)) {
        throw new Error(`Invalid growth rate value for nation "${name}" in line ${i + 1} for year ${year}`);
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
        endPop: endPop
      });

      // Add the addition if it's non-zero and for this era
      if (!isNaN(amount) && amount !== 0) {
        additions.push({ year, amount });
      }
    }

    // Check if nation should be archived based on latest era
    const latestEra = eras[eras.length - 1];
    const isArchived = latestEra && (latestEra.rate === -1 || latestEra.rate === 0);

    nations.push({
      region,
      name,
      startYear,
      startPopulation,
      isArchived,
      eras,
      additions
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

      setCsvData: (data: string) => set({ csvData: data }),
      setImportedNations: (nations: ParsedNation[]) => set({ importedNations: nations }),
      setError: (error: string) => set({ error }),

      parseCsvData: () => {
        try {
          const { csvData } = get();
          set({ error: "" });
          const nations = parseNationsFromCsv(csvData);
          set({ importedNations: nations });
        } catch (err) {
          console.error("Error parsing CSV:", err);
          set({ 
            error: err instanceof Error ? err.message : "Error parsing CSV data. Please check the format.",
            importedNations: []
          });
        }
      },

      submitNations: async () => {
        try {
          const { importedNations } = get();
          
          // Extract unique years from the first nation's eras to determine era boundaries
          const years = importedNations[0].eras.map(era => era.endYear).sort((a, b) => a - b);
          const minYear = Math.min(...importedNations.map(n => n.startYear));
          const maxYear = Math.max(...years);

          // Create eras based on the year boundaries
          const uniqueEras = new Map<string, any>();
          
          // Each era goes from one year point to the next
          for (let i = 0; i < years.length; i++) {
            const startYear = i === 0 ? minYear : years[i - 1];
            const endYear = years[i];
            const key = `${startYear}-${endYear}`;
            uniqueEras.set(key, {
              startYear,
              endYear,
              name: `Era ${startYear}-${endYear}`,
              description: `Era from ${startYear} to ${endYear}`,
            });
          }

          // // Create "before" era
          // const beforeEraResponse = await fetch('/api/eras', {
          //   method: 'POST',
          //   headers: {
          //     'Content-Type': 'application/json',
          //   },
          //   body: JSON.stringify({
          //     name: 'Before Recorded History',
          //     startYear: 0,
          //     endYear: minYear,
          //     description: 'Era before the earliest recorded nation',
          //   }),
          // });
          //
          // if (!beforeEraResponse.ok) {
          //   throw new Error('Failed to create before era');
          // }

          // Create all eras first
          const eraMap = new Map<string, string>(); // Maps era key to era ID
          for (const [key, era] of uniqueEras) {
            const eraResponse = await fetch('/api/eras', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: era.name,
                startYear: era.startYear,
                endYear: era.endYear,
                description: era.description,
              }),
            });

            if (!eraResponse.ok) {
              throw new Error(`Failed to create era ${key}`);
            }

            const eraData = await eraResponse.json();
            eraMap.set(key, eraData.id);
          }

          // Create nations and their growths
          for (const nation of importedNations) {
            // Create nation
            const nationResponse = await fetch('/api/nations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: nation.name,
                region: nation.region,
                startYear: nation.startYear,
                startPopulation: nation.startPopulation,
                isArchived: nation.isArchived,
                vassalIds: JSON.stringify([]),
              }),
            });

            if (!nationResponse.ok) {
              throw new Error(`Failed to create nation ${nation.name}`);
            }

            const nationData = await nationResponse.json();

            // Create additions
            for (const addition of nation.additions) {
              // Find the era that ends with the addition year
              const eraKey = Array.from(uniqueEras.keys()).find(key => {
                const [start, end] = key.split('-').map(Number);
                return addition.year === end;
              });

              if (!eraKey) {
                throw new Error(`Could not find era for addition in year ${addition.year} for nation ${nation.name}`);
              }

              const eraId = eraMap.get(eraKey);
              if (!eraId) {
                throw new Error(`Missing era ID for addition creation ${eraKey}`);
              }

              const additionResponse = await fetch('/api/additions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  nationId: nationData.id,
                  eraId,
                  year: addition.year,
                  amount: addition.amount,
                }),
              });

              if (!additionResponse.ok) {
                throw new Error(`Failed to create addition for nation ${nation.name} in year ${addition.year}`);
              }
            }


            // Create growths for each era
            for (const era of nation.eras) {
              // Find the collapsed era that contains this era's end year
              const collapsedEraKey = Array.from(uniqueEras.keys()).find(key => {
                const [, endYear] = key.split('-').map(Number);
                return endYear === era.endYear;
              });
              
              if (!collapsedEraKey) {
                throw new Error(`Could not find collapsed era for year ${era.endYear} for nation ${nation.name}`);
              }

              const eraId = eraMap.get(collapsedEraKey);
              
              if (!eraId) {
                throw new Error(`Missing era ID for growth creation ${collapsedEraKey}`);
              }

              const growthResponse = await fetch('/api/growths', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  nationId: nationData.id,
                  eraId,
                  startPopulation: era.startPop,
                  growthRate: era.rate,
                  endPopulation: era.endPop,
                }),
              });

              if (!growthResponse.ok) {
                throw new Error(`Failed to create growth for nation ${nation.name} in era ${collapsedEraKey}`);
              }
            }
          }

          set({ importedNations: [] });
        } catch (err) {
          console.error("Error submitting nations:", err);
          set({ 
            error: err instanceof Error ? err.message : "Error submitting nations. Please try again.",
          });
        }
      },

      reset: () => set({
        csvData: "",
        importedNations: [],
        error: "",
      }),
    }),
    {
      name: 'import-store',
      partialize: (state) => ({
        csvData: state.csvData,
        importedNations: state.importedNations,
      }),
    }
  )
); 
