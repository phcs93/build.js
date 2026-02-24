const { suite, test } = require("node:test");
const fs = require("node:fs");
const Build = require("../build.js");

suite("storage", () => {

    const lookupBytes = fs.readFileSync("C:\\GIT\\SergioLuisBerto\\produke\\LOOKUP.DAT");
    const tiles23Bytes = fs.readFileSync("C:\\GIT\\SergioLuisBerto\\produke\\TILES023.ART");

    const originalGRPPath = "C:\\GIT\\SergioLuisBerto\\produke\\bin\\DUKE3D.GRP";

    test("generate produke.grp", () => {

        const produkeGRP = new Build.Models.Storage.GRP();

        produkeGRP.AddFile("LOOKUP.DAT", lookupBytes);
        produkeGRP.AddFile("TILES023.ART", tiles23Bytes);

        const produkeGRPBytes = Build.Models.Storage.GRP.Serialize(produkeGRP);

        fs.writeFileSync("C:\\GIT\\SergioLuisBerto\\produke\\produke.grp", produkeGRPBytes);
        
    });

});