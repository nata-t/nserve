#!/usr/bin/env node
import { program } from "commander";
import { addServer } from "./commands/add.js";
import { listServers } from "./commands/list.js";
import { restartServer } from "./commands/restart.js";
import { deleteServer } from "./commands/delete.js";
import { saveServer } from "./commands/save.js";
// import { autostartServer } from "./commands/autostart.js";
import { stopServer } from "./commands/stop.js";
import { startServer } from "./commands/start.js";

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

program
  .name("n-serve")
  .version("1.0.0")
  .description("Serve static files with PM2 background persistence")
  .option("-d, --dir <path>", "Directory to serve", process.cwd())
  .option("-p, --port <number>", "Server port", "3000")
  .option(
    "-n, --name <string>",
    "Process name",
    (val) => val || `static-serve-${Date.now()}`
  );

// List command
program
  .command("list")
  .description("List all running static servers")
  .action(listServers);

// Restart command
program
  .command("restart <name>")
  .description("Restart a process (use 'all' to restart all)")
  .action(restartServer);

// delete command
program
  .command("delete <name>")
  .description("delete a process (use 'all' to delete all)")
  .action(deleteServer);

// save process list
program
  .command("save")
  .description("save the current process list")
  .action(saveServer);

// automatically start process after reboot
// program
//   .command("autostart")
//   .description("automatically start the process after reboot")
//   .action(autostartServer);

// stop process
program
  .command("stop <name>")
  .description("stop the process (use 'all' to stop all)")
  .action(stopServer);

// start process
program
  .command("start <name>")
  .description("start the process (use 'all' to start all)")
  .action(startServer);

// Define a default action for the main command
program.action(function () {
  addServer(program.opts());
});

// Parse arguments
program.parse();
