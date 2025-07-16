const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Storage = require("../models/Storage.js");
const Map = require("../models/Map.js");

suite("map", () => {

    const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]).filter(f => f === "blood");

    for (const game of games) {

        const json = require(`./games/${game}.json`);
        const storage = new Storage(fs.readFileSync(json.storage.path));

        test(`read-${game}-map`, () => {
            const bytes = storage.Files.filter(f => f.name === json.map.path)[0].bytes;
            const map = new Map(bytes);
            console.log(map.Version);
            assert.equal(map.Sectors.length, json.map["expected-sectors"]);
            assert.equal(map.Walls.length, json.map["expected-walls"]);
            assert.equal(map.Sprites.length, json.map["expected-sprites"]);
        });

        // test(`write-${game}-map`, () => {
        //     const buffer = Uint8Array.from(Array.from("test", c => c.charCodeAt(0)));
        //     storage.Files.push({
        //         name: "test.txt",
        //         bytes: buffer
        //     });
        //     const serialized = storage.Serialize();
        //     const unserialized = new Storage(serialized);
        //     assert.equal(unserialized.Files[unserialized.Files.length-1].name, "test.txt");
        //     assert.equal(unserialized.Files[unserialized.Files.length-1].size, buffer.length);
        //     assert.deepStrictEqual([...unserialized.Files[unserialized.Files.length-1].bytes], [...buffer]);
        // });

    }    

});