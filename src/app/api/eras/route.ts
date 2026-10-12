import { createEra } from "../_lib/records";
import { getEras } from "../_lib/queries";
import { respond, RequestError } from "../_lib/errors";

export async function POST(request: Request) {
  return respond(async () => createEra(await request.json()), 201);
}
export async function GET(request: Request) {
  return respond(async () => {
    return getEras();
  });
}
