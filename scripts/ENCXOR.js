// this is a hybrid implementation of both algorithms used by blood files
// enc xor used in rff files: https://github.com/camoto-project/gamecompjs/blob/master/formats/enc-xor-blood.js
// dbcrypt used in blm (maps) files: https://github.com/clipmove/NotBlood/blob/master/source/blood/src/db.cpp#L203

Build.Scripts.ENCXOR = {

    Compute: (bytes, options = {}) => {

        const output = Uint8Array.from(bytes);

        let key = parseInt(options.key ?? options.seed ?? 0);

        const offset = parseInt(options.offset ?? 0);
        const shift  = parseInt(options.shift ?? 0);
        const limit  = options.limit === undefined ? 0 : parseInt(options.limit);

        const length = limit === 0 ? bytes.length : Math.min(limit, bytes.length);

        for (let i = 0; i < length; i++) {

            const value = (key + ((i + offset) >> shift)) & 0xFF;
            output[i] ^= value;

        }

        return output;

    }

}