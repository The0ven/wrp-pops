import { updateEra, deleteEra } from "../../_lib/records";
import { getEra } from "../../_lib/queries";
import { respond } from "../../_lib/errors";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return respond(async () => getEra((await params).id));
}
export async function PUT(request: Request, { params }: Context) {
  return respond(async () =>
    updateEra((await params).id, await request.json()),
  );
}
export async function DELETE(_request: Request, { params }: Context) {
  return respond(async () => deleteEra((await params).id));
}
