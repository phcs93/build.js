Build.Models.Lookup = class Lookup {

    constructor (bytes) {
        if (!bytes) return;
        return new Build.Models.Lookup.DAT(bytes);
    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}