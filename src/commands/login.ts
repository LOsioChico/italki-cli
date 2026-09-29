import { defineCommand } from "citty";
import { login, verifyLoginOtp } from "../services/auth";
import { writeConfig, readConfig, getConfigPath } from "../services/config";

export default defineCommand({
  meta: { description: "Login to italki (saves session token to ~/.italki/config.json)" },
  args: {
    email: { type: "string", description: "italki account email" },
    password: { type: "string", description: "italki account password" },
    otp: { type: "string", description: "4-digit code from the verification email (second step)" },
  },
  run: async (ctx) => {
    const email = ctx.args.email as string | undefined;
    const password = ctx.args.password as string | undefined;
    const otp = ctx.args.otp as string | undefined;

    if (!email || !password) {
      console.error("Usage: italki login --email <email> --password <password> [--otp <code>]");
      console.error("Note: password will be visible in shell history. Clear it after.");
      process.exit(1);
    }

    const existing = await readConfig();
    if (existing) {
      console.log(`Already logged in as ${existing.nickname}. Refreshing...`);
    }

    console.log("Logging in...");
    let result = await login(email, password);

    if (result.status === "otp") {
      if (!otp) {
        console.log(`italki sent a ${result.otp_code_len}-digit verification code to ${result.otp_account}.`);
        console.log("Check your email, then rerun the same command with --otp <code>.");
        process.exit(0);
      }
      console.log("Verifying code...");
      result = await verifyLoginOtp(result.otp_token_id, otp);
    }

    if (result.status === "fail") {
      console.error(`Login failed: ${result.error}`);
      process.exit(1);
    }

    if (result.status === "otp") {
      console.error("Login still requires OTP — the code may be wrong or expired. Rerun without --otp to request a new one.");
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
