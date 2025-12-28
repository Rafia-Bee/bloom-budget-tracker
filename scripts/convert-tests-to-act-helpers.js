/**
 * convert-tests-to-act-helpers.js
 *
 * Converts test files from userEvent to test-utils act helpers
 * Usage: node scripts/convert-tests-to-act-helpers.js [--dry-run] [--file=filename]
 */

const fs = require("fs");
const path = require("path");

const TEST_DIR = path.join(__dirname, "..", "frontend", "src", "test");

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArg = args.find((a) => a.startsWith("--file="));
const targetFile = fileArg ? fileArg.split("=")[1] : null;

// Get files to process
function getFiles() {
    if (targetFile) {
        return [path.join(TEST_DIR, targetFile)];
    }

    return fs
        .readdirSync(TEST_DIR)
        .filter((f) => f.endsWith(".test.jsx"))
        .map((f) => path.join(TEST_DIR, f))
        .filter((f) => {
            const content = fs.readFileSync(f, "utf8");
            return content.includes(
                "import userEvent from '@testing-library/user-event'"
            );
        });
}

function convertFile(filePath) {
    const fileName = path.basename(filePath);
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;
    const changes = [];

    // Determine which helpers are needed
    const needsClick = /user\.click\(/.test(content);
    const needsType = /user\.type\(/.test(content);
    const needsSelect = /user\.selectOptions\(/.test(content);
    const needsClear = /user\.clear\(/.test(content);
    const needsUpload = /user\.upload\(/.test(content);

    const helpers = [];
    if (needsClick) helpers.push("clickWithAct");
    if (needsType) helpers.push("typeWithAct");
    if (needsSelect) helpers.push("selectWithAct");
    if (needsClear) helpers.push("clearWithAct");
    if (needsUpload) helpers.push("uploadWithAct");

    if (helpers.length === 0) {
        console.log(`  ${fileName}: No userEvent calls to convert`);
        return { fileName, changes: 0 };
    }

    // Add React import if missing
    if (!content.includes("import React from 'react'")) {
        content = "import React from 'react'\n" + content;
        changes.push("Added React import");
    }

    // Replace userEvent import with test-utils helpers
    const helperImport = `import { ${helpers.join(", ")} } from './test-utils'`;
    content = content.replace(
        /import userEvent from '@testing-library\/user-event'/,
        helperImport
    );
    changes.push(`Replaced userEvent import with: ${helpers.join(", ")}`);

    // Remove userEvent.setup() lines
    const setupCount = (
        content.match(/const user = userEvent\.setup\(\)\s*\n?/g) || []
    ).length;
    content = content.replace(/const user = userEvent\.setup\(\)\s*\n?/g, "");
    if (setupCount)
        changes.push(`Removed ${setupCount} userEvent.setup() calls`);

    // Convert user.click() -> clickWithAct()
    const clickCount = (content.match(/await user\.click\(/g) || []).length;
    content = content.replace(
        /await user\.click\(([^)]+)\)/g,
        "await clickWithAct($1)"
    );
    if (clickCount) changes.push(`Converted ${clickCount} click() calls`);

    // Convert user.type() -> typeWithAct()
    const typeCount = (content.match(/await user\.type\(/g) || []).length;
    content = content.replace(
        /await user\.type\(([^,]+),\s*([^)]+)\)/g,
        "await typeWithAct($1, $2)"
    );
    if (typeCount) changes.push(`Converted ${typeCount} type() calls`);

    // Convert user.selectOptions() -> selectWithAct()
    const selectCount = (content.match(/await user\.selectOptions\(/g) || [])
        .length;
    content = content.replace(
        /await user\.selectOptions\(([^,]+),\s*([^)]+)\)/g,
        "await selectWithAct($1, $2)"
    );
    if (selectCount)
        changes.push(`Converted ${selectCount} selectOptions() calls`);

    // Convert user.clear() -> clearWithAct()
    const clearCount = (content.match(/await user\.clear\(/g) || []).length;
    content = content.replace(
        /await user\.clear\(([^)]+)\)/g,
        "await clearWithAct($1)"
    );
    if (clearCount) changes.push(`Converted ${clearCount} clear() calls`);

    // Convert user.upload() -> uploadWithAct()
    const uploadCount = (content.match(/await user\.upload\(/g) || []).length;
    content = content.replace(
        /await user\.upload\(([^,]+),\s*([^)]+)\)/g,
        "await uploadWithAct($1, $2)"
    );
    if (uploadCount) changes.push(`Converted ${uploadCount} upload() calls`);

    // Write file if changed
    if (content !== originalContent) {
        console.log(`\n✅ ${fileName}:`);
        changes.forEach((c) => console.log(`   - ${c}`));

        if (!dryRun) {
            fs.writeFileSync(filePath, content, "utf8");
            console.log("   📝 File saved");
        } else {
            console.log("   [DRY RUN - not saved]");
        }
    }

    return { fileName, changes: changes.length };
}

// Main
console.log("🔄 Converting test files to use act() helpers\n");
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log(`Directory: ${TEST_DIR}\n`);

const files = getFiles();
console.log(`Found ${files.length} files with userEvent imports\n`);

let totalChanges = 0;
files.forEach((f) => {
    const result = convertFile(f);
    totalChanges += result.changes;
});

console.log("\n========================================");
console.log(`Total files: ${files.length}`);
console.log(`Total changes: ${totalChanges}`);
if (dryRun) console.log("[DRY RUN - No files modified]");
