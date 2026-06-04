import fs from "fs";
import path from "path";

async function runDiagnostics() {
  console.log("AUTHORIZED_SERVICE_ACCOUNT_EMAIL:", process.env.AUTHORIZED_SERVICE_ACCOUNT_EMAIL);
}

runDiagnostics();
