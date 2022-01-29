import axios from 'axios';

export const getNotifications = () => {
    return axios.get(`${process.env.REACT_APP_BASE_URL}/notification`);
}

export const getTweetById = (id:string) => {
    return axios.get(`${process.env.REACT_APP_BASE_URL_2}/tweet/${id}`);
}

export const postFeedback = (feedback:string) => {
    return axios.post(`${process.env.REACT_APP_BASE_URL}/feedback`, {
        feedback
    });
}
