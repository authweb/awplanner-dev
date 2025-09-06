import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import BoardPage from "./pages/BoardPage";
import LandingRedirect from "./pages/LandingRedirect";
import "./index.css";

const qc = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 10_000, // кэш живёт 10с
			refetchOnWindowFocus: false, // не дёргать без запроса пользователя
			retry: 1, // 1 попытка ретрая
		},
		mutations: {
			retry: 0, // мутации без ретраев
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<QueryClientProvider client={qc}>
			<BrowserRouter /* basename="/если_нужен_подпуть" */>
				<Routes>
					<Route path='/' element={<LandingRedirect />} />
					<Route path='/p/:projectId' element={<BoardPage />} />
				</Routes>
			</BrowserRouter>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	</React.StrictMode>,
);
