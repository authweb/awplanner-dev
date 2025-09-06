import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "../primitives";
import TagChip from "../tags/TagChip";
import {
	fetchTagCategories,
	fetchTags,
	type UUID,
	type Tag,
	type TagCategory,
} from "../../api";

type Mode = "or" | "and";

export default function TagFilterDropdown({
	projectId,
	open,
	onClose,
	selected,
	mode,
	onChange,
	onlyCategoryId,
}: {
	projectId: UUID;
	open: boolean;
	onClose: () => void;
	selected: UUID[]; // выбранные tag.id
	mode: Mode; // or / and
	onChange: (nextIds: UUID[], nextMode: Mode) => void;
	onlyCategoryId?: UUID; // можно ограничить одной категорией (например «Приоритет»)
}) {
	const [q, setQ] = useState("");

	const { data: cats = [] } = useQuery<TagCategory[]>({
		queryKey: ["tag-categories", projectId],
		queryFn: () => fetchTagCategories(projectId),
		staleTime: 30_000,
	});

	const { data: tags = [] } = useQuery<Tag[]>({
		queryKey: ["tags", projectId],
		queryFn: () => fetchTags(projectId),
		staleTime: 30_000,
	});

	const filteredCats = useMemo(
		() => (onlyCategoryId ? cats.filter(c => c.id === onlyCategoryId) : cats),
		[cats, onlyCategoryId],
	);

	const tagsByCat = useMemo(() => {
		const m = new Map<UUID, Tag[]>();
		for (const t of tags) {
			if (onlyCategoryId && t.category_id !== onlyCategoryId) continue;
			const keep =
				!q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase());
			if (!keep) continue;
			const arr = m.get(t.category_id) || [];
			arr.push(t);
			m.set(t.category_id, arr);
		}
		for (const [, arr] of m) arr.sort((a, b) => a.name.localeCompare(b.name));
		return m;
	}, [tags, q, onlyCategoryId]);

	if (!open) return null;

	return (
		<div className='fixed inset-0 z-50' onClick={onClose}>
			<div className='absolute inset-0' />
			<div
				className='absolute left-0 top-0 z-50 mt-1 w-[360px] rounded-2xl border border-neutral-200 bg-[#1f2937] text-white shadow-2xl'
				onClick={e => e.stopPropagation()}>
				{/* хедер */}
				<div className='flex items-center justify-between px-3 py-2'>
					<div className='font-semibold'>Стикер{onlyCategoryId ? "" : "ы"}</div>
					<button
						className='rounded-lg px-2 py-1 text-xs hover:bg-white/10'
						onClick={() => onChange(selected, mode === "or" ? "and" : "or")}
						title='AND/OR'>
						Фильтр: {mode === "or" ? "OR" : "AND"}
					</button>
				</div>

				{/* поиск */}
				<div className='px-3 pb-2'>
					<Input
						placeholder='Поиск по тегам…'
						value={q}
						onChange={e => setQ(e.target.value)}
						className='h-8 bg-white text-neutral-900'
					/>
				</div>

				{/* список категорий и тегов */}
				<div className='max-h-[300px] overflow-auto px-2 pb-2'>
					{filteredCats.map(cat => {
						const list = tagsByCat.get(cat.id) || [];
						if (!list.length) return null;
						return (
							<div key={cat.id} className='mb-2 rounded-xl bg-[#111827]/40 p-2'>
								<div className='mb-1 flex items-center justify-between'>
									<div className='text-sm font-medium opacity-90'>
										{cat.name}
									</div>
								</div>
								<ul className='space-y-1'>
									{list.map(tag => {
										const checked = selected.includes(tag.id);
										return (
											<li key={tag.id}>
												<label className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/10'>
													<input
														type='checkbox'
														className='accent-white'
														checked={checked}
														onChange={e => {
															const nxt = e.target.checked
																? [...selected, tag.id]
																: selected.filter(id => id !== tag.id);
															onChange(nxt, mode);
														}}
													/>
													<TagChip tag={tag} />
												</label>
											</li>
										);
									})}
								</ul>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
