import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wniglgopmrdxvhdfhawe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduaWdsZ29wbXJkeHZoZGZoYXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDQzMDgsImV4cCI6MjA5MDU4MDMwOH0.AMHPao5Eu0w7AC7dZrd6Bvhq7nkpSjb3tCE5QBJFWI0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
