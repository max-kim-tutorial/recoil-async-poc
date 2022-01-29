# Recoil ASYNC POC

개인 프로젝트 하면서 만든 API들로  
Recoil만을 이용한 비동기 처리 실험을 몇 개 해봅니다

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
  - atom이나 selector은 promise 값을 처리하는데 무리가 없다. 심지어 atom에다가 promise를 써도 된다.
- 이들은 selector일 뿐이므로 다른 selector에 의존하여 데이터를 추가로 변환할 수 있다(컨디셔널 쿼리)
- Selector는 idempotent 함수로, 주어진 인풋들로 **항상 같은 결과**를 만들어낸다(캐싱)

## 컴포넌트 2곳에서 동시에 GET 비동기 쿼리 Mount

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

## param에 의존하는 GET 비동기 요청의 경우

param이 없는 get 요청의 경우 아주 단순하게 위처럼 selector을 만들어 패칭해올 수 있다.  

그런데 param값에 따라 비동기 요청을 각자 따로 보내야 한다면? selectorFamily를 사용해 동적으로 여러 셀렉터를 만들어  
각기 다른 비동기 요청이 일어나게끔 만들 수 있다. selector는 selectorFamily의 인자값을 통해서도 캐싱을 한다.

selectorFamily와 atomFamily는 이름 그대로 atom과 selector들의 집합이다. 동적으로 여러개의 셀렉터, 혹은 아톰을 만드는 방법이다.
원래는 Key로만 selector, atom을 구분하겠지만 family를 사용하는 경우 recoilValue를 사용할때 해당 selector 혹은 atom에 인자를 넣어줄 수 있고,
selector는 이 인자에 의존하게 된다.

```tsx
export const tweetQuery = selectorFamily<Tweet, string>({
  key: 'tweet',
  get: tweetId => async () => {
    const { data } = await getTweetById(tweetId);
    return data.tweet;
  }
})

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

    return (
        <>
            <h1>컴포넌트 D</h1>
            <div>{tweet.name}</div>
            <div>{tweet.id}</div>
        </>
    )
}

export default CompD
```

## 조건부 GET Query

자주는 아니지만, 특정 조건이 충족되었을 때만 GET을 해와야 하는 쿼리가 존재할 수 있다.

종강시계에서는 effect을 이용해 storage의 값을 앱의 시작과 동시에 자동으로 atom에 넣고,  
그 atom의 값을 평가해서, 사용자가 설정한 배경화면이 있을 경우 배경화면을 이미지를 요청하지 않는 식의 로직이 있었다.

이걸 RQ로 처리할때는, useQuery가 제공하는 옵션 중 enable과 동적 쿼리 key를 이용하면 되었었다. 최초의 배경화면을 불러오는
쿼리와, 배경화면을 업데이트하는 쿼리로 나눠서 개발한다.

```tsx
const useBackgroundApplyQuery = () => {
  const [{ status, value }, setBackgroundImage] =
    useRecoilState(userBackgroundImage);

  const { data: backgroundImgData } = useQuery<BackgroundImg>({
    queryKey: [
      'background',
      `apply-${status}${value !== null ? `-${value?.name}` : ''}`,
    ],
    queryFn: async () => {
      if (value !== null) return value;
      const { data } = await getBackgroundImages('seoul');
      const convertResult = {
        ...data,
        dayImageUrl: await convertImageToDataUrl(data.dayImageUrl),
        nightImageUrl: await convertImageToDataUrl(data.nightImageUrl),
      };
      setBackgroundImage((state) => ({
        ...state,
        value: convertResult,
      }));
      return convertResult;
    },
    suspense: true,
    enabled: status === 'initialized',
  });

  return backgroundImgData;
};

// campus 인자로 값을 트리거해서 쿼리를 마운트시킨다
const useBackgroundUpdateQuery = (campus: Campus | null) => {
  const setBackgroundImage = useSetRecoilState(userBackgroundImage);

  const { isFetching, isError } = useQuery({
    queryKey: ['background', `update-${campus}`],
    queryFn: async () => {
      const { data } = await getBackgroundImages(campus as Campus);

      const convertResult = {
        ...data,
        dayImageUrl: await convertImageToDataUrl(data.dayImageUrl),
        nightImageUrl: await convertImageToDataUrl(data.nightImageUrl),
      };

      setBackgroundImage((state) => ({
        ...state,
        value: convertResult,
      }));
      return convertResult;
    },
    cacheTime: 0,
    enabled: campus !== null,
  });

  return {
    isFetching,
    isError,
  };
};
```

이렇게 하면 첫 렌더링에서 마운트된 쿼리는 바로 언마운트되기 때문에 inactive 상태가 되며, 
recoil 값의 평가가 끝났을 때 새로운 query key를 사용해 recoil의 값을 가져오거나,
배경화면을 바꾸는 곳에서 지역 state를 선언하고 이를 쿼리에 주입해 필요할때 새로운 이미지를 패칭해 Recoil value에 넣는다

이렇게 RQ로 하기 좀 까다로웠던 경우가 RQ와 Recoil의 상태가 엮이는 경우였던 것 같다. 

의미 없는 쿼리가 마운트되는게 마음에 안 들고, 쿼리 함수 안에서 recoil을 건드니
더럽다는 생각도 들었다. Recoil로 해보면 어떨까 해서 Recoil로도 짜봤다.

먼저, storage에서 값을 가져오는 아톰을 하나 둔다.

```tsx
const backgroundAtom = atom({
  key: 'userBackgroundImgInfo',
  default: {
    status: 'idle',
    value: null,
  },
  effects_UNSTABLE: [
    chromeStorageEffect<BackgroundImg>('userBackgroundImgInfo'),
  ],
})
```

그리고 컴포넌트에서 참조할, 유저의 진짜 배경화면 정보를 가지고 있는 selector가 필요하다. 이 selector는 atom.value가 
있는 경우 atom.value를 그대로 가져오고, null일 경우 서울캠퍼스 배경화면을 패치해서 가져와 가공해서 제공한다.

```tsx
const userBackgroundQuery = selector({
  key: 'userBackgroundImg',
  get: async({get}) => {
      const background = get(backgroundAtom);
      if(background.status === 'initialized') {
          if (background.value !== null) {
              return background.value;
          } else {
            const { data } = await getBackgroundImages('seoul');
            const convertResult = {
              ...data,
              dayImageUrl: await convertImageToDataUrl(data.dayImageUrl),
              nightImageUrl: await convertImageToDataUrl(data.nightImageUrl),
            };
            return convertResult;
          }
      }
      return undefined;
  }
})
```

쉽게 한계를 알 수 있다. 사용자가 컴포넌트 어딘가에서 배경화면을 바꾸는 동작이 일어났을
경우에 이 셀렉터 만으로는 대응이 불가능하다.

비동기 요청을 selector 밖에서 한 후, 값을 직접 가공해 backgroundAtom에 넘겨줘야만 이 쿼리를 참조하고 잇는 유저 배경화면을
보여주고 있는 컴포넌트가 제대로 동작한다. selector 바깥에서 값을 마련해 atom에 set해야 하는 로직이 외부에 필요한 것이다.

비동기 쿼리를 제공하는 selector에 set을 쓴다는게 어불성설이기도 하고, 비동기 쿼리의 get 함수 안에서 
atom을 set할 수 없다. 아무래도 recoil은 데이터 그래프의 형태로 작동하기 때문에, get 함수 내부에서 부수효과를
발생시키는 것은 개발자들의 의도는 아닐 것이다.

그렇다면, 아예 쿼리를 분리해서 backgroundAtom은 스토리지에서 값을 가져오기만 하고,
userBackgroundQuery는 selectorFamily로 설정하고 컴포넌트의 지역 state와 연동해 준비가 되었을 때 값을 가져오게 하는 쿼리로
활용하면 어떨까?

```tsx
const backgroundAtom = atom({
    key: 'userBackgroundImgInfo',
    default: {
      status: 'idle',
      value: null,
    },
    effects_UNSTABLE: [
        chromeStorageEffect<BackgroundImg>('userBackgroundImgInfo'),
    ],
})

const userBackgroundQuery = selectorFamily({
  key: 'userBackgroundImg',
  get: (campus:Campus | null) => async({get}) => {
      if (campus === null) return undefined; // 최초로 참조되는 나오는 undefiend는 컴포넌트에서 방어를 해야한다
      const { data } = await getBackgroundImages(campus);
      const convertResult = {
        ...data,
        dayImageUrl: await convertImageToDataUrl(data.dayImageUrl),
        nightImageUrl: await convertImageToDataUrl(data.nightImageUrl),
      };
      return convertResult;
  }
})
```

물론 이 경우에도, 셀렉터 밖에서 아톰과, 스토리지에 직접 저장해야 한다는 것은 변하지 않아 여전히 selector에서
모든 로직을 처리할 수 없긴 하다.

컴포넌트에서는 처음에 backgroundAtom의 값을 탐색하고 
없으면 userBackgroundQuery의 값을 참조하게 하는 방식으로 작동해야 하는데,
여전히 셀렉터 바깥의 로직이 꽤 복잡하다.

그냥 케이스가 매우 복잡하기 때문에(...) 구현이 어려운 케이스라 사실 RQ든 Recoil이든 구현이 어렵고, RQ든 Recoil이든
다 때려치고 명령형으로 패칭해서 단순하게 유지하는 것도 괜찮을지도 모른다는... 생각까지 들게 만든다.

어쨌든 이 케이스에서 알 수 있는 건 다음과 같다.

Recoil 비동기 쿼리는 Recoil의 철학이라고 할 수 있는, atom에서 derived된
data graph의 형태로 작동한다는 것을 아주 잘 알 수 있다. atom, selector의 데이터 그래프 내부에서 부수효과는 
못 일으키고, graph의 간선은 recoil에서 컴포넌트로, 혹은 컴포넌트에서 recoil로,
직선으로만 움직인다. (만약에 selector의 get에서 atom을 업데이트할 수 있었다면 쉽게 해결이 되었을 수도 
있었을 것이다.)

이 말은 client의 상태값과 서버 동기화가 엮인 복잡한 케이스에 대응하기에는
데이터 그래프 흐름만으로는 부족하다는 것이다. 부수효과를 발생시켜야 할 수도 있다.
결국 Recoil은 **상태 관리** 라는 목적을 아예 때놓고는 생각할 수 없다.

반면 RQ의 queryFn은 완결된 프로미스를 리턴만 하면 되는 함수로, 리턴값만 지키면 그 안에서 무슨 부수효과를 만들어도
상관이 없으므로 구현에 꽤나 열려있는 구조를 가지고 있다는 것을 알 수 있다. 물론 여러 상태와 엮인
복잡한 케이스를 대응하다 보면 queryFn은 금방 더러워질 것이지만,,, 대응은 된다.

정리하면 **Recoil로 대응 안되는 복잡한 비동기 처리 케이스는 RQ로 대응할 수 있다.**

더불어 RQ에서는 useQuery처럼 컴포넌트에 선언형으로 쿼리를 선언할 수 있는 방법과 더불어, 정 안될때는 쓰라고
명령형으로 데이터를 패칭하되 RQ의 캐싱을 이용할 수 있게 하는 방법을 만들어놨다. 

```tsx
// 명령형 패칭
queryClient.fetchQuery(key, () => fetcher());

// 알아서 패칭해서 여기에 넣기
queryClient.setQueryData(queryKey, updater);
```

### 은총알은 업따!!!!!!!!!!!

내가 위 상황에서 Recoil과 RQ중 하나를 찝어서 해결하려 고민했던 것은, 
**비동기 처리를 관리하는 도구로 어떤 하나만을 쓰겠다**
라는 컨벤션을 정확히 정하고 따르고 싶은 나의 욕망일 수도 있겠다. 

예전에 회사다닐때, 특정 케이스에 대응하는 방법으로 새로운 도구를 도입하고 싶어도
앱의 복잡도를 상승시킬 여지가 있으므로 섵불리 기술 도입은 안 하는게 좋겠다는 말을 들은적이 있어서,

그때는 일반적인+모든 케이스를 대처할 하나의 도구를 정해놓고, 최대한 그것만 사용하는 것이
협업 관점에서나, 프로젝트의 복잡성을 줄이는 면에서 더 좋은게 아닐까 하는 생각을 했었다.

(아 물론 도구가 많아질수록 늘어나는 번들 크기같은건 생각해봐야겠지만,,,)

하지만 요새는 생각이 많이 바뀌었다. 은총알은 없기 때문이다.
프로그래머는 변화에 대처하는 모든 방법을 미리 배울 수 없다.

아예 이런 복잡한 케이스를 만났을 때, RQ든 뭐든 뜯어내고
axios만 가지고 hook 하나 만들어서 조금 더 저레벨에서 대응하는게 더 명료한 방법이라고 팀원들을 설득할 수 있다면,
혹은 다른 도구를 가지고 하는게 더 낫다고 설득할 수 있으면 그게 최선의 해결책일 수도 있는 것이다.

후... 어쨌든 위에서 보인 예처럼 RQ로 어떻게든 대응해놓긴 했는데,
나중에 리팩토링할 때 원점에서 다시 검토해봐야겠다. queryClient 써볼까나

## Suspense와의 궁합

Recoil은 비동기 쿼리를 쓸 때 Suspense를 사용하는 것이 기본으로 설정되어 있다.

RQ와 Recoil의 Suspense 동작에서의 차이는
Recoil은 초기 렌더링때의 네트워크 요청 말고도
리패칭이 일어나면 무조건 fallback UI가 보여지지만, RQ의 경우는 아니라는 것이다.

```tsx
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
            {isFetching ? (<h1>컴넌 E 로딩</h1>) : ( // isFetching을 이용해야만 리패치시 로딩 UI 대응 가능
                <>
                    <h1>컴포넌트 E</h1>
                    <button onClick={() => {refetch()}}>React Query 리패치</button>
                    <div>{(notifications as Notification[])[4].title}</div>
                    {/* useQuery의 data 값은 undeifined의 유니언 타입으로 추론되므로, 단언이 필요하다. */}
                </>
            )}
        </>
    )
```

뇌피셜인데, RQ는 stale-while-validate 구현체이기 때문에 stale이후 리패칭이 일어날 때 원래 cache된 데이터를 화면에 보여줘야 한다.
이 방식을 따르기 때문에 query의 리턴값 중 하나인 isFetching을 플래그 삼아 로딩 UI를 보여주는 식으로 따로 처리해주지 않으면
리패치시 Suspense의 fallback UI가 보이지는 않는다. RQ Suspense 조합으로 처음 써보았을 때 가장 읭?스러운 부분이라고 할 수 있다.

그런데 비동기 요청에 따른 명령형 로직을 작성하지 않으려고 Suspense를 쓰는건데... isFetching을 사용하는 것은
Suspense의 선언형 취지에는 반한다고 할 수 있다.

RQ에 경우 Suspense랑 안맞는 경우가 또 있는데, 바로 type이다. useQuery의 반환값 중 하나인 data는 `T | undefined`로 추론된다. 
아 물론 쿼리가 실패할 수 있으니 쿼리 단에서는 맞는 얘기긴 한데,,, 근데 suspense:true 설정하면
이 쿼리가 suspense를 쓸건지 말건지를 미리 알수 있으니까 타입선언에 반영할 수 있지 않을까?? 하는 생각이..(아닌가)

Suspense는 data가 undefined일 경우에는 렌더링을 멈춘다는게 핵심 컨셉인데, 그렇다면 Suspense를 사용하는 컴포넌트의
로직은 data가 undefined일리가 없다고 전제하고 작성되어야 한다. undefined일 경우에는 fallback UI가 나타나니 필요가 없다는 것임

그런데 저렇게 추론되니까 단언을 해줘야한다. 아니면 `if(data===undefined)return null` 이런식으로 UI를 방어하는
로직을 작성해야 하는데 이렇게되면 컴포넌트에 여러 훅을 사용해야할 경우 훅의 규칙을 위반할 수 있는 실행문이라 
무지성으로 넣기에는 물의를 일으킬 수 있다.

Recoil은 undefined의 유니언 타입으로 추론되지 않는다. 쿼리 안에서의 에러 처리는 쿼리 내부에서 throw를 해주면 된단다
독스의 예제인데, 이런 식이라면 리코일 비동기 쿼리의 리턴값은 확실히 쿼리의 결과물 뿐일 것이다.

```tsx
const currentUserNameQuery = selector({
  key: 'CurrentUserName',
  get: async ({get}) => {
    const response = await myDBQuery({
      userID: get(currentUserIDState),
    });
    if (response.error) {
      throw response.error;
    }
    return response.name;
  },
});
```

여기서 발생시킨 에러는 ErrorBoundary에서 처리해주면 될것이고...

여러모로 Recoil이 더 Suspense와 궁합이 더 잘 맞긴 하다. 역시 소속사가 똑같아서 그런가...
staleTime이 Infinity인 쿼리는 Recoil로 대응하는게 더 타이핑 적고 깔끔할거같기도??

## Invalidation

RQ는 쿼리 자체를 Invalidation해서 캐시를 폐기하는 방법,
useQuery의 리턴값 중 하나인 refetch를 이용해 값을 직접 imperative하게 데이터를 리패치 시도하는 방법 2가지의 방법이 있다. 

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
  
  // id를 통해 비동기 쿼리 참조
  const currentUserInfo = useRecoilValue(userInfoQuery(currentUserID));
  
  // request 요청 리프레시를 트리거하는 아톰 값을 갱신하는 커스텀 훅
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
있는 경우에는 의존성을 사용해 업뎃하거나, 이미 의존성이 fix된 상태에서 리패치만 필요한 경우라면 refresher을 사용할 수 있겠다.

근데 나같으면 refresh만 쓸거같다는 느낌이 강하게 든다

## POST, PUT 요청의 애매함

GET은 그렇다 치는데,, 서버로 직접 요청을 보내야 할땐 Recoil을 어떻게 이용할 수 있을까?

RQ는 Mutation이라는 좋은 해결책을 제시한다. mutate발생은 명령형으로 처리해야하기 때문에
useMutation 훅을 이용해 mutate 함수를 얻어 그거가지고 post나 Put 요청을 날릴 수 있다.

```tsx
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
```

Recoil은 post body가 들어갈 atom을 하나 만들어두고, atom 값이 변할때마다 
POST 요청을 보내주는 selector을 만들어 처리할 수 있을 것 같다. 

```tsx
export const feedbackBody = atom({
    key: 'feedbackBody',
    default: {content: ''},
})

export const postFeedbackQuery = selector({
    key: 'feedbackQuery',
    get: async ({get}) => {
        const feedback = get(feedbackBody);
        if (feedback.content !== '') {
            await postFeedback(feedback.content);
        }
        return
    }
})
```

아니면 atom 없이 selectorFamily를 사용하고 인자를 컴포넌트의 state값과 연동시켜
컴포넌트의 state값이 변경되면 POST를 보내는 방식으로도 할 수 있다. 이 방식이 조금더 나아보인다.

굳이 atom을 써서 post의 body를 atom에 가지고 있을 필요가 없다.

```tsx
export const postFeedbackQueryFamily = selectorFamily({
    key: 'feedbackQuery',
    get: (feedback:string|null) => async() => {
        if (feedback !== null) {
            await postFeedback(feedback);
        }
        return
    }
})
```

로딩, 에러 처리는 loadable을 쓰면 댄다

엌..그런데,,
Recoil은 atom, family의 인자가 계속 똑같으면 캐싱을 하고 비동기 쿼리를 실행하지 않는다!!!!!
그래서 만약에 의존성으로 들어가는 값이 이전과 똑같은 값일 경우 POST 요청을 보내지 않는다..

그래서 보낼때마다 리프레시를 해줘야한다. 완성된 결과물은 이렇다..

```tsx
const feedbackArr = ['피드백1', '피드백2'];

function CompG() {
  const [body, setBody] = useState('');
  const feedbackLoadable = useRecoilValueLoadable(postFeedbackQueryFamily(body));

  const refresh = useRecoilRefresher_UNSTABLE(postFeedbackQueryFamily(body));

  const submitFeedback = () => {
    const randomIndex = Math.floor(Math.random() * feedbackArr.length);
    setBody(feedbackArr[randomIndex]);
    refresh();
  }

  return (
    <>
      <h1>컴포넌트 G</h1>
      <button onClick={submitFeedback}>피드백 보내기</button>
      {feedbackLoadable.state === 'loading' && <div>피드백 보내는 중</div>}
      {body !== '' && feedbackLoadable.state === 'hasValue' && <div>피드백 보내기 성공</div>}
    </>
  )
}
```

원래는 피드백이 2번 보내진 후 피드백을 보낼 수 없었지만 계속 보낼 수 있게 되었다.

혹시 의존하는 값이 불변값이라서 그런가 싶어서 로직을 가변값(객체)로 바꿔보았다. 
그런데 selectorFamily 인자로 받았을 때는 안되었다.

```tsx
export const postFeedbackQueryFamily = selectorFamily({
  key: 'feedbackQuery2',
  get: (feedback:{content:string}) => async() => {
    if (feedback.content !== '') {
      await postFeedback(feedback.content);
    }
    return
  }
})

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
```

엥 뭐지 싶어서 atom으로 바꿔보았는데 이건 또 잘 작동했다.

```tsx
export const feedbackBody = atom({
  key: 'feedbackBody',
  default: {content: ''},
})

export const postFeedbackQuery = selector({
  key: 'feedbackQuery',
  get: async ({get}) => {
    const feedback = get(feedbackBody);
    if (feedback.content !== '') {
      await postFeedback(feedback.content);
    }
    return
  }
})

function CompG() {
    const feedbackLoadable = useRecoilValueLoadable(postFeedbackQuery);
    const [body, setBody] = useRecoilState(feedbackBody);
    // const refresh = useRecoilRefresher_UNSTABLE(postFeedbackQuery);

    const submitFeedback = () => {
        const randomIndex = Math.floor(Math.random() * feedbackArr.length);
        setBody({content: feedbackArr[randomIndex]});
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
```

selectorFamily의 인자는 캐싱을 값으로 하고, atom은 레퍼런스로 하는건가? ㄷㄷ  

아니면 아예 상관없는 값을 요청할때 계속 넘겨주면서 새로운 요청을 계속 만들어내는 방식도 가능은 하겠다

어쨌든,, POST, PUT 요청에 쓰기에는 힘들다는 것을 알 수 있다.
사실 데이터 그래프 형태의 전역 상태 관리를 하려고 만들어진 친구라서, 
서버의 데이터를 동기화하는 것 말고는, 애초에 서버의 상태를 쉽게 바꿀 수 있도록 만들어놓지 않았다.
이건 걍 mutation이 압승..

## 느낀점

### RQ가 Recoil보다 좋은 점

- 좀더 복잡한 유스케이스(특히 시간과 관련된)의 비동기 처리에 강점
  - staleTime, cacheTime 설정
  - 에러시 Retry, window refocus시 refetch
  - refetchInterval등 일정한 간격으로 패칭
  - queryFn의 유연성
  - queryClient의 API를 입맛대로 사용 가능
- Mutation : Recoil로 POST, PUT하기 빡셈
- **Recoil 데브툴 지금 마땅한게 없음**

### Recoil이 RQ보다 좋은 점

- 단순한 GET 요청이고 한번 패칭해온 후 값이 자주 바뀌지 않는다면(staleTime:Infinity), useQuery보다 간단하고 신경쓸게 적은 방식으로 코딩 가능
  - refresh api가 없었을 때는 staleTime: Infinity인거 빼고 리프레시가 빡세서 아예 안쓰는게 나았을 것 같긴함
  - 근데 staleTime:Infinity였던 비동기 쿼리가 갑자기 케이스가 복잡해진다면..? 결국 recoil에서 뜯어낼 수 밖에 없다.
  - 대응 가능한 케이스가 적어서 변화에 유연하지 못할듯 싶다.
- suspense와의 궁합이 RQ보다 좋음

### 기타 등등

- Recoil의 캐시에 영향을 끼치는 의존성은 명시적으로 드러나있지가 않아서 실수하기 쉬울 것 같다. selector 내부의 get함수, selectorFamily의 인자 등을 유심히 살펴야 하지만 의존성 
  배열이나 RQ의 동적 queryKey처럼 정리되어 한눈에 보기 쉬운 부분이 없고 selector의 get 함수 내부를 봐야 어떤게 의존성을 가지는지 알 수 있다. useEffect 의존성 배열처럼 
  바꾸면 좋지 않을까? 싶기도
- Recoil Atom, Selector을 만들기가 넘 쉬워서(미니멀한 API라) 금세 앱의 복잡성을 키워버릴 수 있을 듯 하다.
- Recoil 비동기 쿼리 역시 Recoil의 상태 관리 시스템을 기본으로 한다. 이런 면에서는 RTK Query 같기두 하고

### 결론

그래도 refresh가 나와서... 아주 단순하고, 잘 바뀌지 않는 요청에는 Recoil을 섞어서 쓰는게 더 명료하고 간편한 로직을 만들 수도 있다.
하지만 RQ가 더 많은 케이스에 대응할 수 있고, POST나 PUT과 같은 서버의 상태를 변경시키는 요청도 RQ에서 폭넓게 처리 가능하다. 

그래서 걍 왠만한 비동기 케이스에는 RQ나 SWR 쓰는게 낫지 않나.. 하는 생각

Recoil은 그래도 전역 상태 관리에 아주 컴팩트하고 미니멀한 API를 제공하고 있고, effect같은 좋은 기능도 잘 나오고 있으니
1.0.0 되기까지 더 발전하리라 본다. 근데 쓸만한 데브툴이 빨리 나왔으면 좋겠다ㅜㅜ 회사가면 사이드 프로젝트로 한번 만들어볼까..
