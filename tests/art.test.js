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

        test(`write-${game}-art`, () => {
            let index = 0;
            for (let i = 0; i < art.Tiles.length; i++) {
                // change the first tile to be a random 3x9 rectangle
                if (art.Tiles[i].pixels.length > 0 && art.Tiles[i].pixels[0].length > 0) {
                    art.Tiles[i].pixels = [
                        [0, 4, 0, 1, 0, 0, 3, 0, 0],
                        [0, 0, 5, 2, 2, 2, 0, 9, 4],
                        [7, 0, 0, 8, 0, 5, 0, 0, 9]
                    ];
                    index = i;
                    break;
                }
            }
            const serialized = Build.Models.Art.Serialize(art);
            const unserialized = Build.Models.Art.Unserialize(serialized);
            assert.deepStrictEqual(unserialized.Tiles[index].pixels, [
                [0, 4, 0, 1, 0, 0, 3, 0, 0],
                [0, 0, 5, 2, 2, 2, 0, 9, 4],
                [7, 0, 0, 8, 0, 5, 0, 0, 9]
            ]);
        });

    }    

});