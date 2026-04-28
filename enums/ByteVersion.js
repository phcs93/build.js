Build.Enums.ByteVersion = {

    // ==================================================
    // DUKE
    // ==================================================

    DOS_1_3               : 1,
    DOS_1_3_1_4_Plutonium : 27,
    DOS_1_4_Plutonium     : 116,
    DOS_1_3_1_5_Engine    : 28,
    DOS_1_5_Atomic        : 117,
    
    XDUKE_19_6_1_3        : 29,
    XDUKE_19_6_1_5_Atomic : 118,
    XDUKE_19_7            : 119,

    NDUKE_1               : 128,
    NDUKE_2               : 129,

    HDUKE_1               : 246,
    HDUKE_2               : 247,
    HDUKE_3               : 248,
    HDUKE_4               : 249,
    HDUKE_5               : 250,
    HDUKE_6               : 251,
    HDUKE_7               : 252,
    HDUKE_TDM             : 253,
    HDUKE_FORTS           : 254,

    PRODUKE_0_3           : 150,

    DOSDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.DOS_1_3,
            Build.Enums.ByteVersion.DOS_1_3_1_4_Plutonium,
            Build.Enums.ByteVersion.DOS_1_4_Plutonium,
            Build.Enums.ByteVersion.DOS_1_3_1_5_Engine,
            Build.Enums.ByteVersion.DOS_1_5_Atomic,
        ].some(v => v == version);
    },

    XDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.XDUKE_19_6_1_3,
            Build.Enums.ByteVersion.XDUKE_19_6_1_5_Atomic,
            Build.Enums.ByteVersion.XDUKE_19_7
        ].some(v => v == version);
    },

    HDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.HDUKE_1,
            Build.Enums.ByteVersion.HDUKE_2,
            Build.Enums.ByteVersion.HDUKE_3,
            Build.Enums.ByteVersion.HDUKE_4,
            Build.Enums.ByteVersion.HDUKE_5,
            Build.Enums.ByteVersion.HDUKE_6,
            Build.Enums.ByteVersion.HDUKE_7,
            Build.Enums.ByteVersion.HDUKE_TDM,
            Build.Enums.ByteVersion.HDUKE_FORTS
        ].some(v => v == version);
    },

    NDUKE: (version) => {
        return [
            Build.Enums.ByteVersion.NDUKE_1,
            Build.Enums.ByteVersion.NDUKE_2
        ].some(v => v == version);
    },

    PRODUKE: (version) => {
        return [
            Build.Enums.ByteVersion.PRODUKE_0_3,
        ].some(v => v == version);
    },

    DUKE: (version) => {
        return (
            Build.Enums.ByteVersion.DOSDUKE(version) ||
            Build.Enums.ByteVersion.XDUKE(version) ||
            Build.Enums.ByteVersion.HDUKE(version) ||
            Build.Enums.ByteVersion.NDUKE(version) ||
            Build.Enums.ByteVersion.PRODUKE(version)
        );
    },

    // ==================================================
    // REDNECK RAMPAGE
    // ==================================================

    REDNUKEM_RR_RA : 108,

    REDNUKEM: (version) => {
        return [
            Build.Enums.ByteVersion.REDNUKEM_RR_RA,
        ].some(v => v == version);
    },

    RR: (version) => {
        return (
            Build.Enums.ByteVersion.REDNUKEM(version)
        );
    },

    // ==================================================
    // SHADOW WARRIOR
    // ==================================================

    VOIDSW_2 : 101,

    VOIDSW: (version) => {
        return [
            Build.Enums.ByteVersion.VOIDSW_2,
        ].some(v => v == version);
    },

    SW: (version) => {
        return (
            Build.Enums.ByteVersion.VOIDSW(version)
        );
    },

    // ==================================================
    // BLOOD
    // ==================================================

    NOTBLOOD_1_9_9_9 : 277,

    NOTBLOOD: (version) => {
        return [
            Build.Enums.ByteVersion.NOTBLOOD_1_9_9_9,
        ].some(v => v == version);
    },

    BLOOD: (version) => {
        return (
            Build.Enums.ByteVersion.NOTBLOOD(version)
        );
    },

}