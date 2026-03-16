const supabase = require('./supabase');

console.log('Verifying users in Supabase...');
const checkUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, is_admin');

    if (error) {
        console.error(error);
    } else {
        console.table(data);
    }
};

checkUsers();
