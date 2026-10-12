import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function create(
  request: APIRequestContext,
  resource: string,
  data: object,
) {
  const response = await request.post(`/api/${resource}`, { data });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
const nationData = (name: string) => ({
  name,
  region: "North",
  startYear: 100,
  startPopulation: 1000,
});

test("archive and unarchive a nation through the UI", async ({
  page,
  request,
}) => {
  const nation = await create(
    request,
    "nations",
    nationData(`Archive ${randomUUID()}`),
  );
  await page.goto("/nations");
  await page
    .getByPlaceholder("Search nations by name or region...")
    .fill(nation.name);
  await page
    .getByRole("button", { name: `Archive ${nation.name}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Archive ${nation.name}`, exact: true }),
  ).toBeDisabled();
  expect(
    (await (await request.get(`/api/nations/${nation.id}`)).json()).isArchived,
  ).toBe(true);
  await page.goto(`/nations/${nation.id}/edit`);
  await page
    .getByRole("switch", { name: "Archive Nation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Update Nation", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/nations/${nation.id}$`));
  expect(
    (await (await request.get(`/api/nations/${nation.id}`)).json()).isArchived,
  ).toBe(false);
});

test("era deletion can be canceled and deletes only its own records", async ({
  page,
  request,
}) => {
  const era = await create(request, "eras", {
    name: `Delete ${randomUUID()}`,
    startYear: 800,
    endYear: 810,
  });
  const nation = await create(request, "nations", {
    ...nationData(`Keep ${randomUUID()}`),
    startYear: 800,
  });
  await page.goto(`/eras/${era.id}`);
  await page.getByRole("button", { name: "Delete era", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect((await request.get(`/api/eras/${era.id}`)).status()).toBe(200);
  await page.getByRole("button", { name: "Delete era", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Era", exact: true })
    .click();
  await expect(page).toHaveURL(/\/eras$/);
  expect((await request.get(`/api/eras/${era.id}`)).status()).toBe(404);
  expect((await request.get(`/api/nations/${nation.id}`)).status()).toBe(200);
});

test("CSV import reports success, uses additions once and rejects repeat imports", async ({
  page,
  request,
}) => {
  const name = `Imported ${Date.now()}`;
  const csv = `Region,Name,Start Year,Start Pop,ADD 510,RATE 510,510\nNorth,${name},500,1000,100,0.01,1215`;
  await page.goto("/nations/import");
  await page.getByLabel("Paste CSV Data").fill(csv);
  await page.getByRole("button", { name: "Parse Data", exact: true }).click();
  await page
    .getByRole("button", { name: "Import Nations", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("1 nations imported");
  const nations = await (await request.get("/api/nations")).json();
  const nation = nations.find((n: { name: string }) => n.name === name);
  expect(nation.growths).toHaveLength(1);
  expect(nation.growths[0].endPopulation).toBe(1215);
  await page.getByRole("button", { name: "Parse Data", exact: true }).click();
  await page
    .getByRole("button", { name: "Import Nations", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("An imported nation already exists.", { exact: false }),
  ).toBeVisible();
});

test("nation create/edit preserves description and empire membership and displays validation", async ({
  page,
  request,
}) => {
  const name = `Nation ${randomUUID()}`;
  await page.goto("/nations/new");
  await page.getByLabel("Nation Name", { exact: true }).fill(name);
  await page.getByLabel("Region", { exact: true }).fill("North");
  await page.getByLabel("Start Year", { exact: true }).fill("100");
  await page.getByLabel("Start Population", { exact: true }).fill("1000");
  await page.getByLabel("Description").fill("Keep this description");
  await page
    .getByRole("button", { name: "Create Nation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/nations\/(?!new$)[^/]+$/);
  const id = page.url().split("/").at(-1)!;
  const empire = await create(request, "empires", {
    name: `Empire ${randomUUID()}`,
    vassalIds: [id],
  });
  await page.goto(`/nations/${id}/edit`);
  await expect(page.getByLabel("Description")).toHaveValue(
    "Keep this description",
  );
  await page.getByLabel("Nation Name", { exact: true }).fill("   ");
  await page
    .getByRole("button", { name: "Update Nation", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Name is required",
  );
  await page.getByLabel("Nation Name", { exact: true }).fill(`${name} renamed`);
  await page
    .getByRole("button", { name: "Update Nation", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/nations/${id}$`));
  expect(await (await request.get(`/api/nations/${id}`)).json()).toMatchObject({
    empireId: empire.id,
    description: "Keep this description",
  });
});

test("empire editor retains vassals, removes without submitting, supports keyboard deletion and empty save", async ({
  page,
  request,
}) => {
  const first = await create(
    request,
    "nations",
    nationData(`Vassal ${randomUUID()}`),
  );
  const second = await create(
    request,
    "nations",
    nationData(`Vassal ${randomUUID()}`),
  );
  const name = `Empire ${randomUUID()}`;
  await page.goto("/empires/new");
  await page.getByLabel("Empire Name", { exact: true }).fill(name);
  await page
    .getByRole("combobox", { name: "Vassal Nations", exact: true })
    .fill(first.name);
  await page.getByRole("option", { name: first.name, exact: true }).click();
  await page
    .getByRole("combobox", { name: "Vassal Nations", exact: true })
    .fill(second.name);
  await page.getByRole("option", { name: second.name, exact: true }).click();
  await page
    .getByRole("button", { name: "Create Empire", exact: true })
    .click();
  await expect(page).toHaveURL(/\/empires\/(?!new$)[^/]+$/);
  const id = page.url().split("/").at(-1)!;
  await request.put(`/api/nations/${second.id}`, {
    data: { isArchived: true },
  });
  await page.goto(`/empires/${id}/edit`);
  await expect(
    page.getByRole("button", { name: `Remove ${first.name}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Remove ${second.name}`, exact: true }),
  ).toBeVisible();
  await page.getByLabel("Empire Name", { exact: true }).fill(`${name} renamed`);
  await page
    .getByRole("button", { name: "Update Empire", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/empires/${id}$`));
  expect(
    (await (await request.get(`/api/empires/${id}`)).json()).vassals,
  ).toHaveLength(2);
  await page.goto(`/empires/${id}/edit`);
  await page
    .getByRole("button", { name: `Remove ${first.name}`, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/empires/${id}/edit$`));
  const input = page.getByRole("combobox", {
    name: "Vassal Nations",
    exact: true,
  });
  await input.focus();
  await input.press("Backspace");
  await input.press("Backspace");
  await expect(page.getByText("0 selected.", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "Update Empire", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/empires/${id}$`));
  expect(
    (await (await request.get(`/api/empires/${id}`)).json()).vassals,
  ).toHaveLength(0);
});

test("era create/edit validates ranges and exposes population detail without additions", async ({
  page,
  request,
}) => {
  const name = `Era ${randomUUID()}`;
  await page.goto("/eras/new");
  await page.getByLabel("Era Name").fill(name);
  await page.getByLabel("Start Year").fill("100");
  await page.getByLabel("End Year").fill("90");
  await page.getByRole("button", { name: "Create Era", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "End year",
  );
  await page.getByLabel("End Year").fill("110");
  await page.getByRole("button", { name: "Create Era", exact: true }).click();
  await expect(page).toHaveURL(/\/eras\/(?!new$)[^/]+$/);
  const id = page.url().split("/").at(-1)!;
  await page.getByRole("link", { name: "Edit Era", exact: true }).click();
  await page.getByLabel("Era Name").fill(`${name} renamed`);
  await page.getByLabel("End Year").fill("120");
  await page.getByRole("button", { name: "Update Era", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/eras/${id}$`));
  expect(await (await request.get(`/api/eras/${id}`)).json()).toMatchObject({
    name: `${name} renamed`,
    endYear: 120,
  });
  const nation = await create(
    request,
    "nations",
    nationData(`No addition ${randomUUID()}`),
  );
  await page.goto(`/eras/${id}/nations/${nation.id}`);
  await expect(page.getByLabel("Addition Amount")).toHaveValue("0");
  await page.getByLabel("Addition Amount").fill("500");
  await page.getByLabel("Growth Rate (0.01 = 1%)").fill("0.02");
  await expect(page.getByLabel("Calculated End Population")).toHaveText(
    Math.round(1500 * 1.02 ** 20).toLocaleString(),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved!" }),
  ).toHaveText("Saved!");
  await page.reload();
  await expect(page.getByLabel("Calculated End Population")).toHaveText(
    Math.round(1500 * 1.02 ** 20).toLocaleString(),
  );
});

test("timeline saves simultaneous addition/growth once, preserves filtered edits and isolates eras", async ({
  page,
  request,
}) => {
  const era = await create(request, "eras", {
    name: `Timeline ${randomUUID()}`,
    startYear: 200,
    endYear: 210,
  });
  const other = await create(request, "eras", {
    name: `Other ${randomUUID()}`,
    startYear: 210,
    endYear: 220,
  });
  const first = await create(request, "nations", {
    ...nationData(`Timeline A ${randomUUID()}`),
    startYear: 200,
  });
  const second = await create(request, "nations", {
    ...nationData(`Timeline B ${randomUUID()}`),
    startYear: 200,
  });
  await page.goto("/population");
  await page
    .getByRole("button", { name: `${era.name} (200–210)`, exact: true })
    .click();
  await page.getByLabel(`${first.name} addition`, { exact: true }).fill("500");
  await page
    .getByLabel(`${first.name} growth rate`, { exact: true })
    .fill("0.02");
  await page.getByLabel(`${second.name} addition`, { exact: true }).fill("100");
  await page
    .getByRole("button", { name: `${other.name} (210–220)`, exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "before switching eras",
  );
  await page
    .getByRole("button", { name: "Filter Nations", exact: true })
    .click();
  await page.getByLabel("Search nations").fill(first.name);
  await page.getByLabel("Search nations").press("Escape");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  const rows = (await (await request.get(`/api/eras/${era.id}`)).json())
    .growths;
  expect(
    rows.find((r: { nationId: string }) => r.nationId === first.id),
  ).toMatchObject({
    startPopulation: 1000,
    endPopulation: Math.round(1500 * 1.02 ** 10),
  });
  expect(
    rows.find((r: { nationId: string }) => r.nationId === second.id),
  ).toMatchObject({ endPopulation: 1100 });
  await page.reload();
  await page
    .getByRole("button", { name: `${era.name} (200–210)`, exact: true })
    .click();
  await page
    .getByLabel(`${first.name} growth rate`, { exact: true })
    .fill("0.03");
  await page
    .getByLabel(`${first.name} growth rate`, { exact: true })
    .fill("0.02");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  expect(
    (await (await request.get(`/api/eras/${era.id}`)).json()).growths.find(
      (r: { nationId: string }) => r.nationId === first.id,
    ).endPopulation,
  ).toBe(Math.round(1500 * 1.02 ** 10));
});

test("timeline server error keeps edits, shows feedback and allows cancellation", async ({
  page,
  request,
}) => {
  const era = await create(request, "eras", {
    name: `Failure ${randomUUID()}`,
    startYear: 300,
    endYear: 310,
  });
  const nation = await create(request, "nations", {
    ...nationData(`Failure ${randomUUID()}`),
    startYear: 300,
  });
  await page.goto("/population");
  await page
    .getByRole("button", { name: `${era.name} (300–310)`, exact: true })
    .click();
  await page
    .getByLabel(`${nation.name} addition`, { exact: true })
    .fill("-1001");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "below zero",
  );
  await expect(
    page.getByLabel(`${nation.name} addition`, { exact: true }),
  ).toHaveValue("-1001");
  await page.getByRole("button", { name: "Cancel edits", exact: true }).click();
  await expect(
    page.getByLabel(`${nation.name} addition`, { exact: true }),
  ).toHaveValue("0");
});

test("HTTP validation, bodyless GETs, missing records, and batch rollback", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/eras", {
        data: { name: "Invalid", startYear: 10, endYear: 0 },
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/api/empires/missing")).status()).toBe(404);
  expect((await request.get("/api/eras/missing")).status()).toBe(404);
  const era = await create(request, "eras", {
    name: `API ${randomUUID()}`,
    startYear: 400,
    endYear: 410,
  });
  const nation = await create(request, "nations", {
    ...nationData(`API ${randomUUID()}`),
    startYear: 400,
  });
  const response = await request.put("/api/population", {
    data: [
      { nationId: nation.id, eraId: era.id, amount: 100, growthRate: 0.01 },
      { nationId: "missing", eraId: era.id, amount: 100, growthRate: 0 },
    ],
  });
  expect(response.status()).toBe(404);
  expect(
    (await (await request.get(`/api/eras/${era.id}`)).json()).additions,
  ).toHaveLength(0);
});
