import { expect, test, type APIRequestContext } from "@playwright/test";

async function createPostedPoolTask(request: APIRequestContext, titleSuffix: string) {
  const draftResponse = await request.post("/api/v1/tasks/drafts", {
    data: {
      mode: "VERIFIED_POOL",
      principalMode: "AGENT",
      title: `Smoke task ${titleSuffix}`,
      coarseArea: "Seattle / Pike St",
      timingWindow: "Tomorrow at 10:00 AM local time",
      exactLocation: "Starbucks, 1124 Pike St, Seattle, WA 98101",
      hiddenNotes: "Scout first.",
      expiresInMinutes: 60
    }
  });

  expect(draftResponse.ok()).toBeTruthy();
  const draftJson = await draftResponse.json();
  const taskId = draftJson.job.id as string;
  const buyerToken = draftJson.buyerToken as string;

  const postResponse = await request.post(`/api/v1/tasks/${taskId}/post`, {
    headers: {
      Authorization: `Bearer ${buyerToken}`
    }
  });

  expect(postResponse.ok()).toBeTruthy();
  return { taskId, buyerToken };
}

test.describe("QueueKeeper smoke", () => {
  test("landing page shows the two-sided entrypoints", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByText("Hire a human to queue at your favorite restaurant.")).toBeVisible();
    await expect(page.getByText("I'm an Agent")).toBeVisible();
    await expect(page.getByText("curl -s")).toBeVisible();

    await page.getByText("I'm a Human").click();
    await expect(page.getByRole("link", { name: "Rent a human" })).toBeVisible();
    await expect(page.getByRole("link", { name: "I want to make money" })).toBeVisible();
  });

  test("human defaults can fund and post a task", async ({ page }) => {
    await page.goto("/human", { waitUntil: "networkidle" });

    await expect(page.getByText("Human-authored private procurement task")).toBeVisible();
    await expect(page.getByLabel("Dispatch target")).toBeVisible();

    await page.getByRole("button", { name: "Fund and post task" }).click();
    await page.waitForURL(/\/tasks\/.+/, { timeout: 20_000 });

    await expect(page).toHaveURL(/\/tasks\/.+/);
  });

  test("public tasks board shows earnable tasks", async ({ page, request }) => {
    await createPostedPoolTask(request, "board");
    await page.goto("/tasks", { waitUntil: "networkidle" });

    await expect(page.getByText("Earn by completing verified steps.")).toBeVisible();
    await expect(page.getByText("Earnable task").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "View task" }).first()).toBeVisible();
  });

  test("runner can accept with default identity and submit first proof", async ({ page, request }) => {
    const { taskId } = await createPostedPoolTask(request, "runner");

    await page.goto(`/runner/${taskId}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Who is taking the task")).toBeVisible();
    await expect(page.getByText(/Resolved address:/)).toBeVisible();

    await page.getByRole("button", { name: "Accept task" }).click();
    await expect(page.getByText(/Accepted · verification ref/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Unlocked")).toBeVisible({ timeout: 20_000 });

    await page.getByLabel("Proof note").fill("Scout complete: line is short and moving.");
    await page.getByRole("button", { name: /Submit Scout/i }).click();
    await expect(page.getByText(/proof stored/i)).toBeVisible({ timeout: 20_000 });
  });

  test("evidence page loads", async ({ page }) => {
    await page.goto("/evidence", { waitUntil: "networkidle" });
    await expect(page.getByText(/Core loop|Agent infrastructure|Sidecars/i).first()).toBeVisible();
  });
});
