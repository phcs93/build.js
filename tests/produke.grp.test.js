const { suite, test } = require("node:test");
const fs = require("node:fs");
const Storage = require("../models/Storage.js");

suite("storage", () => {

    const lookupBytes = fs.readFileSync("C:\\GIT\\SergioLuisBerto\\produke\\LOOKUP.DAT");
    const tiles23Bytes = fs.readFileSync("C:\\GIT\\SergioLuisBerto\\produke\\TILES023.ART");

    const originalGRPPath = "C:\\GIT\\SergioLuisBerto\\produke\\bin\\DUKE3D.GRP";

    test("generate produke.grp", async () => {

        const produkeGRP = new Storage(fs.readFileSync(originalGRPPath));

        // replace original files with produke files
        produkeGRP.Files = [
            {
                name: "LOOKUP.DAT",
                bytes: lookupBytes
            },
            {
                name: "TILES023.ART",
                bytes: tiles23Bytes
            }
        ];

        const produkeGRPBytes = await produkeGRP.Serialize();

        fs.writeFileSync("C:\\GIT\\SergioLuisBerto\\produke\\produke.grp", produkeGRPBytes);
        
    });

});