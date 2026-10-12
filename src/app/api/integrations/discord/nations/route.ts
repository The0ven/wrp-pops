import { integration, searchNations } from "../../../_lib/discord";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query") ?? "";
  return integration(request, () => searchNations(query));
}
