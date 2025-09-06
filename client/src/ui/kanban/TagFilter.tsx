import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	fetchTagCategories,
	fetchTags,
	type Tag,
	type TagCategory,
} from "../../api";
import type { BoardFilters } from "../../hooks/useBoardFilters";

type Props = {
	projectId: string;
	value: Pick<BoardFilters, "tagIds" | "tagMode">;
	onChange: (patch: Partial<BoardFilters>) => void;
};

export default function TagFilter({ projectId, value, onChange }: Props) {
	const { data: cats = [] } = useQuery<TagCategory[]>({
		queryKey: ["tag-cats", { projectId }],
		queryFn: () => fetchTagCategories(projectId),
		staleTime: 60_000,
	});

	const { data: tags = [] } = useQuery<Tag[]>({
		queryKey: ["tags", { projectId }],
		queryFn: () => fetchTags(projectId),
		staleTime: 60_000,
	});

	const tagsByCat = useMemo(() => {
		const m = new Map<string, Tag[]>();
		for (const t of tags) {
			const arr = m.get(t.category_id) || [];
			arr.push(t);
			m.set(t.category_id, arr);
		}
		for (const arr of m.values()) {
			arr.sort((a, b) => a.name.localeCompare(b.name));
		}
		return m;
	}, [tags]);

	const toggle = (id: string) => {
		const set = new Set(value.tagIds);
		if (set.has(id)) set.delete(id);
		else set.add(id);
		onChange({ tagIds: Array.from(set) });
	};

	const setMode = (mode: "and" | "or") => onChange({ tagMode: mode });

	return (
		<div className='flex flex-col gap-2'>
			<div className='flex items-center gap-2'>
				<div className='text-xs text-gray-500'>Теги</div>
				<div className='flex rounded-lg border overflow-hidden'>
					<button
						type='button'
						className={`px-2 py-1 text-xs ${
							value.tagMode === "or" ? "bg-neutral-900 text-white" : "bg-white"
						}`}
						onClick={() => setMode("or")}
						title='Любой из выбранных тегов'>
						OR
					</button>
					<button
						type='button'
						className={`px-2 py-1 text-xs border-l ${
							value.tagMode === "and" ? "bg-neutral-900 text-white" : "bg-white"
						}`}
						onClick={() => setMode("and")}
						title='Все выбранные теги одновременно'>
						AND
					</button>
				</div>
			</div>

			<div className='flex flex-wrap gap-3'>
				{cats.map(cat => (
					<div key={cat.id} className='min-w-[180px]'>
						<div className='mb-1 text-xs font-medium'>{cat.name}</div>
						<div className='flex flex-wrap gap-2'>
							{(tagsByCat.get(cat.id) || []).map(tag => {
								const active = value.tagIds.includes(tag.id);
								return (
									<button
										key={tag.id}
										type='button'
										onClick={() => toggle(tag.id)}
										className={`rounded-full border px-2 py-0.5 text-xs transition ${
											active
												? "bg-blue-600 text-white border-blue-600"
												: "bg-white text-gray-700"
										}`}
										title={tag.name}>
										{tag.name}
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
