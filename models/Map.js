Build.Models.Map = class Map {

    constructor (bytes) {
        switch (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) {
            case 0x00000007: return new Build.Models.Map.MAP(bytes); // MAP
            case 0x00000008: return new Build.Models.Map.MAP(bytes); // MAP
            case 0x00000009: return new Build.Models.Map.MAP(bytes); // MAP
            case 0x1A4D4C42: return new Build.Models.Map.BLM(bytes); // BLM\x1a
        }
    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}