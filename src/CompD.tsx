import {useRecoilRefresher_UNSTABLE, useRecoilValue} from "recoil";
import {tweetQuery} from "./atoms";
import React from "react";

const tweetIds = [
    '2058832-1',
    '2058901-1',
    '2058957-1',
    '2059119-1',
    '2059604-1',
    '2059776-1',
    '2060160-1',
]

const randomIndex = Math.floor(Math.random() * tweetIds.length);

function CompD() {
    const tweet = useRecoilValue(tweetQuery(tweetIds[randomIndex]));
    const refresh = useRecoilRefresher_UNSTABLE(tweetQuery(tweetIds[randomIndex]));

    return (
        <>
            <h1>컴포넌트 D</h1>
            <button onClick={() => {refresh()}}>Recoil 쿼리 리프레시</button>
            <div>{tweet.name}</div>
            <div>{tweet.id}</div>
        </>
    )
}

export default CompD
