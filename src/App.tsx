import React, {Suspense, useState} from 'react';
import CompA from "./CompA";
import CompB from "./CompB";
import CompC from "./CompC";

function App() {
    const [isShow, setIsShow] = useState(false);

    return (
    <div>
        <button onClick={()=>{setIsShow((s) => !s)}}>보여주기/없애기</button>
        <Suspense fallback={<div>컴넌 A 로딩</div>}>
            <CompA/>
        </Suspense>
        <Suspense fallback={<div>컴넌 B 로딩</div>}>
            <CompB/>
        </Suspense>
        <Suspense fallback={<div>컴넌 C 로딩</div>}>
            {isShow ? <CompC/> : null}
        </Suspense>
    </div>
  );
}

export default App;
