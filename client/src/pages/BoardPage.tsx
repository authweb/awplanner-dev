// client/src/pages/BoardPage.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query";

import AppShell from "../ui/shell/AppShell";
import BoardHeader from "../ui/kanban/BoardHeader";
import BoardView from "../ui/kanban/BoardView";
import DeskSettingsModal from "../ui/kanban/DeskSettingsModal";
import GanttPage from "./GanttPage";
import CalendarPage from "./CalendarPage";
import { Button, Input, Modal } from "../ui/primitives";

import {
	loadBoard,
	createColumn,
	type BoardPayload,
	type Column,
} from "../api";
import { useBoardFilters } from "../hooks/useBoardFilters";

// 👇 добавим дефолтные стикеры как временное хранилище на клиенте
import { defaultStickers, type StickerItem } from "../ui/desk/stickers.model";

type Tab = "board" | "gantt" | "calendar";

export default function BoardPage() {
	const { projectId = "" } = useParams();
	const [tab, setTab] = useState<Tab>("board");

	// фильтры из URL
	const [filters, setFilters] = useBoardFilters();

	const qc = useQueryClient();

	const { data, isLoading } = useQuery<BoardPayload>({
		queryKey: ["board", projectId],
		queryFn: () => loadBoard(projectId),
		placeholderData: keepPreviousData,
	});

	// ---- локальные модалки/состояния
	const [showCreateCol, setShowCreateCol] = useState(false);
	const [newColTitle, setNewColTitle] = useState("");
	const [showMirror, setShowMirror] = useState(false);

	// централизованная модалка настроек доски
	const [settingsOpen, setSettingsOpen] = useState(false);

	// локальные стикеры (пока без загрузки с API)
	const [stickers, setStickers] = useState<StickerItem[]>(() =>
		defaultStickers(),
	);

	// позиция новой колонки (в конец с шагом 100)
	const nextColPos =
		(data?.columns.reduce((m, c) => Math.max(m, Number(c.position) || 0), 0) ??
			0) + 100;

	// создание колонки
	const createColMutation = useMutation<Column, Error, void>({
		mutationFn: async () => {
			if (!data) throw new Error("board not loaded");
			const payload = {
				boardId: data.board.id,
				title: newColTitle.trim(),
				position: nextColPos,
			};
			return createColumn(payload);
		},
		onSuccess: col => {
			qc.setQueryData<BoardPayload>(["board", projectId], old =>
				old ? { ...old, columns: [...old.columns, col] } : old,
			);
			setNewColTitle("");
			setShowCreateCol(false);
		},
	});

	// экшены для правого рейла
	const handleAddColumn = () => setShowCreateCol(true);
	const handleOpenSettings = () => setSettingsOpen(true);
	const handleOpenMirror = () => setShowMirror(true);

	return (
		<AppShell>
			<BoardHeader
				active={tab}
				onTab={setTab}
				filters={filters}
				onFiltersChange={setFilters}
				projectId={projectId}
				onOpenSettings={() => setSettingsOpen(true)}
				onAddSticker={() => setSettingsOpen(true)}
			/>

			{isLoading || !data ? (
				<div className='p-6 text-sm text-neutral-500'>Загрузка…</div>
			) : tab === "board" ? (
				<BoardView
					payload={data}
					projectId={projectId}
					filters={filters}
					onAddColumn={handleAddColumn}
					onCreateSummary={handleOpenSettings}
					onCreateMirror={handleOpenMirror}
				/>
			) : tab === "gantt" ? (
				<GanttPage />
			) : (
				<CalendarPage />
			)}

			{/* ---- Модалка: создать колонку ---- */}
			<Modal
				open={showCreateCol}
				onClose={() => setShowCreateCol(false)}
				title='Новая колонка'>
				<div className='space-y-3'>
					<Input
						autoFocus
						placeholder='Название колонки'
						value={newColTitle}
						onChange={e => setNewColTitle(e.target.value)}
					/>
					{createColMutation.isError && (
						<div className='text-sm text-red-600'>
							{(createColMutation.error as Error).message}
						</div>
					)}
					<div className='flex justify-end gap-2 pt-2'>
						<Button variant='secondary' onClick={() => setShowCreateCol(false)}>
							Отмена
						</Button>
						<Button
							onClick={() => createColMutation.mutate()}
							disabled={!newColTitle.trim() || createColMutation.isPending}>
							{createColMutation.isPending ? "Создаём…" : "Создать"}
						</Button>
					</div>
				</div>
			</Modal>

			{/* ---- Модалка: Настройки доски (стикеры и т.п.) ---- */}
			{data && (
				<DeskSettingsModal
					open={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					projectId={projectId}
					boardId={data.board.id}
					stickers={stickers}
					onChangeStickers={setStickers}
				/>
			)}

			{/* ---- Модалка: Зеркало (stub) ---- */}
			<Modal
				open={showMirror}
				onClose={() => setShowMirror(false)}
				title='Зеркало доски'>
				<div className='space-y-3 text-sm text-neutral-700'>
					Фича «Зеркало» появится позже. Настроим фильтры/правила и сохранение.
					<div className='flex justify-end'>
						<Button variant='secondary' onClick={() => setShowMirror(false)}>
							Закрыть
						</Button>
					</div>
				</div>
			</Modal>
		</AppShell>
	);
}
