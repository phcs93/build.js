Build.Models.Demo = class Demo {

    // create empty demo object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.DemoType.DMO: return new Build.Models.Demo.DMO();
                case Build.Enums.DemoType.SWD: return new Build.Models.Demo.SWD();
            }
        }  
    }

    // transforms demo object into byte array
    static Serialize (demo) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (demo.constructor.name) {
            case "DMO": return Build.Models.Demo.DMO.Serialize(demo);
            case "SWD": return Build.Models.Demo.SWD.Serialize(demo);
        }

    }

    // transforms byte array into demo object
    static Unserialize (bytes) {     

        const byteVersion = bytes[4];

        switch (true) {
            case Build.Enums.ByteVersion.DUKE(byteVersion): return Build.Models.Demo.DMO.Unserialize(bytes);
            case Build.Enums.ByteVersion.SW(byteVersion): return Build.Models.Demo.SWD.Unserialize(bytes);
            case Build.Enums.ByteVersion.RR(byteVersion): return Build.Models.Demo.DMO.Unserialize(bytes);
            //case Build.Enums.ByteVersion.BLOOD(byteVersion): return Build.Models.Demo.DMO.Unserialize(bytes);
        }
        
    }

}