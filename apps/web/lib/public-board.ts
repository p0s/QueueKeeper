import { getQueueKeeperCore } from "@queuekeeper/core";
import type { QueueJobView } from "@queuekeeper/shared";
import { headers } from "next/headers";

function resolveOrigin(host: string | null, forwardedProto: string | null) {
  if (!host) return "https://queuekeeper.xyz";
  const proto = forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function loadPublicTasks(): Promise<QueueJobView[]> {
  try {
    const requestHeaders = await headers();
    const origin = resolveOrigin(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
      requestHeaders.get("x-forwarded-proto")
    );

    const response = await fetch(`${origin}/api/v1/tasks?viewer=public`, {
      cache: "no-store"
    });
    if (response.ok) {
      const json = await response.json() as { tasks?: QueueJobView[] };
      if (Array.isArray(json.tasks)) {
        return json.tasks;
      }
    }
  } catch {
    // Fall back to direct core reads if the API origin is unavailable in this runtime.
  }

  return (await getQueueKeeperCore()).listTasks("public").tasks;
}
