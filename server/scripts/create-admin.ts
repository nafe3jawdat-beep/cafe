import readline from "node:readline";
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  validateAdminEmail,
  validateAdminPassword,
} from "../src/lib/admin-password";

const prisma = new PrismaClient();

function readFlag(args: string[], name: string) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1]?.startsWith("--") ? undefined : args[index + 1];
}

async function promptEmail(promptText: string) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return await rl.question(promptText);
  } finally {
    rl.close();
  }
}

async function promptPassword(promptText: string) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Password prompt requires an interactive terminal.");
  }

  process.stdout.write(promptText);
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return await new Promise<string>((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.removeListener("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const onKeypress = (
      _chunk: string,
      key: { name?: string; sequence?: string; ctrl?: boolean }
    ) => {
      if (key?.ctrl && key.name === "c") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Password input canceled."));
      } else if (key?.name === "return" || key?.name === "enter") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
      } else if (key?.name === "backspace" || key?.name === "delete") {
        value = value.slice(0, -1);
      } else if (
        !key?.ctrl &&
        !["escape", "up", "down", "left", "right", "home", "end", "pageup", "pagedown"].includes(
          key?.name ?? ""
        ) &&
        key?.sequence &&
        !/[\u001b\u0000-\u001f\u007f]/.test(key.sequence)
      ) {
        value += key.sequence;
      }
    };

    process.stdin.on("keypress", onKeypress);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const email = readFlag(args, "email") ?? process.env.ADMIN_EMAIL ?? "";
  const password = readFlag(args, "password") ?? process.env.ADMIN_PASSWORD ?? "";

  if (args.includes("--password")) {
    console.warn(
      "[admin:create] Warning: --password may be saved in shell history; prefer ADMIN_PASSWORD or the hidden prompt."
    );
  }

  const resolvedEmail = email || (await promptEmail("Admin email: "));
  const resolvedPassword =
    password || (await promptPassword("Admin password: "));

  const trimmedEmail = resolvedEmail.trim();
  if (!validateAdminEmail(trimmedEmail)) {
    console.error("[admin:create] Invalid email format.");
    process.exitCode = 1;
    return;
  }

  const passwordCheck = validateAdminPassword(resolvedPassword);
  if (!passwordCheck.valid) {
    console.error(`[admin:create] ${passwordCheck.reason}`);
    process.exitCode = 1;
    return;
  }

  const emailLower = trimmedEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    console.error(
      "[admin:create] An admin account with that email already exists; refusing to overwrite it."
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(resolvedPassword, 12);
  await prisma.user.create({
    data: {
      name: "Café Administrator",
      email: emailLower,
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log(emailLower);
}

main()
  .catch((error) => {
    console.error("[admin:create] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
