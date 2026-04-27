Build.Models.Palette = class Palette {

    constructor (bytes) {
        if (!bytes) return;
        return new Build.Models.Palette.DAT(bytes);
    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}