ByteReader = (() => { try { return require("../../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

function RFF (bytes) {

    // serialize function
    this.Serialize = () => {

    };

}

try { module.exports = RFF; } catch {}