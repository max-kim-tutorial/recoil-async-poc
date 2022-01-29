import {selector} from "recoil";
import {getNotifications} from "./service";
import {Notification} from "./types";

// const notificationsQuery = atom({
//     key: 'notifications',
//     default: null
// })

export const notificationsQuery = selector<Notification[]>({
    key: 'notifications',
    get: async () => {
        const { data } = await getNotifications();
        return data.notifications;
    }
})
