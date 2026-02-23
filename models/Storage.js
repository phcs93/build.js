GRP = (() => { try { return require("./storage/GRP.js"); } catch {} } )() ?? GRP;
PK3 = (() => { try { return require("./storage/PK3.js"); } catch {} } )() ?? PK3;
RFF = (() => { try { return require("./storage/RFF.js"); } catch {} } )() ?? RFF;
SSI = (() => { try { return require("./storage/SSI.js"); } catch {} } )() ?? SSI;

// this class is just an abstraction that identifies the provided storage file and reads it accordingly
class Storage {

    /**
     * @param {Uint8Array} bytes - file bytes (preferred as Uint8Array)
     * @param {keyof typeof import('../enums/StorageType')} [type] - storage file type
     */
    constructor (bytes, type) {

        // if bytes and type provided, use type to determine storage format
        if (bytes && type) {
            switch (type) {
                case "GRP": return new GRP(bytes);
                case "PK3": return new PK3(bytes);
                case "RFF": return new RFF(bytes);
                case "SSI": return new SSI(bytes);
                default: throw new Error(`Unknown storage type: ${type}`);
            }
        }

        // if only bytes provided, try to identify storage format by file signature
        if (bytes && !type) {

            // grp / prg
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

        // if only type provided, create empty storage of that type
        if (!bytes && type) {
            switch (type) {
                case "GRP": return new GRP();
                case "PK3": return new PK3();
                case "RFF": return new RFF();
                case "SSI": return new SSI();
                default: throw new Error(`Unknown storage type: ${type}`);
            }
        }
        
    }

}

try { module.exports = Storage; } catch {}