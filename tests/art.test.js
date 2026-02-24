const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Build = require("../build.js");

suite("art", () => {

    const games = fs.readdirSync("./tests/games").map(f => f.split(".")[0]);

    for (const game of games) {

        const json = require(`./games/${game}.json`);
        let storage = Build.Models.Storage.Unserialize(fs.readFileSync(json.storage.path));
        if (json.art["sub-storage"]) {
            storage = Build.Models.Storage.Unserialize(storage.Files.filter(f => f.name === json.art["sub-storage"])[0].bytes);
        }
        const bytes = json.art.path[1] !== ":" ? storage.Files.filter(f => f.name === json.art.path)[0].bytes : fs.readFileSync(json.art.path);
        const art = Build.Models.Art.Unserialize(bytes);

        test(`read-${game}-art`, () => {            
            assert.equal(art.Tiles.length, json.art["expected-tiles"]);
        });

        // test(`write-${game}-art`, () => {
        //     map.Sprites.push(Object.assign({}, map.Sprites[map.Sprites.length-1]));
        //     const serialized = map.Serialize();
        //     const unserialized = new Map(serialized);
        //     assert.equal(unserialized.Sprites.length, map.Sprites.length);
        // });

    }    

});