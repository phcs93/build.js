Build.Models.Lookup = class Lookup {

    // create empty lookup object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.LookupType.DAT: return new DAT();
            }
        }
    }

    // transforms lookup object into byte array
    static Serialize (lookup) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (lookup.constructor.name) {
            case "DAT": return Build.Models.Lookup.DAT.Serialize(lookup);
        }

    }

    // transforms byte array into lookup object
    static Unserialize (bytes) {        
        return Build.Models.Lookup.DAT.Unserialize(bytes);
    }

}