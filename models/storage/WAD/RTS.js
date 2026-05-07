// reference: https://moddingwiki.shikadi.net/wiki/RTS_Format
Build.Models.Storage.WAD.RTS = class RTS extends Build.Models.Storage.WAD {

    // since RTS are just WAD files, we reuse all WAD logic
    constructor (input) {

        super([]);

        // check if input is a WAD instance
        if (input instanceof Build.Models.Storage.WAD) {
            // just copy properties from WAD instance
            Object.keys(input).forEach(key => this[key] = input[key]);
        } else if (input instanceof Uint8Array) {
            // if input is bytes, parse it as a WAD and then convert to RTS
            return new Build.Models.Storage.WAD(input);
        } else {
            return new Build.Models.Storage.WAD();
        }

    }

    Serialize () {
        return super.Serialize();
    }

}