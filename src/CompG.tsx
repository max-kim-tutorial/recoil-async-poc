import React, {useState} from 'react';
import {useRecoilValueLoadable, useRecoilState, useRecoilRefresher_UNSTABLE} from 'recoil';
import {postFeedbackQuery,  postFeedbackQueryFamily} from "./atoms";


const feedbackArr = ['피드백1', '피드백2'];

function CompG() {
    const [body, setBody] = useState({content:''});
    const feedbackLoadable = useRecoilValueLoadable(postFeedbackQueryFamily(body));

    // const refresh = useRecoilRefresher_UNSTABLE(postFeedbackQueryFamily(body));

    const submitFeedback = () => {
        const randomIndex = Math.floor(Math.random() * feedbackArr.length);
        console.log(randomIndex);
        setBody({content:feedbackArr[randomIndex]});
        // refresh();
    }

    return (
        <>
            <h1>컴포넌트 G</h1>
            <button onClick={submitFeedback}>피드백 보내기</button>
            {feedbackLoadable.state === 'loading' && <div>피드백 보내는 중</div>}
            {body.content !== '' && feedbackLoadable.state === 'hasValue' && <div>피드백 보내기 성공</div>}
        </>
    )
}

export default CompG
