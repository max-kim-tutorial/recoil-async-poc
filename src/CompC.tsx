import React from 'react';
import {useRecoilValue} from "recoil";
import {notificationsQuery} from "./atoms";

function CompC() {
    const notifications = useRecoilValue(notificationsQuery);

    return (
        <>
            <h1>컴포넌트 C</h1>
            <div>{notifications[2].title}</div>
        </>
    )
}

export default CompC
