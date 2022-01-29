import React, {Suspense, useState} from 'react';
import CompA from "./CompA";
import CompB from "./CompB";
import CompC from "./CompC";
import CompD from "./CompD";
import CompE from "./CompE";

function App() {
    const [isShow, setIsShow] = useState(false);

    return (
    <div>
        <button onClick={()=>{setIsShow((s) => !s)}}>보여주기/없애기</button>
        <Suspense fallback={<h1>컴넌 A 로딩</h1>}>
            <CompA/>
        </Suspense>
        <Suspense fallback={<h1>컴넌 B 로딩</h1>}>
            <CompB/>
        </Suspense>
        <Suspense fallback={<h1>컴넌 D 로딩</h1>}>
            <CompD/>
        </Suspense>
        <Suspense fallback={<h1>컴넌 E 로딩</h1>}>
            <CompE/>
        </Suspense>
        <Suspense fallback={<h1>컴넌 C 로딩</h1>}>
            {isShow ? <CompC/> : null}
        </Suspense>
    </div>
  );
}

export default App;
