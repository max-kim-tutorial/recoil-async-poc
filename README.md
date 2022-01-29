# Recoil ASYNC POC

Recoil만을 이용한 비동기 처리 실험을 몇개 해봅니다

## 왜 하는가?

외대 종강시계에서 React Query + Suspense 조합으로 개발을 했고 Recoil은 전역 상태 저장용 + Storage 상태 연동용이었음  
Chrome Storage와 앱 시작 시점부터 연동하기에 unstable_effect가 정말 좋은 기능이었고, 그래도 전역 Store가 필요는 했기 때문에 Recoil을 썼는데  

일반적으로 생각해봐도 Recoil보다는 React Query가 비동기 처리와 관련된 기능들을 더 많이 제공하기 때문에,
Recoil과 RQ는 집중하는 분야가 다르구나 싶은 생각이 들었었음. 

그래서 고민하다가 RQ를 썼는데,
사실 Recoil만을 사용해서 비동기 처리도 가능하기 때문에 관련해서 비교를 좀 해보고 싶었음.
여러 유스케이스에 대응해보면서,
비동기 처리 중 혹시 RQ를 쓰기에 적합한 곳과, Recoil을 쓰기에 적합한 곳이 또 따로 있을지도 알아보고 싶었음.

## 컨셉

- Recoil은 동기와 비동기 함수들을 selector의 데이터 플로우 그래프에서 균일하게 혼합해준다.
- Selecter Get 콜백에서 나온 값 그 자체 대신 프로미스를 리턴해도 인터페이스는 정확하게 그대로 유지된다.
  - 심지어 atom default 값에다가 promise를 설정해도(이때는 함수는 하니고 값) 비동기 처리가 된다.
- 이들은 selector일 뿐이므로 다른 selector에 의존하여 데이터를 추가로 변환할 수 있다(컨디셔널 쿼리)
- Selector는 idempotent 함수로, 주어진 인풋들로 **항상 같은 결과**를 만들어낸다(캐싱)

## GET Cache

## Conditional Query

## 컴포넌트 2곳에서 동시에 비동기 쿼리 Mount

param없는, 이렇게 생긴 셀렉터 값을 받아서 2개의 컴포넌트를 동시에 렌더링했는데  
network 요청은 한번만 발생했다. 의존성이 없는 것도 하나의 의존성 유형으로 치는가부다.

RQ로 치면 StaleTime이 Infinity인 쿼리 데이터값을 하나 만드는 것이다.  

사실 atom이 없는데 selector를 만든다는 게,, selector는 atom을 compute하는 역할을 하는 친군데
이런 selector을 만들어도 되나 싶긴 하다. 아니믄 내가 넘 융통성없게 생각하나...

```tsx
// 아무 의존성이 없다
export const notificationsQuery = selector<Notification[]>({
    key: 'notifications',
    get: async () => {
        const { data } = await getNotifications();
        return data.notifications;
    }
})
```

## param(id같은거)을 atom으로 저장할 수 있는 경우와 아닌 경우

param이 없는 get 요청의 경우 아주 단순하게 위처럼 selector을 만들어 패칭해올 수 있다.  
그런데 param값에 따라 비동기 요청을 각자 따로 보내야 한다면?


## Suspense

비동기 쿼리를 쓸 때 Suspense가 무조건 필요하다


## Refetch & Invalidation

Selector의 의존성을 이용해 값을 캐싱하기 때문에 사실상 리코일에서의 Refetch와 Invalidation은 같은 개념이다.

RQ는 쿼리 자체를 Invalidation해서 캐시를 폐기하는 방법,
useQuery의 리턴값 중 하나인 refetch를 이용해 값을 직접 imperative하게 데이터를 리패치 시도하는 방법 2가지의 방법이 있다. 

Invalidation과 refetch의 차이는, Invalidation 시킬 경우 쿼리 자체가 강제로 stale 상태로 바뀌고
inactive 상태가 아닌 쿼리의 경우 리패치가 일어난다. 이때 cacheTime이나 stateTime을 얼마나 걸어놨는지는 상관이 없다.

refetch 시도의 경우는 현재 설정한 stale, cache 타임에 영향을 받는다
여전히 fresh 상태면 네트워크 요청이 발생하지 않을 것이고, stale 상태일때만 리패치가 일어나서
결과값을 받아 캐시를 갱신한다.

Recoil의 invalidation 방식은 의존성을 수정하는 것이다. 의존성은 SelectorFamily의 인자일수도,
Selector 내부에서 의존하는 atom일수도 있다. 어쨌든 refetch를 위해서는 의존성이 필요하다.

이런 방식은, 쿼리 요청 과정에서 특정 값과 의존할 필요가 없는 상황에도 invalidation이 필요하다면
atom을 추가로 요한다.  

확실히 맘에 안드는 지점이다.. 하지만 atom을 추가하는데 드는 공수는 별로 안크기때문에 그래도 뭐..
의도한대로는 할 수 있겠지 싶다.

Recoil 독스에는 언뜻 보기에 이렇게까지 해야하나 싶은 예제가 있다.

```tsx
// atomfamily는 atom을 반환하는 함수를 반환하는 방식으로 atom을 여러개 만들 수 있다.
// 동적으로 atom을 만들 수 있게 되고, 이때 매개변수를 통해 하나의 아톰에 접근이 가능하다
const userInfoQueryRequestIDState = atomFamily({
  key: 'UserInfoQueryRequestID',
  default: 0,
});

const userInfoQuery = selectorFamily({
  key: 'UserInfoQuery',
  get: (userID) => async ({get}) => { 
    get(userInfoQueryRequestIDState(userID)); // atomFamily를 param으로 특정하기(참조만 한다)
    
    // 만약에 userId만 파라미터로 받는 상황이래도 마운트시에 다른 파라미터를 넣어주면
    // 다른 쿼리를 리패칭할 수 있을 것이다. 하지만 **특정** 쿼리를 refresh하기 위해 set을 할 수 있는 atom을 이용하는 것
    const response = await myDBQuery({userID});
    if (response.error) {
      throw response.error;
    }
    return response;
  },
});

// 커스텀훅
// userInfoQueryReqeustId의 값을 하나 올려서 쿼리 캐시를 폐기한다.
function useRefreshUserInfo(userID) {
  setUserInfoQueryRequestID = useSetRecoilState(
    userInfoQueryRequestIDState(userID),
  );
  return () => {
    setUserInfoQueryRequestID((requestID) => requestID + 1);
  };
}

function CurrentUserInfo() {
  // 현재 atom에 미리 저장해두었던 사용자 id
  const currentUserID = useRecoilValue(currentUserIDState);
  
  // 비동기 쿼리 참조
  const currentUserInfo = useRecoilValue(userInfoQuery(currentUserID));
  const refreshUserInfo = useRefreshUserInfo(currentUserID);

  return (
    <div>
      <h1>{currentUser.name}</h1>
      <button onClick={refreshUserInfo}>Refresh</button>
    </div>
  );
}
```

만약에 앞에서 봤던 Notifcations 처럼 의존성을 찾아볼 수 없는 셀렉터를 만들 경우
얘는 refresh를 할 수 있는 방법이 없다

### !!useRecoilRefresher_UNSTABLE()이 나왔다!!

원래는 이렇게 의존성을 바꾸는 방향으로 쿼리를 귀찮게 refresh했는데,

21년 11월 4일에 나온 0.5 버전에서는 `useRecoilRefresher_UNSTABLE()` 이라는게 나왔다!!!  
한국어 독스 업데이트 느리다...(커밋해볼까...)

RQ의 invalidate처럼 캐시를 강제로 폐기하고 다시 요청을 보내는 방식인 것 같다.

```tsx
const myQuery = selector({
  key: 'MyQuery',
  get: () => fetch(myQueryURL),
});

function MyComponent() {
  const data = useRecoilValue(myQuery);
  const refresh = useRecoilRefresher_UNSTABLE(myQuery); // RQ와 인터페이스가 비슷하다

  return (
    <div>
      Data: {data}
      <button onClick={() => refresh()}>Refresh</button>
    </div>
  );
}
```

의존성이 없는 쿼리도 이걸 사용하면 강제 refresh가 될까?? 된다!!!

```tsx
import React from 'react';
import {useRecoilRefresher_UNSTABLE, useRecoilValue} from "recoil";
import {notificationsQuery} from "./atoms";

function CompA() {
    const notifications = useRecoilValue(notificationsQuery);
    const refresh = useRecoilRefresher_UNSTABLE(notificationsQuery);
    
    // 버튼을 누르면 해당 selector값을 읽는 모든 컴포넌트가 업뎃된다.
    return (
        <>
            <button onClick={() => {refresh()}}>쿼리 리프레시</button>
            <h1>컴포넌트 A</h1>
            <div>{notifications[0].title}</div>
        </>
    )
}

export default CompA
```

로드맵에 당연히 있었겠지만 나와서 다행인 API이다..  

의존성이 없는 비동기 쿼리는 refetch가 필요하면 refresher을 사용하고,
있는 경우에는 의존성을 사용해 업뎃하거나, 이미 의존성이 fix된 상태라면 refresher을 사용할 수 있겠다.

## POST?

## 느낀점

### Recoil이 불편한 점

### Recoil이 좋은 점

### 결론


