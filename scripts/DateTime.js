Build.Scripts.DateTime = {

    DecodeDosDateTime (date, time) {
        const day = date & 0x1F;
        const month = (date >> 5) & 0x0F;
        const year = ((date >> 9) & 0x7F) + 1980;
        const second = (time & 0x1F) * 2;
        const minute = (time >> 5) & 0x3F;
        const hour = (time >> 11) & 0x1F;
        return new Date(year, month - 1, day, hour, minute, second);
    },

    EncodeDosDateTime (datetime) {
        const year = datetime.getFullYear();
        const month = datetime.getMonth() + 1;
        const day = datetime.getDate();
        const hours = datetime.getHours();
        const minutes = datetime.getMinutes();
        const seconds = Math.floor(datetime.getSeconds() / 2);
        const date = ((year - 1980) << 9) | (month << 5) | day;
        const time = (hours << 11) | (minutes << 5) | seconds;
        return { date, time };
    },

    ToUnixDateTime (date) {
        return date.valueOf() / 1000 - new Date().getTimezoneOffset() * 60;
    }

}