import { useEffect, useMemo, useState } from "react";
import {
	type Task,
	type UUID,
	updateTask,
	fetchTaskTags,
	fetchTagCategories,
	fetchTags,
	attachTagToTask,
	detachTagFromTask,
	type Tag,
	type TagCategory,
} from "../../api";

type Props = {
	open: boolean;
	onClose: () => void;
	task: Task;
	projectId: UUID;
	onUpdated?: (t: Task) => void;
};

export default function TaskModal({
	open,
	onClose,
	task,
	projectId,
	onUpdated,
}: Props) {
	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description ?? "");
	const [priority, setPriority] = useState(task.priority);
	const [startDate, setStartDate] = useState(task.start_date ?? "");
	const [dueDate, setDueDate] = useState(task.due_date ?? "");
	const [taskTags, setTaskTags] = useState<Tag[]>([]);
	const [cats, setCats] = useState<TagCategory[]>([]);
	const [tags, setTags] = useState<Tag[]>([]);

	useEffect(() => {
		if (!open) return;
		Promise.all([
			fetchTaskTags(task.id),
			fetchTagCategories(projectId),
			fetchTags(projectId),
		]).then(([tTags, c, t]) => {
			setTaskTags(tTags);
			setCats(c);
			setTags(t);
		});
	}, [open, projectId, task.id]);

	const tagsByCat = useMemo(() => {
		const m = new Map<string, Tag[]>();
		for (const tag of tags) {
			const arr = m.get(tag.category_id) || [];
			arr.push(tag);
			m.set(tag.category_id, arr);
		}
		return m;
	}, [tags]);

	if (!open) return null;

	const taskHas = (id: string) => taskTags.some(t => t.id === id);

	async function toggleTag(tag: Tag) {
		if (taskHas(tag.id)) {
			await detachTagFromTask(task.id, tag.id);
			setTaskTags(prev => prev.filter(t => t.id !== tag.id));
		} else {
			await attachTagToTask(task.id, tag.id);
			setTaskTags(prev => [...prev, tag]);
		}
	}

	async function save() {
		const updated = await updateTask(task.id, {
			title,
			description: description || null,
			priority,
			startDate: startDate || null,
			dueDate: dueDate || null,
		});
		onUpdated?.(updated);
		onClose();
	}

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
			<div className='w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl'>
				<div className='mb-3 flex items-center justify-between'>
					<h3 className='text-lg font-semibold'>Задача</h3>
					<button className='text-gray-500 hover:text-black' onClick={onClose}>
						✕
					</button>
				</div>

				<div className='grid gap-3'>
					<div>
						<label className='block text-xs text-gray-500 mb-1'>Название</label>
						<input
							className='w-full rounded border px-2 py-1'
							value={title}
							onChange={e => setTitle(e.target.value)}
						/>
					</div>
					<div>
						<label className='block text-xs text-gray-500 mb-1'>Описание</label>
						<textarea
							className='w-full rounded border px-2 py-1'
							rows={4}
							value={description}
							onChange={e => setDescription(e.target.value)}
						/>
					</div>
					<div className='grid grid-cols-3 gap-3'>
						<div>
							<label className='block text-xs text-gray-500 mb-1'>
								Приоритет (0–4)
							</label>
							<input
								type='number'
								min={0}
								max={4}
								className='w-full rounded border px-2 py-1'
								value={priority}
								onChange={e => setPriority(Number(e.target.value))}
							/>
						</div>
						<div>
							<label className='block text-xs text-gray-500 mb-1'>Старт</label>
							<input
								type='date'
								className='w-full rounded border px-2 py-1'
								value={startDate ?? ""}
								onChange={e => setStartDate(e.target.value)}
							/>
						</div>
						<div>
							<label className='block text-xs text-gray-500 mb-1'>
								Дедлайн
							</label>
							<input
								type='date'
								className='w-full rounded border px-2 py-1'
								value={dueDate ?? ""}
								onChange={e => setDueDate(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<div className='text-xs text-gray-500 mb-2'>Теги</div>
						<div className='space-y-2'>
							{cats.map(cat => (
								<div key={cat.id}>
									<div className='text-xs font-medium mb-1'>{cat.name}</div>
									<div className='flex flex-wrap gap-2'>
										{(tagsByCat.get(cat.id) || []).map(tag => {
											const active = taskHas(tag.id);
											return (
												<button
													key={tag.id}
													onClick={() => toggleTag(tag)}
													className={`rounded-full border px-2 py-0.5 text-xs ${
														active
															? "bg-blue-600 text-white border-blue-600"
															: "bg-white text-gray-700"
													}`}>
													{tag.name}
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>

					<div className='mt-2 flex justify-end gap-2'>
						<button className='rounded border px-3 py-1' onClick={onClose}>
							Отмена
						</button>
						<button
							className='rounded bg-blue-600 text-white px-3 py-1'
							onClick={save}>
							Сохранить
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
