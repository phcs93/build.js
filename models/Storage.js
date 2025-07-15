GRP = (() => { try { return require("./storage/GRP.js"); } catch {} } )() ?? GRP;
PK3 = (() => { try { return require("./storage/PK3.js"); } catch {} } )() ?? PK3;
RFF = (() => { try { return require("./storage/RFF.js"); } catch {} } )() ?? RFF;
SSI = (() => { try { return require("./storage/SSI.js"); } catch {} } )() ?? SSI;

// this class is just an abstraction that identifies the provided storage file and reads it accordingly
class Storage {

    constructor (bytes) {

        // grp
        if (String.fromCharCode(...bytes.slice(0, 12)) === "KenSilverman") {
            return new GRP(bytes);
        }
        
        // pk3
        if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
            return new PK3(bytes);
        }

        // rff
        if (String.fromCharCode(...bytes.slice(0, 3)) === "RFF") {
            return new RFF(bytes);
        }

        // ssi
        return new SSI(bytes);
        
    }

}

try { module.exports = Storage; } catch {}