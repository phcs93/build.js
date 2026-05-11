const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Build = require("../build.js");

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const format = s => s.split("-").map(capitalize).join("");
const str = s => s.replace(/\x00/g, "")

const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]);

for (const game of games) {

    suite(game, () => {

        // get game test scenarios defintions
        const json = require(`./games/${game}.json`);
        
        // get storage file bytes
        const storageBytes = fs.readFileSync(json.storage instanceof Array ? json.storage[0].path : json.storage.path);

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
            test(scenario, (t) => {

                // a scenario might have multiple cases, so we try to iterate through them if scenario is an array
                const definitions = json[scenario] instanceof Array ? json[scenario] : [json[scenario]];

                for (const definition of definitions) {

                    console.log(`testing ${game} ${scenario}...`);

                    // each scenario is coveniently named after the model it is testing
                    const modelName = format(scenario);

                    // bytes of file to be tested
                    let bytes = null;
                    
                    if (definition.path.indexOf(":") !== -1) { 
                        // if path is from disk, get bytes from disk
                        bytes = fs.readFileSync(definition.path);
                    } else { 
                        // otherwise get bytes from storage instance
                        bytes = storage.Files.filter(f => str(f.name) === definition.path)[0].bytes;
                    }

                    // deserialize bytes into instance
                    const instance = scenario === "rts" ? new Build.Models.Storage.WAD.RTS(bytes) : new Build.Models[modelName](bytes);

                    // first check if instance can be serialized back to the same bytes (roundtrip equality)
                    const serialized = instance.Serialize();

                    if (scenario === "storage") {
                        t.test(definition.path.split("/").pop(), () => {
                            assert.ok(
                                Buffer.from(serialized).equals(Buffer.from(bytes)), 
                                serialized.length !== bytes.length ? 
                                `original length = ${bytes.length} | serialized length = ${serialized.length}` :
                                "lengths are equal but bytes are different"
                            );
                        });
                    } else {
                        assert.ok(
                            Buffer.from(serialized).equals(Buffer.from(bytes)), 
                            serialized.length !== bytes.length ? 
                            `original length = ${bytes.length} | serialized length = ${serialized.length}` :
                            "lengths are equal but bytes are different"
                        );
                    }

                    // now check if instance has expected properties
                    for (const key of Object.keys(definition)) {

                        if (key.startsWith("expected-")) {

                            const property = format(key.replace("expected-", ""));
                            const expected = definition[key];
                            let actual = null;

                            if (instance[property] instanceof Array && typeof expected === "number") {
                                actual = instance[property].length;
                            } else if (instance[property] instanceof Array && expected instanceof Array) {
                                if (instance[property][0] instanceof Object && expected[0] instanceof Object) {
                                    const keys = Object.keys(expected[0]);
                                    actual = instance[property].map(i => {
                                        const o = {};
                                        for (const k of keys) {
                                            if (typeof i[k] === "string") {
                                                o[k] = str(i[k]);
                                            } else {
                                                o[k] = i[k];
                                            }
                                        }
                                        return o;
                                    });
                                } else {
                                    actual = instance[property];
                                }                            
                            }

                            if (actual !== expected) {
                                
                            }

                            try {
                                assert.deepStrictEqual(actual, expected);
                            } catch (e) {
                                fs.writeFileSync(`./tests/actuall-${game}-${scenario}-${definition.path.split("/").pop()}.json`, JSON.stringify(instance.Files.map(f => ({ name: str(f.name), size: f.size })), null, "\t"));
                                throw e;
                            }

                        }

                    }

                }

            });

        }

    });

}