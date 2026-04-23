Build.Models.Map = class Map {

    // create empty map object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.MapType.MAP: return new Build.Models.Map.MAP();
                case Build.Enums.MapType.BLM: return new Build.Models.Map.BLM();
            }
        }  
    }

    // transforms map object into byte array
    static Serialize (map) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (map.constructor.name) {
            case "MAP": return Build.Models.Map.MAP.Serialize(map);
            case "BLM": return Build.Models.Map.BLM.Serialize(map);
        }

    }

    // transforms byte array into map object
    static Unserialize (bytes) {

        // blood map
        if (String.fromCharCode(...bytes.slice(0, 4)) === "BLM\x1a") {
            return Build.Models.Map.BLM.Unserialize(bytes);
        }

        // common map
        return Build.Models.Map.MAP.Unserialize(bytes);

    }

}