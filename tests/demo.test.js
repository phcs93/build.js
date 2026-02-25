const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Build = require("../build.js");

suite("demo", () => {

    const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]).filter(f => f === "duke-nukem-3d");

    for (const game of games) {

        const json = require(`./games/${game}.json`);
        const storage = Build.Models.Storage.Unserialize(fs.readFileSync(json.storage.path));
        const bytes = storage.Files.filter(f => f.name === json.demo.path)[0].bytes;
        const demo = Build.Models.Demo.Unserialize(bytes);

        test(`read-${game}-demo`, () => {
            assert.equal(demo.Inputs.length, json.demo["expected-inputs"]);
        });

        test(`write-${game}-demo`, () => {
            demo.FriendlyFire = 0;
            const serialized = Build.Models.Demo.Serialize(demo);
            const unserialized = Build.Models.Demo.Unserialize(serialized);
            assert.equal(unserialized.FriendlyFire, demo.FriendlyFire);
        });

    }

});