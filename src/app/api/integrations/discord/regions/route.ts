import { integration, regions } from "../../../_lib/discord";

export async function GET(request: Request) {
  return integration(request, () => regions());
}
