const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Build = require("../build.js");

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const str = s => s.replace(/\x00/g, "")

const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]);

for (const game of games) {

    suite(game, () => {

        // get game test scenarios defintions
        const json = require(`./games/${game}.json`);
        
        // get storage file bytes
        const storageBytes = fs.readFileSync(json.storage.path);

        // get game file storage instance
        const storage = new Build.Models.Storage(storageBytes);

        // loop through test scenario defintions
        for (const scenario of Object.keys(json)) {

            // if scenario is set as null -> flag as skipped test
            if (!json[scenario]) {
                test.skip(scenario);
                continue;
            }

            // if scenario is set as empty object -> flag as todo
            if (!Object.keys(json[scenario]).length) {
                test.todo(scenario);
                continue;
            }

            // create a unit test for each scenario defintion
            test(scenario, () => {

                // each scenario is coveniently named after the model it is testing
                const modelName = capitalize(scenario)

                // bytes of file to be tested
                let bytes = null;
                
                // if scenario is "storage"
                if (scenario === "storage") {
                    // we want to test the storage file itself 
                    bytes = storageBytes;
                } else if (json[scenario].path.indexOf(":") !== -1) { 
                    // if path is from disk, get bytes from disk
                    bytes = fs.readFileSync(json[scenario].path);
                } else { 
                    // otherwise get bytes from storage instance
                    bytes = storage.Files.filter(f => str(f.name) === json[scenario].path)[0].bytes;
                }

                // deserialize bytes into instance
                const instance = scenario === "storage" ? storage : new Build.Models[modelName](bytes);
                
                // first check if instance can be serialized back to the same bytes (roundtrip equality)
                const serialized = instance.Serialize();

                assert.ok(
                    Buffer.from(serialized).equals(Buffer.from(bytes)), 
                    serialized.length !== bytes.length ? 
                    `original length = ${bytes.length} | serialized length = ${serialized.length}` :
                    "lengths are equal but bytes are different"
                );

            });

        }

    });

}

// suite("palette", () => {

//     const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]);

//     for (const game of games) {

//         const json = require(`./games/${game}.json`);

//         if (!json.palette) {
//             test.skip(game);
//             continue;
//         }

//         test(game, () => {

//             // get game file storage instance
//             const storage = Build.Models.Storage.Unserialize(fs.readFileSync(json.storage.path));

//             // get bytes of file in storage path
//             const bytes = storage.Files.filter(f => f.name === json.palette.path)[0].bytes;

//             // deserialize bytes into instance
//             const instance = Build.Models.Palette.Unserialize(bytes);
            
//             // first check it can be serialized back to the same bytes
//             const serialized = Build.Models.Palette.Serialize(instance);
//             assert.ok(Buffer.from(serialized).equals(Buffer.from(bytes)));

//             // check if instance has expected properties
//             assert.equal(instance.Colors.length,  json.palette["expected-colors"]);
//             assert.equal(instance.Shades.length,  json.palette["expected-shades"]);
//             assert.equal(instance.Translucency.length,  json.palette["expected-translucency"]);

//             // modify instance
//             instance.Colors[0] = { r: 255, g: 0, b: 0 };
//             // serialize modified instance
//             const modifiedBytes = Build.Models.Palette.Serialize(instance);
//             // deserialize modified bytes into new instance
//             const modifiedInstance = Build.Models.Palette.Unserialize(modifiedBytes);
//             // check if modification is present
//             assert.deepEqual(modifiedInstance.Colors[0], instance.Colors[0]);

//         });        

//     }

// });