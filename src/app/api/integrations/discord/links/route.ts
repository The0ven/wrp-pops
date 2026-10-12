import { integration, linkNation } from "../../../_lib/discord";

export async function POST(request: Request) {
  return integration(request, async () => linkNation(await request.json()));
}
