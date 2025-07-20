DNM = (() => { try { return require("./map/DNM.js"); } catch {} } )() ?? DNM;
BLM = (() => { try { return require("./map/BLM.js"); } catch {} } )() ?? BLM;

// this class is just an abstraction that identifies the provided map file and reads it accordingly
class Map {

    constructor(bytes) {

        // blm
        if (String.fromCharCode(...bytes.slice(0, 4)) === "BLM\x1a") {
            return new BLM(bytes);
        }

        // dnm
        return new DNM(bytes);

    }

}

try { module.exports = Map; } catch {}