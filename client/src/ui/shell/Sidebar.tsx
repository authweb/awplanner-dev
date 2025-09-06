// client/src/ui/shell/Sidebar.tsx
import { Plus, MessageCircleMore } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, type Project } from "../../api";
import { Button } from "../primitives";

export default function Sidebar() {
	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["projects"],
		queryFn: fetchProjects,
		staleTime: 60_000,
	});

	return (
		<aside className='flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white'>
			<div className='flex items-center gap-2 p-4'>
				<div className='size-9 rounded-full bg-neutral-200' />
				<div>
					<div className='text-sm font-medium'>Profile</div>
					<div className='text-xs text-neutral-500'>user@company</div>
				</div>
			</div>

			<div className='px-4'>
				<Button
					variant='primary'
					size='md'
					className='w-full justify-start gap-2'>
					<Plus size={16} /> Добавить проект
				</Button>
			</div>

			<div className='mt-2 space-y-1 px-2'>
				{projects.map(p => (
					<NavLink
						key={p.id}
						to={`/p/${p.id}`}
						className={({ isActive }) =>
							`block rounded-lg px-3 py-2 text-sm hover:bg-neutral-100 ${
								isActive ? "bg-neutral-100 font-medium" : ""
							}`
						}>
						{p.name}
					</NavLink>
				))}
			</div>

			<div className='mt-auto p-3'>
				<div className='flex items-center gap-2 px-2 text-sm text-neutral-600'>
					<MessageCircleMore size={16} /> Личные чаты
				</div>
			</div>
		</aside>
	);
}
