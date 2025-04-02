import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const args = process.argv.slice(2);
const port = parseInt(
  args.find((arg) => arg.startsWith("--port="))?.split("=")[1] || "3000",
  10
);
const directory =
  args.find((arg) => arg.startsWith("--dir="))?.split("=")[1] || process.cwd();

console.log("Starting server with directory:", directory);
console.log("Directory exists:", fs.existsSync(directory));

try {
  const files = fs.readdirSync(directory);
  console.log("Files in directory:", files);

  const indexPath = path.join(directory, "index.html");
  console.log("index.html exists:", fs.existsSync(indexPath));
} catch (err) {
  console.error("Error reading directory:", err);
}

app.use(
  express.static(directory, {
    index: ["index.html", "index.htm"],
    extensions: ["html", "htm"],
    fallthrough: true,
    redirect: false,
  })
);

app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

app.use((req, res) => {
  console.log("Fallback middleware for:", req.url);

  const indexPath = path.join(directory, "index.html");

  if (fs.existsSync(indexPath)) {
    console.log("Serving index.html as fallback");
    res.sendFile(indexPath);
  } else {
    console.log("index.html not found for fallback");
    res
      .status(404)
      .send(
        `<h1>404 - Not Found</h1><p>The path ${req.url} was not found</p><p>Directory being served: ${directory}</p>`
      );
  }
});

app.listen(port, () => {
  console.log(`🌍 Static server running at http://localhost:${port}`);
  console.log(`📁 Serving files from: ${directory}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
