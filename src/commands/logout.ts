import { defineCommand } from "citty";
import { clearConfig } from "../services/config";

export default defineCommand({
  meta: { description: "Clear saved italki session" },
  args: {},
  run: async () => {
    await clearConfig();
    console.log("Logged out. Session cleared.");
  },
});
