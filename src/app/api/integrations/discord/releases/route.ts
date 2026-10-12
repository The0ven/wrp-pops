import { integration, releaseMember } from "../../../_lib/discord";

export async function POST(request: Request) {
  return integration(request, async () => releaseMember(await request.json()));
}
