Build.Models.Storage = class Storage {

    // create empty storage object based on type
    constructor (type) {
        if (type) {
            switch (type) {
                case Build.Enums.StorageType.GRP: return new GRP();
                case Build.Enums.StorageType.PK3: return new PK3();
                case Build.Enums.StorageType.RFF: return new RFF();
                case Build.Enums.StorageType.SSI: return new SSI();
            }
        }        
    }

    // add file to storage (this is the same for all storage types)
    AddFile (name, bytes) {
        this.Files.push({
            name: name,
            size: bytes.length,
            bytes: bytes
        });
    }
       
    // transforms storage object into byte array
    static Serialize (storage) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (storage.constructor.name) {
            case "GRP": return Build.Models.Storage.GRP.Serialize(storage);
            case "PK3": return Build.Models.Storage.PK3.Serialize(storage);
            case "RFF": return Build.Models.Storage.RFF.Serialize(storage);
            case "SSI": return Build.Models.Storage.SSI.Serialize(storage);
        }

    }

    // transforms byte array into storage object
    static Unserialize (bytes) {

        // grp / prg
        if (String.fromCharCode(...bytes.slice(0, 12)) === "KenSilverman") {
            return Build.Models.Storage.GRP.Unserialize(bytes);
        }
        
        // pk3
        if (String.fromCharCode(...bytes.slice(0, 4)) === "PK\x03\x04") {
            return Build.Models.Storage.PK3.Unserialize(bytes);
        }

        // rff
        if (String.fromCharCode(...bytes.slice(0, 4)) === "RFF\x1a") {
            return Build.Models.Storage.RFF.Unserialize(bytes);
        }

        // ssi
        if (((bytes[0] << 0) | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) === 2) {
            return Build.Models.Storage.SSI.Unserialize(bytes);
        }

    }

}