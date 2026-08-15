import { defineCommand } from "citty";
import { login } from "../services/auth";
import { writeConfig, readConfig, getConfigPath } from "../services/config";

export default defineCommand({
  meta: { description: "Login to italki (saves session token to ~/.italki/config.json)" },
  args: {
    email: { type: "string", description: "italki account email" },
    password: { type: "string", description: "italki account password" },
  },
  run: async (ctx) => {
    const email = ctx.args.email as string | undefined;
    const password = ctx.args.password as string | undefined;

    if (!email || !password) {
      console.error("Usage: italki login --email <email> --password <password>");
      console.error("Note: password will be visible in shell history. Clear it after.");
      process.exit(1);
    }

    const existing = await readConfig();
    if (existing) {
      console.log(`Already logged in as ${existing.nickname}. Refreshing...`);
    }

    console.log("Logging in...");
    const result = await login(email, password);

    if (!result.success) {
      console.error(`Login failed: ${result.error}`);
      process.exit(1);
    }

    await writeConfig({
      i_token: result.i_token,
      user_id: result.user_id,
      nickname: result.nickname,
      timezone_iana: result.timezone_iana,
      saved_at: new Date().toISOString(),
    });

    console.log(`Logged in as ${result.nickname} (user ${result.user_id})`);
    console.log(`Timezone: ${result.timezone_iana}`);
    console.log(`Config saved to ${getConfigPath()}`);
  },
});
