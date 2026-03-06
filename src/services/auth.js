import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqnwoueitczzaapsrgme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbndvdWVpdGN6emFhcHNyZ21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MjA0NTIsImV4cCI6MjA3Nzk5NjQ1Mn0.60i3fherQgSSDSyevmuhWK8mAZ8fSXNNmKzYdwzmAEY';

export const supabase = createClient(supabaseUrl, supabaseKey);
