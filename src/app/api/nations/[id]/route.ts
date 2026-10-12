import { updateNation } from "../../_lib/records";
import { getNation } from "../../_lib/queries";
import { respond } from "../../_lib/errors";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return respond(async () => getNation((await params).id));
}
export async function PUT(request: Request, { params }: Context) {
  return respond(async () =>
    updateNation((await params).id, await request.json()),
  );
}
