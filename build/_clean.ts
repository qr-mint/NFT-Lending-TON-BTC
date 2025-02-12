// scripts/clean.js
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '../build');

fs.readdir(buildDir, (err: any, files:any) => {
    if (err) {
        console.error(`Error reading directory: ${err}`);
        process.exit(1);
    }

    files.filter((file: any) => file.endsWith('.json') || file.endsWith('.fif')).forEach((file: any) => {
        const filePath = path.join(buildDir, file);
        fs.unlink(filePath, (err: any) => {
            if (err) {
                console.error(`Error deleting file ${filePath}: ${err}`);
            } else {
                console.log(`Deleted file: ${filePath}`);
            }
        });
    });
});