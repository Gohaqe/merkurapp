// js/supabase.js
const SUPABASE_URL = 'https://uhryalhhypfopsxbfttr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVocnlhbGhoeXBmb3BzeGJmdHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NjAxMjYsImV4cCI6MjA4NjQzNjEyNn0.QgDfttGQg_iSaiHAd5J9R0YfEh_aaSodo0_DJyZQA1Q';

// Inicializamos el cliente (asume que la librería de Supabase se carga en el HTML)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);