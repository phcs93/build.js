ByteVersion = {
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
    HDUKE                 : 252,
    HDUKE_TDM             : 253,
    HDUKE_FORTS           : 254,
    PRODUKE               : 150,
    XDUKE_19_7_OR_HDUKE: (version) => {
        return [
            ByteVersion.XDUKE_19_7,
            ByteVersion.HDUKE_1,
            ByteVersion.HDUKE_2,
            ByteVersion.HDUKE_3,
            ByteVersion.HDUKE_4,
            ByteVersion.HDUKE_5,
            ByteVersion.HDUKE_6,
            ByteVersion.HDUKE,
            ByteVersion.HDUKE_TDM,
            ByteVersion.HDUKE_FORTS
        ].some(v => v == version);
    }
}