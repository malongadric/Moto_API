import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()  // 🔹 DOIT être avant createClient

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('⚠️ Supabase URL ou KEY manquante. Vérifie ton .env')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
