import { defineCommand } from "citty";
import { getFoundation, getAnalytics } from "../services/user";
import { transformWhoami } from "../transforms/whoami";
import { readConfig } from "../services/config";
import { formatWhoami } from "../presenters/whoami";
import { dim } from "../lib/color";

export default defineCommand({
  meta: { description: "Show your italki profile and learning stats" },
  args: {
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const config = await readConfig();
    if (!config) {
      console.error("Not logged in. Run 'italki login' first.");
      process.exit(1);
    }

    const [foundation, analytics] = await Promise.all([
      getFoundation(config),
      getAnalytics(config).catch(() => null),
    ]);

    const transformed = transformWhoami(foundation, analytics);
    const useJson = ctx.args.json === true;

    if (useJson) {
      console.log(JSON.stringify(transformed, null, 2));
      return;
    }

    const lines = formatWhoami(transformed);
    console.log(lines.join("\n"));
    console.log("");
    console.log(dim("  More: italki lessons  |  italki balance"));
  },
});
