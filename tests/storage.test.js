const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const Storage = require("../models/Storage.js");

suite("storage", () => {

    const games = [
        {
            name: "blood",
            path: "C:/Games/Build Engine Games/Blood/ports/notblood/blood.rff"
        },
        {
            name: "duke-nukem-3d",
            path: "C:/Games/Build Engine Games/Duke Nukem 3D/ports/produke/duke3d.grp"
        },        
        {
            name: "duke-nukem-3d-vacation",
            path: "C:/Games/Build Engine Games/.stuff/files/DUKE3D_ADDONS_SSI_FILE_ORIGINAL_RELEASES/VACA15.SSI"
        },
        {
            name: "ion-fury",
            path: "C:/Program Files (x86)/Steam/steamapps/common/Ion Fury/fury.grp" // ion fury uses a pk3, calls it a grp but it is actually a zip file
        },
        {
            name: "redneck-rampage",
            path: "C:/Games/Build Engine Games/Redneck Rampage/ports/rr/redneck.grp"
        },
        {
            name: "shadow-warrior",
            path: "C:/Games/Build Engine Games/Shadow Warrior/ports/voidsw/sw.grp"
        }
    ];

    for (const game of games) {

        console.log(`initializing ${game.name}...`);

        const json = require(`./jsons/${game.name}.json`);
        const bytes = fs.readFileSync(game.path);
        const storage = new Storage(bytes);

        test(`read-${game.name}-storage-file-count-names-and-sizes`, args => {
            console.log(`${args.name}...`);
            const actuall = storage.Files.map(f => ({name: f.name, size: f.size}));
            //fs.writeFileSync(`temp-${game.name}.json`, JSON.stringify(actuall, null, "\t"));
            assert.equal(storage.Files.length, json[`expected-storage-file-names-and-sizes`].length);
            assert.deepStrictEqual(actuall, json[`expected-storage-file-names-and-sizes`]);
        });

        test(`write-${game.name}-storage-file-count-names-and-sizes`, args => {
            console.log(`${args.name}...`);
            const buffer = Uint8Array.from(Array.from("test", c => c.charCodeAt(0)));
            storage.Files.push({
                name: "test.txt",
                bytes: buffer
            });
            const serialized = storage.Serialize();
            const unserialized = new Storage(serialized);
            assert.equal(unserialized.Files[unserialized.Files.length-1].name, "test.txt");
            assert.equal(unserialized.Files[unserialized.Files.length-1].size, buffer.length);
            assert.deepStrictEqual([...unserialized.Files[unserialized.Files.length-1].bytes], [...buffer]);
        });

    }    

});