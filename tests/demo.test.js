const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Storage = require("../models/Storage.js");
const Demo = require("../models/Demo.js");

suite("demo", () => {

    const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]).filter(f => f === "duke-nukem-3d");

    for (const game of games) {

        const json = require(`./games/${game}.json`);
        const storage = new Storage(fs.readFileSync(json.storage.path));
        const bytes = storage.Files.filter(f => f.name === json.demo.path)[0].bytes;
        const demo = new Demo(bytes);

        test(`read-${game}-demo`, () => {
            console.log(demo);
            assert.equal(demo.Tics, json.demo["expected-tics"]);
        });

        // test(`write-${game}-demo`, () => {
        //     map.Sprites.push(Object.assign({}, map.Sprites[map.Sprites.length-1]));
        //     const serialized = map.Serialize();
        //     const unserialized = new Map(serialized);
        //     assert.equal(unserialized.Sprites.length, map.Sprites.length);
        // });

    }    

});