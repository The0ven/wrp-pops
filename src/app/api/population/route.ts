import { savePopulationRecords } from "../_lib/records";
import { respond } from "../_lib/errors";
export async function PUT(request: Request) {
  return respond(async () => savePopulationRecords(await request.json()));
}
