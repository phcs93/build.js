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

// only run this code if we are in a nodejs environment, since the "require" function is not necessary in the browser
if (typeof process !== "undefined" && process.versions && process.versions.node) {

    // this function will recursively require all the files in the given directory and its subdirectories
    function recursiveRequire(dir) {

        // get file system module to read the files in the directory
        const fs = require("node:fs");

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

    // export the variable just in case someone requires it and stores in a variable
    module.exports = Build;

}