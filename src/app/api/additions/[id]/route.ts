import { updateAddition } from "../../_lib/records";
import { getAddition } from "../../_lib/queries";
import { respond } from "../../_lib/errors";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return respond(async () => getAddition((await params).id));
}
export async function PUT(request: Request, { params }: Context) {
  return respond(async () =>
    updateAddition((await params).id, await request.json()),
  );
}
