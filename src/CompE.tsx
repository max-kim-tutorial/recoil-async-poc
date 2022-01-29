import React from 'react';
import {useQuery} from "react-query";
import {Notification} from "./atoms/types";
import {getNotifications} from "./atoms/service";
import {AxiosError} from "axios";

function CompE() {
    const { data:notifications, refetch, isFetching } = useQuery<Notification[], AxiosError>({
        queryKey: 'notifications',
        queryFn: async() => {
            const {data} = await getNotifications();
            return data.notifications
        },
        suspense: true,
        staleTime: Infinity,
        cacheTime: Infinity,
    })

    return (
        <>
            {isFetching ? (<h1>컴넌 E 로딩</h1>) : (
                <>
                    <h1>컴포넌트 E</h1>
                    <button onClick={() => {refetch()}}>React Query 리패치</button>
                    <div>{(notifications as Notification[])[4].title}</div>
                </>
            )}
        </>
    )
}

export default CompE
