/**
 * Build.js by phcs93 (LARD)
 * 
 * This library is capable of manipulating Build Engine files like GRPs, Maps, Arts, Palettes, etc...
 * It is written in pure JavaScript and can be used both in Node.js and in the browser.
 * I made this library to be the basis for my modding tools and to make it easier for other people to create their own.
 */

/**
 * setting "Build" as a global variable makes it accesible anywhere without needing to "import" or "require" it
 * this is useful when bundling the code in a lib format since it will work both on nodejs and on the browser
 * while also making the code cleaner for me to read and easier for the consumer to use it
 */
globalThis.Build = {
    Enums: {},
    Models: {},
    Scripts: {}
};

// only run this code if we are in a nodejs environment
if (process && process.versions && process.versions.node) {

    // get file system module to read the files in the directory
    const fs = require("node:fs");

    // check the npm lifecycle event to see if we are building or testing the library
    switch (process.env.npm_lifecycle_event) {

        // generate build.js file
        case "build": {

            // array to store the contents of all files
            const library = [fs.readFileSync(__dirname + '/build.js', "utf-8")];

            // this function will recursively get the contents of all the files in the given directory and its subdirectories
            function recursiveRead(dir) {

                // load the files in the current folder
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (!fs.statSync(fullPath).isDirectory() && entry.endsWith('.js')) {
                        library.push(fs.readFileSync(fullPath, "utf-8"));
                    }
                }

                // load the files in the subfolders
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (fs.statSync(fullPath).isDirectory()) {
                        recursiveRead(fullPath);
                    }
                }

            }

            // load the scripts, enums and models into th library array
            recursiveRead(__dirname + '/scripts');
            recursiveRead(__dirname + '/enums');
            recursiveRead(__dirname + '/models');

            // create bin folder if it doesn't exist
            if (!fs.existsSync(__dirname + '/bin')) {
                fs.mkdirSync(__dirname + '/bin');
            }

            // create full js file library output
            fs.writeFileSync(__dirname + '/bin/build.js', library.join("\n\n"), "utf-8");

            break;

        }

        // run unit tests
        case "test": {

            // this function will recursively require all the files in the given directory and its subdirectories
            function recursiveRequire(dir) {

                // load the files in the current folder
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (!fs.statSync(fullPath).isDirectory() && entry.endsWith('.js')) {
                        require(fullPath);
                    }
                }

                // load the files in the subfolders
                for (const entry of fs.readdirSync(dir)) {
                    const fullPath = dir + '/' + entry;
                    if (fs.statSync(fullPath).isDirectory()) {
                        recursiveRequire(fullPath);
                    }
                }

            }

            // load the scripts, enums and models in the "build" folder
            recursiveRequire(__dirname + '/scripts');
            recursiveRequire(__dirname + '/enums');
            recursiveRequire(__dirname + '/models');

        }

        default: {
            module.exports = Build;
            break;
        }

    }

}