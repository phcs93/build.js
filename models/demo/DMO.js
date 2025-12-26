ByteReader = (() => { try { return require("../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;
LZW = (() => { try { return require("../../scripts/LZW.js"); } catch {} } )() ?? LZW;
ByteVersion = (() => { try { require("../../enums/ByteVersion.js"); return ByteVersion; } catch {} } )() ?? ByteVersion;

// reference: https://web.archive.org/web/20150603141920/http://www.quakewiki.net/archives/demospecs/dmo/dmo.html
class DMO {

    static RECSYNCBUFSIZ = 2520;
    static InputSize = 10;

    constructor(bytes) {

        const reader = new ByteReader(bytes);

        this.Inputs = new Array(reader.uint32());
        this.Version = reader.uint8();
        if (ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version)) {
            this.GRPVersion = reader.read(4*4);
        }
        this.Volume = reader.uint8();
        this.Level = reader.uint8();
        this.Skill = reader.uint8();
        this.Mode = reader.uint8();
        this.FriendlyFire = reader.uint8();
        this.Players = reader.uint16();
        this.Monsters = reader.uint16();
        this.RespawnMonsters = reader.uint32();
        this.RespawnItems = reader.uint32();
        this.RespawnInventory = reader.uint32();
        this.BotAI = reader.uint32();
        this.Names = new Array(this.Players);
        for (let i = 0; i < 16; i++) {
            this.Names[i] = reader.string(32);
        }        
        this.Dummy = reader.int32();
        this.Map = reader.string(128);
        this.AimMode = new Array(this.Players);
        this.WeaponChoice = new Array(this.Players);
        for (let i = 0; i < this.Players; i++) {
            this.AimMode[i] = reader.int8();
            if (ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version)) {
                this.WeaponChoice[i] = new Array(12);
                for (let w = 0; w < 12; w++) {
                    this.WeaponChoice[i][w] = reader.uint32();
                }
            }
        }

        let i = 0;

        while (i < this.Inputs.length) {

            const size = Math.min(this.Inputs.length - i, DMO.RECSYNCBUFSIZ);
            const _reader = new ByteReader(reader.kdfread(DMO.InputSize * this.Players, size / this.Players));
            
            for (let _i = 0; _i < size; _i++) {
                this.Inputs[i++] = {
                    avel: _reader.int8(),
                    horz: _reader.int8(),
                    fvel: _reader.int16(),
                    svel: _reader.int16(),
                    bits: _reader.uint32()
                };

            }

        }

    }

    Serialize () {

        const headerSize =
            4 +                     // Inputs count (uint32)
            1 +                     // Version
            (ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version) ? 16 : 0) + // GRPVersion bruto
            1 + 1 + 1 + 1 + 1 +     // Volume, Level, Skill, Mode, FriendlyFire
            2 + 2 +                 // Players, Monsters
            4 + 4 + 4 + 4 +         // RespawnMonsters, RespawnItems, RespawnInventory, BotAI
            16 * 32 +               // Names[16] (cada 32 bytes)
            4 +                     // Dummy
            128 +                   // Map (128 bytes)
            this.Players +               // AimMode[Players] (int8)
            (ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version) ? this.Players * 12 * 4 : 0); // WeaponChoice

        const writer = new ByteWriter(
            headerSize + 
            (this.Inputs.length * DMO.InputSize) +
            (Math.ceil((this.Inputs.length * DMO.InputSize) / LZW.size) *  (4096 + 2))
        );

        // ----- Cabeçalho -----

        // número de inputs
        writer.int32(this.Inputs.length);

        // versão
        writer.int8(this.Version | 0);

        // GRPVersion (bruto) só se Version == 119 (XDUKE_19_7)
        if (ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version)) {
            let grp = this.GRPVersion;
            if (!(grp instanceof Uint8Array)) {
                grp = grp ? Uint8Array.from(grp) : new Uint8Array(16);
            }
            if (grp.length !== 16) {
                grp = grp.slice(0, 16);
            }
            writer.write(grp);
        }

        // campos simples
        writer.int8(this.Volume | 0);
        writer.int8(this.Level | 0);
        writer.int8(this.Skill | 0);
        writer.int8(this.Mode | 0);
        writer.int8(this.FriendlyFire | 0);

        writer.int16(this.Players & 0xFFFF);
        writer.int16(this.Monsters & 0xFFFF);

        writer.int32(this.RespawnMonsters >>> 0);
        writer.int32(this.RespawnItems >>> 0);
        writer.int32(this.RespawnInventory >>> 0);
        writer.int32(this.BotAI >>> 0);

        // 16 nomes de 32 bytes cada (sempre 16, igual ao constructor)
        for (let i = 0; i < 16; i++) {
            const name = (this.Names && this.Names[i]) ? this.Names[i] : "";
            writer.string(name, 32);
        }

        // Dummy
        writer.int32((this.Dummy | 0));

        // Map (128 bytes, padded com '\0')
        writer.string(this.Map || "", 128);

        // AimMode[Players]
        for (let i = 0; i < this.Players; i++) {
            const v = (this.AimMode && this.AimMode[i] != null) ? this.AimMode[i] : 0;
            writer.int8(v | 0);
        }

        // WeaponChoice[Players][12] se Version == 119
        if (ByteVersion.XDUKE_19_7_OR_HDUKE(this.Version)) {
            for (let i = 0; i < this.Players; i++) {
                const wcRow = (this.WeaponChoice && this.WeaponChoice[i]) || [];
                for (let w = 0; w < 12; w++) {
                    const val = wcRow[w] != null ? wcRow[w] : 0;
                    writer.int32(val >>> 0);
                }
            }
        }

        // ----- Inputs comprimidos (dfwrite inverso do kdfread) -----

        if (this.Inputs.length > 0 && this.Players > 0) {

            let i = 0;

            while (i < this.Inputs.length) {

                const size = Math.min(this.Inputs.length - i, DMO.RECSYNCBUFSIZ);

                // buffer descomprimido para este bloco: size * 10 bytes
                const buf = new Uint8Array(size * 10);
                let off = 0;

                for (let _i = 0; _i < size; _i++) {
                    const input = this.Inputs[i + _i] || {};

                    const avel = (input.avel | 0);
                    const horz = (input.horz | 0);
                    const fvel = (input.fvel | 0);
                    const svel = (input.svel | 0);
                    const bits = (input.bits >>> 0);

                    // int8 avel
                    buf[off++] = avel & 0xFF;
                    // int8 horz
                    buf[off++] = horz & 0xFF;

                    // int16 fvel (little-endian)
                    buf[off++] = fvel & 0xFF;
                    buf[off++] = (fvel >> 8) & 0xFF;

                    // int16 svel (little-endian)
                    buf[off++] = svel & 0xFF;
                    buf[off++] = (svel >> 8) & 0xFF;

                    // uint32 bits (little-endian)
                    buf[off++] = bits & 0xFF;
                    buf[off++] = (bits >> 8) & 0xFF;
                    buf[off++] = (bits >> 16) & 0xFF;
                    buf[off++] = (bits >> 24) & 0xFF;
                }

                // Mesmos parâmetros do kdfread no constructor:
                //   kdfread(10 * this.Players, size / this.Players)
                writer.dfwrite(buf, 10 * this.Players, size / this.Players);

                i += size;
            }
        }

        // Retorna apenas a parte usada do buffer
        return writer.bytes.subarray(0, writer.index);

    }

}

try { module.exports = DMO; } catch {}