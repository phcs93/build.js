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
            case "VSW": return Build.Models.Demo.VSW.Serialize(demo);
        }

    }

    // transforms byte array into demo object
    static Unserialize (bytes) {        
        const byteVersion = bytes[4];
        if (Object.values(Build.Enums.ByteVersion).includes(byteVersion)) {
            return Build.Models.Demo.DMO.Unserialize(bytes);
        } else {
            return Build.Models.Demo.VSW.Unserialize(bytes);
        }
    }

}