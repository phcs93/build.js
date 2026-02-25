const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Build = require("../build.js");

suite("storage", () => {

    const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]);

    for (const game of games) {

        const json = require(`./games/${game}.json`);
        const storage = Build.Models.Storage.Unserialize(fs.readFileSync(json.storage.path));

        test(`read-${game}-storage (${storage.constructor.name})`, () => {
            const actuall = storage.Files.map(f => ({name: f.name, size: f.size}));
            //console.log(actuall);
            //fs.writeFileSync(`temp-${game}.json`, JSON.stringify(actuall, null, "\t"));
            assert.equal(storage.Files.length, json.storage["expected-files"].length);
            assert.deepStrictEqual(actuall, json.storage["expected-files"]);
        });

        test(`write-${game}-storage (${storage.constructor.name})`, () => {
            const buffer = Uint8Array.from(Array.from("test", c => c.charCodeAt(0)));
            storage.AddFile("test.txt", buffer);
            // Ion Fury PK3 has some giant files (tiles000.art 117191963 and tiles001.art 136378146)
            // this causes ZLIB compression to be very slow
            // so I removed those files from the test and just check if the new file is correctly added and serialized
            if (game === "ion-fury") {
                storage.Files = storage.Files.filter(f => f.name !== "tiles000.art" && f.name !== "tiles001.art");
            }
            const serialized = Build.Models.Storage.Serialize(storage);
            const unserialized = Build.Models.Storage.Unserialize(serialized);
            assert.equal(unserialized.Files[unserialized.Files.length-1].name, "test.txt");
            assert.equal(unserialized.Files[unserialized.Files.length-1].size, buffer.length);
            assert.deepStrictEqual([...unserialized.Files[unserialized.Files.length-1].bytes], [...buffer]);
        });

    }    

});