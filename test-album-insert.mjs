import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testUpload() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.log("No authenticated user")
        return
    }

    console.log("User details:", {
        id: user.id,
        email: user.email
    })

    // Check if user exists in the public.users table
    const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profileErr) {
        console.error("Error fetching user profile:", profileErr)
    } else {
        console.log("Found user profile:", profile)
    }

    // Try to insert an album
    const { data, error } = await supabase
        .from('albums')
        .insert({
            user_id: user.id,
            title: "Test Album",
            artist: "Test Artist",
        })
        .select()

    if (error) {
        console.error("Error inserting album:", error)
    } else {
        console.log("Successfully inserted album:", data)
    }
}

testUpload()
