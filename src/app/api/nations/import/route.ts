import { importNations } from "../../_lib/import";
import { respond } from "../../_lib/errors";
export async function POST(request: Request) {
  return respond(async () => importNations(await request.json()), 201);
}
