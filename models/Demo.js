Build.Models.Demo = class Demo {

    constructor (bytes) {

        if (!bytes) return;

        let byteVersion = bytes[4];

        // check for blood demo signature
        if (String.fromCharCode(...bytes.slice(0, 4)) === "DEM\u001A") {
            // blood demo byte version is an int16 not an int8
            byteVersion = (bytes[4] | bytes[5] << 8) << 16 >> 16;
        }

        switch (true) {
            case Build.Enums.ByteVersion.DUKE(byteVersion): return new Build.Models.Demo.DMO(bytes);
            case Build.Enums.ByteVersion.RR(byteVersion): return new Build.Models.Demo.DMO(bytes);
            case Build.Enums.ByteVersion.SW(byteVersion): return new Build.Models.Demo.SWD(bytes);            
            case Build.Enums.ByteVersion.BLOOD(byteVersion): return new Build.Models.Demo.BLD(bytes);
        }

    }

    Serialize () {
        throw new Error("Method not implemented.");
    }

}