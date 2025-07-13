const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const GRP = require("../models/GRP.js");
const RFF = require("../models/RFF.js");
const ZIP = require("../models/ZIP.js");

suite("grp-rff-zip", () => {

    const games = [
        {
            name: "duke-nukem-3d",
            type: "grp",
            path: "C:/Games/Duke Nukem 3D/ports/produke/duke3d.grp"
        },
        {
            name: "shadow-warrior",
            type: "grp",
            path: "C:/Games/Shadow Warrior/ports/voidsw/sw.grp"
        },
        {
            name: "redneck-rampage",
            type: "grp",
            path: "C:/Games/Redneck Rampage/ports/rr/redneck.grp"
        },
        // {
        //     name: "blood",
        //     type: "rff",
        //     path: "C:/Games/Blood/ports/notblood/blood.rff"
        // },
        {
            name: "ion-fury",
            type: "zip",
            path: "C:/Program Files (x86)/Steam/steamapps/common/Ion Fury/fury.grp" // zip
        }
    ];

    for (const game of games) {

        const json = require(`./jsons/${game.name}.json`);
        const bytes = fs.readFileSync(game.path);
        const grprffzip = (() => {
            switch (game.type) {
                case "grp": return new GRP(bytes);
                case "rff": return new RFF(bytes);
                case "zip": return new ZIP(bytes);
            }
        })();

        test(`read-${game.name}-${game.type.toUpperCase()}-file-count-names-and-sizes`, () => {
            const actuall = grprffzip.Files.map(f => ({name: f.name, size: f.size}));
            //fs.writeFileSync(`temp-${game.name}.json`, JSON.stringify(actuall, null, "\t"));
            assert.equal(grprffzip.Files.length, json[`expected-${game.type}-file-names-and-sizes`].length);
            assert.deepStrictEqual(actuall, json[`expected-${game.type}-file-names-and-sizes`]);
        });

        test(`write-${game.name}-${game.type.toUpperCase()}-file-count-names-and-sizes`, () => {
            const buffer = Array.from("test", c => c.charCodeAt(0));
            grprffzip.Files.push({
                name: "test.txt",
                size: buffer.length,
                bytes: buffer
            });            
            const serialized = grprffzip.Serialize();
            const unserialized = (() => {
                switch (game.type) {
                    case "grp": return new GRP(serialized);
                    case "rff": return new RFF(serialized);
                    case "zip": return new ZIP(serialized);
                }
            })();
            assert.equal(unserialized.Files[unserialized.Files.length-1].name, "test.txt");
            assert.equal(unserialized.Files[unserialized.Files.length-1].size, buffer.length);
            assert.deepStrictEqual([...unserialized.Files[unserialized.Files.length-1].bytes], [...buffer]);
        });

    }    

});