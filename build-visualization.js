import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { parseFile } from "fast-csv";

const CHAINS_API = "https://sourcify.dev/server/chains";
const CHAIN_STATS_DIR = "./chainStats";
const OUTPUT_DIR = "./docs";
const OUTPUT_FILE = path.join(OUTPUT_DIR, "data.json");

async function fetchChainNames() {
  try {
    const res = await fetch(CHAINS_API);
    const chains = await res.json();
    const nameMap = {};
    for (const chain of chains) {
      nameMap[String(chain.chainId)] = chain.name;
    }
    return nameMap;
  } catch (e) {
    console.warn("Could not fetch chain names:", e.message);
    return {};
  }
}

function readChainCsv(filePath) {
  return new Promise((resolve, reject) => {
    const dates = [];
    const full = [];
    const partial = [];
    const total = [];
    parseFile(filePath, { headers: true })
      .on("data", (row) => {
        if (!row.date) return;
        dates.push(row.date);
        full.push(Number(row.full_match) || 0);
        partial.push(Number(row.partial_match) || 0);
        total.push(Number(row.total) || 0);
      })
      .on("end", () => resolve({ dates, full, partial, total }))
      .on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Fetching chain names from Sourcify API...");
  const chainNames = await fetchChainNames();

  const files = fs
    .readdirSync(CHAIN_STATS_DIR)
    .filter((f) => f.endsWith(".csv"))
    .sort();

  console.log(`Processing ${files.length} chain files...`);

  const chains = {};
  for (const file of files) {
    const chainId = path.basename(file, ".csv");
    try {
      const data = await readChainCsv(path.join(CHAIN_STATS_DIR, file));
      if (data.dates.length === 0) {
        console.log(`  Skipping empty: ${file}`);
        continue;
      }
      chains[chainId] = {
        name: chainNames[chainId] || `Chain ${chainId}`,
        dates: data.dates,
        full: data.full,
        partial: data.partial,
        total: data.total,
      };
    } catch (e) {
      console.warn(`  Error reading ${file}: ${e.message}`);
    }
  }

  const output = {
    lastUpdated: new Date().toISOString().split("T")[0],
    chains,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
  const kb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(
    `\nWritten ${OUTPUT_FILE} (${kb} KB, ${Object.keys(chains).length} chains)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
