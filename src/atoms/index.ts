import {selector, selectorFamily, atom} from "recoil";
import {getNotifications, getTweetById, postFeedback} from "./service";
import {Notification, Tweet} from "./types";

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


export const feedbackBody = atom({
    key: 'feedbackBody',
    default: {content: ''},
})

export const postFeedbackQuery = selector({
    key: 'feedbackQuery',
    get: async ({get}) => {
        const feedback = get(feedbackBody);
        if (feedback.content !== '') {
            await postFeedback(feedback.content);
        }
        return
    }
})

export const postFeedbackQueryFamily = selectorFamily({
    key: 'feedbackQuery2',
    get: (feedback:{content:string}) => async() => {
        if (feedback.content !== '') {
            await postFeedback(feedback.content);
        }
        return
    }
})
