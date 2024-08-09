const https = require('https');
const fs = require('fs');
const path = require('path');

// Function to download a file
function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        console.log("Downloading:",dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err.message));
        });
    });
}

// Function to fetch the torch URL
function fetchTorchUrl() {
    return new Promise((resolve, reject) => {
        https.get('https://www.chess.com/analysis?tab=analysis', (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                const torchUrlMatch = data.match(/([^']*torch-2[^']*)/);
                if (torchUrlMatch) {
                    resolve(`https://www.chess.com${torchUrlMatch[0]}`);
                } else {
                    reject('Torch URL not found.');
                }
            });
        }).on('error', (err) => {
            reject(err.message);
        });
    });
}

// Function to fetch the number of parts
function fetchPartsCount(fileName) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf8', (err, data) => {
            if (err) {
                reject(err.message);
                return;
            }
            const partsMatch = data.match(/enginePartsCount\s*=\s*(\d+)/);
            if (partsMatch) {
                // Skip the first 3 lines
                data = data.split('\n').slice(3).join('\n');
                
                // Save the modified content back to the file
                fs.writeFile(fileName, data, 'utf8', (err) => {
                    if (err) {
                        reject(err.message);
                        return;
                    }
                    resolve(parseInt(partsMatch[1]) - 1);
                });
            } else {
                reject('Parts count not found.');
            }
        });
    });
}

// Function to combine parts into a single file
function combineParts(parts, outputFileName) {
    const writeStream = fs.createWriteStream(outputFileName);
    parts.forEach((partFileName) => {
        const data = fs.readFileSync(partFileName);
        writeStream.write(data);
    });
    writeStream.end();
}

// Function to delete part files
function deleteParts(parts) {
    parts.forEach((partFileName) => {
        fs.unlinkSync(partFileName);
    });
}

// Main logic
(async () => {
    try {
        const torchUrl = await fetchTorchUrl();
        const fileName = path.basename(torchUrl);

        // Download the torch file
        await download(torchUrl, "torch-2.js");

        // Fetch the number of parts
        const parts = await fetchPartsCount("torch-2.js");

        // Download each part in parallel
        const downloadPromises = [];
        const partFileNames = [];
        for (let i = 0; i <= parts; i++) {
            const partUrl = `${torchUrl.slice(0, -3)}-part-${i}.wasm`;
            const partFileName = path.basename(partUrl);
            partFileNames.push(partFileName);
            downloadPromises.push(download(partUrl, partFileName));
        }

        // Wait for all downloads to complete
        await Promise.all(downloadPromises);
        console.log('All parts downloaded successfully.');

        // Combine parts into a single file
        combineParts(partFileNames, 'torch-2.wasm');
        console.log('Parts combined into torch-2.wasm successfully.');
        deleteParts(partFileNames);
        console.log('Part files deleted successfully.');
        
    } catch (err) {
        console.error(`Error: ${err}`);
    }
})();
