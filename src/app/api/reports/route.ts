import { respond, RequestError } from "../_lib/errors";
import { getReport } from "../_lib/reports";
export async function GET(request: Request) {
  return respond(async () => {
    const eraId = new URL(request.url).searchParams.get("eraId");
    if (!eraId) throw new RequestError("Era ID is required");
    const r = await getReport(eraId);
    return {
      era: { name: r.era.name, endYear: r.era.endYear },
      totalPopulation: r.totalPopulation,
      highestPopulatedRegion: r.highestPopulatedRegion.region,
      highestPopulatedNation: r.highestPopulatedNation.name,
      regions: r.nationsByRegion,
      empires: r.empires,
    };
  });
}
