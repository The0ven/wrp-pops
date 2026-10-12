import { saveEmpire } from "../../_lib/records";
import { getEmpire } from "../../_lib/queries";
import { respond } from "../../_lib/errors";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return respond(async () => getEmpire((await params).id));
}
export async function PUT(request: Request, { params }: Context) {
  return respond(async () =>
    saveEmpire((await params).id, await request.json()),
  );
}
