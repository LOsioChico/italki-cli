import { defineCommand } from "citty";
import { getBalance } from "../services/finance";
import { readConfig } from "../services/config";
import { formatBalance } from "../presenters/balance";
import { dim } from "../lib/color";

export default defineCommand({
  meta: { description: "Show your italki credit balance" },
  args: {
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const config = await readConfig();
    if (!config) {
      console.error("Not logged in. Run 'italki login' first.");
      process.exit(1);
    }

    const balance = await getBalance(config);
    const useJson = ctx.args.json === true;

    if (useJson) {
      console.log(JSON.stringify(balance.data, null, 2));
      return;
    }

    const lines = formatBalance(balance);
    console.log(lines.join("\n"));
    console.log("");
    console.log(dim("  More: italki lessons  |  italki whoami"));
  },
});
