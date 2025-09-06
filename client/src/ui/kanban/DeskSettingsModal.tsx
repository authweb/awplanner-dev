// client/src/ui/desk/DeskSettingsModal.tsx
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal, Button, Input } from "../primitives";
import {
	createSticker,
	type Sticker,
	type CreateStickerPayload,
} from "../../api";
import {
	defaultStickers,
	type StickerItem,
	type StickerKey,
	type BuiltinStickerKey,
} from "../desk/stickers.model";
import type { IconName } from "../icons/registry";
import Icon from "../icons/Icon";

/* ---------- разделы ---------- */
type SectionKey =
	| "general"
	| "appearance"
	| "stickers"
	| "share"
	| "handoff"
	| "templates";

/* ---------- иконки для встроенных стикеров ---------- */
const STICKER_ICON: Partial<Record<BuiltinStickerKey, IconName>> = {
	assignee: "user",
	deadline: "eventCalendar",
	priority: "status",
	recurring: "notification",
	stopwatch: "calendar",
	timetracking: "stats",
	timer: "calendar",
	sprint: "list",
};

function getStickerIcon(key: StickerKey): IconName {
	// для кастомных стикеров показываем дефолтную
	if (typeof key === "string" && key.startsWith("custom:")) return "list";
	return STICKER_ICON[key as BuiltinStickerKey] ?? "list";
}

/* =======================================================================
   МОДАЛ НАСТРОЕК ДОСКИ
======================================================================== */
export default function DeskSettingsModal({
	open,
	onClose,
	projectId,
	boardId,
	stickers,
	onChangeStickers,
	initialSection = "stickers",
}: {
	open: boolean;
	onClose: () => void;
	projectId: string;
	boardId?: string;
	stickers?: StickerItem[];
	onChangeStickers?: (next: StickerItem[]) => void;
	initialSection?: SectionKey;
}) {
	const [section, setSection] = useState<SectionKey>(initialSection);
	const [localStickers, setLocalStickers] = useState<StickerItem[]>(
		stickers ?? defaultStickers(),
	);

	// при открытии возвращаемся в стартовый раздел
	useEffect(() => {
		if (open) setSection(initialSection);
	}, [open, initialSection]);

	// держим локальное состояние в синхроне с пропсами
	useEffect(() => {
		setLocalStickers(stickers ?? defaultStickers());
	}, [stickers]);

	const apply = () => {
		onChangeStickers?.(localStickers);
		onClose();
	};

	const menu: { key: SectionKey; title: string }[] = [
		{ key: "general", title: "Основные" },
		{ key: "appearance", title: "Внешний вид" },
		{ key: "stickers", title: "Стикеры" },
		{ key: "share", title: "Доступ по ссылке" },
		{ key: "handoff", title: "Передача задач" },
		{ key: "templates", title: "Шаблоны задач" },
	];

	return (
		<Modal open={open} onClose={onClose} size='xl' title='Настройки доски'>
			<div className='flex min-h-[60vh] gap-6'>
				{/* LEFT: навигация */}
				<aside className='w-56 shrink-0'>
					<nav className='space-y-1 text-sm'>
						{menu.map(m => (
							<button
								key={m.key}
								onClick={() => setSection(m.key)}
								className={
									"w-full rounded-lg px-3 py-2 text-left hover:bg-black/5 " +
									(section === m.key
										? "bg-black/5 font-medium ring-1 ring-border"
										: "text-neutral-600")
								}>
								{m.title}
							</button>
						))}
					</nav>

					<div className='mt-6 rounded-xl bg-brand-50 p-3 text-xs text-brand'>
						Больше автоматизаций и интеграций — в Расширениях.
						<div className='pt-2'>
							<Button size='sm' variant='secondary'>
								Открыть Расширения
							</Button>
						</div>
					</div>
				</aside>

				{/* RIGHT: контент */}
				<section className='min-w-0 flex-1'>
					{section === "stickers" ? (
						<StickersPane
							value={localStickers}
							onChange={setLocalStickers}
							projectId={projectId}
							boardId={boardId}
						/>
					) : (
						<div className='rounded-xl border border-border bg-panel p-6 text-sm text-muted'>
							Раздел «{menu.find(m => m.key === section)?.title}» — заглушка.
							Здесь позже появятся соответствующие настройки.
						</div>
					)}

					<div className='mt-4 flex justify-end gap-2'>
						<Button variant='secondary' onClick={onClose}>
							Отмена
						</Button>
						<Button onClick={apply}>Сохранить</Button>
					</div>
				</section>
			</div>
		</Modal>
	);
}

/* =======================================================================
   СЕКЦИЯ "СТИКЕРЫ"
======================================================================== */
function StickersPane({
	value,
	onChange,
	projectId,
	boardId,
}: {
	value: StickerItem[];
	onChange: (next: StickerItem[]) => void;
	projectId: string;
	boardId?: string;
}) {
	const [view, setView] = useState<"list" | "create">("list");
	const [tpl, setTpl] = useState<"states" | "sprint" | "text" | "number">(
		"states",
	);

	const push = (updater: (prev: StickerItem[]) => StickerItem[]) =>
		onChange(updater(value));

	return (
		<>
			<div className='mb-3 flex items-center justify-between'>
				<div className='text-sm font-medium'>
					{view === "list"
						? "Стикеры и автоматизация"
						: "Создание нового стикера"}
				</div>

				<div className='flex items-center gap-2'>
					{view === "create" ? (
						<Button
							variant='secondary'
							size='sm'
							onClick={() => setView("list")}>
							← Назад к списку стикеров
						</Button>
					) : (
						<>
							<Button
								variant='secondary'
								size='sm'
								onClick={() => {
									setTpl("states");
									setView("create");
								}}>
								<Icon name='plus' className='icon' /> Создать
							</Button>
							<Button variant='secondary' size='sm'>
								<Icon name='list' className='icon' /> Стикеры других досок
							</Button>
						</>
					)}
				</div>
			</div>

			{view === "create" ? (
				<StickerCreateForm
					projectId={projectId}
					boardId={boardId}
					type={tpl}
					onCancel={() => setView("list")}
					onCreated={s => {
						const item: StickerItem = {
							id: s.id,
							key: `custom:${s.type}-${s.id}` as unknown as StickerKey,
							title: s.title,
							enabled: true,
							system: false,
							automations: 0,
						};
						push(prev => [...prev, item]);
						setView("list");
					}}
				/>
			) : (
				<div className='grid grid-cols-2 gap-3'>
					{value.map((s, i) => (
						<StickerRow
							key={s.id ?? s.key}
							item={s}
							onToggle={() =>
								push(prev =>
									prev.map((x, idx) =>
										idx === i ? { ...x, enabled: !x.enabled } : x,
									),
								)
							}
							onRemove={() => push(prev => prev.filter((_, idx) => idx !== i))}
						/>
					))}
				</div>
			)}
		</>
	);
}

/* =======================================================================
   СОЗДАНИЕ СТИКЕРА
======================================================================== */
function StickerCreateForm({
	projectId,
	boardId,
	type,
	onCancel,
	onCreated,
}: {
	projectId: string;
	boardId?: string;
	type: "states" | "sprint" | "text" | "number";
	onCancel: () => void;
	onCreated: (s: Sticker) => void;
}) {
	const [title, setTitle] = useState("");

	// только для states — набор состояний
	const [states, setStates] = useState<
		Array<{ name: string; color?: string | null }>
	>([
		{ name: "Низкий", color: "#94a3b8" },
		{ name: "Средний", color: "#f59e0b" },
		{ name: "Высокий", color: "#ef4444" },
	]);

	const addState = () =>
		setStates(s => [...s, { name: `Состояние ${s.length + 1}` }]);
	const setStateName = (i: number, name: string) =>
		setStates(s => s.map((x, idx) => (idx === i ? { ...x, name } : x)));
	const setStateColor = (i: number, color: string) =>
		setStates(s => s.map((x, idx) => (idx === i ? { ...x, color } : x)));
	const removeState = (i: number) =>
		setStates(s => s.filter((_, idx) => idx !== i));

	const m = useMutation({
		mutationFn: async (): Promise<Sticker> => {
			let payload: CreateStickerPayload;
			if (type === "states") {
				payload = { projectId, boardId, type, title: title.trim(), states };
			} else {
				payload = { projectId, boardId, type, title: title.trim() };
			}
			// ВАЖНО: вернуть ответ сервера (Sticker), а не payload
			const created = await createSticker(payload);
			return created as Sticker;
		},
		onSuccess: sticker => onCreated(sticker),
	});

	const disabled =
		!title.trim() || (type === "states" && states.length === 0) || m.isPending;

	return (
		<div className='rounded-xl border border-border bg-panel p-4'>
			<div className='grid gap-4'>
				<div>
					<div className='mb-1 text-sm font-medium'>Название</div>
					<Input
						value={title}
						onChange={e => setTitle(e.target.value)}
						placeholder='Например, Приоритет'
					/>
				</div>

				{type === "states" && (
					<div>
						<div className='mb-2 text-sm font-medium'>Состояния</div>
						<div className='space-y-2'>
							{states.map((s, i) => (
								<div key={`${s.name}-${i}`} className='flex items-center gap-2'>
									<input
										className='h-8 w-60 rounded-xl border border-border bg-panel px-3 text-sm'
										value={s.name}
										onChange={e => setStateName(i, e.target.value)}
									/>
									<ColorDot
										color={s.color || "#94a3b8"}
										onPick={c => setStateColor(i, c)}
									/>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => removeState(i)}>
										Удалить
									</Button>
								</div>
							))}
							<Button variant='secondary' size='sm' onClick={addState}>
								<Icon name='plus' /> Добавить состояние
							</Button>
						</div>
					</div>
				)}

				<div className='flex justify-end gap-2 pt-2'>
					<Button variant='secondary' onClick={onCancel}>
						Отмена
					</Button>
					<Button onClick={() => m.mutate()} disabled={disabled}>
						{m.isPending ? "Создаём…" : "Создать"}
					</Button>
				</div>

				{m.isError && (
					<div className='text-sm text-red-600'>
						Ошибка: {(m.error as Error).message}
					</div>
				)}
			</div>
		</div>
	);
}

/* =======================================================================
   ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
======================================================================== */
function ColorDot({
	color,
	onPick,
}: {
	color: string;
	onPick: (c: string) => void;
}) {
	const palette = [
		"#94a3b8",
		"#60a5fa",
		"#34d399",
		"#f59e0b",
		"#ef4444",
		"#a78bfa",
		"#f43f5e",
		"#10b981",
		"#22d3ee",
	];
	return (
		<div className='flex items-center gap-1'>
			{palette.map(c => (
				<button
					key={c}
					className='h-5 w-5 rounded-full border border-border'
					style={{ backgroundColor: c }}
					onClick={() => onPick(c)}
					title={c}
				/>
			))}
			<span
				className='ml-2 inline-block h-5 w-5 rounded-full border'
				style={{ backgroundColor: color }}
			/>
		</div>
	);
}

function StickerRow({
	item,
	onToggle,
	onRemove,
}: {
	item: StickerItem;
	onToggle: () => void;
	onRemove: () => void;
}) {
	const iconName = getStickerIcon(item.key);

	return (
		<div className='rounded-xl border border-border bg-panel p-3'>
			<div className='mb-2 flex items-center justify-between'>
				<div className='flex items-center gap-2'>
					<span className='inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black/5'>
						<Icon name={iconName} size={14} />
					</span>
					<div>
						<div className='text-sm font-medium'>{item.title}</div>
						<div className='text-xs text-muted'>
							{item.system ? "Системный" : "Пользовательский"} • Автоматизаций:{" "}
							{item.automations ?? 0}
						</div>
					</div>
				</div>
				<Toggle checked={item.enabled} onChange={onToggle} />
			</div>

			<div className='flex gap-2'>
				<Button size='sm' variant='secondary'>
					Настроить
				</Button>
				<Button size='sm' variant='secondary' onClick={onRemove}>
					Убрать с доски
				</Button>
			</div>
		</div>
	);
}

function Toggle({
	checked,
	onChange,
}: {
	checked: boolean;
	onChange: () => void;
}) {
	return (
		<button
			type='button'
			onClick={onChange}
			className={
				"relative h-5 w-9 rounded-full transition " +
				(checked ? "bg-blue-600" : "bg-neutral-300")
			}
			aria-pressed={checked}
			aria-label='toggle'>
			<span
				className={
					"absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition " +
					(checked ? "translate-x-4" : "")
				}
			/>
		</button>
	);
}
