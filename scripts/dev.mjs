#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const serverDir = path.join(rootDir, "server");
const clientDir = path.join(rootDir, "client");

// Color detection
const isColorSupported =
  !process.env.NO_COLOR && (process.env.FORCE_COLOR || process.stdout.isTTY);

const c = isColorSupported
  ? {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      cyan: "\x1b[36m",
      magenta: "\x1b[35m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      red: "\x1b[31m",
      blue: "\x1b[34m",
      gray: "\x1b[90m",
    }
  : {
      reset: "",
      bold: "",
      dim: "",
      cyan: "",
      magenta: "",
      green: "",
      yellow: "",
      red: "",
      blue: "",
      gray: "",
    };

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function logOrchestrator(msg, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const timeStr = `${c.gray}[${timestamp}]${c.reset}`;
  const prefix = `${c.bold}${c.green}[orchestrator]${c.reset}`;
  let formattedMsg = msg;
  if (type === "warn") formattedMsg = `${c.yellow}${msg}${c.reset}`;
  if (type === "error") formattedMsg = `${c.bold}${c.red}${msg}${c.reset}`;
  console.log(`${timeStr} ${prefix} ${formattedMsg}`);
}

function printHeader() {
  console.log(
    `\n${c.bold}${c.cyan}======================================================${c.reset}`
  );
  console.log(
    `${c.bold}${c.cyan}       Smart Scheduler Development Orchestrator       ${c.reset}`
  );
  console.log(
    `${c.bold}${c.cyan}======================================================${c.reset}\n`
  );
}

// Check & verify dependencies
function ensureDependencies() {
  const checks = [
    { name: "server", dir: serverDir },
    { name: "client", dir: clientDir },
  ];

  for (const { name, dir } of checks) {
    const nodeModulesPath = path.join(dir, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      logOrchestrator(
        `Dependencies missing in '${name}'. Running 'npm install'...`,
        "warn"
      );
      const installRes = spawnSync(npmCmd, ["install"], {
        cwd: dir,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      if (installRes.status !== 0) {
        logOrchestrator(
          `Failed to install dependencies for '${name}'.`,
          "error"
        );
        process.exit(1);
      }
      logOrchestrator(`Dependencies installed successfully in '${name}'.`);
    }
  }

  // Check Prisma client generation
  const prismaGeneratedPath = path.join(serverDir, "src/generated/prisma");
  const prismaClientNodeModules = path.join(serverDir, "node_modules/.prisma/client");
  if (!fs.existsSync(prismaGeneratedPath) && !fs.existsSync(prismaClientNodeModules)) {
    logOrchestrator(
      "Prisma client not generated yet. Running 'npm run prisma:generate'...",
      "warn"
    );
    const generateRes = spawnSync(npmCmd, ["run", "prisma:generate"], {
      cwd: serverDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (generateRes.status !== 0) {
      logOrchestrator("Failed to generate Prisma client.", "error");
      process.exit(1);
    }
    logOrchestrator("Prisma client generated successfully.");
  }
}

// Running processes tracking
const processes = new Map();
let isShuttingDown = false;

function killProcessTree(childProcess) {
  if (!childProcess || childProcess.killed || childProcess.exitCode !== null) {
    return;
  }

  const pid = childProcess.pid;
  if (!pid) return;

  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {
      // Ignored
    }
  } else {
    try {
      // Kill process group (detached: true)
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Process might have already exited
      }
    }
  }
}

function shutdownAll(exitCode = 0, reason = "") {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (reason) {
    logOrchestrator(`Shutdown triggered: ${reason}`, exitCode === 0 ? "info" : "error");
  } else {
    logOrchestrator("Shutting down development servers gracefully...");
  }

  // Send termination to all tracked processes
  for (const [name, proc] of processes.entries()) {
    logOrchestrator(`Stopping ${name} (PID ${proc.pid})...`);
    killProcessTree(proc);
  }

  // Hard kill fallback timer
  const forceKillTimer = setTimeout(() => {
    logOrchestrator("Force terminating remaining processes...", "warn");
    for (const [, proc] of processes.entries()) {
      if (proc.pid && proc.exitCode === null) {
        if (process.platform !== "win32") {
          try {
            process.kill(-proc.pid, "SIGKILL");
          } catch {
            // Ignored
          }
        }
      }
    }
    process.exit(exitCode);
  }, 3000);

  forceKillTimer.unref();

  // Monitor process completion
  const checkInterval = setInterval(() => {
    let allExited = true;
    for (const [, proc] of processes.entries()) {
      if (proc.exitCode === null && !proc.killed) {
        allExited = false;
        break;
      }
    }
    if (allExited) {
      clearInterval(checkInterval);
      logOrchestrator("All processes stopped. Goodbye!");
      process.exit(exitCode);
    }
  }, 100);
  checkInterval.unref();
}

function pipeOutput(stream, prefix, isError = false) {
  if (!stream) return;
  const rl = readline.createInterface({ input: stream });

  rl.on("line", (line) => {
    if (!line.trim() && line.length === 0) return;
    const timestamp = new Date().toLocaleTimeString();
    const timeStr = `${c.gray}[${timestamp}]${c.reset}`;
    const errIndicator = isError ? `${c.red}` : "";
    console.log(`${timeStr} ${prefix} ${errIndicator}${line}${c.reset}`);
  });
}

function startService({ name, dir, color, script = "dev" }) {
  const prefix = `${c.bold}${color}[${name}]${c.reset}`;
  logOrchestrator(`Starting ${name}...`);

  const child = spawn(npmCmd, ["run", script], {
    cwd: dir,
    stdio: ["inherit", "pipe", "pipe"],
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  processes.set(name, child);

  pipeOutput(child.stdout, prefix, false);
  pipeOutput(child.stderr, prefix, true);

  child.on("error", (err) => {
    logOrchestrator(`Failed to start ${name}: ${err.message}`, "error");
    shutdownAll(1, `${name} failed to start`);
  });

  child.on("exit", (code, signal) => {
    processes.delete(name);
    if (!isShuttingDown) {
      const exitReason =
        signal ? `terminated by signal ${signal}` : `exited with code ${code}`;
      logOrchestrator(`Service '${name}' ${exitReason}`, code === 0 ? "info" : "error");
      shutdownAll(code === 0 ? 0 : 1, `Service '${name}' stopped`);
    }
  });

  return child;
}

// Trap system signals for graceful cleanup
["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
  process.on(signal, () => {
    console.log("");
    shutdownAll(0, `Received ${signal}`);
  });
});

process.on("uncaughtException", (err) => {
  logOrchestrator(`Uncaught exception: ${err.stack || err.message}`, "error");
  shutdownAll(1, "Uncaught exception");
});

process.on("unhandledRejection", (reason) => {
  logOrchestrator(`Unhandled rejection: ${reason}`, "error");
  shutdownAll(1, "Unhandled rejection");
});

// Main execution
printHeader();
ensureDependencies();

logOrchestrator("Launching services in parallel...");
startService({ name: "server", dir: serverDir, color: c.cyan });
startService({ name: "client", dir: clientDir, color: c.magenta });
