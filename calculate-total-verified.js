import fs from "fs";
import path from "path";
import csv from "fast-csv";

/**
 * Calculate total verified contracts across all chains for a given date
 * @param {string} targetDate - Date in YYYY-MM-DD format
 * @returns {Promise<number>} Total verified contracts across all chains
 */
const calculateTotalVerifiedForDate = async (targetDate) => {
  const chainStatsDir = "./chainStats";

  // Get all CSV files in the chainStats directory
  const csvFiles = fs
    .readdirSync(chainStatsDir)
    .filter((file) => file.endsWith(".csv"))
    .map((file) => path.join(chainStatsDir, file));

  console.log(`Found ${csvFiles.length} chain CSV files`);
  console.log(`Calculating total verified contracts for date: ${targetDate}`);

  let totalVerified = 0;
  let chainsWithData = 0;
  let chainsWithoutData = 0;

  // Process each CSV file
  const promises = csvFiles.map((filePath) => {
    return new Promise((resolve, reject) => {
      const chainId = path.basename(filePath, ".csv");
      let foundData = false;

      fs.createReadStream(filePath)
        .pipe(csv.parse({ headers: true }))
        .on("data", (row) => {
          if (row.date === targetDate) {
            const total = parseInt(row.total, 10);
            if (!isNaN(total)) {
              totalVerified += total;
              chainsWithData++;
              foundData = true;
              console.log(`Chain ${chainId}: ${total} verified contracts`);
            }
          }
        })
        .on("end", () => {
          if (!foundData) {
            chainsWithoutData++;
            console.log(`Chain ${chainId}: No data found for date ${targetDate}`);
          }
          resolve();
        })
        .on("error", (error) => {
          console.error(`Error reading ${filePath}:`, error);
          reject(error);
        });
    });
  });

  // Wait for all files to be processed
  await Promise.all(promises);

  console.log(`\n--- Summary ---`);
  console.log(`Date: ${targetDate}`);
  console.log(`Chains with data: ${chainsWithData}`);
  console.log(`Chains without data: ${chainsWithoutData}`);
  console.log(`Total verified contracts: ${totalVerified.toLocaleString()}`);

  return totalVerified;
};

// Get date from command line argument or use today's date
const targetDate = process.argv[2] || new Date().toISOString().split("T")[0];

// Validate date format (basic check)
if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
  console.error("Please provide date in YYYY-MM-DD format");
  console.error("Usage: node calculate-total-verified.js [YYYY-MM-DD]");
  process.exit(1);
}

calculateTotalVerifiedForDate(targetDate)
  .then((total) => {
    console.log(`\nFinal Result: ${total.toLocaleString()} total verified contracts on ${targetDate}`);
  })
  .catch((error) => {
    console.error("Error calculating totals:", error);
    process.exit(1);
  });
