Build.Models.Demo = class Demo {

    // create empty demo object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.DemoType.DMO: return new Build.Models.Demo.DMO();
                case Build.Enums.DemoType.SWD: return new Build.Models.Demo.SWD();
                case Build.Enums.DemoType.BLD: return new Build.Models.Demo.BLD();
            }
        }  
    }

    // transforms demo object into byte array
    static Serialize (demo) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (demo.constructor.name) {
            case "DMO": return Build.Models.Demo.DMO.Serialize(demo);
            case "SWD": return Build.Models.Demo.SWD.Serialize(demo);
            case "BLD": return Build.Models.Demo.BLD.Serialize(demo);
        }

    }

    // transforms byte array into demo object
    static Unserialize (bytes) {     

        let byteVersion = bytes[4];

        // check for blood demo signature
        if (String.fromCharCode(...bytes.slice(0, 4)) === "DEM\u001A") {
            // blood demo byte version is an int16 not an int8
            byteVersion = (bytes[4] | bytes[5] << 8) << 16 >> 16;
        }

        switch (true) {
            case Build.Enums.ByteVersion.DUKE(byteVersion): return Build.Models.Demo.DMO.Unserialize(bytes);
            case Build.Enums.ByteVersion.SW(byteVersion): return Build.Models.Demo.SWD.Unserialize(bytes);
            case Build.Enums.ByteVersion.RR(byteVersion): return Build.Models.Demo.DMO.Unserialize(bytes);
            case Build.Enums.ByteVersion.BLOOD(byteVersion): return Build.Models.Demo.BLD.Unserialize(bytes);
        }
        
    }

}