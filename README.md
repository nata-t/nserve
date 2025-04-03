# nserve-cli

A command-line tool for serving static files with PM2 background persistence. This tool makes it easy to serve multiple static sites and manage them with simple commands.

## Features

- Serve static websites with Express
- Run servers in the background using PM2
- Support for multiple static servers on different ports
- SPA mode with fallback to index.html for client-side routing
- Easy management with simple CLI commands
- Auto-restart on system reboot (with PM2)

## Installation

```bash
# Install globally
npm install -g nserve-cli
```

## Usage

The CLI tool can be used with the following commands:

```bash
nserve [options]           # Start a new static server
nserve list                # List all running servers
nserve start <name|all>    # Start stopped servers
nserve stop <name|all>     # Stop running servers
nserve restart <name|all>  # Restart servers
nserve delete <name|all>   # Delete servers
nserve save                # Save the current process list
```

### Options

When starting a new server, you can specify the following options:

- `-d, --dir <path>` - Directory to serve (defaults to current directory)
- `-p, --port <number>` - Server port (defaults to 3000)
- `-n, --name <string>` - Process name (defaults to a generated name)

## Command Details

### Starting a new server

To start a new static server:

```bash
nserve --dir ./build --port 3001 --name my-website
```

This will start a static file server in the background using PM2.

### Listing all servers

```bash
nserve list
```

Shows a table with all running static servers, including:

- Name
- Status (online/stopped)
- Port
- Directory being served
- Uptime
- Number of restarts

### Starting a server

```bash
nserve start my-website  # Start a specific server
nserve start all         # Start all stopped servers
```

Starts a stopped server or all stopped servers.

### Stopping a server

```bash
nserve stop my-website   # Stop a specific server
nserve stop all          # Stop all running servers
```

Stops a server or all running servers without removing them from PM2.

### Restarting a server

```bash
nserve restart my-website   # Restart a specific server
nserve restart all          # Restart all servers
```

Restarts one or all servers.

### Deleting a server

```bash
nserve delete my-website   # Delete a specific server
nserve delete all          # Delete all servers
```

Completely removes a server or all servers from PM2.

### Saving the process list

```bash
nserve save
```

Saves the current process list so that it can be restored when PM2 restarts.

### Configuring autostart

```bash
nserve autostart
```

Configures PM2 to start on system boot, ensuring your servers restart automatically. You may need to run the provided sudo command to complete the setup.

## Examples

### Serving a React build folder

```bash
# From the project directory
npm run build
nserve --dir ./build --port 3000 --name my-react-app
```

### Serving multiple websites

```bash
# Start multiple websites on different ports
nserve --dir ./site1 --port 3001 --name site1
nserve --dir ./site2 --port 3002 --name site2

# List all running websites
nserve list

# Stop all websites
nserve stop all

# Start all websites again
nserve start all
```

### Auto-starting on system boot

```bash
# Save current process list
nserve save

# Configure PM2 to start on boot
nserve autostart
# Follow the instructions to run the sudo command
```

## License

ISC
