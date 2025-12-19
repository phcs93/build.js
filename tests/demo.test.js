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
            assert.equal(demo.Inputs.length, json.demo["expected-inputs"]);
        });

        test(`write-${game}-demo`, () => {
            demo.FriendlyFire = 0;
            const serialized = demo.Serialize();
            const unserialized = new Demo(serialized);
            assert.equal(unserialized.FriendlyFire, demo.FriendlyFire);
        });

    }    

});