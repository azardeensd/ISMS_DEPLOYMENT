import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwnjegbvwxlaysifetok.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3bmplZ2J2d3hsYXlzaWZldG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MTIyNzksImV4cCI6MjA3Nzk4ODI3OX0.hPWiyaoCJ1ZEuQBLlC1QyBhSi62mGRMhBfP8O13ecAM';

export const supabase = createClient(supabaseUrl, supabaseKey);
