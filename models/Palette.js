Build.Models.Palette = class Palette {

    // create empty palette object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.PaletteType.DAT: return new DAT();
            }
        }
    }

    // transforms palette object into byte array
    static Serialize (palette) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (palette.constructor.name) {
            case "DAT": return Build.Models.Palette.DAT.Serialize(palette);
        }

    }

    // transforms byte array into palette object
    static Unserialize (bytes) {        
        return Build.Models.Palette.DAT.Unserialize(bytes);
    }

}