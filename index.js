const SOURCIFY_STATS_URL = "https://repo.sourcify.dev/stats.json";
import fetch from "node-fetch";
import fs from "fs";
import csv from "fast-csv";

const downloadSourcifyStats = async () => {
  const sourcifyStats = await (await fetch(SOURCIFY_STATS_URL)).json();
  if (!sourcifyStats) {
    throw new Error(
      "Could not fetch sourcify stats from " + SOURCIFY_STATS_URL
    );
  }
  return sourcifyStats;
};

downloadSourcifyStats()
  .then((sourcifyStats) => {
    // Separate file for each chain. Difficult to contain everything in a single .csv because the chains can change and columns will be malformed.
    Object.keys(sourcifyStats).forEach((chainId) => {
      const chainStats = {};
      chainStats.full_match = sourcifyStats[chainId].full_match;
      chainStats.partial_match = sourcifyStats[chainId]. partial_match;
      chainStats.total = chainStats.full_match + chainStats.partial_match;
      // Assign today's date in YYYY-MM-DD format to chains.date
      chainStats.date = new Date().toISOString().split("T")[0];
      appendCsv(chainId, chainStats);
    });
  })
  .then(() => {
    console.log("Done!");
  });

const appendCsv = (chainId, rowObject) => {
  return new Promise((resolve, reject) => {
    const fileName = `./chainStats/${chainId}.csv`;
    let writeHeaders = false;
    try {
      fs.accessSync(fileName, fs.constants.F_OK);
      // file exists, don't write headers
    } catch (err) {
      writeHeaders = true;
    }
    const fsWriteStream = fs.createWriteStream(fileName, {
      flags: "a",
    }); // append flag.
    const csvStream = csv.format({
      headers: true,
      writeHeaders: writeHeaders,
      includeEndRowDelimiter: true,
    });
    csvStream
      .pipe(fsWriteStream)
      .on("finish", () => {
        console.log("Finished writing to .csv");
        resolve();
      })
      .on("error", () => {
        console.error("Error writing to .csv");
        reject();
      });

    csvStream.write(rowObject);
    csvStream.end();
  });
};
