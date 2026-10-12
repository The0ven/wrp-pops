import { createNation } from "../_lib/records";
import { fetchNations } from "../_lib/queries";
import { respond, RequestError } from "../_lib/errors";

export async function POST(request: Request) {
  return respond(async () => createNation(await request.json()), 201);
}
export async function GET(request: Request) {
  return respond(async () => {
    return fetchNations();
  });
}
