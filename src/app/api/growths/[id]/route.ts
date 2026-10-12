import { updateGrowth } from "../../_lib/records";
import { getGrowth } from "../../_lib/queries";
import { respond } from "../../_lib/errors";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return respond(async () => getGrowth((await params).id));
}
export async function PUT(request: Request, { params }: Context) {
  return respond(async () =>
    updateGrowth((await params).id, await request.json()),
  );
}
