// 환경변수 접근. 서버 전용 값은 서버에서만 읽힌다.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다.`);
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

export const serverEnv = {
  // 컨테이너 내부에서 Supabase에 닿는 주소. 없으면 공개 URL 사용.
  supabaseServerUrl: () => process.env.SUPABASE_INTERNAL_URL || publicEnv.supabaseUrl(),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  timeUnit: (): "days" | "minutes" => (process.env.RITUAL_TIME_UNIT === "minutes" ? "minutes" : "days"),
};
