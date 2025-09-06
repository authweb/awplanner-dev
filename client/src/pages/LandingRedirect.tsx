import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "../api";

export default function LandingRedirect() {
	const nav = useNavigate();
	const { data, isLoading, error } = useQuery({
		queryKey: ["projects"],
		queryFn: fetchProjects,
	});

	useEffect(() => {
		if (!data || !data.length) return;
		nav(`/p/${data[0].id}`, { replace: true });
	}, [data, nav]);

	if (isLoading) return <div className='p-6'>Загружаем проекты…</div>;
	if (error)
		return <div className='p-6 text-red-600'>Не удалось загрузить проекты</div>;
	return <div className='p-6'>Нет проектов. Создайте первый в БД.</div>;
}
