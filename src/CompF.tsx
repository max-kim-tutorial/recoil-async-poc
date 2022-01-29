import React from 'react';
import {useMutation} from "react-query";
import {postFeedback} from "./atoms/service";

function CompF() {
    const {mutate, isLoading, isSuccess} = useMutation((feedback:string) => postFeedback(feedback))

    const submitFeedback = () => {
        mutate('이것은 피드백');
    }

    return (
        <>
            <h1>컴포넌트 F</h1>
            <button onClick={submitFeedback}>피드백 보내기</button>
            {isLoading && <div>피드백 보내는 중</div>}
            {isSuccess && <div>피드백 보내기 성공</div>}
        </>
    )
}

export default CompF
