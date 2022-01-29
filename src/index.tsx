import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {RecoilRoot} from "recoil";
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            notifyOnChangeProps: ['data', 'error', 'isFetching'],
            refetchOnWindowFocus: false,
        },
    },
});

ReactDOM.render(
    <QueryClientProvider client={queryClient}>
        <RecoilRoot>
            <React.StrictMode>
                <App />
            </React.StrictMode>
        </RecoilRoot>
        <ReactQueryDevtools initialIsOpen={false} position="top-right" />
    </QueryClientProvider>,
  document.getElementById('root')
);
