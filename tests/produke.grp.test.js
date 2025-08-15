const { suite, test } = require("node:test");
const fs = require("node:fs");
const Storage = require("../models/Storage.js");

suite("produke.grp", () => {

    const storage = new Storage(fs.readFileSync("C:/GIT/SergioLuisBerto/produke/bin/duke3d.grp"));

    const files = [
        { name: "LOOKUP.DAT", bytes: fs.readFileSync("C:/GIT/SergioLuisBerto/produke/LOOKUP.DAT") },
        { name: "TILES023.ART", bytes: fs.readFileSync("C:/GIT/SergioLuisBerto/produke/TILES023.ART") },
    ];

    test("generate produke.grp", async () => {
        storage.Files = files;
        const bytes = await storage.Serialize();
        fs.writeFileSync("C:/GIT/SergioLuisBerto/produke/produke.grp", bytes);
    });

});