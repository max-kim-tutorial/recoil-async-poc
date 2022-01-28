# Recoil ASYNC POC

Recoil만을 이용한 비동기 처리 실험을 몇개 해봅니다

## 왜 하는가?

외대 종강시계에서 React Query + Suspense 조합으로 개발을 했고 Recoil은 전역 상태 저장용 + Storage 상태 연동용 이었음  
unstable_effect가 정말 좋은 기능이었고, 그래도 전역 Store가 필요는 했기 때문에 Recoil을 썼는데  
Recoil보다는 React Query가 비동기 처리와 관련된 기능들을 더 많이 제공하기 때문에, Recoil과 RQ는 전공 분야가 다르구나
싶은 생각이 들었었음. 그래서 깊게 생각하진 않고 RQ를 썼는데,
사실 Recoil만을 사용해서 비동기 처리도 가능하기 때문에 관련해서 비교를 좀 해보고 싶었음..

## GET Cache

## Conditional Query

## 컴포넌트 2곳에서 동시에 비동기 쿼리 Mount

## 컴포넌트 2곳에서 연달아 비동기 쿼리 Mount

## Suspense와의 궁합

## Suspense를 안 쓰는 경우

## Refetch

## Invalidation
