-- 로컬/테스트 전용 seed: 시간 단위를 분으로.
update public.app_config set value = 'minutes' where key = 'time_unit';
