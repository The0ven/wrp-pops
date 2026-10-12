import { createAddition } from "../_lib/records";
import { getAdditions } from "../_lib/queries";
import { respond, RequestError } from "../_lib/errors";

export async function POST(request: Request) {
  return respond(async () => createAddition(await request.json()), 201);
}
export async function GET(request: Request) {
  return respond(async () => {
    const url = new URL(request.url);
    const nationId = url.searchParams.get("nationId");
    const eraId = url.searchParams.get("eraId");
    if (!nationId || !eraId)
      throw new RequestError("Nation and era are required");
    return getAdditions(nationId, eraId);
  });
}
