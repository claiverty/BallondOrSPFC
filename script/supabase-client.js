// conectando com o supabase
const SUPABASE_URL = "https://yuadgwysfngfcxujxhdw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRnd3lzZm5nZmN4dWp4aGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjA3MjgsImV4cCI6MjA3MDUzNjcyOH0.aXphwPM8SAfq7sSCMbH_s5-i59InG2f2z6JgF0zeyf0";

const { createClient } = supabase;

// Exporta a conexão para que outros arquivos possam importá-la
export const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);