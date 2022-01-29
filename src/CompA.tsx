import React from 'react';
import {useRecoilRefresher_UNSTABLE, useRecoilValue} from "recoil";
import {notificationsQuery} from "./atoms";

function CompA() {
    const notifications = useRecoilValue(notificationsQuery);
    const refresh = useRecoilRefresher_UNSTABLE(notificationsQuery);

    return (
        <>
            <button onClick={() => {refresh()}}>공지사항 쿼리 몽땅 리프레시</button>
            <h1>컴포넌트 A</h1>
            <div>{notifications[0].title}</div>
        </>
    )
}

export default CompA
