const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Build = require("../build.js");

suite("map", () => {

    const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]);

    for (const game of games) {

        const json = require(`./games/${game}.json`);
        const storage = Build.Models.Storage.Unserialize(fs.readFileSync(json.storage.path));
        const bytes = storage.Files.filter(f => f.name === json.map.path)[0].bytes;
        const map = Build.Models.Map.Unserialize(bytes);

        test(`read-${game}-map`, () => {
            assert.equal(map.Sectors.length, json.map["expected-sectors"]);
            assert.equal(map.Walls.length, json.map["expected-walls"]);
            assert.equal(map.Sprites.length, json.map["expected-sprites"]);
        });

        test(`write-${game}-map`, () => {
            map.Sprites.push(Object.assign({}, map.Sprites[map.Sprites.length-1]));
            const serialized = Build.Models.Map.Serialize(map);
            const unserialized = Build.Models.Map.Unserialize(serialized);
            assert.equal(unserialized.Sprites.length, map.Sprites.length);
        });

    }    

});