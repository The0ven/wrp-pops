import { createRegistration, integration } from "../../../_lib/discord";

export async function POST(request: Request) {
  return integration(request, async () =>
    createRegistration(await request.json()),
  );
}
