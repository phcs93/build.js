DMO = (() => { try { return require("./demo/DMO.js"); } catch {} } )() ?? DMO;
PRO = (() => { try { return require("./demo/PRO.js"); } catch {} } )() ?? PRO;

// this class is just an abstraction that identifies the provided map file and reads it accordingly
class Demo {

    constructor(bytes) {

        // dmo
        return new DMO(bytes);

    }

}

try { module.exports = Demo; } catch {}