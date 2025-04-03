import chalk from "chalk";
import pm2 from "pm2";
import Table from "cli-table3";

export function listServers() {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    pm2.list((err, list) => {
      if (err) {
        console.error(chalk.red("Failed to retrieve process list"), err);
        pm2.disconnect();
        process.exit(1);
      }

      // Filter to get only our static servers
      const servers = list.filter((p) => {
        const args = p.pm2_env?.args || [];
        return args.some((arg) => arg.startsWith("--dir="));
      });

      if (servers.length === 0) {
        console.log(chalk.yellow("No static servers are currently running"));
        pm2.disconnect();
        return;
      }

      // Create table
      const table = new Table({
        head: [
          chalk.cyan("Name"),
          chalk.cyan("Status"),
          chalk.cyan("Port"),
          chalk.cyan("Directory"),
          chalk.cyan("Uptime"),
          chalk.cyan("Restarts"),
        ],
        colWidths: [20, 10, 10, null, 15, 10],
      });

      // Add data to table
      servers.forEach((server) => {
        const args = server.pm2_env?.args || [];
        const port =
          args.find((arg) => arg.startsWith("--port="))?.split("=")[1] || "N/A";
        const dir =
          args.find((arg) => arg.startsWith("--dir="))?.split("=")[1] || "N/A";

        const status = server.pm2_env?.status || "unknown";
        const statusColor = status === "online" ? chalk.green : chalk.red;

        // Format uptime
        let uptime = "N/A";
        if (server.pm2_env?.pm_uptime) {
          const uptimeSeconds = Math.floor(
            (Date.now() - server.pm2_env.pm_uptime) / 1000
          );
          if (uptimeSeconds < 60) uptime = `${uptimeSeconds}s`;
          else if (uptimeSeconds < 3600)
            uptime = `${Math.floor(uptimeSeconds / 60)}m`;
          else if (uptimeSeconds < 86400)
            uptime = `${Math.floor(uptimeSeconds / 3600)}h`;
          else uptime = `${Math.floor(uptimeSeconds / 86400)}d`;
        }

        table.push([
          server.name,
          statusColor(status),
          port,
          dir,
          uptime,
          server.pm2_env?.restart_time || 0,
        ]);
      });

      console.log(table.toString());
      pm2.disconnect();
    });
  });
}
