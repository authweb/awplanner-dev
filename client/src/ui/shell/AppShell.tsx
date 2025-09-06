import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: ReactNode }) {
	return (
		// экран целиком и никакого горизонтального скролла
		<div className='flex h-screen w-full overflow-x-hidden'>
			<Sidebar />
			{/* правая часть: колонка, в которой верхняя панель фикс высоты, а main занимает остаток */}
			<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
				{/* высота topbar — 56px (h-14). Если у вас другая — поправьте и ниже */}
				<Topbar />
				{/* main не должен создавать горизонтальный скролл страницы */}
				<main className='min-h-0 flex-1 overflow-hidden'>{children}</main>
			</div>
		</div>
	);
}
