Build.Models.Demo = class Demo {

    // create empty demo object based on type
    constructor(type) {
        if (type) {
            switch (type) {
                case Build.Enums.DemoType.DMO: return new DMO();
            }
        }  
    }

    // transforms demo object into byte array
    static Serialize (demo) {

        // this looks stupid but it makes it easier to use outside when bundled into lib format
        switch (demo.constructor.name) {
            case "DMO": return Build.Models.Demo.DMO.Serialize();
        }

    }

    // transforms byte array into demo object
    static Unserialize (bytes) {        
        return Build.Models.Demo.DMO.Unserialize(bytes);
    }

}