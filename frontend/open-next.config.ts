import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default in-memory/asset caching — no Durable Objects needed for NexLearn.
export default defineCloudflareConfig();
