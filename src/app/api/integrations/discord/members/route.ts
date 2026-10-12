import { integration, memberLinks } from "../../../_lib/discord";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return integration(request, () =>
    memberLinks({
      guildId: params.get("guildId"),
      memberId: params.get("memberId"),
    }),
  );
}
