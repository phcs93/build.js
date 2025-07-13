Picnum = {
    Effectors: {
        SectorEffector: 1,
        Activator: 2,
        Touchplate: 3,
        Locker: 4,
        MusicAndSfx: 5,
        Locator: 6,
        Cycler: 7,
        MasterSwitch: 8,
        Respawn: 9,
        Speed: 10
    },
    Spawn: 1405,
    Card: 60,
    Weapons: {
        Pistol: 21,
        Shotgun: 28,
        Chaingun: 22,
        RPG: 23,
        Pipebomb: 26,
        Shrinker: 25,
        Devastator: 29,
        Freezer: 24,
        Tripbomb: 27
    },
    Ammo: {
        Pistol: 40,
        Shotgun: 49,
        Chaingun: 41,
        RPG: 44,
        Pipebomb: 47,
        Shrinker: 46,
        Expander: 45,
        Devastator: 42,
        Freezer: 37
    },
    Inventory: {
        Medkit: 53,
        Armor: 54,
        Steroids: 55,
        Scuba: 56,
        JetPack: 57,
        NightVision: 59,
        Boots: 61,
        Holoduke: 1348
    },
    Health: {
        Small: 51,
        Medium: 52,
        Atomic: 100
    },
    NDuke: {
        Flag: 5120
    },
    ProDuke: {
        Flag: 5888
    },
    DamagingFloorTextures: {
        FloorSlime: 200,
        HurtRail: 859,
        FloorPlasma: 1082,
        PurpleLava: 4240
    },
    get Items () {
        return [
            Picnum.Spawn,
            Picnum.Card,
            ...Object.values(Picnum.Weapons),
            ...Object.values(Picnum.Ammo),
            ...Object.values(Picnum.Inventory),
            ...Object.values(Picnum.Health),
            Picnum.ProDuke.Flag,
            Picnum.NDuke.Flag
        ];
    }
}