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
        if (String.fromCharCode(...bytes.slice(0, 4)) === "PK\x03\x04") {
            return new PK3(bytes);
        }

        // rff
        if (String.fromCharCode(...bytes.slice(0, 4)) === "RFF\x1a") {
            return new RFF(bytes);
        }

        // ssi
        if (((bytes[0] << 0) | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) === 2) {
            return new SSI(bytes);
        }
        
    }

}

try { module.exports = Storage; } catch {}