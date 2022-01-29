import React from 'react';
import {useRecoilValue} from "recoil";
import {notificationsQuery} from "./atoms";

function CompB() {
    const notifications = useRecoilValue(notificationsQuery);

    return (
        <>
            <h1>컴포넌트 B</h1>
            <div>{notifications[1].title}</div>
        </>
    )
}

export default CompB
