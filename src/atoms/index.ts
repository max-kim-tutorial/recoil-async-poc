import {selector, selectorFamily} from "recoil";
import {getNotifications, getTweetById} from "./service";
import {Notification, Tweet} from "./types";

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

export const tweetQuery = selectorFamily<Tweet, string>({
    key: 'tweet',
    get: tweetId => async () => {
        const { data } = await getTweetById(tweetId);
        return data.tweet;
    }
})
