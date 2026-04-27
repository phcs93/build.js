Build.Models.Storage = class Storage {

    constructor (bytes) {
        switch (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) {
            case 0x536E654B: return new Build.Models.Storage.GRP(bytes); // KenS
            case 0x1A464652: return new Build.Models.Storage.RFF(bytes); // RFF\x1a
            case 0x04034B50: return new Build.Models.Storage.PK3(bytes); // PK\x03\x04
            case 0x00000001: return new Build.Models.Storage.SSI(bytes); // \x01\x00\x00\x00
            case 0x00000002: return new Build.Models.Storage.SSI(bytes); // \x02\x00\x00\x00
        }
    }

    AddFile (name, bytes) {
        throw new Error(`Method "${arguments.callee.name}()" not implemented.`);
    }
        
    Serialize () {
        throw new Error(`Method "${arguments.callee.name}()" not implemented.`);
    }

}